/**
 * productos.js — Lógica de productos y filtros
 */

const PRODUCTOS_DEMO = [
  { id:1, nombre:'Monitor 24" FHD LG', cat:'elec', precio:680, original:850, icon:'🖥️', badge:'sale', rating:4.8, reviews:124, vendor:'ImportadoraX' },
  { id:2, nombre:'Teclado Mecánico RGB', cat:'elec', precio:220, original:280, icon:'⌨️', badge:'hot', rating:4.9, reviews:89, vendor:'ImportadoraX' },
  { id:3, nombre:'Polo Premium Dry-Fit', cat:'ropa', precio:45, original:null, icon:'👕', badge:'new', rating:4.6, reviews:203, vendor:'TechStar' },
  { id:4, nombre:'Auriculares BT Pro', cat:'elec', precio:159, original:199, icon:'🎧', badge:'sale', rating:4.7, reviews:67, vendor:'ImportadoraX' },
  { id:5, nombre:'Licuadora 600W Oster', cat:'hogar', precio:89, original:120, icon:'🥤', badge:'hot', rating:4.5, reviews:312, vendor:'Global' },
  { id:6, nombre:'Balón de Fútbol Pro', cat:'dep', precio:55, original:null, icon:'⚽', badge:'new', rating:4.8, reviews:45, vendor:'SurTech' },
  { id:7, nombre:'Set Maquillaje Premium', cat:'bell', precio:75, original:95, icon:'💄', badge:'sale', rating:4.9, reviews:178, vendor:'ImportadoraX' },
  { id:8, nombre:'Mouse Inalámbrico Pro', cat:'elec', precio:89, original:null, icon:'🖱️', badge:'new', rating:4.6, reviews:91, vendor:'TechStar' },
  { id:9, nombre:'Zapatillas Running Pro', cat:'dep', precio:129, original:160, icon:'👟', badge:'hot', rating:4.7, reviews:256, vendor:'ImportadoraX' },
  { id:10, nombre:'Silla Ergonómica Pro', cat:'hogar', precio:380, original:450, icon:'🪑', badge:'sale', rating:4.8, reviews:143, vendor:'Global' },
  { id:11, nombre:'Camisa Oxford Slim', cat:'ropa', precio:65, original:80, icon:'👔', badge:'new', rating:4.5, reviews:88, vendor:'SurTech' },
  { id:12, nombre:'Crema Hidratante SPF50', cat:'bell', precio:35, original:null, icon:'🧴', badge:'new', rating:4.7, reviews:220, vendor:'ImportadoraX' },
];

let productosFiltrados = [...PRODUCTOS_DEMO];
let categoriaActual = 'all';

// Renderizar grid de productos
function renderizarProductos(lista) {
  const grid = document.getElementById('products-grid');
  const count = document.getElementById('prod-count');

  count.textContent = `Mostrando ${lista.length} productos`;

  if (lista.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div style="font-size:48px">😕</div>
        <p>No se encontraron productos</p>
        <small>Intenta con otros filtros</small>
      </div>`;
    return;
  }

  grid.innerHTML = lista.map((p, i) => {
    const descuento = p.original ? Math.round((1 - p.precio / p.original) * 100) : 0;
    const badgeHtml = p.badge === 'hot'
      ? '<div class="prod-badge badge-hot">🔥 HOT</div>'
      : p.badge === 'new'
      ? '<div class="prod-badge badge-new">✨ NUEVO</div>'
      : '<div class="prod-badge badge-sale">💥 OFERTA</div>';

    return `
      <div class="prod-card" data-id="${p.id}">
        ${badgeHtml}
        <div class="prod-img">${p.icon}</div>
        <div class="prod-info">
          <div class="prod-vendor">${p.vendor}</div>
          <div class="prod-name">${p.nombre}</div>
          <div class="prod-rating">
            <span class="stars">${'★'.repeat(Math.floor(p.rating))}${'☆'.repeat(5 - Math.floor(p.rating))}</span>
            <span class="rating-count">${p.rating} (${p.reviews})</span>
          </div>
          <div class="prod-price-row">
            <span class="prod-price">S/ ${p.precio}</span>
            ${p.original ? `<span class="prod-original">S/ ${p.original}</span><span class="prod-discount">-${descuento}%</span>` : ''}
          </div>
          <button class="add-cart" onclick="agregarAlCarrito(${i})">🛒 Agregar al carrito</button>
        </div>
      </div>`;
  }).join('');
}

// Filtrar por categoría
function filtrarCat(cat, el) {
  document.querySelectorAll('.nc').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  categoriaActual = cat;
  aplicarFiltros();
}

// Buscar
function buscar() {
  const q = document.getElementById('searchInput').value;
  aplicarFiltros(q);
}

document.getElementById('searchInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') buscar();
});

// Aplicar todos los filtros
function aplicarFiltros(busqueda = '') {
  const q = busqueda || document.getElementById('searchInput')?.value || '';
  const minP = parseFloat(document.getElementById('minPrice')?.value) || 0;
  const maxP = parseFloat(document.getElementById('maxPrice')?.value) || 99999;

  productosFiltrados = PRODUCTOS_DEMO.filter(p => {
    const matchCat = categoriaActual === 'all' || p.cat === categoriaActual;
    const matchQ = !q || p.nombre.toLowerCase().includes(q.toLowerCase());
    const matchPrecio = p.precio >= minP && p.precio <= maxP;
    return matchCat && matchQ && matchPrecio;
  });

  renderizarProductos(productosFiltrados);
}

// Ordenar
function ordenar(criterio) {
  const lista = [...productosFiltrados];
  if (criterio === 'price-asc') lista.sort((a, b) => a.precio - b.precio);
  else if (criterio === 'price-desc') lista.sort((a, b) => b.precio - a.precio);
  else if (criterio === 'rating') lista.sort((a, b) => b.rating - a.rating);
  else if (criterio === 'sold') lista.sort((a, b) => b.reviews - a.reviews);
  renderizarProductos(lista);
}

// Limpiar filtros
function limpiarFiltros() {
  document.getElementById('minPrice').value = 0;
  document.getElementById('maxPrice').value = 2000;
  document.getElementById('searchInput').value = '';
  categoriaActual = 'all';
  document.querySelectorAll('.nc').forEach((n, i) => n.classList.toggle('active', i === 0));
  productosFiltrados = [...PRODUCTOS_DEMO];
  renderizarProductos(productosFiltrados);
}

// Intentar cargar desde Odoo, si falla usa demo
async function inicializarProductos() {
  try {
    const odooProds = await OdooProductos.obtenerTodos();
    if (odooProds && odooProds.length > 0) {
      const mapeados = odooProds.map((p, i) => ({
        id: p.id,
        nombre: p.name,
        cat: 'elec',
        precio: p.list_price,
        original: null,
        icon: '📦',
        badge: 'new',
        rating: 4.5,
        reviews: 0,
        vendor: 'ImportadoraX',
        odoo_id: p.id,
      }));
      PRODUCTOS_DEMO.length = 0;
      PRODUCTOS_DEMO.push(...mapeados);
    }
  } catch (e) {
    console.log('Usando productos de demo (Odoo no disponible)');
  }
  productosFiltrados = [...PRODUCTOS_DEMO];
  renderizarProductos(productosFiltrados);
}

// Iniciar
document.addEventListener('DOMContentLoaded', inicializarProductos);
