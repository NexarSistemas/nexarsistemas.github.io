(function () {
  const STORAGE_KEY = "nexar.portal.vendedor.session";
  const LOGIN_ENDPOINT = "/.netlify/functions/portal-login-vendedor";
  const DASHBOARD_RPC = "portal_dashboard_vendedor";

  const page = document.body ? document.body.dataset.portalPage : "";

  function getConfig() {
    const config = window.NEXAR_SUPABASE_CONFIG || {};
    const url = typeof config.url === "string" ? config.url.trim() : "";
    const anonKey = typeof config.anonKey === "string" ? config.anonKey.trim() : "";
    const isPlaceholder =
      !url ||
      !anonKey ||
      url.includes("TU-PROYECTO") ||
      anonKey.includes("TU_ANON_PUBLIC_KEY");

    return {
      url,
      anonKey,
      ready: !isPlaceholder
    };
  }

  function getStatusElement() {
    return document.getElementById("portal-status");
  }

  function showStatus(message, type) {
    const element = getStatusElement();
    if (!element) {
      return;
    }

    element.textContent = message;
    element.className = `portal-status is-visible is-${type}`;
  }

  function hideStatus() {
    const element = getStatusElement();
    if (!element) {
      return;
    }

    element.textContent = "";
    element.className = "portal-status";
  }

  function saveSession(payload) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function loadSession() {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  function clearSession() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function isExpired(session) {
    if (!session || !session.expires_at) {
      return true;
    }

    const expiresAt = Date.parse(session.expires_at);
    return Number.isNaN(expiresAt) || expiresAt <= Date.now();
  }

  async function callSupabaseRpc(functionName, payload) {
    const config = getConfig();
    if (!config.ready) {
      throw new Error("Falta configurar assets/js/supabase-config.js.");
    }

    const response = await fetch(`${config.url}/rest/v1/rpc/${functionName}`, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let detail = "";
      try {
        const errorData = await response.json();
        detail = errorData.message || errorData.error || errorData.hint || "";
      } catch (error) {
        detail = "";
      }

      throw new Error(detail || `Supabase respondio con estado ${response.status}.`);
    }

    return response.json();
  }

  function formatCurrency(value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 2
    }).format(amount);
  }

  function formatDate(value) {
    if (!value) {
      return "-";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: value.includes("T") ? "short" : undefined
    }).format(parsed);
  }

  function createStatCard(label, value, hint) {
    return `
      <article class="portal-stat">
        <span>${label}</span>
        <strong>${value}</strong>
        <span>${hint}</span>
      </article>
    `;
  }

  function statePillClass(value) {
    if (value === "pagada") {
      return "is-paid";
    }
    if (value === "pendiente") {
      return "is-pending";
    }
    return "is-cancelled";
  }

  function renderTable(containerId, columns, rows) {
    const container = document.getElementById(containerId);
    if (!container) {
      return;
    }

    if (!Array.isArray(rows) || !rows.length) {
      container.innerHTML = '<p class="portal-empty">Todavia no hay datos para mostrar.</p>';
      return;
    }

    const head = columns.map((column) => `<th>${column.label}</th>`).join("");
    const body = rows.map((row) => `
      <tr>
        ${columns.map((column) => `<td>${column.render(row)}</td>`).join("")}
      </tr>
    `).join("");

    container.innerHTML = `
      <table class="portal-table">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    `;
  }

  function bindLogout() {
    const targets = [
      document.getElementById("portal-logout-button"),
      document.getElementById("portal-logout-link")
    ].filter(Boolean);

    targets.forEach((element) => {
      element.addEventListener("click", (event) => {
        event.preventDefault();
        clearSession();
        window.location.href = "./login.html";
      });
    });
  }

  async function initLoginPage() {
    const existingSession = loadSession();
    if (existingSession && !isExpired(existingSession)) {
      window.location.href = "./dashboard.html";
      return;
    }

    clearSession();

    const form = document.getElementById("portal-login-form");
    const submitButton = document.getElementById("portal-login-submit");
    if (!form || !submitButton) {
      return;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      hideStatus();

      const codigoField = document.getElementById("codigo_vendedor");
      const passwordField = document.getElementById("password");
      const codigo = codigoField ? codigoField.value.trim().toUpperCase() : "";
      const password = passwordField ? passwordField.value : "";

      if (!codigo || !password) {
        showStatus("Completá código vendedor y contraseña para continuar.", "error");
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Ingresando...";
      showStatus("Validando acceso...", "loading");

      try {
        const response = await fetch(LOGIN_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            codigo_vendedor: codigo,
            password
          })
        });

        if (!response.ok) {
          throw new Error("Credenciales invalidas.");
        }

        const payload = await response.json();
        if (!payload || !payload.session_token || !payload.vendedor) {
          throw new Error("Respuesta incompleta.");
        }

        saveSession(payload);
        window.location.href = "./dashboard.html";
      } catch (error) {
        console.error("Portal vendedor: error al iniciar sesion.", error);
        showStatus("No pudimos iniciar sesion. Verificá tus datos e intentá nuevamente.", "error");
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Ingresar";
      }
    });
  }

  function renderDashboard(payload) {
    const vendedor = payload.vendedor || {};
    const resumen = payload.resumen || {};
    const title = document.getElementById("portal-title");
    const subtitle = document.getElementById("portal-subtitle");
    const summary = document.getElementById("portal-summary");
    const adminSummary = document.getElementById("portal-admin-summary");

    if (title) {
      title.textContent = vendedor.es_admin
        ? `Dashboard general - ${vendedor.nombre || ""} ${vendedor.apellido || ""}`.trim()
        : `Dashboard de ${vendedor.nombre || ""} ${vendedor.apellido || ""}`.trim();
    }

    if (subtitle) {
      const rolePill = vendedor.es_admin
        ? '<span class="portal-pill is-admin">Vendedor admin</span>'
        : '<span class="portal-pill is-standard">Vendedor</span>';
      subtitle.innerHTML = `${rolePill} Codigo ${vendedor.codigo_vendedor || "-"}`;
    }

    if (summary) {
      summary.innerHTML = [
        createStatCard("Licencias", String(resumen.total_licencias || 0), "Ventas/licencias visibles"),
        createStatCard("Comisiones pendientes", String(resumen.comisiones_pendientes || 0), "Movimientos pendientes"),
        createStatCard("Total pendiente", formatCurrency(resumen.total_pendiente || 0), "Monto a liquidar"),
        createStatCard("Total pagado", formatCurrency(resumen.total_pagado || 0), "Historial abonado")
      ].join("");
    }

    if (adminSummary) {
      if (vendedor.es_admin) {
        adminSummary.hidden = false;
        adminSummary.innerHTML = `
          <h2>Resumen general</h2>
          <p>Vendedores totales: <strong>${resumen.total_vendedores || 0}</strong></p>
          <p>Vendedores activos: <strong>${resumen.vendedores_activos || 0}</strong></p>
          <p>Comisiones pagadas: <strong>${resumen.comisiones_pagadas || 0}</strong></p>
        `;
      } else {
        adminSummary.hidden = true;
        adminSummary.innerHTML = "";
      }
    }

    renderTable("portal-licenses", [
      { label: "Fecha", render: (row) => formatDate(row.created_at) },
      { label: "Licencia", render: (row) => row.license_key || "-" },
      { label: "Producto", render: (row) => row.producto || "-" },
      { label: "Cliente", render: (row) => row.usuario || "-" },
      { label: "Plan", render: (row) => row.plan_vendido || row.plan || "-" },
      { label: "Expira", render: (row) => formatDate(row.expira) }
    ], payload.ultimas_licencias || []);

    renderTable("portal-commissions", [
      { label: "Fecha", render: (row) => formatDate(row.created_at) },
      { label: "Tipo", render: (row) => row.tipo || "-" },
      { label: "Producto", render: (row) => row.producto || "-" },
      { label: "Licencia", render: (row) => row.license_key || "-" },
      { label: "Monto", render: (row) => formatCurrency(row.monto || 0) },
      {
        label: "Estado",
        render: (row) => `<span class="portal-pill ${statePillClass(row.estado)}">${row.estado || "-"}</span>`
      }
    ], payload.ultimas_comisiones || []);
  }

  async function initDashboardPage() {
    bindLogout();

    const session = loadSession();
    if (!session || isExpired(session) || !session.session_token) {
      clearSession();
      window.location.href = "./login.html";
      return;
    }

    showStatus("Cargando dashboard...", "loading");

    try {
      const payload = await callSupabaseRpc(DASHBOARD_RPC, {
        p_session_token: session.session_token
      });

      saveSession({
        ...session,
        vendedor: payload.vendedor || session.vendedor
      });
      renderDashboard(payload);
      hideStatus();
    } catch (error) {
      console.error("Portal vendedor: error al cargar dashboard.", error);
      clearSession();
      showStatus("La sesion vencio o no pudimos cargar tus datos. Ingresá nuevamente.", "error");
      setTimeout(() => {
        window.location.href = "./login.html";
      }, 1400);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (page === "login") {
      initLoginPage();
      return;
    }

    if (page === "dashboard") {
      initDashboardPage();
    }
  });
})();
