var mysql      = require('mysql2');
const config = require('./config/dbConfig.json')

var connection = mysql.createConnection({
    host     : config.devlopment.host,
    user     : config.devlopment.user,
    password : config.devlopment.password,
    database : config.devlopment.database
});

connection.connect(function(err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }
    console.log("db connected");
});

module.exports = connection;