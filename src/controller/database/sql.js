const connect = require("./connect");
const assistant = require("../assistant/assistantOpenAI");
const dotenv = require("dotenv");
dotenv.config();

async function GetConfig() {
    const sql = `SELECT * FROM configuraciones`;
    const result = await connect.connect.query(sql);
    const configinfo = result.rows[0];
    return {
        apikey: configinfo.config_apikey,
        organization: configinfo.config_orgaid,
        project: configinfo.config_projid
    }
}

async function GetClients() {
    const sql = `SELECT ses_number FROM sessions`;
    const response = await connect.dbprin.query(sql);
    const clientsIds = response.rows;
    return clientsIds;
}

async function GetUser(number) {
    try {
        const userExists = await FindUser(number);
        if (userExists) {
            const sql = `SELECT * FROM usuarios WHERE usu_number = $1`;
            const values = [number];
            const response = await connect.connect.query(sql, values);
            const userInfo = response.rows[0];
            return userInfo;
        } else {
            const insertSuccess = await InsertUser(number);
            if (insertSuccess) {
                const userInfo = await GetUser(number);
                return userInfo;
            }
        }
    } catch (error) {
        console.error("Error al ejecutar la consulta:", error);
        throw error;
    }
}

async function GetAssistant(){
    const sql = `SELECT * FROM configuraciones`;
    const result = await connect.connect.query(sql);
    const assistantInfo = result.rows[0].config_assist;
    return assistantInfo;
}

async function FindUser(number) {
    const sql = `SELECT EXISTS (SELECT user_number FROM usuarios WHERE user_number = $1)`;
    const values = [number];
    const response = await connect.connect.query(sql, values);
    const userExists = response.rows[0].exists;
    return userExists;
}

async function InsertUser(number) {
    const threadid = await assistant.GetThreadAssistant();
    const sql = `INSERT INTO usuarios (user_number, user_thread) VALUES ($1, $2)`;
    const values = [number, threadid];
    const response = await connect.connect.query(sql, values);
    return response.rowCount > 0;
}

async function GetProductsInfo(nomprod) {
    try{
        const producto = `%${(nomprod).toLowerCase()}%`;
        const sql = `SELECT * FROM productos WHERE pro_nombre LIKE $1`;
        const result = await connect.connect.query(sql, [producto]);
        if (result.rows.length > 0) {
            const allproduts = [];
            for (let product of result.rows){
                const colorresult = await GetColorProd(product.pro_id);
                const colorprod = colorresult.map(row => row.det_prodcolor);
                const response = {
                    pro_id: product.pro_id,
                    pro_codigo: product.pro_codigo,
                    pro_nombre: product.pro_nombre,
                    pro_talla: product.pro_talla,
                    pro_colores: colorprod
                }
                allproduts.push(response);
            }
            return {
                estado: 'ok',
                mensaje: 'los siguientes son los productos encontrados con las coincidencia de busqueda',
                productos: allproduts,
                error: null
            };
        }else {
            return {
                estado: 'error',
                mensaje: 'Producto no encontrado, verifique el nombre del producto',
                productos: null,
                error: null
            };
        }
    } catch (error) {
        return {
            estado: 'error',
            mensaje: 'Error interno de la base de datos',
            productos: null,
            error: error
        };
    }
}

async function CreatePedUser(values) {
    try {
        const sql = `INSERT INTO pedidos (ped_usuid, ped_fecha, ped_monto, ped_estado) VALUES ($1, $2, $3, $4) RETURNING pedido_id`;
        const result = await connect.connect.query(sql, values);
        return {
            estado: 'ok',
            mensaje: 'Se ha creado un nuevo pedido para el cliente',
            pedidoid: result.rows[0].pedido_id,
            error: null
        }
    } catch (error) {
        return {
            estado: 'error',
            mensaje: 'No se pudo crear el pedido',
            pedidoid: null,
            error: error
        }
    }
}

async function GetPedidoId(usuarioid) {
    try {
        const sql = `SELECT * FROM pedidos where ped_usuid = $1 and ped_estado = $2`;
        const values = [usuarioid, 'pendiente'];
        const result = await connect.connect.query(sql, values);
        if (result.rows.length > 0) {
            return {
                estado: 'ok',
                mensaje: 'Se ha encontrado el siguiente id de pedido',
                pedido: result.rows[0].pedido_id,
                error: null
            }
        } else {
            return {
                estado: 'error',
                mensaje: 'No se ha encontrado pedido pendiente para el cliente',
                pedido: null,
                error: null
            }
        }
    } catch (error) {
        return {
            estado: 'error',
            mensaje: 'No se pudo obtener el id el pedido',
            pedido: null,
            error: error
        };
    }
}

