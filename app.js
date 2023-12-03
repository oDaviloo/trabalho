const express = require('express');
const session = require("express-session");
const path = require('path');
const app = express();
const axios = require('axios');
const bodyParser = require("body-parser");
const mysql = require("mysql");
let connection;

app.use(session({
    secret: "ssshhhhh",
    resave: false,
    saveUninitialized: false
}));

app.use(express.static('public'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/public'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Função para estabelecer conexão com o banco de dados
function conectiondb() {
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
            console.log('Connection established!');
        });
    }

    return connection;
}

// Rota raiz - renderiza a página de registro
app.get('/', (req, res) => {
    var message = ' ';
    req.session.destroy();
    res.render('views/registro', { message: message });
});

// Rota para redirecionar a página de registro
app.get('/views/registro', (req, res) => {
    res.redirect('../');
});

// Rota para redirecionar a página de home após login
app.get("/views/home", function (req, res) {
    if (req.session.user) {
        var con = conectiondb();
        var query2 = 'SELECT * FROM users WHERE email LIKE ?';
        con.query(query2, [req.session.user], function (err, results) {
            res.render('views/home', { message: results });
        });
    } else {
        res.redirect("/");
    }
});

// Rota para a página de login
app.get("/views/login", function (req, res) {
    var message = ' ';
    res.render('views/login', { message: message });
});


//tudo de gerenciar produtos

// Rota para a página de gerenciamento de produtos da empresa logada
app.get('/gerenciar_produtos/:nomeEmpresa', function (req, res) {
    // Verificar se a empresa está logada
    if (req.session.user) {
        const nomeEmpresa = req.params.nomeEmpresa;
        // Aqui você pode adicionar a lógica para renderizar a página de gerenciamento de produtos
        // com base no nome da empresa recebido como parâmetro na URL
        // Você pode passar o nome da empresa como uma variável para a página renderizada
        res.render('views/gerenciar_produtos', { nomeEmpresa: nomeEmpresa });
    } else {
        // Redirecionar se a empresa não estiver logada
        res.redirect("/");
    }
});


//tudo de gerenciar produtos FIM


// tudo de perfil empresa

// Rota para o perfil da empresa
app.get('/perfil_empresa', function (req, res) {
    if (req.session.user) {
        const con = conectiondb();
        const query = 'SELECT * FROM empresas WHERE email LIKE ?';
        con.query(query, [req.session.user], function (err, results) {
            if (err) {
                console.error('Erro ao obter perfil da empresa:', err);
                res.status(500).send('Erro ao obter perfil da empresa. Tente novamente mais tarde.');
            } else {
                const profileData = results[0]; // Dados do perfil da empresa
                const cep = profileData.cep; // Capturando o CEP da empresa

                // Renderizando a página 'perfil_empresa' e passando os dados para o template
                res.render('views/perfil_empresa', {
                    profileData: profileData, // Dados do perfil da empresa
                    cep: cep,
                    logradouro: profileData.logradouro,
                    complemento: profileData.complemento,
                    bairro: profileData.bairro,
                    localidade: profileData.localidade,
                    nome_empresa: profileData.nome_empresa
                    // Adicione aqui os outros campos necessários do perfil da empresa
                });
            }
        });
    } else {
        res.redirect("/"); // Redirecionar se o usuário não estiver logado
    }
});

