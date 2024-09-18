const sql = require("../sql");

async function GetConfig() {
    const config = await sql.GetConfig();
    return config;
}

async function GetProducts(values) {
    const response = await sql.GetProductsInfo(values.nombre);
    if(response.estado === 'error'){
        return response;
    }
}

async function GetDay(){
    const currentday = new Date();
    const nombresDiasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const day = currentday.getDate();
    const month = (currentday.getMonth()+1);
    const year = currentday.getFullYear();
    const date = `${day}/${month}/${year}`;
    const diaSemana = nombresDiasSemana[currentday.getDay(date)];
    const dateassistant = `${diaSemana}, ${day}/${month}/${year}`
    return dateassistant;
}

async function UpdateDetPedido(values) {
    const valores = [values.pedidoid, values.productoid, values.cantidad, values.precio];
    const detalpedid = await sql.UpdateDetallePed(valores);
    return detalpedid;
}

async function InsertDetPedido(values) {
    const detalpedid = await sql.InsertDetallePed(values);
    return detalpedid;
}

async function GetPedido(values, number) {
    const usuario = await sql.GetUser(number);
    const pedidoid = await sql.GetPedidoId(usuario.user_id);
    if (pedidoid.estado === 'error') {
        const valped = [usuario.user_id, values.fecha, 0, 'pendiente'];
        const pedidoid = await sql.CreatePedUser(valped);
        return pedidoid;
    }
    return pedidoid;
}

async function GetProdDetal(values) {
    const proddetal = await sql.GetProDetal(values);
    return proddetal;
}

async function GetInfoEnvio(values) {
    const costoenvio = await sql.GetCostoEnvio(values.ciudad, values.idpedido);
    return costoenvio;
}

async function ConfirmPedido(idpedido) {
    const confpedido = await sql.ConfirmPedido(idpedido);
    return confpedido;
}


module.exports = {
    GetConfig,
    GetProducts,
    GetDay,
    GetInfoEnvio,
    ConfirmPedido,
    GetPedido,
    InsertDetPedido,
    UpdateDetPedido,
    GetProdDetal
}