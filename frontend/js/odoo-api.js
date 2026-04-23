/* ===================================================
   IMPORTAX — odoo-api.js
   Conector completo con Odoo 17 via JSON-RPC
   Base de datos: importadorax
   URL: http://localhost:8069
=================================================== */

const ODOO_CONFIG = {
  url:      'https://importax.odoo.com',
  db:       'importax',
  username: 'lourdesadriana15n@gmail.com',
  password: 'importadorax'
};

// ─────────────────────────────────────────────────
// NÚCLEO: llamada JSON-RPC a Odoo
// ─────────────────────────────────────────────────
async function odooCall(service, method, args) {
const response = await fetch(`https://odoo-proxy-production-c0bc.up.railway.app/api/odoo/rpc`, {
      method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url:      ODOO_CONFIG.url,
      db:       ODOO_CONFIG.db,
      username: ODOO_CONFIG.username,
      password: ODOO_CONFIG.password,
      service,
      method,
      args
    })
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.error);
  return data.result;
}

// ─────────────────────────────────────────────────
// AUTENTICACIÓN
// ─────────────────────────────────────────────────
const OdooAuth = {
  uid: null,

  async login() {
    const response = await fetch(`https://odoo-proxy-production-c0bc.up.railway.app/api/odoo/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url:      ODOO_CONFIG.url,
        db:       ODOO_CONFIG.db,
        username: ODOO_CONFIG.username,
        password: ODOO_CONFIG.password
      })
    });
    const data = await response.json();
    if (data.ok) {
      this.uid = data.uid;
      return true;
    }
    return false;
  },

  async probarConexion() {
    try {
      const ok = await this.login();
      return { success: ok, mensaje: ok ? '✅ Conexión exitosa con Odoo' : '❌ Credenciales incorrectas' };
    } catch (e) {
      return { success: false, mensaje: '❌ No se puede conectar: ' + e.message };
    }
  }
};

// ─────────────────────────────────────────────────
// PRODUCTOS
// ─────────────────────────────────────────────────
const OdooProductos = {

  async obtenerTodos(limite = 80) {
    await OdooAuth.login();
    return await odooCall('object', 'execute_kw', [
      ODOO_CONFIG.db, OdooAuth.uid, ODOO_CONFIG.password,
      'product.template', 'search_read',
      [[['sale_ok', '=', true], ['active', '=', true]]],
      {
        fields: ['id', 'name', 'list_price', 'standard_price', 'qty_available',
                 'categ_id', 'description_sale', 'image_1920', 'default_code'],
        limit: limite
      }
    ]);
  },

  async obtenerPorCategoria(categoria) {
    await OdooAuth.login();
    return await odooCall('object', 'execute_kw', [
      ODOO_CONFIG.db, OdooAuth.uid, ODOO_CONFIG.password,
      'product.template', 'search_read',
      [[['categ_id.name', 'ilike', categoria], ['sale_ok', '=', true]]],
      { fields: ['id', 'name', 'list_price', 'qty_available', 'categ_id', 'image_1920'], limit: 40 }
    ]);
  },

  async obtenerPorId(id) {
    await OdooAuth.login();
    const result = await odooCall('object', 'execute_kw', [
      ODOO_CONFIG.db, OdooAuth.uid, ODOO_CONFIG.password,
      'product.template', 'search_read',
      [[['id', '=', id]]],
      { fields: ['id', 'name', 'list_price', 'qty_available', 'description_sale', 'image_1920', 'categ_id'] }
    ]);
    return result[0] || null;
  },

  async crear(datos) {
    await OdooAuth.login();
    return await odooCall('object', 'execute_kw', [
      ODOO_CONFIG.db, OdooAuth.uid, ODOO_CONFIG.password,
      'product.template', 'create',
      [{
        name:             datos.nombre,
        list_price:       datos.precio,
        standard_price:   datos.precioOriginal || datos.precio,
        qty_available:    datos.stock || 0,
        description_sale: datos.descripcion || '',
        default_code:     datos.sku || '',
        sale_ok:          true,
        purchase_ok:      true,
        type:             'product'
      }]
    ]);
  },

  async actualizarStock(productoId, cantidad) {
    await OdooAuth.login();
    // Buscar la ubicación de inventario principal
    const ubicaciones = await odooCall('object', 'execute_kw', [
      ODOO_CONFIG.db, OdooAuth.uid, ODOO_CONFIG.password,
      'stock.location', 'search_read',
      [[['usage', '=', 'internal'], ['active', '=', true]]],
      { fields: ['id', 'name'], limit: 1 }
    ]);
    if (!ubicaciones.length) throw new Error('No se encontró ubicación de inventario');

    const producto = await odooCall('object', 'execute_kw', [
      ODOO_CONFIG.db, OdooAuth.uid, ODOO_CONFIG.password,
      'product.product', 'search_read',
      [[['product_tmpl_id', '=', productoId]]],
      { fields: ['id'], limit: 1 }
    ]);

    return await odooCall('object', 'execute_kw', [
      ODOO_CONFIG.db, OdooAuth.uid, ODOO_CONFIG.password,
      'stock.quant', 'create',
      [{
        product_id:  producto[0].id,
        location_id: ubicaciones[0].id,
        quantity:    cantidad
      }]
    ]);
  }
};

// ─────────────────────────────────────────────────
// VENTAS / PEDIDOS
// ─────────────────────────────────────────────────
const OdooVentas = {

  async obtenerTodos() {
    await OdooAuth.login();
    return await odooCall('object', 'execute_kw', [
      ODOO_CONFIG.db, OdooAuth.uid, ODOO_CONFIG.password,
      'sale.order', 'search_read',
      [[['state', 'in', ['draft', 'sent', 'sale', 'done']]]],
      {
        fields: ['id', 'name', 'partner_id', 'amount_total', 'state', 'date_order', 'order_line'],
        limit: 50,
        order: 'date_order desc'
      }
    ]);
  },

  async crearDesdeCarrito(carrito, clienteId) {
    await OdooAuth.login();

    // Buscar productos en Odoo por nombre para obtener product_id
    const lineas = [];
    for (const item of carrito) {
      const productos = await odooCall('object', 'execute_kw', [
        ODOO_CONFIG.db, OdooAuth.uid, ODOO_CONFIG.password,
        'product.product', 'search_read',
        [[['product_tmpl_id', '=', item.id]]],
        { fields: ['id'], limit: 1 }
      ]);
      if (productos.length) {
        lineas.push([0, 0, {
          product_id:    productos[0].id,
          product_uom_qty: item.cantidad,
          price_unit:    item.precio
        }]);
      }
    }

    return await odooCall('object', 'execute_kw', [
      ODOO_CONFIG.db, OdooAuth.uid, ODOO_CONFIG.password,
      'sale.order', 'create',
      [{
        partner_id: clienteId || 3, // 3 = cliente público por defecto
        order_line: lineas
      }]
    ]);
  },

  async cambiarEstado(ordenId, estado) {
    await OdooAuth.login();
    const metodo = {
      'confirmada': 'action_confirm',
      'cancelada':  'action_cancel',
      'borrador':   'action_draft'
    }[estado] || 'action_confirm';

    return await odooCall('object', 'execute_kw', [
      ODOO_CONFIG.db, OdooAuth.uid, ODOO_CONFIG.password,
      'sale.order', metodo,
      [[ordenId]]
    ]);
  },

  async obtenerResumenFinanciero() {
    await OdooAuth.login();
    const ordenes = await odooCall('object', 'execute_kw', [
      ODOO_CONFIG.db, OdooAuth.uid, ODOO_CONFIG.password,
      'sale.order', 'search_read',
      [[['state', '=', 'sale']]],
      { fields: ['amount_total'], limit: 1000 }
    ]);
    const bruto = ordenes.reduce((sum, o) => sum + o.amount_total, 0);
    const comision = bruto * 0.10;
    return {
      bruto:    bruto.toFixed(2),
      comision: comision.toFixed(2),
      neto:     (bruto - comision).toFixed(2),
      total_pedidos: ordenes.length
    };
  }
};

// ─────────────────────────────────────────────────
// INVENTARIO
// ─────────────────────────────────────────────────
const OdooInventario = {

  async obtenerStock() {
    await OdooAuth.login();
    return await odooCall('object', 'execute_kw', [
      ODOO_CONFIG.db, OdooAuth.uid, ODOO_CONFIG.password,
      'product.template', 'search_read',
      [[['type', '=', 'product']]],
      { fields: ['id', 'name', 'qty_available', 'virtual_available', 'default_code'], limit: 100 }
    ]);
  },

  async obtenerKardex(productoId, fechaDesde, fechaHasta) {
    await OdooAuth.login();
    return await odooCall('object', 'execute_kw', [
      ODOO_CONFIG.db, OdooAuth.uid, ODOO_CONFIG.password,
      'stock.move.line', 'search_read',
      [[
        ['product_id.product_tmpl_id', '=', productoId],
        ['date', '>=', fechaDesde],
        ['date', '<=', fechaHasta],
        ['state', '=', 'done']
      ]],
      { fields: ['date', 'product_id', 'qty_done', 'location_id', 'location_dest_id'], limit: 100 }
    ]);
  },

  async obtenerProductosBajoStock(minimo = 5) {
    await OdooAuth.login();
    return await odooCall('object', 'execute_kw', [
      ODOO_CONFIG.db, OdooAuth.uid, ODOO_CONFIG.password,
      'product.template', 'search_read',
      [[['qty_available', '<=', minimo], ['type', '=', 'product']]],
      { fields: ['id', 'name', 'qty_available', 'default_code'], limit: 50 }
    ]);
  }
};

// ─────────────────────────────────────────────────
// CLIENTES / PARTNERS
// ─────────────────────────────────────────────────
const OdooClientes = {

  async buscarOCrear(nombre, email, telefono) {
    await OdooAuth.login();
    // Buscar si ya existe
    const existente = await odooCall('object', 'execute_kw', [
      ODOO_CONFIG.db, OdooAuth.uid, ODOO_CONFIG.password,
      'res.partner', 'search_read',
      [[['email', '=', email]]],
      { fields: ['id', 'name', 'email'], limit: 1 }
    ]);
    if (existente.length) return existente[0].id;

    // Crear nuevo
    return await odooCall('object', 'execute_kw', [
      ODOO_CONFIG.db, OdooAuth.uid, ODOO_CONFIG.password,
      'res.partner', 'create',
      [{
        name:    nombre,
        email:   email,
        phone:   telefono || '',
        customer_rank: 1
      }]
    ]);
  },

  async registrarProveedor(datos) {
    await OdooAuth.login();
    return await odooCall('object', 'execute_kw', [
      ODOO_CONFIG.db, OdooAuth.uid, ODOO_CONFIG.password,
      'res.partner', 'create',
      [{
        name:          datos.razon_social,
        vat:           datos.ruc || '',
        email:         datos.email,
        phone:         datos.whatsapp || '',
        website:       datos.website || '',
        supplier_rank: 1,
        customer_rank: 0,
        country_id:    173 // Perú
      }]
    ]);
  }
};

// ─────────────────────────────────────────────────
// FACTURAS
// ─────────────────────────────────────────────────
const OdooFacturas = {

  async obtenerTodas() {
    await OdooAuth.login();
    return await odooCall('object', 'execute_kw', [
      ODOO_CONFIG.db, OdooAuth.uid, ODOO_CONFIG.password,
      'account.move', 'search_read',
      [[['move_type', '=', 'out_invoice']]],
      {
        fields: ['id', 'name', 'partner_id', 'amount_total', 'state', 'invoice_date'],
        limit: 50,
        order: 'invoice_date desc'
      }
    ]);
  },

  async crearDesdeOrden(ordenId) {
    await OdooAuth.login();
    return await odooCall('object', 'execute_kw', [
      ODOO_CONFIG.db, OdooAuth.uid, ODOO_CONFIG.password,
      'sale.order', 'action_create_invoices',
      [[ordenId]]
    ]);
  }
};

// ─────────────────────────────────────────────────
// UTILIDADES PARA EL PANEL
// ─────────────────────────────────────────────────
const OdooPanel = {

  // Carga el dashboard completo
  async cargarDashboard() {
    try {
      const [financiero, pedidos, productos] = await Promise.all([
        OdooVentas.obtenerResumenFinanciero(),
        OdooVentas.obtenerTodos(),
        OdooInventario.obtenerStock()
      ]);

      // KPIs
      const kpiVentas = document.getElementById('kpi-ventas');
      const kpiPedidos = document.getElementById('kpi-pedidos');
      const kpiProductos = document.getElementById('kpi-productos');
      if (kpiVentas)    kpiVentas.textContent    = `S/ ${parseFloat(financiero.bruto).toLocaleString('es-PE')}`;
      if (kpiPedidos)   kpiPedidos.textContent   = financiero.total_pedidos;
      if (kpiProductos) kpiProductos.textContent = productos.length;

      // Finanzas
      const fiBruto = document.getElementById('fi-bruto');
      const fiNeto  = document.getElementById('fi-neto');
      if (fiBruto) fiBruto.textContent = `S/ ${parseFloat(financiero.bruto).toLocaleString('es-PE')}`;
      if (fiNeto)  fiNeto.textContent  = `S/ ${parseFloat(financiero.neto).toLocaleString('es-PE')}`;

      // Tabla de pedidos
      const tbody = document.getElementById('pedidos-dash-body');
      if (tbody && pedidos.length) {
        tbody.innerHTML = pedidos.slice(0, 5).map(p => `
          <tr>
            <td><strong>${p.name}</strong></td>
            <td>${p.partner_id[1]}</td>
            <td><strong>S/ ${p.amount_total.toFixed(2)}</strong></td>
            <td><span class="badge ${estadoBadge(p.state)}">${estadoTexto(p.state)}</span></td>
          </tr>
        `).join('');
      }

      // Productos más vendidos (top 5 por stock vendido)
      const topBody = document.getElementById('top-productos-body');
      if (topBody && productos.length) {
        topBody.innerHTML = productos.slice(0, 5).map(p => `
          <tr>
            <td>${p.name}</td>
            <td>—</td>
            <td>${p.qty_available}</td>
          </tr>
        `).join('');
      }

    } catch (e) {
      console.error('Error cargando dashboard:', e);
    }
  },

  // Carga el catálogo de productos
  async cargarCatalogo() {
    try {
      const productos = await OdooProductos.obtenerTodos();
      const tbody = document.getElementById('catalogo-body');
      if (!tbody) return;
      if (!productos.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-row">No hay productos en Odoo</td></tr>';
        return;
      }
      tbody.innerHTML = productos.map(p => `
        <tr>
          <td><strong>${p.name}</strong><br><small>${p.default_code || '—'}</small></td>
          <td>${p.categ_id ? p.categ_id[1] : '—'}</td>
          <td>S/ ${p.list_price.toFixed(2)}</td>
          <td>${p.qty_available}</td>
          <td>—</td>
          <td><span class="badge ${p.qty_available > 0 ? 'badge-green' : 'badge-red'}">${p.qty_available > 0 ? 'Publicado' : 'Sin stock'}</span></td>
          <td>
            <button class="btn-outline" style="padding:6px 12px;font-size:12px" onclick="editarProducto(${p.id})">Editar</button>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      console.error('Error cargando catálogo:', e);
    }
  },

  // Carga pedidos
  async cargarPedidos() {
    try {
      const pedidos = await OdooVentas.obtenerTodos();
      const tbody = document.getElementById('pedidos-body');
      if (!tbody) return;
      if (!pedidos.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading-row">No hay pedidos aún</td></tr>';
        return;
      }
      tbody.innerHTML = pedidos.map(p => `
        <tr>
          <td><strong>${p.name}</strong></td>
          <td>${new Date(p.date_order).toLocaleDateString('es-PE')}</td>
          <td>${p.partner_id[1]}</td>
          <td>—</td>
          <td>—</td>
          <td><strong>S/ ${p.amount_total.toFixed(2)}</strong></td>
          <td><span class="badge ${estadoBadge(p.state)}">${estadoTexto(p.state)}</span></td>
          <td>
            <button class="btn-outline" style="padding:6px 10px;font-size:12px">Ver</button>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      console.error('Error cargando pedidos:', e);
    }
  },

  // Carga pagos
  async cargarPagos() {
    try {
      const financiero = await OdooVentas.obtenerResumenFinanciero();
      const phAmount = document.getElementById('ph-amount');
      if (phAmount) phAmount.textContent = `S/ ${parseFloat(financiero.neto).toLocaleString('es-PE')}`;
    } catch (e) {
      console.error('Error cargando pagos:', e);
    }
  }
};

// ─────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────
function estadoBadge(state) {
  return { draft: 'badge-gray', sent: 'badge-blue', sale: 'badge-green', done: 'badge-gold', cancel: 'badge-red' }[state] || 'badge-gray';
}
function estadoTexto(state) {
  return { draft: 'Borrador', sent: 'Enviado', sale: 'Confirmado', done: 'Completado', cancel: 'Cancelado' }[state] || state;
}

// ─────────────────────────────────────────────────
// CONEXIÓN DESDE EL PANEL (botones del UI)
// ─────────────────────────────────────────────────
async function probarConexionOdoo() {
  const btn = document.querySelector('[onclick="probarConexionOdoo()"]');
  if (btn) btn.textContent = '⏳ Probando...';

  // Leer credenciales del formulario si las hay
  const urlInput  = document.getElementById('odoo-url');
  const dbInput   = document.getElementById('odoo-db');
  const userInput = document.getElementById('odoo-user');
  const passInput = document.getElementById('odoo-pass');
  if (urlInput)  ODOO_CONFIG.url      = urlInput.value;
  if (dbInput)   ODOO_CONFIG.db       = dbInput.value;
  if (userInput) ODOO_CONFIG.username = userInput.value;
  if (passInput) ODOO_CONFIG.password = passInput.value;

  const resultado = await OdooAuth.probarConexion();
  const div = document.getElementById('odoo-test-result');
  if (div) {
    div.style.display = 'block';
    div.className = `result-banner ${resultado.success ? 'success' : 'error'}`;
    div.textContent = resultado.mensaje;
  }
  if (btn) btn.textContent = '🔌 Probar conexión';
  return resultado.success;
}

async function guardarConexionOdoo() {
  const ok = await probarConexionOdoo();
  if (!ok) return;

  const badge = document.getElementById('odoo-status-badge');
  if (badge) { badge.textContent = '● Conectado'; badge.classList.add('connected'); }

  // Marcar módulos como sincronizados
  ['products','inventory','orders','invoices','partners'].forEach(m => {
    const el = document.getElementById(`sync-${m}`);
    if (el) {
      const badge = el.querySelector('.badge');
      if (badge) { badge.textContent = 'Activo'; badge.className = 'badge badge-green'; }
    }
  });

  alert('✅ Conexión guardada correctamente');
}

async function sincronizarTodo() {
  const btn = document.querySelector('[onclick="sincronizarTodo()"]');
  if (btn) btn.textContent = '⏳ Sincronizando...';
  try {
    await OdooPanel.cargarDashboard();
    await OdooPanel.cargarCatalogo();
    await OdooPanel.cargarPedidos();
    alert('✅ Sincronización completada');
  } catch (e) {
    alert('❌ Error al sincronizar: ' + e.message);
  }
  if (btn) btn.textContent = '🔄 Sincronizar ahora';
}

// ─────────────────────────────────────────────────
// PRODUCTOS EN LA TIENDA (tienda.html)
// ─────────────────────────────────────────────────
async function cargarProductosTienda() {
  const grid = document.getElementById('products-grid');
  const count = document.getElementById('prod-count');
  if (!grid) return;

  grid.innerHTML = '<p style="padding:40px;text-align:center;color:#8A97AB">Cargando productos desde Odoo...</p>';

  try {
    const productos = await OdooProductos.obtenerTodos();
    if (count) count.innerHTML = `<strong>${productos.length}</strong> productos encontrados`;

    if (!productos.length) {
      grid.innerHTML = '<p style="padding:40px;text-align:center;color:#8A97AB">No hay productos disponibles</p>';
      return;
    }

    grid.innerHTML = productos.map(p => `
      <div class="product-card" onclick="verProducto(${p.id})">
        <div class="product-img">
          ${p.image_1920
            ? `<img src="data:image/png;base64,${p.image_1920}" style="width:100%;height:100%;object-fit:cover">`
            : '📦'}
        </div>
        <div class="product-info">
          <div class="product-vendor">ImportaX</div>
          <div class="product-name">${p.name}</div>
          <div class="product-rating"><span>⭐</span> 4.8 (120)</div>
          <div class="product-prices">
            <span class="price-current">S/ ${p.list_price.toFixed(2)}</span>
          </div>
          <button class="btn-add-cart" onclick="event.stopPropagation();agregarAlCarrito({id:${p.id},nombre:'${p.name.replace(/'/g,"\\'")}',precio:${p.list_price},imagen:'📦'})">
            + Agregar
          </button>
        </div>
      </div>
    `).join('');

  } catch (e) {
    grid.innerHTML = `<p style="padding:40px;text-align:center;color:#EF4444">❌ Error conectando con Odoo: ${e.message}</p>`;
    console.error(e);
  }
}

// Auto-cargar productos al abrir la tienda
if (document.getElementById('products-grid')) {
  cargarProductosTienda();
}

// Auto-cargar dashboard al abrir el panel
if (document.getElementById('panel-dashboard')) {
  OdooPanel.cargarDashboard();
}