// Rota para atualizar informações da empresa
app.post('/atualizar_empresa', async (req, res) => { // Adicionando a palavra-chave async aqui
    const { nomeEmpresa, cnpj, setor, senha, cep, numeroContato, numeroEndereco } = req.body;

    // Verificar se todos os campos obrigatórios estão preenchidos
   

    try {
        // Log para capturar o CEP utilizado na requisição
        console.log('CEP utilizado:', cep);

        const response = await axios.get(`https://viacep.com.br/ws/${cep}/json`);
        const endereco = response.data;

        // Certifique-se de que a conexão está estabelecida antes de usar connection.query
        const connection = conectiondb();

        // Atualizar informações da empresa no banco de dados
        const query = `UPDATE empresas 
                        SET nome_empresa = ?, cnpj = ?, setor = ?, senha = ?, cep = ?, 
                            logradouro = ?, complemento = ?, bairro = ?, localidade = ?, 
                            uf = ?, ibge = ?, gia = ?, ddd = ?, siafi = ?, numero_contato = ?, numero_endereco = ?
                        WHERE email = ?`;

        const queryParams = [
            nomeEmpresa, cnpj, setor, senha, cep, endereco.logradouro, endereco.complemento, endereco.bairro,
            endereco.localidade, endereco.uf, endereco.ibge, endereco.gia, endereco.ddd, endereco.siafi,
            numeroContato, numeroEndereco, req.session.user
        ];

        connection.query(query, queryParams, (error, results) => {
            if (error) {
                console.error('Erro ao atualizar informações da empresa:', error);
                res.status(500).send('Erro ao atualizar informações da empresa. Tente novamente mais tarde.');
            } else {
                res.redirect('/perfil_empresa'); // Redirecionar após a atualização bem-sucedida
            }
        });

    } catch (error) {
        console.error('Erro ao consultar CEP:', error.message);
        res.status(500).send('Erro ao consultar CEP. Tente novamente mais tarde.');
    }
});

// Rota para excluir perfil da empresa
app.post('/excluir_empresa', function (req, res) {
    const con = conectiondb();
    const query = 'DELETE FROM empresas WHERE email LIKE ?';
    con.query(query, [req.session.user], function (err, results) {
        if (err) {
            console.error('Erro ao excluir perfil da empresa:', err);
            res.status(500).send('Erro ao excluir perfil da empresa. Tente novamente mais tarde.');
        } else {
            req.session.destroy();
            res.redirect('/'); // Redirecionar após a exclusão do perfil
        }
    });
});


// tudo de perfil empresa FIM



// Rota para a página de cadastro de empresas
app.get('/cadastro_empresas', function (req, res) {
    // Lógica para renderizar a página de cadastro de empresas
    res.render('views/cadastro_empresas');
});

// Método POST para cadastrar empresas
app.post('/cadastrar_empresas', async (req, res) => {
    const { nomeEmpresa, cnpj, setor, email, senha, cep, numeroContato, numeroEndereco } = req.body;

   

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
                    tipo_conta: 'company', // Definindo o tipo de conta como 'company' para empresas
                    numero_contato: numeroContato,
                    numero_endereco: numeroEndereco
                }, (error, results, fields) => {
                    if (error) {
                        console.error('Erro ao cadastrar empresa:', error);
                        res.status(500).json({ success: false, message: 'Erro ao cadastrar empresa. Por favor, tente novamente.' });
                    } else {
                        console.log('Empresa cadastrada com sucesso!');
                        // Exibindo a mensagem de sucesso sem redirecionamento
                        res.render('views/login', { message: 'Cadastro realizado com sucesso. Faça login para entrar.' });

                    }
                });
            }
        });
    } catch (error) {
        console.error('Erro ao consultar CEP:', error.message);
        res.status(500).send('Erro ao consultar CEP. Por favor, tente novamente.');
    }
});



// Rota para o login
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

// Rota para atualização de informações de usuário
app.post('/update', function (req, res) {
    var email = req.body.email;
    var pass = req.body.pwd;
    var username = req.body.nome;
    var idade = req.body.idade;
    var cidade = req.body.cidade;
    var estado = req.body.estado;

    var con = conectiondb();

    var query = 'UPDATE users SET username = ?, pass = ?, idade = ? WHERE email LIKE ?';

    con.query(query, [username, pass, idade, req.session.user], function (err, results) {
        var query2 = 'SELECT * FROM users WHERE email LIKE ?';
        con.query(query2, [req.session.user], function (err, results) {
            res.render('views/home', { message: results });
        });
    });
});

// Rota para exclusão de conta de usuário
app.post('/delete', function (req, res) {
    var username = req.body.nome;
    var con = conectiondb();
    var query = 'DELETE FROM users WHERE email LIKE ?';
    con.query(query, [req.session.user], function (err, results) {
        res.redirect('/');
    });
});




// Executa o servidor
app.listen(8081, () => console.log(`App listening on port 8081!`));


