const express = require("express");
const wspcontrol = require("./controller/whatsapp/wspControl");
const dotenv = require("dotenv");
dotenv.config();

//App
const app = express();

//Server
const port = process.env.PORTSV;
app.set("port", port);
const portsrv = app.get("port");
app.listen(portsrv || 4000);
console.log("Servidor funcionando en puerto:", portsrv);

//Iniciar Whatsapp
async function main() {
    await wspcontrol.CreateClient();
}

main();
