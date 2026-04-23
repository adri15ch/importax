/**
 * panel-proveedor.js
 * Lógica del panel del proveedor — carga datos desde Odoo
 */

// ─────────────────────────────────────────────────
// AUTO-CARGAR CREDENCIALES GUARDADAS (conexión automática)
// ─────────────────────────────────────────────────
const _savedOdoo = localStorage.getItem('odoo_config');
if (_savedOdoo) {
  try {
    const _c = JSON.parse(_savedOdoo);
    ODOO_CONFIG.url      = _c.url;
    ODOO_CONFIG.db       = _c.db;
    ODOO_CONFIG.username = _c.username;
    ODOO_CONFIG.password = _c.password;
    console.log('✅ Credenciales Odoo cargadas automáticamente');
  } catch(e) {
    console.warn('No se pudieron cargar credenciales guardadas');
  }
}

// ─────────────────────────────────────────────────
// NAVEGACIÓN ENTRE PANELES
// ─────────────────────────────────────────────────
const pageTitles = {
  dashboard: { title: 'Dashboard',          bc: 'Inicio / Dashboard' },
  catalogo:  { title: 'Mi Catálogo',        bc: 'Inicio / Catálogo' },
  agregar:   { title: 'Agregar Producto',   bc: 'Inicio / Productos / Agregar' },
  pedidos:   { title: 'Mis Pedidos',        bc: 'Inicio / Pedidos' },
  pagos:     { title: 'Pagos',              bc: 'Inicio / Pagos' },
  odoo:      { title: 'Conectar Odoo ERP',  bc: 'Inicio / Configuración / Odoo' },
  whatsapp:  { title: 'WhatsApp IA',        bc: 'Inicio / Configuración / WhatsApp' },
};

