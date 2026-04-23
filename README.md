# 🏪 ImportaX — Marketplace + ERP Odoo

Sistema web completo de marketplace para importadora, con panel de proveedores y conexión a Odoo 17.

---

## 📁 Estructura del Proyecto

```
marketplace-importax/
│
├── frontend/
│   ├── pages/
│   │   ├── tienda.html              ← Tienda del cliente (marketplace)
│   │   ├── registro-proveedor.html  ← Formulario de registro de proveedor
│   │   └── panel-proveedor.html     ← Dashboard del proveedor
│   │
│   ├── css/
│   │   ├── tienda.css
│   │   ├── proveedor.css
│   │   └── panel.css
│   │
│   └── js/
│       ├── odoo-api.js          ← ⭐ CONECTOR CON ODOO (el más importante)
│       ├── productos.js         ← Lógica de productos y filtros
│       ├── carrito.js           ← Lógica del carrito de compras
│       ├── registro-proveedor.js
│       └── panel-proveedor.js   ← Lógica del panel del proveedor
│
├── odoo-module/                 ← Módulo custom para Odoo (addon)
│   ├── __manifest__.py
│   ├── models/
│   ├── views/
│   └── controllers/
│
└── README.md
```

---

## 🚀 Cómo conectar con Odoo

### Paso 1 — Asegúrate de tener Odoo corriendo
```
http://localhost:8069
```

### Paso 2 — Habilitar CORS en Odoo
Edita el archivo `odoo.conf` en tu servidor y agrega:
```ini
[options]
; Permite peticiones desde el frontend
cors = *
```
Reinicia Odoo:
```bash
docker-compose restart odoo
```

### Paso 3 — Abrir el panel del proveedor
Abre `frontend/pages/panel-proveedor.html` en tu navegador y ve a **"Conectar Odoo"**.

Ingresa:
- **URL**: `http://localhost:8069`
- **Base de datos**: `importadorax`
- **Usuario**: `admin@importadorax.com`
- **Contraseña**: la que pusiste al crear la BD

Clic en **"Probar conexión"** → debe decir ✅ Exitoso.

### Paso 4 — Sincronizar
Clic en **"Sincronizar ahora"** y todos los datos de Odoo aparecerán en el sistema.

---

## 🔌 Cómo funciona la conexión técnica

El archivo `js/odoo-api.js` usa la **API JSON-RPC de Odoo** para comunicarse:

```javascript
// Ejemplo: obtener productos de Odoo
const productos = await OdooProductos.obtenerTodos();

// Ejemplo: crear orden de venta en Odoo
const orden_id = await OdooVentas.crearDesdeCarrito(carrito, cliente_id);

// Ejemplo: obtener kardex de un producto
const kardex = await OdooInventario.obtenerKardex(producto_id, '2026-01-01', '2026-04-22');
```

---

## 📦 Módulos Odoo requeridos (instalar en Odoo)

| Módulo | Para qué |
|--------|----------|
| Ventas | Órdenes de venta |
| Inventario | Kardex y stock |
| Compras | Órdenes de compra |
| Sitio Web | E-commerce |
| Comercio Electrónico | Tienda online |
| Facturación | Facturas SUNAT |
| CRM | Clientes |
| Contactos | Proveedores |

---

## 💬 Configurar WhatsApp IA

1. Crea cuenta en [360dialog.com](https://360dialog.com) — tienen plan gratuito para demos
2. Obtén tu API Key
3. Crea cuenta en [console.anthropic.com](https://console.anthropic.com) y obtén tu Claude API Key
4. En el panel del proveedor → "WhatsApp IA" → ingresa ambas claves

---

## 🎨 Personalización

Para cambiar el nombre "ImportaX":
1. Busca y reemplaza "ImportaX" en todos los archivos HTML
2. Cambia el emoji 🏪 por tu logo

Para cambiar colores:
- En `css/tienda.css` cambia `--primary: #FF6B35` por el color que quieras

---

## 📞 Soporte
Sistema desarrollado para presentación y producción.
Conecta a Odoo Community 17 siguiendo los pasos de arriba.
