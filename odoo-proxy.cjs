// odoo-proxy.cjs
// Ejecutar con: node odoo-proxy.cjs

const express = require("express");
const xmlrpc  = require("xmlrpc");
const cors    = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ─── HELPER: crear cliente XML-RPC ───────────────────────────
function crearCliente(url, path) {
  const u       = new URL(url);
  const isHttps = u.protocol === "https:";
  const host    = u.hostname;
  const port    = u.port ? parseInt(u.port) : isHttps ? 443 : 80;
  const cfg     = { host, port, path };
  return isHttps ? xmlrpc.createSecureClient(cfg) : xmlrpc.createClient(cfg);
}

function llamar(client, method, params) {
  return new Promise((resolve, reject) =>
    client.methodCall(method, params, (err, val) => err ? reject(err) : resolve(val))
  );
}

// ─── AUTENTICAR ───────────────────────────────────────────────
async function autenticar(url, db, username, password) {
  const client = crearCliente(url, "/xmlrpc/2/common");
  const uid    = await llamar(client, "authenticate", [db, username, password, {}]);
  if (!uid) throw new Error("Usuario o contraseña incorrectos");
  return uid;
}

// ─── PROBAR CONEXIÓN ──────────────────────────────────────────
app.post("/api/odoo/test", async (req, res) => {
  const { url, db, username, password } = req.body;
  try {
    const common  = crearCliente(url, "/xmlrpc/2/common");
    const version = await llamar(common, "version", []);
    const uid     = await autenticar(url, db, username, password);
    res.json({ ok: true, uid, server_version: version.server_version });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ─── LLAMADA GENÉRICA (reemplaza odooCall) ────────────────────
app.post("/api/odoo/rpc", async (req, res) => {
  const { url, db, username, password, service, method, args } = req.body;
  try {
    const uid    = await autenticar(url, db, username, password);
    const client = crearCliente(url, "/xmlrpc/2/object");

    // args = [db, uid, password, model, modelMethod, domain, options]
    const model       = args[3];
    const modelMethod = args[4];
    const domain      = args[5] || [];
    const options     = args[6] || {};

    const result = await llamar(client, "execute_kw", [
      db, uid, password,
      model, modelMethod,
      domain,
      options
    ]);
    res.json({ ok: true, result });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ─── SINCRONIZAR TODOS LOS MÓDULOS ───────────────────────────
app.post("/api/odoo/sync", async (req, res) => {
  const { url, db, username, password } = req.body;
  try {
    const uid    = await autenticar(url, db, username, password);
    const client = crearCliente(url, "/xmlrpc/2/object");

    const call = (model, method, domain, options) =>
      llamar(client, "execute_kw", [db, uid, password, model, method, domain, options]);

    const [productos, inventario, pedidos, facturas, clientes] = await Promise.all([
      call("product.template", "search_read", [[]], { fields: ["id","name","list_price","qty_available"], limit: 10 }),
      call("stock.move.line",  "search_read", [[]], { fields: ["id","product_id","quantity"], limit: 10 }),
      call("sale.order",       "search_read", [[]], { fields: ["id","name","amount_total","state"], limit: 10 }),
      call("account.move",     "search_read", [[]], { fields: ["id","name","amount_total","state"], limit: 10 }),
      call("res.partner",      "search_read", [[]], { fields: ["id","name","email"], limit: 10 }),
    ]);

    res.json({ ok: true, uid, data: { productos, inventario, pedidos, facturas, clientes } });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ─── INICIAR ──────────────────────────────────────────────────
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ Proxy Odoo corriendo en http://localhost:${PORT}`);
  console.log(`   POST /api/odoo/test  — probar conexión`);
  console.log(`   POST /api/odoo/rpc   — llamadas generales`);
  console.log(`   POST /api/odoo/sync  — sincronizar módulos`);
});