async function InsertDetallePed(values) {
    try {
        const detalles = [values.pedidoid, values.productoid, values.cantidad, values.precio, values.detprodid, values.talla];
        const sql = `INSERT INTO detalles_pedido (det_pedid, det_proid, det_cantidad, det_precio, det_prodid, det_talla) VALUES ($1, $2, $3, $4, $5, $6) RETURNING detped_id`;
        const result = await connect.connect.query(sql, detalles);
        if (result.rows.length > 0) {
            return {
                estado: 'ok',
                mensaje: 'El producto se ha agregado correctamente al pedido',
                detallepedido: result.rows[0].detped_id,
                error: null
            };
        }
        return {
            estado: 'error',
            mensaje: 'No se ha podido agregar el producto al pedido',
            detallepedido: null,
            error: null
        };
    } catch (error) {
        return {
            estado: 'error',
            mensaje: 'Error al insertar producto en la base de datos',
            detallepedido: null,
            error: error
        };
    }
}

async function UpdateDetallePed(values) {
    try {
        const sql = `UPDATE detalles_pedido SET det_cantidad = $3, det_precio = $4 WHERE det_pedid = $1 AND det_proid = $2 RETURNING detped_id`;
        const result = await connect.connect.query(sql, values);
        if (result.rows.length > 0) {
            return {
                estado: 'ok',
                mensaje: 'El producto se ha modificado correctamente al pedido',
                detallepedido: result.rows[0].detped_id,
                error: null
            };
        }
        return {
            estado: 'error',
            mensaje: 'No se ha podido modificar el producto al pedido',
            detallepedido: null,
            error: null
        };
    } catch (error) {
        return {
            estado: 'error',
            mensaje: 'Error al modificar producto en la base de datos',
            detallepedido: null,
            error: error
        };
    }
}

async function GetProDetal(values) {
    try {
        const sql = `SELECT * FROM productos WHERE pro_id = $1`;
        const result = await connect.connect.query(sql, [values.idproducto]);
        if (result.rows.length > 0) {
            const color = `${(values.color).toLowerCase()}`;
            const puntera = `${(values.puntera).toLowerCase()}`;
            const sql = `SELECT * FROM detalle_productos WHERE det_proid = $1 AND det_prodcolor = $2 AND det_prodpunt = $3`;
            const response = await connect.connect.query(sql, [values.idproducto, color, puntera]);
            const detalprod = {
                pro_id_gen: result.rows[0].pro_id,
                pro_codigo: result.rows[0].pro_codigo,
                pro_nombre: result.rows[0].pro_nombre,
                pro_talla: values[1],
                pro_color: response.rows[0].det_prodcolor,
                pro_puntera: response.rows[0].det_prodpunt,
                pro_precio: response.rows[0].det_prodprec,
                det_prodid: response.rows[0].det_id
            }
            return {
                estado: 'ok',
                mensaje: 'Los siguientes son los datos detallados del producto',
                productos: detalprod,
                error: null
            };
        } else {
            return {
                estado: 'error',
                mensaje: 'Producto no encontrado, verifique el los parametros de busqueda detallados del producto',
                productos: null,
                error: null
            };
        }
    } catch (error) {
        return { 
            estado: 'error', 
            mensaje: 'Error interno de la base de datos',
            productos: null,
            error: error 
        };
    }
}

async function GetCostoEnvio(ciudades, idpedido) {
    try {
        const ciudad = `${ciudades.toLowerCase()}`;
        const sqlSelect = `SELECT * FROM costos_envio WHERE env_ciudad = $1`;
        const result = await connect.connect.query(sqlSelect, [ciudad]);
        if (result.rows.length > 0) {
            const idped = Number(idpedido);
            const sqlUpdate = `UPDATE pedidos SET ped_envioid = $1 WHERE pedido_id = $2 RETURNING pedido_id`;
            const update = await connect.connect.query(sqlUpdate, [result.rows[0].env_id, idped]);
            return {
                estado: `ok`,
                respuesta: `El costo de envio para la ciudad de ${ciudad} es de $${result.rows[0].env_costo}`,
                aviso: `Se ha agregado el costo de envio por valor de $${result.rows[0].env_costo}, al pedido ${update.rows[0].pedido_id}`,
                error: null
            };
        } else {
            return {
                estado: `error`,
                respuesta: `No se ha encontrado coincidencia con la busqueda de ciudad`,
                aviso: null,
                error: null
            };
        }
    } catch (error) {
        return { 
            estado: `error`, 
            respuesta: `Error interno de la base de datos`, 
            aviso: null,
            error: error 
        };
    }
}

