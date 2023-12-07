
const express = require('express');
const session = require("express-session");
const path = require('path');
const app = express();
const axios = require('axios');
const bodyParser = require("body-parser");
const mysql = require("mysql");
const fs = require('fs'); // Módulo para manipular arquivos
let connection;
const multer = require('multer');

// Configuração do Multer para lidar com o upload da imagem
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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

// Rota para cadastrar novo produto
app.post('/cadastrar_produto', upload.single('foto'), async function (req, res) {
    // Obtenha outros dados do formulário
    const { nome_produto, descricao, preco, quantidade, disponibilidade, empresa_id } = req.body;

    // Verifica se a imagem foi enviada no corpo da requisição
    if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'Imagem não encontrada na requisição.' });
    }

    const buffer = req.file.buffer; // Obter o buffer da imagem enviada

    try {
        // Realiza sua conexão com o banco de dados aqui
        const connection = conectiondb();

        // Query para inserir um novo produto na tabela 'produtos' com a foto em formato BLOB
        const insertProductQuery = `INSERT INTO produtos (nome_produto, descricao, preco, quantidade, disponibilidade, foto, empresa_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const insertProductParams = [nome_produto, descricao, preco, quantidade, disponibilidade, buffer, empresa_id];

        connection.query(insertProductQuery, insertProductParams, (error, results) => {
            if (error) {
                console.error('Erro ao cadastrar o produto:', error);
                res.status(500).send('Erro ao cadastrar o produto. Tente novamente mais tarde.');
            } else {
                const productId = results.insertId; // Obtendo o ID do produto recém-cadastrado

                // Inserir um novo registro na tabela 'empresa_produtos' associando o produto à empresa correspondente
                const insertEmpresaProdutoQuery = 'INSERT INTO empresa_produtos (empresa_id, produto_id) VALUES (?, ?)';
                const insertEmpresaProdutoParams = [empresa_id, productId]; // Usando o ID da empresa e do produto

                connection.query(insertEmpresaProdutoQuery, insertEmpresaProdutoParams, (err, result) => {
                    if (err) {
                        console.error('Erro ao associar produto à empresa:', err);
                        res.status(500).send('Erro ao associar produto à empresa. Tente novamente mais tarde.');
                    } else {
                        // Processamento após a associação bem-sucedida
                        // ...
                        res.json({ success: true }); // Responder com um JSON indicando o sucesso do cadastro
                    }
                });
            }
        });
    } catch (error) {
        console.error('Erro ao realizar a requisição:', error.message);
        res.status(500).send('Erro ao realizar a requisição. Tente novamente mais tarde.');
    }
});


//rotas cadastro produto FIM



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

app.get('/logout', function (req, res) {
    // Limpar a sessão ou executar qualquer lógica necessária para efetuar o logout
    req.session.destroy(function (err) {
        if (err) {
            console.error('Erro ao fazer logout:', err);
        } else {
            res.redirect('/'); // Redirecionar para a página inicial após o logout
        }
    });
});



// Rota para atualizar informações da empresa
app.post('/atualizar_empresa', async (req, res) => { // Adicionando a palavra-chave async aqui
    const { nomeEmpresa, cnpj, setor, senha, cep, numeroContato, numeroEndereco } = req.body;

    // Verificar se todos os campos obrigatórios estão preenchidos


    try {
        // Log para capturar o CEP utilizado na requisição
        console.log('CEP utilizado:', cep); update

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
                req.session.user = resultsUser[0].email;
                req.session.userId = resultsUser[0].id; // Armazena o ID do usuário na sessão

                // Obtenha a cidade do usuário após o login e armazene na sessão
                const cidadeDoUsuario = resultsUser[0].cidade;
                req.session.cidade = cidadeDoUsuario;

                // Consulta para obter o nome de usuário usando o ID do usuário
                const queryUsername = 'SELECT username FROM users WHERE id = ?';

                con.query(queryUsername, [req.session.userId], function (err, resultUsername) {
                    if (err) {
                        console.error('Erro ao consultar o nome de usuário:', err);
                        res.render('views/login', { message: 'Erro ao realizar login. Por favor, tente novamente.' });
                        return;
                    }

                    if (resultUsername.length > 0) {
                        // Armazena o nome de usuário na sessão
                        req.session.username = resultUsername[0].username;
                        console.log('Login do usuário com sucesso:', req.session.username);
                        res.redirect('/views/home');
                    } else {
                        console.error('Nome de usuário não encontrado!');
                        res.render('views/login', { message: 'Erro ao realizar login. Por favor, tente novamente.' });
                    }
                });
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
                        req.session.empresa_id = result[0].id; // Define o empresa_id na sessão
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



//rotas das páginas home || produtos || categorias

app.get('/views/home', function (req, res) {
    if (req.session.user) {
        console.log('Cidade do usuário:', req.session.cidade);

        var con = conectiondb();

        var query = `SELECT p.id, p.nome_produto, p.descricao, p.preco, p.quantidade, p.foto, e.nome_empresa
                     FROM produtos p
                     INNER JOIN empresa_produtos ep ON p.id = ep.produto_id
                     INNER JOIN empresas e ON e.id = ep.empresa_id
                     WHERE e.localidade = ? AND p.disponibilidade = 'disponível'
                     ORDER BY RAND()
                     LIMIT 10`;

        con.query(query, [req.session.cidade], function (err, results) {
            if (err) {
                console.error('Erro ao buscar produtos:', err);
                res.render('views/home', { produtos: [] });
                return;
            }

            // Convertendo os Buffers em Base64 (sem cabeçalho) antes de armazenar em 'produtos'
            const produtos = results.map(produto => {
                const product = { ...produto };
                if (Buffer.isBuffer(product.foto)) {
                    product.foto = product.foto.toString('base64');
                }
                return product;
            });

            // Obtendo apenas a primeira palavra do nome do usuário
            const userName = req.session.username ? req.session.username.split(' ')[0] : '';

            res.render('views/home', { produtos, userName }); // Enviando 'produtos' e 'userName' para o template
        });
    } else {
        res.redirect('/');
    }
});




// Rota para lidar com a pesquisa
app.get('/pesquisar/:termo', function (req, res) {
    if (req.session.user) {
        const searchTerm = req.params.termo.toLowerCase(); // Captura o termo de pesquisa da URL e converte para minúsculas

        const connection = conectiondb();

        // Consulta sql
        const query = `
            SELECT p.id, p.nome_produto, p.descricao, p.preco, p.quantidade, p.foto, e.nome_empresa
            FROM produtos p
            INNER JOIN empresas e ON p.empresa_id = e.id
            WHERE (LOWER(p.nome_produto) LIKE ? OR LOWER(p.descricao) LIKE ? OR LOWER(e.nome_empresa) LIKE ?)
            AND p.disponibilidade = 'disponível'`;

        const searchTermWithWildcards = `%${searchTerm}%`; // Adiciona coringas para pesquisar por termos parciais

        connection.query(query, [searchTermWithWildcards, searchTermWithWildcards, searchTermWithWildcards], (error, results) => {
            if (error) {
                console.error('Erro ao buscar produtos:', error);
                res.status(500).send('Erro ao buscar produtos. Tente novamente mais tarde.');
            } else {
                // convertendo base64
                const produtosEncontrados = results.map(produto => {
                    const product = { ...produto };
                    if (Buffer.isBuffer(product.foto)) {
                        product.foto = product.foto.toString('base64');
                    }
                    return product;
                });

                console.log('produtos encontrados pesquisa', produtosEncontrados)
                res.render('views/resultados-pesquisa', { produtosEncontrados }); 
            }
        });
    } else {
        res.redirect('/');
    }
});






// Rota para a página produtos
app.get('/produtos/:id', function (req, res) {
    if (req.session.user) {
        const produtoId = req.params.id; // ID do produto clicado na página home

        // Obtendo a cidade do usuário logado na sessão
        const cidadeDoUsuario = req.session.cidade;

        // Consulta para buscar a primeira palavra do produto com o ID específico
        const queryPrimeiraPalavra = `
            SELECT SUBSTRING_INDEX(nome_produto, ' ', 1) AS primeira_palavra
            FROM produtos
            WHERE id = ?`;

        const connection = conectiondb();
        connection.query(queryPrimeiraPalavra, produtoId, (error, results) => {
            if (error) {
                console.error('Erro ao buscar a primeira palavra do produto:', error);
                res.status(500).send('Erro ao buscar produtos semelhantes. Tente novamente mais tarde.');
            } else {
                const primeiraPalavra = results[0].primeira_palavra; // Primeira palavra do produto

                // Consulta para buscar produtos semelhantes à primeira palavra do produto de ID especificado
                const queryProdutosSemelhantes = `
                    SELECT p.nome_produto, p.preco, p.descricao, e.nome_empresa 
                    FROM produtos p
                    INNER JOIN empresa_produtos ep ON p.id = ep.produto_id
                    INNER JOIN empresas e ON e.id = ep.empresa_id
                    WHERE SUBSTRING_INDEX(p.nome_produto, ' ', 1) = ?
                    AND e.localidade = ?`;

                connection.query(queryProdutosSemelhantes, [primeiraPalavra, cidadeDoUsuario], (error, results) => {
                    if (error) {
                        console.error('Erro ao buscar produtos semelhantes:', error);
                        res.status(500).send('Erro ao buscar produtos semelhantes. Tente novamente mais tarde.');
                    } else {
                        const produtosSemelhantes = results; // Resultados da busca de produtos semelhantes

                        // Consulta para buscar informações do produto atual
                        const queryProdutoAtual = `
                            SELECT p.nome_produto, p.preco, p.descricao, e.nome_empresa 
                            FROM produtos p
                            INNER JOIN empresa_produtos ep ON p.id = ep.produto_id
                            INNER JOIN empresas e ON e.id = ep.empresa_id
                            WHERE p.id = ?
                            AND e.localidade = ?`;

                        connection.query(queryProdutoAtual, [produtoId, cidadeDoUsuario], (error, results) => {
                            if (error) {
                                console.error('Erro ao buscar informações do produto atual:', error);
                                res.status(500).send('Erro ao buscar informações do produto atual. Tente novamente mais tarde.');
                            } else {
                                const produtoAtual = results[0]; // Informações do produto atual

                                // console.log('Dados enviados para o template:', produtosSemelhantes);

                                res.render('views/produtos', { produtosSemelhantes });
                            }
                        });
                    }
                });
            }
        });
    } else {
        res.redirect('/');
    }
});




//produtos FIM

//categorias inicio

// Rota para a página de categorias com base na categoria selecionada
app.get('/categorias/:categoria', (req, res) => {
    if (req.session.user) {
        const categoriaSelecionada = req.params.categoria;
        const cidadeDoUsuario = req.session.cidade;

        const connection = conectiondb();

        // Consulta para buscar empresas do setor correspondente à categoria e na mesma cidade do usuário
        const queryEmpresas = `
            SELECT e.id AS empresa_id, e.nome_empresa, p.id AS produto_id, p.nome_produto, p.descricao, p.foto
            FROM empresas e
            INNER JOIN empresa_produtos ep ON e.id = ep.empresa_id
            INNER JOIN produtos p ON ep.produto_id = p.id
            WHERE e.setor = ? AND e.localidade = ?
        `;

        connection.query(queryEmpresas, [categoriaSelecionada, cidadeDoUsuario], (error, results) => {
            if (error) {
                console.error('Erro ao buscar produtos:', error);
                res.status(500).send('Erro ao buscar produtos. Tente novamente mais tarde.');
            } else {
                const produtosPorCategoria = results.map(produto => ({
                    id: produto.produto_id,
                    nome_produto: produto.nome_produto,
                    descricao: produto.descricao,
                    foto: produto.foto.toString('base64'), // Converta a foto para base64
                    nome_empresa: produto.nome_empresa
                }));
              //  console.log('Dados enviados para o template (categorias) :', produtosPorCategoria);
                res.render('views/categorias', { produtosPorCategoria });
            }
        });
    } else {
        res.redirect('/');
    }
});


//categorias fim




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




// tudo perfil user

// Rota para a página de perfil do usuário
app.get('/perfil', function (req, res) {
    if (req.session.user) {
        // Consulta para obter os dados do usuário logado
        const con = conectiondb();
        const query = 'SELECT * FROM users WHERE email LIKE ?';

        con.query(query, [req.session.user], function (err, results) {
            if (err) {
                console.error('Erro ao obter perfil do usuário:', err);
                res.status(500).send('Erro ao obter perfil do usuário. Tente novamente mais tarde.');
            } else {
                const profileData = results[0]; // Dados do perfil do usuário
                console.log('Dados do perfil do usuário:', results);
                res.render('views/perfil', { message: profileData }); // Renderiza a página de perfil do usuário
            }
        });
    } else {
        res.redirect('/');
    }
});

// Rota para atualizar informações do perfil do usuário
app.post('/update_profile', function (req, res) {
    if (req.session.user) {
        const { nome, idade, cidade, estado, senha } = req.body;

        // Verifica se todos os campos obrigatórios estão preenchidos

        // Realiza a conexão com o banco de dados
        const con = conectiondb();

        // Query para atualizar as informações do perfil do usuário na tabela 'users'
        const query = `UPDATE users
                        SET username = ?, idade = ?, cidade = ?, estado = ?, pass = ?
                        WHERE email = ?`;

        const queryParams = [nome, idade, cidade, estado, senha, req.session.user];

        con.query(query, queryParams, (error, results) => {
            if (error) {
                console.error('Erro ao atualizar informações do perfil do usuário:', error);
                res.status(500).send('Erro ao atualizar informações do perfil do usuário. Tente novamente mais tarde.');
            } else {
                res.redirect('/perfil'); // Redireciona após a atualização bem-sucedida
            }
        });
    } else {
        res.redirect('/');
    }
});

// Rota para excluir perfil do usuário
app.post('/delete_profile', function (req, res) {
    if (req.session.user) {
        const con = conectiondb();
        const query = 'DELETE FROM users WHERE email LIKE ?';
        con.query(query, [req.session.user], function (err, results) {
            if (err) {
                console.error('Erro ao excluir perfil do usuário:', err);
                res.status(500).send('Erro ao excluir perfil do usuário. Tente novamente mais tarde.');
            } else {
                req.session.destroy();
                res.redirect('/'); // Redireciona após a exclusão do perfil
            }
        });
    } else {
        res.redirect('/');
    }
});


// Fim tudo perfil user


//rotas página gerenciar produtos  

// Rota para exibir a página de gerenciamento de produtos
app.get('/gerenciar_produtos', function (req, res) {
    if (req.session.user) {
        const con = conectiondb();
        const queryEmpresa = 'SELECT nome_empresa FROM empresas WHERE id = ?'; // Consulta para obter o nome da empresa
        const queryProdutos = 'SELECT * FROM produtos WHERE empresa_id = ?'; // Consulta para buscar produtos por ID da empresa

        con.query(queryEmpresa, [req.session.empresa_id], function (errEmpresa, resultsEmpresa) {
            if (errEmpresa) {
                console.error('Erro ao obter nome da empresa:', errEmpresa);
                res.status(500).send('Erro ao obter nome da empresa. Tente novamente mais tarde.');
            } else {
                const nomeEmpresaLogada = resultsEmpresa[0].nome_empresa; // Nome da empresa obtido do banco de dados

                con.query(queryProdutos, [req.session.empresa_id], function (errProdutos, resultsProdutos) {
                    if (errProdutos) {
                        console.error('Erro ao obter produtos:', errProdutos);
                        res.status(500).send('Erro ao obter produtos. Tente novamente mais tarde.');
                    } else {
                        const products = resultsProdutos; // Dados dos produtos da empresa
                        res.render('views/gerenciar_produtos', { 
                            products: products,
                            nomeEmpresaLogada: nomeEmpresaLogada // Enviando o nome da empresa logada para o template
                        });
                    }
                });
            }
        });
    } else {
        res.redirect("/"); // Redirecionar se o usuário não estiver logado
    }
});


// Rota para editar um produto
app.post('/editar_produto', function (req, res) {
    if (req.session.user) {
        const { produtoId, nome_produto, descricao, preco, quantidade, disponibilidade } = req.body;

        try {
            // Certifique-se de que a conexão está estabelecida antes de usar connection.query
            const connection = conectiondb();

            // Query para atualizar os dados do produto na tabela 'produtos'
            const query = `UPDATE produtos 
                            SET nome_produto = ?, descricao = ?, preco = ?, quantidade = ?, disponibilidade = ?
                            WHERE id = ?`;
            const queryParams = [nome_produto, descricao, preco, quantidade, disponibilidade, produtoId];

            connection.query(query, queryParams, (error, results) => {
                if (error) {
                    console.error('Erro ao atualizar o produto:', error);
                    res.status(500).send('Erro ao atualizar o produto. Tente novamente mais tarde.');
                } else {
                    res.redirect('/gerenciar_produtos'); // Redirecionar após a atualização bem-sucedida
                }
            });

        } catch (error) {
            console.error('Erro ao editar o produto:', error.message);
            res.status(500).send('Erro ao editar o produto. Tente novamente mais tarde.');
        }
    } else {
        res.redirect("/"); // Redirecionar se o usuário não estiver logado
    }
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
            res.redirect('/gerenciar_produtos'); // Redirecionar após a exclusão bem-sucedida
        }
    });
});




//tudo de gerenciar produtos FIM


// Executa o servidor
app.listen(8081, () => console.log(`App listening on port 8081!`));