const Sequelize = require("sequelize");
const dbConfig = require("../config/dbConfig.json");


const sequelize = new Sequelize(
  dbConfig.devlopment.database,
  dbConfig.devlopment.username,
  dbConfig.devlopment.password,
  {
    host: dbConfig.devlopment.host,
    dialect: 'mysql',
    logging: false,
    // operatorsAliases: false,
    retry :{
      max:4
    },
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      connectTimeout: 60000,
    },
  },

);

sequelize.authenticate().then(() => {
  console.log('Connection has been established successfully.');
}).catch((error) => {
  console.error('Unable to connect to the database: ', error);
});

module.exports = sequelize;
