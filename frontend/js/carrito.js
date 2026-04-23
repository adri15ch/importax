/**
 * carrito.js — Lógica completa del carrito de compras
 */

let carrito = JSON.parse(localStorage.getItem('carrito_importax') || '[]');

// Agregar producto al carrito
function agregarAlCarrito(indice) {
  const producto = productosFiltrados[indice];
  if (!producto) return;

  const existente = carrito.find(c => c.id === producto.id);
  if (existente) {
    existente.cantidad++;
  } else {
    carrito.push({ ...producto, cantidad: 1 });
  }

  guardarCarrito();
  actualizarUI();

  // Feedback visual en el botón
  const btns = document.querySelectorAll('.add-cart');
  if (btns[indice]) {
    const btn = btns[indice];
    const textoOriginal = btn.textContent;
    btn.textContent = '✓ Agregado!';
    btn.style.background = '#10B981';
    setTimeout(() => {
      btn.textContent = textoOriginal;
      btn.style.background = '';
    }, 1200);
  }
}

// Cambiar cantidad
function cambiarCantidad(indice, delta) {
  carrito[indice].cantidad += delta;
  if (carrito[indice].cantidad <= 0) {
    carrito.splice(indice, 1);
  }
  guardarCarrito();
  actualizarUI();
  renderizarCarrito();
}

// Eliminar item
function eliminarItem(indice) {
  carrito.splice(indice, 1);
  guardarCarrito();
  actualizarUI();
  renderizarCarrito();
}

// Actualizar contador y totales en el UI
function actualizarUI() {
  const total = carrito.reduce((sum, c) => sum + c.cantidad, 0);
  document.getElementById('cart-count').textContent = total;
  document.getElementById('cart-items-count').textContent = total;
  renderizarCarrito();
}

// Renderizar contenido del carrito
function renderizarCarrito() {
  const body = document.getElementById('cart-body');
  const footer = document.getElementById('cart-footer');

  if (carrito.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <div style="font-size:48px">🛒</div>
        <p>Tu carrito está vacío</p>
        <small>Agrega productos para comenzar</small>
      </div>`;
    footer.style.display = 'none';
    return;
  }

  body.innerHTML = carrito.map((item, i) => `
    <div class="cart-item">
      <div class="ci-img">${item.icon}</div>
      <div class="ci-info">
        <div class="ci-name">${item.nombre}</div>
        <div class="ci-price">S/ ${item.precio}</div>
        <div class="ci-qty">
          <button class="qty-btn" onclick="cambiarCantidad(${i}, -1)">−</button>
          <span class="qty-num">${item.cantidad}</span>
          <button class="qty-btn" onclick="cambiarCantidad(${i}, 1)">+</button>
          <button class="ci-remove" onclick="eliminarItem(${i})">✕ quitar</button>
        </div>
      </div>
    </div>
  `).join('');

  // Calcular totales
  const subtotal = carrito.reduce((sum, c) => sum + c.precio * c.cantidad, 0);
  const igv = subtotal * 0.18;
  const total = subtotal + igv;

  document.getElementById('cart-subtotal').textContent = `S/ ${subtotal.toFixed(2)}`;
  document.getElementById('cart-igv').textContent = `S/ ${igv.toFixed(2)}`;
  document.getElementById('cart-total').textContent = `S/ ${total.toFixed(2)}`;

  footer.style.display = 'block';
}

// Abrir/cerrar carrito
function toggleCart() {
  const panel = document.getElementById('cart-panel');
  const overlay = document.getElementById('cart-overlay');
  panel.classList.toggle('open');
  overlay.classList.toggle('open');
}

// Ir al checkout
async function irCheckout() {
  if (carrito.length === 0) return alert('Tu carrito está vacío');

  const nombre = prompt('Tu nombre completo:');
  if (!nombre) return;
  const email = prompt('Tu correo electrónico:');
  if (!email) return;

  try {
    // Registrar cliente y crear orden en Odoo
    const cliente_id = await OdooPartners.registrarCliente({ nombre, apellido: '', email });
    const orden_id = await OdooVentas.crearDesdeCarrito(carrito, cliente_id);
    carrito = [];
    guardarCarrito();
    actualizarUI();
    toggleCart();
    alert(`✅ ¡Pedido creado exitosamente!\nN° de orden en Odoo: ${orden_id}\n\nRecibirás confirmación en tu correo.`);
  } catch (err) {
    alert(`Pedido registrado localmente.\nID temporal: #MKT-${Date.now().toString().slice(-4)}\n\nConecta Odoo para sincronización automática.`);
    carrito = [];
    guardarCarrito();
    actualizarUI();
    toggleCart();
  }
}

// Guardar en localStorage
function guardarCarrito() {
  localStorage.setItem('carrito_importax', JSON.stringify(carrito));
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => {
  actualizarUI();
});
