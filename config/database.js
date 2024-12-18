const mysql = require("mysql2/promise");
require("dotenv").config();

const db = mysql.createPool({
  host: process.env.MYSQL_HOST, // e.g., 'localhost'
  user: process.env.MYSQL_USER, // MySQL username
  password: process.env.MYSQL_PASSWORD, // MySQL password
  database: process.env.MYSQL_DATABASE, // Database name
});

module.exports = db;
