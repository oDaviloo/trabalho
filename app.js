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

// Rota para a página de login
app.get("/views/login", function (req, res) {
    var message = ' ';
    res.render('views/login', { message: message });
});

//rotas cadastro produto

app.get('/cadastro_produtos', function (req, res) {
    if (req.session.user) {
        const successMessage = req.session.successMessage; // Obtendo a mensagem de sucesso da sessão
        req.session.successMessage = null; // Limpar a mensagem da sessão após exibi-la

        // Obtendo o ID da empresa logada da sessão
        const empresaId = req.session.empresa_id;

        // Consultar o banco de dados para obter o nome da empresa usando o ID
        const query = 'SELECT nome_empresa FROM empresas WHERE id = ?';

        const connection = conectiondb();

        connection.query(query, [empresaId], (error, results) => {
            if (error) {
                console.error('Erro ao obter nome da empresa:', error);
                res.status(500).send('Erro ao obter nome da empresa. Tente novamente mais tarde.');
            } else {
                const nomeEmpresaLogada = results[0].nome_empresa; // Nome da empresa obtido do banco de dados

                res.render('views/cadastro_produtos', { 
                    empresa_id: empresaId,   
                    successMessage: successMessage,
                    nomeEmpresaLogada: nomeEmpresaLogada // Enviando o nome da empresa logada para o template
                });
            }
        });
    } else {
        res.redirect("/"); // Redirecionar se o usuário não estiver logado
    }
});
// Rota para cadastrar um novo produto
const multer = require('multer');

// Configuração do Multer para salvar os arquivos na pasta 'uploads'
const upload = multer({ dest: '.../uploads' }); // Ajuste o diretório conforme sua estrutura de pastas

// ...

// Rota para cadastrar um novo produto
app.post('/cadastrar_produto', upload.single('foto'), async function (req, res) {
    if (req.session.user) {
        const { nome_produto, descricao, preco, quantidade, disponibilidade } = req.body;
        const empresa_id = req.session.empresa_id; // Obtendo o ID da empresa logada

        try {
            // Certifique-se de que a conexão está estabelecida antes de usar connection.query
            const connection = conectiondb();

            // Recuperar o nome do arquivo da requisição
            const foto = req.file.filename; // Nome do arquivo de imagem enviado

            // Query para inserir um novo produto na tabela 'produtos'
            const query = `INSERT INTO produtos (nome_produto, descricao, preco, quantidade, disponibilidade, foto, empresa_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
            const queryParams = [nome_produto, descricao, preco, quantidade, disponibilidade, foto, empresa_id];

            connection.query(query, queryParams, (error, results) => {
                if (error) {
                    console.error('Erro ao cadastrar o produto:', error);
                    res.status(500).send('Erro ao cadastrar o produto. Tente novamente mais tarde.');
                } else {
                    req.session.successMessage = 'Produto cadastrado com sucesso!'; // Adicione a mensagem de sucesso à sessão
                    res.redirect('/cadastro_produtos'); // Redirecionar após o cadastro bem-sucedido
                    
                }
            });

        } catch (error) {
            console.error('Erro ao cadastrar o produto:', error.message);
            res.status(500).send('Erro ao cadastrar o produto. Tente novamente mais tarde.');
        }
    } else {
        res.redirect("/"); // Redirecionar se o usuário não estiver logado
    }
});


//rotas cadastro produto FIM

//rotas página gerenciar produtos  


// Rota para a página de gerenciamento de produtos da empresa logada
app.get('/gerenciar_produtos/', function (req, res) {
    if (req.session.user) {
        const nomeEmpresa = req.params.nomeEmpresa;
        // Lógica para obter os produtos da empresa do banco de dados
        const con = conectiondb();
        const query = `SELECT * FROM empresa_produtos 
                       JOIN produtos ON empresa_produtos.produto_id = produtos.id 
                       WHERE empresa_produtos.empresa_id = (
                           SELECT id FROM empresas WHERE nome_empresa = ?
                       )`;

        con.query(query, [nomeEmpresa], function (err, results) {
            if (err) {
                console.error('Erro ao obter produtos da empresa:', err);
                res.status(500).send('Erro ao obter produtos da empresa. Tente novamente mais tarde.');
            } else {
                const products = results; // Dados dos produtos da empresa
                res.render('views/gerenciar_produtos');
            }
        });
    } else {
        res.redirect("/"); // Redirecionar se o usuário não estiver logado
    }
});

// Rota para atualizar informações de um produto
app.post('/atualizar_produto', function (req, res) {
    const { idProduto, nomeProduto, disponibilidade, preco, quantidade } = req.body;
    // Lógica para atualizar as informações do produto no banco de dados
    const connection = conectiondb();
    const query = `UPDATE produtos 
                    SET nome_produto = ?, disponibilidade = ?, preco = ?, quantidade = ? 
                    WHERE id = ?`;

    const queryParams = [nomeProduto, disponibilidade, preco, quantidade, idProduto];

    connection.query(query, queryParams, (error, results) => {
        if (error) {
            console.error('Erro ao atualizar informações do produto:', error);
            res.status(500).send('Erro ao atualizar informações do produto. Tente novamente mais tarde.');
        } else {
            res.redirect(`/gerenciar_produtos/`); // Redirecionar após a atualização bem-sucedida
        }
    });
});

// Rota para excluir um produto
app.post('/excluir_produto', function (req, res) {
    const idProduto = req.body.idProduto;
    // Lógica para excluir o produto do banco de dados
    const connection = conectiondb();
    const query = `DELETE FROM produtos WHERE id = ?`;

    connection.query(query, [idProduto], (error, results) => {
        if (error) {
            console.error('Erro ao excluir produto:', error);
            res.status(500).send('Erro ao excluir produto. Tente novamente mais tarde.');
        } else {
            res.redirect(`/gerenciar_produtos/`); // Redirecionar após a exclusão bem-sucedida
        }
    });
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

                // Aqui você precisa obter o ID da empresa após a consulta no banco de dados
                const empresaIdQuery = 'SELECT id FROM empresas WHERE email = ?';
                con.query(empresaIdQuery, [email], function (err, result) {
                    if (err) {
                        console.error('Erro ao obter o ID da empresa:', err);
                        res.render('views/login', { message: 'Erro ao realizar login. Por favor, tente novamente.' });
                        return;
                    }

                    if (result.length > 0) {
                        req.session.empresa_id = result[0].id; // Defina o empresa_id na sessão
                        console.log('Login da empresa com sucesso!');
                        res.redirect('/perfil_empresa'); // Altere para a rota correta da página de perfil da empresa
                    } else {
                        console.error('Empresa não encontrada!');
                        res.render('views/login', { message: 'Erro ao realizar login. Por favor, tente novamente.' });
                    }
                });
            } else {
                // Caso não seja encontrado nem na tabela 'users' nem na tabela 'empresas'
                console.error('Login incorreto!');
                res.render('views/login', { message: 'Login incorreto!' });
            }
        });
    });
});






// Executa o servidor
app.listen(8081, () => console.log(`App listening on port 8081!`));


