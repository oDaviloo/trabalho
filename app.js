const express = require('express');
const session = require("express-session");
const path = require('path');
const app = express();
const axios = require('axios');

const bodyParser = require("body-parser");

const mysql = require("mysql"); 
const { resolveSoa } = require('dns');
let connection;

app.use(session({secret: "ssshhhhh", resave: false, 
saveUninitialized: false 
}));

app.use(express.static('public'))

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/public'));

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


//conexão com banco mysql
function conectiondb(){
    if (!connection || !connection.threadId) {
        connection = mysql.createConnection({
            host: 'localhost', 
            user: 'root', 
            password: '', 
            database: 'caçaofertas' 
        });

        connection.connect((err) => {
            if (err) {
                console.log('Erro connecting to database...', err);
                return;
            }
            console.log('Connection established!')
        });
    }

    return connection;
}


app.get('/', (req, res) => {
    var message = ' ';
    req.session.destroy();
    res.render('views/registro', { message: message });
});



app.get('/views/registro', (req, res)=>{
    res.redirect('../');
    
});


app.get("/views/home", function (req, res){
    
  
    if (req.session.user){
        var con = conectiondb();
        var query2 = 'SELECT * FROM users WHERE email LIKE ?';
        con.query(query2, [req.session.user], function (err, results){
            res.render('views/home', {message:results});
            
        });
        
    }else{
        res.redirect("/");
    }
    
});


//rota para login
app.get("/views/login", function(req, res){
    var message = ' ';
    res.render('views/login', {message:message});
});

app.get('/cadastro_empresas', function(req, res) {
    // Lógica para renderizar a página de cadastro de empresas
    res.render('views/cadastro_empresas');
});

//método post do register
app.post('/register', function (req, res){

    
    

    var username = req.body.nome;
    var pass = req.body.pwd;
    var email = req.body.email;
    var idade = req.body.idade;
    var cidade = req.body.cidade;
    var estado = req.body.estado;

    var con = conectiondb();

    var queryConsulta = 'SELECT * FROM users WHERE email LIKE ?';

    con.query(queryConsulta, [email], function (err, results){
        if (results.length > 0){            
            var message = 'E-mail já cadastrado';
            res.render('views/registro', { message: message });
        }else{
            var query = 'INSERT INTO users VALUES (DEFAULT, ?, ?, ?, ?, ?, ?)';

            con.query(query, [username, email, idade, cidade, estado, pass], function (err, results){
                if (err){
                    throw err;
                }else{
                    console.log ("Usuario adicionado com email " + email);
                    var message = "ok";
                    res.render('views/registro', { message: message });
                }        
            });
        }
    });
});

// cadastro empresas



// ... (seu código existente)

// Rota para cadastrar uma empresa
app.post('/cadastrar_empresas', async (req, res) => {
    const { nomeEmpresa, cnpj, setor, email, senha, cep } = req.body;

    try {
        // Log para capturar o CEP utilizado na requisição
        console.log('CEP utilizado:', cep);

        const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
        const endereco = response.data;

        // Certifique-se de que a conexão está estabelecida antes de usar connection.query
        const connection = conectiondb();

        // Salvar dados no banco de dados
        connection.query('INSERT INTO empresas SET ?', {
            nome_empresa: nomeEmpresa,
            cnpj,
            setor,
            email,
            senha,
            cep: endereco.cep,
            logradouro: endereco.logradouro,
            complemento: endereco.complemento,
            bairro: endereco.bairro,
            localidade: endereco.localidade,
            uf: endereco.uf,
            ibge: endereco.ibge,
            gia: endereco.gia,
            ddd: endereco.ddd,
            siafi: endereco.siafi
        }, (error, results, fields) => {
            if (error) {
                console.error('Erro ao cadastrar empresa:', error);
                res.status(500).send('Erro ao cadastrar empresa. Por favor, tente novamente.');
            } else {
                console.log('Empresa cadastrada com sucesso!');
                res.status(200).send('Cadastro realizado com sucesso!');
            }
        });

    } catch (error) {
        console.error('Erro ao consultar CEP:', error.message);
        res.status(500).send('Erro ao consultar CEP. Por favor, tente novamente.');
    }
});

//cadastro empresas fim


app.post('/home', function (req, res){
 
    var email = req.body.email;
    var pass = req.body.pass;
   
    var con = conectiondb();
   
    var query = 'SELECT * FROM users WHERE pass = ? AND email LIKE ?';
    
    
    con.query(query, [pass, email], function (err, results){
        if (results.length > 0){
            req.session.user = email;         
            console.log("Login feito com sucesso!");
            res.render('views/home', {message:results});
        }else{
            var message = 'Login incorreto!';
            res.render('views/login', { message: message });
        }
    });
});

app.post('/home', function (req, res) {
    var email = req.body.email;
    var pass = req.body.pass;
   
    var con = conectiondb();
   
    var query = 'SELECT * FROM users WHERE pass = ? AND email LIKE ?';
    
    con.query(query, [pass, email], function (err, results) {
        if (results.length > 0) {
            req.session.user = email;         
            console.log("Login feito com sucesso!");
            res.redirect('/home'); // Redireciona para a página home após o login bem-sucedido
        } else {
            var message = 'Login incorreto!';
            res.render('views/login', { message: message });
        }
    });
});

app.get('/home', function (req, res) {
    if (req.session.user) {
        // Lógica para verificar se o usuário está logado
        // Se estiver logado, renderize a página home
        res.render('views/home');
    } else {
        // Se não estiver logado, redirecione para a página de login ou faça outro tratamento
        res.redirect('/');
    }
});

// Adicione também uma rota para lidar com o método POST na mesma rota '/home'
app.post('/home', function (req, res) {
    if (req.session.user) {
        // Lógica para verificar se o usuário está logado
        // Se estiver logado e o método POST for enviado para /home, faça algo aqui
    } else {
        // Se não estiver logado e o método POST for enviado para /home, redirecione para a página de login ou faça outro tratamento
        res.redirect('/');
    }
});


app.post('/update', function (req, res){
   
    console.log("entrou");
    
    var email = req.body.email;
    var pass = req.body.pwd;
    var username = req.body.nome;
    var idade = req.body.idade;
    var cidade = req.body.cidade;
    var estado = req.body.estado;
   
    var con = conectiondb();
   
    var query = 'UPDATE users SET username = ?, pass = ?, idade = ? WHERE email LIKE ?';
    

   
    con.query(query, [username, pass, idade, req.session.user], function (err, results){
        
        var query2 = 'SELECT * FROM users WHERE email LIKE ?';
        con.query(query2, [req.session.user], function (err, results){
            res.render('views/home', {message:results});    
        });
        
    });
});

app.post('/delete', function (req, res){
    
    
    var username = req.body.nome;
    
   
    var con = conectiondb();
   
    var query = 'DELETE FROM users WHERE email LIKE ?';
    

    
    con.query(query, [req.session.user], function (err, results){
        res.redirect ('/');
    });
});

//executa servidor
app.listen(8081, () => console.log(`App listening on port!`));