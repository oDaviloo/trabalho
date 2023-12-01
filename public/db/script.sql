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

);
