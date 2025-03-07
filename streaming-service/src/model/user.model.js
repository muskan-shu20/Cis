const sequelize = require('./index')
const { Sequelize, DataTypes } = require('sequelize')

const User = sequelize.define("newusers", {
    userId:{
        type : DataTypes.INTEGER,
        autoIncrement : true,
        primaryKey : true
    },
    firstName : {
        type : DataTypes.STRING
    },
    lastName : {
        type : DataTypes.STRING
    },
    twitchUsername : {
         type: DataTypes.STRING
    },
    twitchId: {
        type: DataTypes.STRING
    },
    twitchAccessToken :{ 
        type: DataTypes.STRING
    },
    twitchImage :{
        type: DataTypes.STRING
    },
    email: {
        type: DataTypes.STRING
    },
    password: {
        type: DataTypes.STRING
    },
    gender : {
       type : DataTypes.STRING
    }, 
    profileImage:{
        type:DataTypes.STRING
    },
    isLive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
},
{
    freezeTableName: true,
    paranoid:true
})


User.sync({alter:true})    
module.exports = User
