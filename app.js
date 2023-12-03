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

// Método post do register para usuários
app.post('/register', function (req, res) {
    var username = req.body.nome;
    var pass = req.body.pwd;
    var email = req.body.email;
    var idade = req.body.idade;
    var cidade = req.body.cidade;
    var estado = req.body.estado;

    var con = conectiondb();

    // Verificação se o email já existe na tabela 'users'
    var queryUser = 'SELECT * FROM users WHERE email LIKE ?';

    con.query(queryUser, [email], function (err, resultsUser) {
        if (resultsUser.length > 0) {
            var message = 'E-mail já cadastrado como usuário';
            res.render('views/registro', { message: message });
        } else {
            // Se o email não existe na tabela 'users', então verifica na tabela 'empresas'
            var queryCompany = 'SELECT * FROM empresas WHERE email LIKE ?';

            con.query(queryCompany, [email], function (err, resultsCompany) {
                if (resultsCompany.length > 0) {
                    var message = 'E-mail já cadastrado como empresa';
                    res.render('views/registro', { message: message });
                } else {
                    // Se o email não existe em nenhuma das tabelas, realiza o cadastro na tabela 'users'
                    var query = 'INSERT INTO users (username, email, idade, cidade, estado, pass, tipo_conta) VALUES (?, ?, ?, ?, ?, ?, ?)';

                    con.query(query, [username, email, idade, cidade, estado, pass, 'user'], function (err, results) {
                        if (err) {
                            throw err;
                        } else {
                            console.log("Usuário adicionado com email " + email);
                            var message = "ok";
                            res.render('views/registro', { message: message });
                        }
                    });
                }
            });
        }
    });
});


// cadastro empresas

// Rota para cadastrar uma empresa
app.post('/cadastrar_empresas', async (req, res) => {
    const { nomeEmpresa, cnpj, setor, email, senha, cep } = req.body;

    try {
        // Log para capturar o CEP utilizado na requisição
        console.log('CEP utilizado:', cep);

        const response = await axios.get(`https://viacep.com.br/ws/${cep}/json`);
        const endereco = response.data;

        // Certifique-se de que a conexão está estabelecida antes de usar connection.query
        const connection = conectiondb();

        // Verificar se o email já está cadastrado como usuário
        const queryCheckUser = 'SELECT * FROM users WHERE email LIKE ?';
        connection.query(queryCheckUser, [email], (err, resultsUser) => {
            if (resultsUser.length > 0) {
                // Se o email já estiver cadastrado como usuário, não permitir o cadastro como empresa
                console.error('E-mail já cadastrado como usuário. Não é possível cadastrar como empresa.');
                res.status(400).send('E-mail já cadastrado como usuário. Não é possível cadastrar como empresa.');
            } else {
                // Se o email não está cadastrado como usuário, prosseguir com o cadastro como empresa
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
                    siafi: endereco.siafi,
                    tipo_conta: 'company' // Definindo o tipo de conta como 'company' para empresas
                }, (error, results, fields) => {
                    if (error) {
                        console.error('Erro ao cadastrar empresa:', error);
                        res.status(500).send('Erro ao cadastrar empresa. Por favor, tente novamente.');
                    } else {
                        console.log('Empresa cadastrada com sucesso!');
                        res.redirect('/views/login'); // Redirecionar para a página de login após o cadastro bem-sucedido
                    }
                });
            }
        });

    } catch (error) {
        console.error('Erro ao consultar CEP:', error.message);
        res.status(500).send('Erro ao consultar CEP. Por favor, tente novamente.');
    }
});



//cadastro empresas fim


app.post('/home', function (req, res) {
    var email = req.body.email;
    var pass = req.body.pass;

    var con = conectiondb();

    // Consulta para verificar na tabela 'users'
    var queryUser = 'SELECT * FROM users WHERE pass = ? AND email LIKE ?';

    // Consulta para verificar na tabela 'empresas'
    var queryCompany = 'SELECT * FROM empresas WHERE senha = ? AND email LIKE ?';

    con.query(queryUser, [pass, email], function (err, resultsUser) {
        if (err) {
            console.error('Erro ao consultar o banco de dados de usuários:', err);
            res.render('views/login', { message: 'Erro ao realizar login. Por favor, tente novamente.' });
            return;
        }

        con.query(queryCompany, [pass, email], function (err, resultsCompany) {
            if (err) {
                console.error('Erro ao consultar o banco de dados de empresas:', err);
                res.render('views/login', { message: 'Erro ao realizar login. Por favor, tente novamente.' });
                return;
            }

            if (resultsUser.length > 0) {
                // Se for um usuário normal, redirecione para a página home
                req.session.user = email;
                console.log('Login do usuário com sucesso!');
                res.redirect('/views/home');
            } else if (resultsCompany.length > 0) {
                // Se for uma empresa, redirecione para a página de perfil da empresa
                req.session.user = email;
                console.log('Login da empresa com sucesso!');
                res.redirect('/perfil_empresa'); // Altere para a rota correta da página de perfil da empresa
            } else {
                // Caso não seja encontrado nem na tabela 'users' nem na tabela 'empresas'
                console.error('Login incorreto!');
                res.render('views/login', { message: 'Login incorreto!' });
            }
        });
    });
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