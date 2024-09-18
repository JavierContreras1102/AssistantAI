const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const openai = require("../assistant/assistantOpenAI");
const sql = require("../database/sql");

//Qr
async function CreateClient(){
    try {
        const clientsData = await sql.GetClients();
        console.log(clientsData);
        for (const clientData of clientsData) {
            console.log(clientData.ses_number);
            const session = clientData.ses_number;
            const client = new Client({
                webVersion: '2.2409.2',
                webVersionCache: {
                    type: 'remote',
                    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2409.2.html'
                },
                authStrategy: new LocalAuth({
                    dataPath: 'SESSION WHATSAPP',
                    clientId: session
                })
            });
            client.on('qr', (qr) => {
                console.log(`Configuracion de Sesion para`,session);
                qrcode.generate(qr, { small: true });
            });
            // Asegúrate de inicializar cada cliente
            client.on('ready', () => {
                console.log(`Client ${clientData.ses_number} is ready!`);
            });
            client.initialize();
            ConversationClient(client)
        }
    } catch (error) {
        console.error("Error creating clients:", error);
    }
}

function ConversationClient(client) {
    client.on('message', async (message) => {
        if (message.body != null && message.type == 'chat') {
            const numberuser = await MessageFrom(message.from);
            const messageto = await MessageTo(message.to);
            const messageuser = message.body;
            const assistantid = await sql.GetAssistant();
            const user = await sql.GetUser(numberuser);
            const threadid = user.user_thread;
            const responseAi = await openai.GetMessageAssistant(messageuser, assistantid, threadid, numberuser);
            await client.sendMessage(message.from, responseAi);
        }
    });
}

function MessageTo(messageto){
    const indiceArroba = messageto.indexOf('@');
    if (indiceArroba === -1) {
        return messageto;
    }
    return messageto.substring(0, indiceArroba);
}

function MessageFrom(messagefrom){
    const indiceArroba = messagefrom.indexOf('@');
    if (indiceArroba === -1) {
        return messagefrom;
    }
    return messagefrom.substring(0, indiceArroba);
}

module.exports = {
    CreateClient,
}