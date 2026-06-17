(function () {
  const STORAGE_KEY = "nexar.portal.vendedor.session";
  const LOGIN_ENDPOINT = "/.netlify/functions/portal-login-vendedor";
  const CHANGE_PASSWORD_ENDPOINT = "/.netlify/functions/portal-change-password";
  const UPDATE_PROFILE_ENDPOINT = "/.netlify/functions/portal-update-profile";
  const PASSWORD_RECOVERY_ENDPOINT = "/.netlify/functions/portal-password-recovery";
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

  function getStatusElement(statusId = "portal-status") {
    return document.getElementById(statusId);
  }

  function showStatus(message, type, statusId = "portal-status") {
    const element = getStatusElement(statusId);
    if (!element) {
      return;
    }

    element.textContent = message;
    element.className = `portal-status is-visible is-${type}`;
  }

  function hideStatus(statusId = "portal-status") {
    const element = getStatusElement(statusId);
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

  function requiresPasswordChange(session) {
    return Boolean(session && session.vendedor && session.vendedor.password_change_required);
  }

  function getDefaultPortalRoute(session) {
    return requiresPasswordChange(session) ? "./perfil.html" : "./dashboard.html";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

  async function fetchProfile(sessionToken) {
    const response = await fetch(`${UPDATE_PROFILE_ENDPOINT}?session_token=${encodeURIComponent(sessionToken)}`, {
      method: "GET"
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error((payload && payload.error) || "No pudimos cargar el perfil.");
    }

    return payload;
  }

  function renderProfileIdentity(vendedor) {
    const labels = {
      profile_codigo_vendedor: vendedor.codigo_vendedor || "-",
      profile_nombre: vendedor.nombre || "-",
      profile_apellido: vendedor.apellido || "-",
      profile_dni: vendedor.dni || "-"
    };

    Object.entries(labels).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });

    const emailField = document.getElementById("profile_email");
    const telefonoField = document.getElementById("profile_telefono");
    const aliasField = document.getElementById("profile_alias_cbu");

    if (emailField) {
      emailField.value = vendedor.email || "";
    }
    if (telefonoField) {
      telefonoField.value = vendedor.telefono || "";
    }
    if (aliasField) {
      aliasField.value = vendedor.alias_cbu || "";
    }
  }

  async function initLoginPage() {
    const existingSession = loadSession();
    if (existingSession && !isExpired(existingSession)) {
      window.location.href = getDefaultPortalRoute(existingSession);
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
        window.location.href = getDefaultPortalRoute(payload);
      } catch (error) {
        console.error("Portal vendedor: error al iniciar sesion.", error);
        showStatus("No pudimos iniciar sesion. Verificá tus datos e intentá nuevamente.", "error");
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Ingresar";
      }
    });
  }

  async function initRecoveryPage() {
    const form = document.getElementById("portal-recovery-form");
    const submitButton = document.getElementById("portal-recovery-submit");
    if (!form || !submitButton) {
      return;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      hideStatus();

      const codigoField = document.getElementById("recovery_codigo_vendedor");
      const emailField = document.getElementById("recovery_email");
      const telefonoField = document.getElementById("recovery_telefono");
      const mensajeField = document.getElementById("recovery_mensaje");

      const codigo = codigoField ? codigoField.value.trim().toUpperCase() : "";
      const email = emailField ? emailField.value.trim().toLowerCase() : "";
      const telefono = telefonoField ? telefonoField.value.trim() : "";
      const mensaje = mensajeField ? mensajeField.value.trim() : "";

      if (!codigo) {
        showStatus("Ingresá tu código vendedor para continuar.", "error");
        return;
      }

      if (!email && !telefono) {
        showStatus("Ingresá email o teléfono para continuar.", "error");
        return;
      }

      if (email && !isValidEmail(email)) {
        showStatus("Si informás email, debe tener un formato válido.", "error");
        return;
      }

      if (mensaje.length > 500) {
        showStatus("El mensaje es demasiado largo.", "error");
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Enviando...";
      showStatus("Registrando solicitud...", "loading");

      try {
        const response = await fetch(PASSWORD_RECOVERY_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            codigo_vendedor: codigo,
            email,
            telefono,
            mensaje
          })
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error((payload && payload.error) || "No pudimos registrar la solicitud.");
        }

        form.reset();
        showStatus(
          (payload && payload.message) || "Si los datos son correctos, registramos tu solicitud.",
          "success"
        );
      } catch (error) {
        console.error("Portal vendedor: error al solicitar recuperacion.", error);
        showStatus(error.message || "No pudimos registrar la solicitud.", "error");
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Enviar solicitud";
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

    if (requiresPasswordChange(session)) {
      window.location.href = "./perfil.html";
      return;
    }

    showStatus("Cargando dashboard...", "loading");

    try {
      const payload = await callSupabaseRpc(DASHBOARD_RPC, {
        p_session_token: session.session_token
      });

      saveSession({
        ...session,
        vendedor: {
          ...(session.vendedor || {}),
          ...(payload.vendedor || {})
        }
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

  async function initProfilePage() {
    bindLogout();

    const session = loadSession();
    if (!session || isExpired(session) || !session.session_token) {
      clearSession();
      window.location.href = "./login.html";
      return;
    }

    const title = document.getElementById("portal-profile-title");
    const copy = document.getElementById("portal-profile-copy");
    const profileForm = document.getElementById("portal-update-profile-form");
    const profileSubmitButton = document.getElementById("portal-update-profile-submit");
    const passwordForm = document.getElementById("portal-change-password-form");
    const passwordSubmitButton = document.getElementById("portal-change-password-submit");
    const forcedChange = requiresPasswordChange(session);
    let currentSession = session;

    if (title) {
      title.textContent = forcedChange ? "Completar perfil y cambiar contraseña" : "Mi perfil";
    }

    if (copy) {
      copy.textContent = forcedChange
        ? "Este es tu primer acceso o tenés una clave temporal. Primero revisá tus datos y definí una nueva contraseña."
        : "Actualizá tus datos de contacto y cobro, y cambiá tu contraseña cuando lo necesites.";
    }

    try {
      const payload = await fetchProfile(session.session_token);
      currentSession = {
        ...session,
        vendedor: {
          ...(session.vendedor || {}),
          ...(payload.vendedor || {})
        }
      };
      saveSession(currentSession);
      renderProfileIdentity(currentSession.vendedor || {});
    } catch (error) {
      console.error("Portal vendedor: error al cargar perfil.", error);
      clearSession();
      showStatus(error.message || "No pudimos cargar tu perfil.", "error", "portal-profile-status");
      setTimeout(() => {
        window.location.href = "./login.html";
      }, 1400);
      return;
    }

    if (profileForm && profileSubmitButton) {
      profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        hideStatus("portal-profile-status");

        const emailField = document.getElementById("profile_email");
        const telefonoField = document.getElementById("profile_telefono");
        const aliasField = document.getElementById("profile_alias_cbu");

        const email = emailField ? emailField.value.trim().toLowerCase() : "";
        const telefono = telefonoField ? telefonoField.value.trim() : "";
        const aliasCbu = aliasField ? aliasField.value.trim() : "";

        if (email && !isValidEmail(email)) {
          showStatus("Si informás email, debe tener un formato válido.", "error", "portal-profile-status");
          return;
        }

        profileSubmitButton.disabled = true;
        profileSubmitButton.textContent = "Guardando...";
        showStatus("Actualizando datos de contacto...", "loading", "portal-profile-status");

        try {
          const response = await fetch(UPDATE_PROFILE_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              session_token: currentSession.session_token,
              email,
              telefono,
              alias_cbu: aliasCbu
            })
          });

          const payload = await response.json();
          if (!response.ok) {
            throw new Error((payload && payload.error) || "No pudimos actualizar el perfil.");
          }

          currentSession = {
            ...currentSession,
            vendedor: {
              ...(currentSession.vendedor || {}),
              ...(payload.vendedor || {})
            }
          };
          saveSession(currentSession);
          renderProfileIdentity(currentSession.vendedor || {});
          showStatus("Datos actualizados correctamente.", "success", "portal-profile-status");
        } catch (error) {
          console.error("Portal vendedor: error al actualizar perfil.", error);
          showStatus(error.message || "No pudimos actualizar el perfil.", "error", "portal-profile-status");
        } finally {
          profileSubmitButton.disabled = false;
          profileSubmitButton.textContent = "Guardar datos";
        }
      });
    }

    if (!passwordForm || !passwordSubmitButton) {
      return;
    }

    passwordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      hideStatus("portal-password-status");

      const currentPasswordField = document.getElementById("current_password");
      const newPasswordField = document.getElementById("new_password");
      const confirmPasswordField = document.getElementById("confirm_password");

      const currentPassword = currentPasswordField ? currentPasswordField.value : "";
      const newPassword = newPasswordField ? newPasswordField.value : "";
      const confirmPassword = confirmPasswordField ? confirmPasswordField.value : "";

      if (!currentPassword || !newPassword || !confirmPassword) {
        showStatus("Completá los tres campos para actualizar la contraseña.", "error", "portal-password-status");
        return;
      }

      passwordSubmitButton.disabled = true;
      passwordSubmitButton.textContent = "Guardando...";
      showStatus("Actualizando contraseña...", "loading", "portal-password-status");

      try {
        const response = await fetch(CHANGE_PASSWORD_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            session_token: currentSession.session_token,
            current_password: currentPassword,
            new_password: newPassword,
            confirm_password: confirmPassword
          })
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error((payload && payload.error) || "No pudimos actualizar la contraseña.");
        }

        currentSession = {
          ...currentSession,
          vendedor: {
            ...(currentSession.vendedor || {}),
            ...(payload.vendedor || {}),
            password_change_required: false
          }
        };
        saveSession(currentSession);

        passwordForm.reset();
        showStatus("Contraseña actualizada correctamente. Ya podés continuar al dashboard.", "success", "portal-password-status");

        setTimeout(() => {
          window.location.href = "./dashboard.html";
        }, 900);
      } catch (error) {
        console.error("Portal vendedor: error al cambiar contraseña.", error);
        showStatus(error.message || "No pudimos actualizar la contraseña.", "error", "portal-password-status");
      } finally {
        passwordSubmitButton.disabled = false;
        passwordSubmitButton.textContent = "Guardar nueva contraseña";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (page === "login") {
      initLoginPage();
      return;
    }

    if (page === "recovery") {
      initRecoveryPage();
      return;
    }

    if (page === "dashboard") {
      initDashboardPage();
      return;
    }

    if (page === "profile") {
      initProfilePage();
    }
  });
})();
