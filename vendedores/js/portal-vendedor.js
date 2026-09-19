(function () {
  const page = document.body ? document.body.dataset.portalPage : "";
  const LOGIN_ROUTE = "./login.html";
  const PROFILE_FIELDS = "id,codigo_vendedor,email,telefono,alias_cbu";
  const LICENSE_FIELDS = "license_key,producto,usuario,plan,plan_vendido,expira,created_at";
  const COMMISSION_FIELDS = "tipo,producto,license_key,monto,estado,created_at,paid_at";

  function getConfig() {
    const config = window.NEXAR_SUPABASE_CONFIG || {};
    const url = typeof config.url === "string" ? config.url.trim() : "";
    const anonKey = typeof config.anonKey === "string" ? config.anonKey.trim() : "";
    const ready = url && anonKey && !url.includes("TU-PROYECTO") && !anonKey.includes("TU_ANON_PUBLIC_KEY");
    return { url, anonKey, ready };
  }

  function getClient() {
    const config = getConfig();
    if (!config.ready || !window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("No pudimos preparar el acceso seguro al portal.");
    }
    return window.supabase.createClient(config.url, config.anonKey);
  }

  function getStatusElement(statusId = "portal-status") { return document.getElementById(statusId); }
  function showStatus(message, type, statusId = "portal-status") {
    const element = getStatusElement(statusId);
    if (!element) return;
    element.textContent = message;
    element.className = `portal-status is-visible is-${type}`;
  }
  function hideStatus(statusId = "portal-status") {
    const element = getStatusElement(statusId);
    if (!element) return;
    element.textContent = "";
    element.className = "portal-status";
  }
  function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
  function escapeHtml(value) {
    return String(value ?? "-").replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function formatCurrency(value) {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(Number(value || 0));
  }
  function formatDate(value) {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: value.includes("T") ? "short" : undefined }).format(parsed);
  }
  function createStatCard(label, value, hint) {
    return `<article class="portal-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><span>${escapeHtml(hint)}</span></article>`;
  }
  function statePillClass(value) { return value === "pagada" ? "is-paid" : value === "pendiente" ? "is-pending" : "is-cancelled"; }
  function renderTable(containerId, columns, rows) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!rows.length) { container.innerHTML = '<p class="portal-empty">Todavía no hay datos para mostrar.</p>'; return; }
    const head = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
    const body = rows.map((row) => `<tr>${columns.map((column) => `<td>${column.render(row)}</td>`).join("")}</tr>`).join("");
    container.innerHTML = `<table class="portal-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  }

  async function getPortalIdentity(client) {
    const { data: sessionData } = await client.auth.getSession();
    const session = sessionData.session;
    if (!session || !session.user) return null;
    const { data: profile, error } = await client.from("perfiles")
      .select("user_id,nombre,rol,activo,vendedor_id").eq("user_id", session.user.id).maybeSingle();
    if (error || !profile || !profile.activo || profile.rol !== "vendedor" || !profile.vendedor_id) {
      await client.auth.signOut();
      return null;
    }
    return { session, profile };
  }
  async function requirePortalIdentity(client, statusId) {
    const identity = await getPortalIdentity(client);
    if (identity) return identity;
    if (statusId) showStatus("Tu acceso no está habilitado para el portal.", "error", statusId);
    window.setTimeout(() => { window.location.href = LOGIN_ROUTE; }, statusId ? 1000 : 0);
    return null;
  }
  function bindLogout(client) {
    [document.getElementById("portal-logout-button"), document.getElementById("portal-logout-link")].filter(Boolean).forEach((element) => {
      if (element.dataset.logoutBound === "true") return;
      element.dataset.logoutBound = "true";
      element.addEventListener("click", async (event) => {
        event.preventDefault(); await client.auth.signOut(); window.location.href = LOGIN_ROUTE;
      });
    });
  }

  async function initLoginPage() {
    const client = getClient();
    const { data } = await client.auth.getSession();
    if (data.session && await getPortalIdentity(client)) { window.location.href = "./dashboard.html"; return; }
    const form = document.getElementById("portal-login-form");
    const submitButton = document.getElementById("portal-login-submit");
    if (!form || !submitButton) return;
    form.addEventListener("submit", async (event) => {
      event.preventDefault(); hideStatus();
      const email = document.getElementById("email")?.value.trim().toLowerCase() || "";
      const password = document.getElementById("password")?.value || "";
      if (!isValidEmail(email) || !password) { showStatus("Ingresá tu email de acceso y contraseña.", "error"); return; }
      submitButton.disabled = true; submitButton.textContent = "Ingresando..."; showStatus("Validando acceso...", "loading");
      try {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error || !await getPortalIdentity(client)) {
          await client.auth.signOut(); showStatus("No pudimos iniciar sesión. Verificá tus datos e intentá nuevamente.", "error");
        } else window.location.href = "./dashboard.html";
      } catch (error) {
        showStatus("No pudimos iniciar sesión. Intentá nuevamente.", "error");
      } finally {
        submitButton.disabled = false; submitButton.textContent = "Ingresar";
      }
    });
  }

  async function initRecoveryPage() {
    const client = getClient();
    const form = document.getElementById("portal-recovery-form");
    const submitButton = document.getElementById("portal-recovery-submit");
    if (!form || !submitButton) return;
    form.addEventListener("submit", async (event) => {
      event.preventDefault(); hideStatus();
      const email = document.getElementById("recovery_email")?.value.trim().toLowerCase() || "";
      if (!isValidEmail(email)) { showStatus("Ingresá un email de acceso válido.", "error"); return; }
      submitButton.disabled = true; submitButton.textContent = "Enviando...";
      const redirectTo = `${window.location.origin}${window.location.pathname.replace("recuperar.html", "perfil.html")}?recovery=1`;
      try {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) showStatus("No pudimos solicitar el restablecimiento. Intentá nuevamente.", "error");
        else { form.reset(); showStatus("Si el email está registrado, vas a recibir instrucciones para restablecer tu contraseña.", "success"); }
      } catch (error) {
        showStatus("No pudimos solicitar el restablecimiento. Intentá nuevamente.", "error");
      } finally {
        submitButton.disabled = false; submitButton.textContent = "Enviar enlace";
      }
    });
  }

  function renderDashboard(identity, seller, licenses, commissions) {
    const title = document.getElementById("portal-title");
    const subtitle = document.getElementById("portal-subtitle");
    if (title) title.textContent = `Dashboard de ${identity.profile.nombre}`;
    if (subtitle) subtitle.textContent = `Vendedor ${seller.codigo_vendedor || "-"}`;
    const summary = document.getElementById("portal-summary");
    if (summary) {
      const pending = commissions.filter((item) => item.estado === "pendiente");
      const pendingTotal = pending.reduce((total, item) => total + Number(item.monto || 0), 0);
      summary.innerHTML = [
        createStatCard("Licencias recientes", String(licenses.length), "Información visible para tu cuenta"),
        createStatCard("Comisiones recientes", String(commissions.length), "Información visible para tu cuenta"),
        createStatCard("Pendiente reciente", formatCurrency(pendingTotal), "Según los movimientos mostrados")
      ].join("");
    }
    renderTable("portal-licenses", [
      { label: "Fecha", render: (row) => escapeHtml(formatDate(row.created_at)) },
      { label: "Licencia", render: (row) => escapeHtml(row.license_key) },
      { label: "Producto", render: (row) => escapeHtml(row.producto) },
      { label: "Cliente", render: (row) => escapeHtml(row.usuario) },
      { label: "Plan", render: (row) => escapeHtml(row.plan_vendido || row.plan) },
      { label: "Expira", render: (row) => escapeHtml(formatDate(row.expira)) }
    ], licenses);
    renderTable("portal-commissions", [
      { label: "Fecha", render: (row) => escapeHtml(formatDate(row.created_at)) },
      { label: "Tipo", render: (row) => escapeHtml(row.tipo) },
      { label: "Producto", render: (row) => escapeHtml(row.producto) },
      { label: "Licencia", render: (row) => escapeHtml(row.license_key) },
      { label: "Monto", render: (row) => escapeHtml(formatCurrency(row.monto)) },
      { label: "Estado", render: (row) => `<span class="portal-pill ${statePillClass(row.estado)}">${escapeHtml(row.estado)}</span>` }
    ], commissions);
  }
  async function initDashboardPage() {
    const client = getClient(); bindLogout(client);
    const identity = await requirePortalIdentity(client, "portal-status");
    if (!identity) return;
    showStatus("Cargando dashboard...", "loading");
    try {
      const [sellerResult, licenseResult, commissionResult] = await Promise.all([
        client.from("vendedores").select(PROFILE_FIELDS).eq("id", identity.profile.vendedor_id).maybeSingle(),
        client.from("licencias").select(LICENSE_FIELDS).order("created_at", { ascending: false }).limit(25),
        client.from("comisiones").select(COMMISSION_FIELDS).order("created_at", { ascending: false }).limit(25)
      ]);
      if (sellerResult.error || !sellerResult.data || licenseResult.error || commissionResult.error) {
        showStatus("No pudimos cargar los datos autorizados para tu cuenta.", "error"); return;
      }
      renderDashboard(identity, sellerResult.data, licenseResult.data || [], commissionResult.data || []); hideStatus();
    } catch (error) {
      showStatus("No pudimos cargar los datos autorizados para tu cuenta.", "error"); return;
    }
  }

  function renderProfile(identity, seller) {
    const values = { profile_codigo_vendedor: seller.codigo_vendedor || "-", profile_nombre: identity.profile.nombre || "-", profile_login_email: identity.session.user.email || "-" };
    Object.entries(values).forEach(([id, value]) => { const element = document.getElementById(id); if (element) element.textContent = value; });
    document.getElementById("profile_email").value = seller.email || "";
    document.getElementById("profile_telefono").value = seller.telefono || "";
    document.getElementById("profile_alias_cbu").value = seller.alias_cbu || "";
  }
  async function initProfilePage() {
    const client = getClient(); bindLogout(client);
    const identity = await requirePortalIdentity(client, "portal-profile-status");
    if (!identity) return;
    const sellerResult = await client.from("vendedores").select(PROFILE_FIELDS).eq("id", identity.profile.vendedor_id).maybeSingle();
    if (sellerResult.error || !sellerResult.data) { showStatus("No pudimos cargar tu perfil.", "error", "portal-profile-status"); return; }
    let seller = sellerResult.data; renderProfile(identity, seller);
    const profileForm = document.getElementById("portal-update-profile-form");
    const profileSubmit = document.getElementById("portal-update-profile-submit");
    profileForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = document.getElementById("profile_email").value.trim().toLowerCase();
      const telefono = document.getElementById("profile_telefono").value.trim();
      const alias_cbu = document.getElementById("profile_alias_cbu").value.trim();
      if (email && !isValidEmail(email)) { showStatus("Si informás email, debe tener un formato válido.", "error", "portal-profile-status"); return; }
      profileSubmit.disabled = true;
      const { data, error } = await client.from("vendedores").update({ email, telefono, alias_cbu }).eq("id", seller.id).select(PROFILE_FIELDS).maybeSingle();
      profileSubmit.disabled = false;
      if (error || !data) { showStatus("No pudimos actualizar tus datos de contacto.", "error", "portal-profile-status"); return; }
      seller = data; renderProfile(identity, seller); showStatus("Datos actualizados correctamente.", "success", "portal-profile-status");
    });
    const passwordForm = document.getElementById("portal-change-password-form");
    const passwordSubmit = document.getElementById("portal-change-password-submit");
    const recoveryMode = new URLSearchParams(window.location.search).get("recovery") === "1";
    if (recoveryMode) { document.getElementById("current_password_group").hidden = true; document.getElementById("portal-profile-copy").textContent = "Definí una nueva contraseña para recuperar tu acceso."; }
    passwordForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const currentPassword = document.getElementById("current_password").value;
      const newPassword = document.getElementById("new_password").value;
      const confirmPassword = document.getElementById("confirm_password").value;
      if (!newPassword || newPassword !== confirmPassword || (!recoveryMode && !currentPassword)) { showStatus("Revisá los datos de la nueva contraseña.", "error", "portal-password-status"); return; }
      passwordSubmit.disabled = true;
      if (!recoveryMode) {
        const verified = await client.auth.signInWithPassword({ email: identity.session.user.email, password: currentPassword });
        if (verified.error) { passwordSubmit.disabled = false; showStatus("No pudimos verificar la contraseña actual.", "error", "portal-password-status"); return; }
      }
      const { error } = await client.auth.updateUser({ password: newPassword });
      passwordSubmit.disabled = false;
      if (error) showStatus("No pudimos actualizar la contraseña. Intentá nuevamente.", "error", "portal-password-status");
      else { passwordForm.reset(); showStatus("Contraseña actualizada correctamente.", "success", "portal-password-status"); history.replaceState({}, "", "./perfil.html"); }
    });
  }

  function bindPrintSheets() {
    let selectedSheet = null;
    const clearPrintState = () => { document.body.classList.remove("is-printing-sheet"); selectedSheet?.classList.remove("is-print-target"); selectedSheet = null; };
    window.addEventListener("afterprint", clearPrintState);
    document.querySelectorAll("[data-print-sheet]").forEach((button) => button.addEventListener("click", () => {
      const sheet = document.getElementById(button.dataset.printSheet); if (!sheet) return;
      clearPrintState(); selectedSheet = sheet; document.body.classList.add("is-printing-sheet"); selectedSheet.classList.add("is-print-target"); window.print();
    }));
  }
  function copyTextFallback(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text; textarea.setAttribute("readonly", ""); textarea.style.position = "fixed"; textarea.style.left = "-9999px";
    document.body.appendChild(textarea); textarea.select();
    try { return document.execCommand("copy"); } finally { document.body.removeChild(textarea); }
  }
  function bindCopyTargets() {
    const status = document.getElementById("copy-status");
    document.querySelectorAll("[data-copy-target]").forEach((button) => {
      const defaultLabel = button.textContent;
      button.addEventListener("click", async () => {
        const text = document.getElementById(button.dataset.copyTarget)?.textContent.trim() || "";
        let copied = false;
        try { if (text && navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); copied = true; } } catch (error) { copied = false; }
        if (text && !copied) copied = copyTextFallback(text);
        button.textContent = copied ? "Mensaje copiado" : "No se pudo copiar"; if (status) status.textContent = button.textContent;
        window.setTimeout(() => { button.textContent = defaultLabel; if (status) status.textContent = ""; }, 1500);
      });
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    bindPrintSheets(); bindCopyTargets();
    if (page === "material") bindLogout(getClient());
    if (page === "login") initLoginPage();
    if (page === "recovery") initRecoveryPage();
    if (page === "dashboard") initDashboardPage();
    if (page === "profile") initProfilePage();
  });
})();