async function ConfirmPedido(idpedido) {
    try {
        const detped = await GetDetPedido(idpedido);
        const productos = await GetProductos(detped.rows[0].det_proid);
        const montoprod = await MontoProductos(idpedido);
        const costoenvio = await GetCostoEnv(idpedido);
        const montototal = (Number(montoprod.rows[0].monto_total) + Number(costoenvio.rows[0].env_costo));
        const cuerpomensaje = [];
        for (let i = 0; i < detalpedido.rows.length; i++) {
            const detprod = `SELECT * FROM detalle_productos where det_id = $1`;
            const detalproduc = await connect.connect.query(detprod, [detalpedido.rows[i].det_prodid]);
            const puntera = detalproduc.rows[0].det_prodpunt;
            const plantilla = `- ${detalpedido.rows[i].det_cantidad} Par(es) de ${productos.rows[0].pro_nombre}
            - Talla ${detalpedido.rows[i].det_talla}
            - ${puntera.charAt(0).toUpperCase() + puntera.slice(1)} puntera
            - Color ${detalproduc.rows[0].det_prodcolor}
            - Valor: $${detalpedido.rows[i].det_precio}
            `;
            cuerpomensaje.push(plantilla);
        }
        const mensaje = `Nos complace confirmar que Hemos recibido tu pedido:

                ${cuerpomensaje}
            Valor de envio: $${costoenvio.rows[0].env_costo}

            Pago Contraentrega por un valor de :$${montototal}
            
            Para procesar tu pedido de forma adecuada y garantizar una entrega sin contratiempos, necesitamos que nos proporciones la siguiente información para los datos de facturación y envio:
            
            - Nombre completo:
            - Número de cédula o NIT:
            - Correo electrónico:
            - Número de celular:
            - Dirección de envío completa:
            - Municipio:`;
        return {
            estado: 'ok',
            mensaje: 'Enviar al cliente la siguiente respuesta',
            respuesta: mensaje,
            error: null
        };
    } catch (error) {
        return {
            estado: 'error',
            mensaje: 'No se pudo establecer correctamente el pedido del cliente para confirmar',
            respuesta: null,
            error: error
        }
    }
}

async function GetColorProd(proid) {
    const sql = `SELECT det_prodcolor FROM detalle_productos where det_proid = $1`;
    const values = [proid];
    const result = await connect.connect.query(sql, values);
    return result.rows;
}

async function GetDetPedido(idpedido) {
    const detped = `SELECT * FROM detalles_pedido where det_pedid = $1`;
    const detalpedido = await connect.connect.query(detped, [idpedido]);
    return detalpedido;
}

async function GetProductos(detproid) {
    const prod = `SELECT * FROM productos where pro_id = $1`;
    const productos = await connect.connect.query(prod, [detproid]);
    return productos;
}

async function MontoProductos(idpedido) {
    const monto = `SELECT SUM(det_precio) AS monto_total FROM detalles_pedido WHERE det_pedid = $1`;
    const montoprod = await connect.connect.query(monto, [idpedido]);
    return montoprod;
}

async function GetCostoEnv(idpedido) {
    const ped = `SELECT ped_envioid FROM pedidos where pedido_id = $1`;
    const pedidoenvio = await connect.connect.query(ped, [idpedido]);
    const cost = `SELECT * FROM costos_envio WHERE env_id = $1`;
    const costoenvio = await connect.connect.query(cost, [pedidoenvio.rows[0].ped_envioid]);
    return costoenvio;
}

module.exports = {
    GetClients,
    GetUser,
    GetAssistant,
    GetConfig,
    GetProductsInfo,
    CreatePedUser,
    GetPedidoId,
    InsertDetallePed,
    UpdateDetallePed,
    GetProDetal,
    GetCostoEnvio,
    ConfirmPedido
}