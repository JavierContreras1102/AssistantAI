const {OpenAI} = require ("openai");
const dotenv = require("dotenv");
const functions = require("../database/functions/functions");
dotenv.config();

async function openai() {
    infoconfig = await functions.GetConfig();
    const open = new OpenAI({
    apiKey: infoconfig.apikey,
    project: infoconfig.project,
    organization: infoconfig.organig
    });
    return open;
} 

async function GetThreadAssistant(){
    const myThread = await openai.beta.threads.create();
    const thread = myThread.id;
    return thread;
}

async function GetMessageAssistant(message, assistant, thread, number) {
    await openai.beta.threads.messages.create(
        thread,
        {
            role: "user",
            content: message
        }
    );

    const run = await openai.beta.threads.runs.create(
        thread,
        { 
            assistant_id: assistant,
        }
    );
    
    while (run.status === 'queued') {
        const runs = await VerifyStatusRun(thread, run.id);
        if (runs.status === 'completed') {
            return await ListMessage(thread);
        }else if (runs.status === 'requires_action') {
            await RequireAction(thread, assistant, runs, number);
        }
    }
}

async function RequireAction(thread, runs, number) {
    const callid = runs.required_action.submit_tool_outputs.tool_calls[0].id;
    const functname = runs.required_action.submit_tool_outputs.tool_calls[0].function.name;
    const funcvalues = JSON.parse(runs.required_action.submit_tool_outputs.tool_calls[0].function.arguments);
    switch (functname) {
        case 'GetProducts':
            const products = await functions.GetProducts(funcvalues);
            await SubtmitToolOut(thread, runs.id, callid, products);
            break;
        case 'GetDay':
            const currentday = await functions.GetDay();
            await SubtmitToolOut(thread, runs.id, callid, currentday);
            break;
        case 'UpdateDetPedido':
            const detpedidoid = await functions.UpdateDetPedido(number);
            await SubtmitToolOut(thread, runs.id, callid, detpedidoid);
            break;
        case 'ConfirmPedido':
            const confirmpedido = await functions.ConfirmPedido(funcvalues);
            await SubtmitToolOut(thread, runs.id, callid, confirmpedido);
            break;
        case 'GetPedido':
            const pedidoid = await functions.GetPedido(funcvalues, number);
            await SubtmitToolOut(thread, runs.id, callid, pedidoid);
            break;
        case 'InsertDetPedido':
            const instdetpedido = await functions.InsertDetPedido(funcvalues);
            await SubtmitToolOut(thread, runs.id, callid, instdetpedido);
            break;
        case 'GetProdDetal':
            const producdetal = await functions.GetProdDetal(funcvalues);
            await SubtmitToolOut(thread, runs.id, callid, producdetal);
            break;
        case 'GetInfoEnvio':
            const infoenvio = await functions.GetInfoEnvio(funcvalues);
            await SubtmitToolOut(thread, runs.id, callid, infoenvio);
            break;
        default:
            break;
    }
}

async function ListMessage(thread) {
    const response = await openai.beta.threads.messages.list(thread);
    const respuesta = response.data[0].content[0].text.value;
    return respuesta;
}

async function VerifyStatusRun(thread, runid) {
    const runs = await openai.beta.threads.runs.retrieve(
        thread,
        runid
    );
    return runs;
}

async function SubtmitToolOut(thread, runid, callid, out) {
    const response = JSON.stringify(out);
    await openai.beta.threads.runs.submitToolOutputs(
        thread,
        runid,
        {
            tool_outputs: [{
                tool_call_id: callid,
                output: response
            }]
        }
    );
}

module.exports = {
    GetThreadAssistant,
    GetMessageAssistant
}