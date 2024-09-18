const {Pool} = require("pg");
const dotenv = require("dotenv");
dotenv.config();

const connect = new Pool({
    user: process.env.USERPG,
    password: process.env.PASSPG,
    host: process.env.HOSTPG,
    port: process.env.PORTPG,
    database: process.env.DATAPG
});

const dbprin = new Pool({
    user: process.env.USERPG,
    user: process.env.USERPG,
    password: process.env.PASSPG,
    host: process.env.HOSTPG,
    port: process.env.PORTPG,
    database: 'assistantswsp'
})

module.exports = {
    connect, 
    dbprin
}