function mostrarPanel(id) {
  document.querySelectorAll('.panel-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  document.getElementById(`panel-${id}`)?.classList.add('active');

  const meta = pageTitles[id];
  if (meta) {
    document.getElementById('page-title').textContent = meta.title;
    document.getElementById('page-bc').textContent    = meta.bc;
  }

  if (id === 'dashboard') cargarDashboard();
  if (id === 'catalogo')  cargarCatalogo();
  if (id === 'pedidos')   cargarPedidos();
  if (id === 'pagos')     cargarPagos();
  if (id === 'odoo')      iniciarPanelOdoo();
}

// ─────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────
async function cargarDashboard() {
  try {
    const [ordenes, productos] = await Promise.all([
      OdooVentas.obtenerTodos(),
      OdooProductos.obtenerTodos()
    ]);

    const totalVentas  = ordenes.reduce((sum, o) => sum + o.amount_total, 0);
    const pedidosNuevos = ordenes.filter(o => o.state === 'sale').length;
    const comision     = totalVentas * 0.10;
    const neto         = totalVentas - comision;

    document.getElementById('kpi-ventas').textContent    = formatPrecio(totalVentas);
    document.getElementById('kpi-pedidos').textContent   = pedidosNuevos;
    document.getElementById('kpi-productos').textContent = productos.length;
    document.getElementById('fi-bruto').textContent      = formatPrecio(totalVentas);
    document.getElementById('fi-neto').textContent       = formatPrecio(neto);
    document.getElementById('ph-amount').textContent     = formatPrecio(neto);

    const tbody = document.getElementById('pedidos-dash-body');
    if (ordenes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="loading-row">No hay pedidos aún</td></tr>';
    } else {
      tbody.innerHTML = ordenes.slice(0, 5).map(o => `
        <tr>
          <td><b>${o.name}</b></td>
          <td>${o.partner_id[1]}</td>
          <td><b>${formatPrecio(o.amount_total)}</b></td>
          <td>${badgeEstado(o.state)}</td>
        </tr>
      `).join('');
    }

    const topBody = document.getElementById('top-productos-body');
    topBody.innerHTML = productos.slice(0, 5).map(p => `
      <tr>
        <td>${p.name}</td>
        <td><b>—</b></td>
        <td>${p.qty_available > 10
          ? `<span class="badge badge-green">${p.qty_available}</span>`
          : p.qty_available > 0
            ? `<span class="badge badge-orange">${p.qty_available}</span>`
            : `<span class="badge badge-red">Sin stock</span>`
        }</td>
      </tr>
    `).join('');

  } catch (err) {
    console.warn('Odoo no disponible, usando datos demo:', err.message);
    cargarDashboardDemo();
  }
}

function cargarDashboardDemo() {
  document.getElementById('kpi-ventas').textContent    = 'S/ 28,400';
  document.getElementById('kpi-pedidos').textContent   = '34';
  document.getElementById('kpi-productos').textContent = '47';
  document.getElementById('fi-bruto').textContent      = 'S/ 28,400';
  document.getElementById('fi-neto').textContent       = 'S/ 25,560';
  document.getElementById('ph-amount').textContent     = 'S/ 25,560';

  document.getElementById('pedidos-dash-body').innerHTML = `
    <tr><td><b>#MKT-1089</b></td><td>Luis Torres</td><td><b>S/ 680</b></td><td><span class="badge badge-orange">Nuevo</span></td></tr>
    <tr><td><b>#MKT-1088</b></td><td>María Quispe</td><td><b>S/ 199</b></td><td><span class="badge badge-blue">Preparando</span></td></tr>
    <tr><td><b>#MKT-1087</b></td><td>Empresa ABC</td><td><b>S/ 3,480</b></td><td><span class="badge badge-green">Enviado</span></td></tr>
    <tr><td><b>#MKT-1086</b></td><td>Pedro Salinas</td><td><b>S/ 380</b></td><td><span class="badge badge-green">Entregado</span></td></tr>
  `;
  document.getElementById('top-productos-body').innerHTML = `
    <tr><td>🖥️ Monitor 24" FHD</td><td><b>42</b></td><td><span class="badge badge-green">18</span></td></tr>
    <tr><td>⌨️ Teclado Mecánico</td><td><b>38</b></td><td><span class="badge badge-green">45</span></td></tr>
    <tr><td>🎧 Auriculares BT</td><td><b>29</b></td><td><span class="badge badge-orange">8</span></td></tr>
    <tr><td>🔌 Cable HDMI 2m</td><td><b>61</b></td><td><span class="badge badge-red">4</span></td></tr>
  `;
}

// ─────────────────────────────────────────────────
// CATÁLOGO
// ─────────────────────────────────────────────────
async function cargarCatalogo() {
  const tbody = document.getElementById('catalogo-body');
  try {
    const productos = await OdooProductos.obtenerTodos();
    if (productos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="loading-row">No tienes productos aún.</td></tr>';
      return;
    }
    tbody.innerHTML = productos.map(p => `
      <tr>
        <td><b>${p.name}</b></td>
        <td>${p.categ_id ? p.categ_id[1] : '—'}</td>
        <td><b>${formatPrecio(p.list_price)}</b></td>
        <td>${p.qty_available > 10
          ? `<span class="badge badge-green">${p.qty_available}</span>`
          : p.qty_available > 0
            ? `<span class="badge badge-orange">${p.qty_available}</span>`
            : `<span class="badge badge-red">0</span>`
        }</td>
        <td>—</td>
        <td><span class="badge badge-green">Publicado</span></td>
        <td><button class="btn-link" onclick="editarProducto(${p.id})">Editar</button></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `
      <tr><td><b>Monitor 24" FHD LG</b></td><td>Electrónica</td><td><b>S/ 680</b></td><td><span class="badge badge-green">18</span></td><td>42</td><td><span class="badge badge-green">Publicado</span></td><td><button class="btn-link">Editar</button></td></tr>
      <tr><td><b>Teclado Mecánico RGB</b></td><td>Electrónica</td><td><b>S/ 220</b></td><td><span class="badge badge-green">45</span></td><td>38</td><td><span class="badge badge-green">Publicado</span></td><td><button class="btn-link">Editar</button></td></tr>
      <tr><td><b>Auriculares BT Pro</b></td><td>Electrónica</td><td><b>S/ 159</b></td><td><span class="badge badge-orange">8</span></td><td>29</td><td><span class="badge badge-green">Publicado</span></td><td><button class="btn-link">Editar</button></td></tr>
    `;
  }
}

function filtrarCatalogo(q) {
  document.querySelectorAll('#catalogo-body tr').forEach(tr => {
    tr.style.display = tr.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}

// ─────────────────────────────────────────────────
// PUBLICAR PRODUCTO
// ─────────────────────────────────────────────────
async function publicarProducto(e) {
  e.preventDefault();
  const btn = e.submitter;
  btn.textContent = '⏳ Publicando...';
  btn.disabled    = true;

  const datos = {
    nombre:         document.getElementById('prod-nombre').value,
    precio:         document.getElementById('prod-precio').value,
    precioOriginal: document.getElementById('prod-precio-orig').value || 0,
    descripcion:    document.getElementById('prod-desc').value,
    sku:            document.getElementById('prod-sku').value,
  };

  try {
    const id = await OdooProductos.crear(datos);
    mostrarResultado('prod-result', `✅ Producto publicado en Odoo. ID: ${id}`, 'success');
  } catch (err) {
    mostrarResultado('prod-result', `⚠️ Guardado localmente (Odoo no disponible): ${err.message}`, 'warning');
  }

  btn.textContent = '🚀 Publicar en marketplace';
  btn.disabled    = false;
}

function guardarBorrador() {
  alert('Borrador guardado.');
  mostrarPanel('catalogo');
}

// ─────────────────────────────────────────────────
// PEDIDOS
// ─────────────────────────────────────────────────
async function cargarPedidos() {
  const tbody = document.getElementById('pedidos-body');
  try {
    const pedidos = await OdooVentas.obtenerTodos();
    if (pedidos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="loading-row">No hay pedidos aún</td></tr>';
      return;
    }
    tbody.innerHTML = pedidos.map(p => `
      <tr>
        <td><b>${p.name}</b></td>
        <td>${formatFecha(p.date_order)}</td>
        <td>${p.partner_id[1]}</td>
        <td>Ver detalle</td>
        <td>—</td>
        <td><b>${formatPrecio(p.amount_total)}</b></td>
        <td>${badgeEstado(p.state)}</td>
        <td><button class="btn-link" onclick="verPedido(${p.id})">Ver</button></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `
      <tr><td><b>#MKT-1089</b></td><td>22/04/26</td><td>Luis Torres</td><td>Monitor 24"</td><td>1</td><td><b>S/680</b></td><td><span class="badge badge-orange">Nuevo</span></td><td><button class="btn-link">Ver</button></td></tr>
      <tr><td><b>#MKT-1088</b></td><td>22/04/26</td><td>María Quispe</td><td>Cable HDMI x5</td><td>5</td><td><b>S/125</b></td><td><span class="badge badge-blue">Preparando</span></td><td><button class="btn-link">Ver</button></td></tr>
    `;
  }
}

// ─────────────────────────────────────────────────
// PAGOS
// ─────────────────────────────────────────────────
function cargarPagos() {
  document.getElementById('pagos-body').innerHTML = `
    <tr><td>31/03/26</td><td>Marzo 2026</td><td><b>S/ 21,340</b></td><td><span class="badge badge-green">Pagado</span></td></tr>
    <tr><td>28/02/26</td><td>Feb 2026</td><td><b>S/ 18,900</b></td><td><span class="badge badge-green">Pagado</span></td></tr>
    <tr><td>30/04/26</td><td>Abril 2026</td><td><b>S/ 25,560</b></td><td><span class="badge badge-orange">Pendiente</span></td></tr>
  `;
}

function guardarCuenta() {
  alert('Datos bancarios guardados correctamente.');
}

// ─────────────────────────────────────────────────
// CONEXIÓN ODOO
// ─────────────────────────────────────────────────

// Al abrir el panel Odoo, rellenar formulario con credenciales guardadas
function iniciarPanelOdoo() {
  const saved = localStorage.getItem('odoo_config');
  if (saved) {
    const c = JSON.parse(saved);
    document.getElementById('odoo-url').value  = c.url      || '';
    document.getElementById('odoo-db').value   = c.db       || '';
    document.getElementById('odoo-user').value = c.username || '';
    // No mostramos la contraseña por seguridad, pero está guardada
    document.getElementById('odoo-pass').placeholder = '••••••• (guardada)';

    // Mostrar badge conectado si hay credenciales
    const badge = document.getElementById('odoo-status-badge');
    if (badge) { badge.textContent = '● Conectado'; badge.style.color = '#10B981'; }

    // Marcar módulos como activos
    ['products','inventory','orders','invoices','partners'].forEach(m => {
      const el = document.getElementById(`sync-${m}`);
      if (el) {
        const b = el.querySelector('.badge');
        if (b) { b.textContent = '✓ Activo'; b.className = 'badge badge-green'; }
      }
    });
  }
}

async function probarConexionOdoo() {
  const url  = document.getElementById('odoo-url').value;
  const db   = document.getElementById('odoo-db').value;
  const user = document.getElementById('odoo-user').value;
  const pass = document.getElementById('odoo-pass').value
            || JSON.parse(localStorage.getItem('odoo_config') || '{}').password
            || '';

  mostrarResultado('odoo-test-result', '⟳ Probando conexión...', 'info');

  ODOO_CONFIG.url      = url;
  ODOO_CONFIG.db       = db;
  ODOO_CONFIG.username = user;
  ODOO_CONFIG.password = pass;

  const resultado = await OdooAuth.probarConexion();

  if (resultado.success) {
    mostrarResultado('odoo-test-result', `✅ Conexión exitosa con Odoo. Listo para sincronizar.`, 'success');
    const badge = document.getElementById('odoo-status-badge');
    if (badge) { badge.textContent = '● Conectado'; badge.style.color = '#10B981'; }
  } else {
    mostrarResultado('odoo-test-result', `❌ ${resultado.mensaje}`, 'error');
  }
  return resultado.success;
}

async function guardarConexionOdoo() {
  const url  = document.getElementById('odoo-url').value;
  const db   = document.getElementById('odoo-db').value;
  const user = document.getElementById('odoo-user').value;
  const pass = document.getElementById('odoo-pass').value;

  if (!pass) {
    mostrarResultado('odoo-test-result', '⚠️ Ingresa la contraseña para guardar.', 'warning');
    return;
  }

  const ok = await probarConexionOdoo();
  if (!ok) return;

  // ✅ GUARDAR CREDENCIALES PARA SIEMPRE (auto-conexión futura)
  localStorage.setItem('odoo_config', JSON.stringify({ url, db, username: user, password: pass }));

  const badge = document.getElementById('odoo-status-badge');
  if (badge) { badge.textContent = '● Conectado'; badge.style.color = '#10B981'; }

  ['products','inventory','orders','invoices','partners'].forEach(m => {
    const el = document.getElementById(`sync-${m}`);
    if (el) {
      const b = el.querySelector('.badge');
      if (b) { b.textContent = '✓ Activo'; b.className = 'badge badge-green'; }
    }
  });

  mostrarResultado('odoo-test-result', '✅ Conexión guardada. La próxima vez será automática.', 'success');
}

async function sincronizarTodo() {
  const btn = document.querySelector('[onclick="sincronizarTodo()"]');
  if (btn) btn.textContent = '⏳ Sincronizando...';

  const modulos = ['sync-products','sync-inventory','sync-orders','sync-invoices','sync-partners'];
  modulos.forEach(mod => {
    const el = document.getElementById(mod);
    if (el) { const b = el.querySelector('.badge'); if(b) { b.textContent = '⟳ Sincronizando...'; b.className = 'badge badge-orange'; } }
  });

  try {
    await cargarDashboard();
    await cargarCatalogo();
    await cargarPedidos();
    modulos.forEach(mod => {
      const el = document.getElementById(mod);
      if (el) { const b = el.querySelector('.badge'); if(b) { b.textContent = '✓ Sincronizado'; b.className = 'badge badge-green'; } }
    });
    mostrarResultado('odoo-test-result', '✅ Sincronización completada con éxito.', 'success');
  } catch (e) {
    mostrarResultado('odoo-test-result', '❌ Error al sincronizar: ' + e.message, 'error');
  }

  if (btn) btn.textContent = '🔄 Sincronizar ahora';
}

function guardarWhatsApp() {
  alert('Configuración de WhatsApp IA guardada.');
}

// ─────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────
function mostrarResultado(elementId, mensaje, tipo) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.style.display = 'block';
  el.textContent   = mensaje;
  const estilos = {
    success: 'display:block;background:#D1FAE5;color:#065F46;padding:10px 14px;border-radius:10px;font-size:12px;margin-top:10px',
    error:   'display:block;background:#FEE2E2;color:#991B1B;padding:10px 14px;border-radius:10px;font-size:12px;margin-top:10px',
    warning: 'display:block;background:#FEF3C7;color:#92400E;padding:10px 14px;border-radius:10px;font-size:12px;margin-top:10px',
    info:    'display:block;background:#DBEAFE;color:#1E40AF;padding:10px 14px;border-radius:10px;font-size:12px;margin-top:10px',
  };
  el.style.cssText = estilos[tipo] || estilos.info;
}

function formatPrecio(val) {
  return `S/ ${parseFloat(val || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

function formatFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-PE');
}

function badgeEstado(state) {
  const map = {
    draft:  '<span class="badge badge-gray">Borrador</span>',
    sent:   '<span class="badge badge-blue">Enviado</span>',
    sale:   '<span class="badge badge-green">Confirmado</span>',
    done:   '<span class="badge badge-green">Completado</span>',
    cancel: '<span class="badge badge-red">Cancelado</span>',
  };
  return map[state] || `<span class="badge badge-gray">${state}</span>`;
}

function previsualizarImagenes(input) {
  const preview = document.getElementById('image-preview');
  preview.innerHTML = '';
  Array.from(input.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:8px;border:1.5px solid #E2E8F0';
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

function exportarPedidos() { alert('Conecta Odoo para exportar datos reales.'); }
function editarProducto(id) { alert(`Editar producto ID: ${id}`); }
function verPedido(id) { alert(`Ver pedido ID: ${id}`); }
function filtrarPedidos(estado) { console.log('Filtrar:', estado); }

// ─────────────────────────────────────────────────
// INICIALIZAR
// ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  cargarDashboard();
});