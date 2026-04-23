// odoo-connect.js
// Incluir en tu HTML: <script src="odoo-connect.js"></script>
// El proxy debe estar corriendo en localhost:3001

const PROXY_URL = "http://localhost:3001";

// ─── UTILIDADES UI ────────────────────────────────────────────────────────────
function getCredentials() {
  return {
    url: document.getElementById("odoo-url")?.value?.trim() || "http://localhost:8069",
    db: document.getElementById("odoo-db")?.value?.trim() || "",
    username: document.getElementById("odoo-user")?.value?.trim() || "",
    password: document.getElementById("odoo-password")?.value?.trim() || "",
  };
}

function setStatus(conectado) {
  const badge = document.getElementById("status-badge");
  if (!badge) return;
  badge.textContent = conectado ? "● Conectado" : "● Desconectado";
  badge.style.background = conectado ? "#22c55e" : "#ef4444";
}

function setModuleStatus(moduleId, status) {
  // status: 'pendiente' | 'sincronizado' | 'error'
  const el = document.getElementById(moduleId);
  if (!el) return;
  const colores = { pendiente: "#94a3b8", sincronizado: "#22c55e", error: "#ef4444" };
  const textos = { pendiente: "PENDIENTE", sincronizado: "✓ SINCRONIZADO", error: "ERROR" };
  el.textContent = textos[status] || status;
  el.style.color = colores[status] || "#94a3b8";
}

function showAlert(msg, tipo = "info") {
  // tipo: 'success' | 'error' | 'info'
  const colores = { success: "#22c55e", error: "#ef4444", info: "#3b82f6" };
  const div = document.createElement("div");
  div.style.cssText = `
    position:fixed; top:20px; right:20px; z-index:9999;
    background:${colores[tipo]}; color:white; padding:12px 20px;
    border-radius:8px; font-weight:600; max-width:350px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

// ─── PROBAR CONEXIÓN ──────────────────────────────────────────────────────────
async function probarConexion() {
  const creds = getCredentials();
  const btn = document.getElementById("btn-probar");

  if (!creds.db || !creds.username || !creds.password) {
    showAlert("Completa todos los campos antes de probar.", "error");
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = "⏳ Probando..."; }

  try {
    const resp = await fetch(`${PROXY_URL}/api/odoo/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds),
    });
    const data = await resp.json();

    if (data.ok) {
      setStatus(true);
      showAlert(`✅ Conexión exitosa con Odoo ${data.server_version} (UID: ${data.uid})`, "success");
      localStorage.setItem("odoo_credentials", JSON.stringify(creds));
    } else {
      setStatus(false);
      showAlert("❌ Error: " + data.error, "error");
    }
  } catch (e) {
    showAlert("❌ No se pudo contactar al proxy. ¿Está corriendo node odoo-proxy.js?", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "🔌 Probar conexión"; }
  }
}

// ─── GUARDAR Y SINCRONIZAR ────────────────────────────────────────────────────
async function guardarYConectar() {
  const creds = getCredentials();
  const btn = document.getElementById("btn-guardar");

  if (!creds.db || !creds.username || !creds.password) {
    showAlert("Completa todos los campos.", "error");
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = "⏳ Sincronizando..."; }

  // Poner todos los módulos en estado cargando
  ["mod-productos", "mod-inventario", "mod-pedidos", "mod-facturas", "mod-clientes"].forEach(
    (id) => setModuleStatus(id, "pendiente")
  );

  try {
    const resp = await fetch(`${PROXY_URL}/api/odoo/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds),
    });
    const data = await resp.json();

    if (data.ok) {
      setStatus(true);
      localStorage.setItem("odoo_credentials", JSON.stringify(creds));
      localStorage.setItem("odoo_uid", data.uid);

      // Marcar módulos como sincronizados
      setModuleStatus("mod-productos", data.data.productos?.length ? "sincronizado" : "error");
      setModuleStatus("mod-inventario", data.data.inventario?.length >= 0 ? "sincronizado" : "error");
      setModuleStatus("mod-pedidos", data.data.pedidos?.length >= 0 ? "sincronizado" : "error");
      setModuleStatus("mod-facturas", data.data.facturas?.length >= 0 ? "sincronizado" : "error");
      setModuleStatus("mod-clientes", data.data.clientes?.length >= 0 ? "sincronizado" : "error");

      showAlert("✅ ¡Conectado y sincronizado con Odoo 17!", "success");

      // Guardar datos en window para uso en otras páginas
      window.odooData = data.data;
      console.log("📦 Datos Odoo disponibles en window.odooData:", data.data);
    } else {
      setStatus(false);
      showAlert("❌ Error: " + data.error, "error");
    }
  } catch (e) {
    showAlert("❌ No se pudo contactar al proxy. ¿Está corriendo node odoo-proxy.js?", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "✅ Guardar y conectar"; }
  }
}

// ─── AUTO-CARGAR CREDENCIALES GUARDADAS ───────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("odoo_credentials");
  if (saved) {
    try {
      const creds = JSON.parse(saved);
      if (document.getElementById("odoo-url")) document.getElementById("odoo-url").value = creds.url;
      if (document.getElementById("odoo-db")) document.getElementById("odoo-db").value = creds.db;
      if (document.getElementById("odoo-user")) document.getElementById("odoo-user").value = creds.username;
    } catch (_) {}
  }

  // Asignar eventos a los botones
  document.getElementById("btn-probar")?.addEventListener("click", probarConexion);
  document.getElementById("btn-guardar")?.addEventListener("click", guardarYConectar);
});
