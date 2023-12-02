CREATE DATABASE caçaofertas;

use caçaofertas;

CREATE TABLE users(
	id INTEGER PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR (100) NOT NULL,
    email VARCHAR (100) NOT NULL,
    idade INTEGER NOT NULL,
    cidade VARCHAR(45),
    estado VARCHAR(45),
    pass INTEGER NOT NULL

CREATE TABLE IF NOT EXISTS empresas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_empresa VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) NOT NULL,
    setor VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    cep VARCHAR(9) NOT NULL,
    uf VARCHAR(2) NOT NULL,
    cidade VARCHAR(255) NOT NULL,
    tipo_cep VARCHAR(50),
    subtipo_cep VARCHAR(10),
    bairro VARCHAR(255),
    endereco VARCHAR(255),
    complemento VARCHAR(255),
    codigo_ibge VARCHAR(50),
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

);
