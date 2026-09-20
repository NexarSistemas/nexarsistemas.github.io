const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("el frontend del portal usa Auth y consultas RLS con campos permitidos", () => {
  const script = read("vendedores/js/portal-vendedor.js");
  assert.match(script, /auth\.signInWithPassword/);
  assert.match(script, /auth\.signOut/);
  assert.match(script, /auth\.resetPasswordForEmail/);
  assert.match(script, /auth\.updateUser/);
  assert.match(script, /from\("perfiles"\)/);
  assert.match(script, /from\("vendedores"\)/);
  assert.match(script, /from\("licencias"\)/);
  assert.match(script, /from\("comisiones"\)/);
  assert.match(script, /const PROFILE_FIELDS = "id,codigo_vendedor,email,telefono,alias_cbu"/);
  assert.match(script, /const LICENSE_FIELDS = "license_key,producto,usuario,plan,plan_vendido,expira,created_at"/);
  assert.match(script, /const COMMISSION_FIELDS = "tipo,producto,license_key,monto,estado,created_at,paid_at"/);
});

test("el frontend del portal no llama autenticación, sesión ni RPC legacy", () => {
  const script = read("vendedores/js/portal-vendedor.js");
  for (const forbidden of [
    "session_token", "portal-login-vendedor", "portal_dashboard_vendedor", "password_hash", "password_change_required", "ultimo_login",
    "service_role", "PORTAL_VENDOR_RPC_SECRET"
  ]) {
    assert.equal(script.includes(forbidden), false, forbidden);
  }
  assert.doesNotMatch(script, /getFunctionEndpoint\("portal-(update-profile|change-password|password-recovery)"\)/);
});

function makeElement(id, value = "") {
  const listeners = {};
  return {
    id,
    value,
    hidden: false,
    disabled: false,
    textContent: "",
    className: "",
    dataset: {},
    listeners,
    addEventListener(type, listener) { listeners[type] = listener; },
    reset() {},
  };
}

async function runPasswordChange({ search, authEvent, currentPassword, updateError = null }) {
  const ids = [
    "portal-logout-button", "portal-logout-link", "portal-profile-status", "portal-password-status",
    "profile_codigo_vendedor", "profile_nombre", "profile_login_email", "profile_email", "profile_telefono",
    "profile_alias_cbu", "portal-update-profile-form", "portal-update-profile-submit", "portal-change-password-form",
    "portal-change-password-submit", "current_password_group", "current_password", "new_password", "confirm_password",
    "portal-profile-copy",
  ];
  const elements = new Map(ids.map((id) => [id, makeElement(id)]));
  elements.get("current_password").value = currentPassword;
  elements.get("new_password").value = "ReplacementPass123!";
  elements.get("confirm_password").value = "ReplacementPass123!";
  let updateAttributes;
  let hiddenAtUpdate;
  let signInCalls = 0;
  const session = { user: { id: "auth-user", email: "rona@example.com" } };
  const profile = { user_id: session.user.id, nombre: "Rolando", rol: "vendedor", activo: true, vendedor_id: "seller-id" };
  const seller = { id: "seller-id", codigo_vendedor: "RONA596", email: "contact@example.com", telefono: "", alias_cbu: "" };
  let authStateListener;
  const client = {
    auth: {
      onAuthStateChange(listener) { authStateListener = listener; if (authEvent) listener(authEvent, session); return { data: { subscription: { unsubscribe() {} } } }; },
      async getSession() { return { data: { session } }; },
      async signOut() { return { error: null }; },
      async signInWithPassword() { signInCalls += 1; return { error: null }; },
      async updateUser(attributes) { updateAttributes = attributes; hiddenAtUpdate = elements.get("current_password_group").hidden; return { error: updateError }; },
    },
    from(table) {
      const query = {
        select() { return query; },
        eq() { return query; },
        maybeSingle() { return Promise.resolve({ data: table === "perfiles" ? profile : seller, error: null }); },
      };
      return query;
    },
  };
  const document = {
    body: { dataset: { portalPage: "profile" }, classList: { add() {}, remove() {} } },
    getElementById(id) { return elements.get(id) || null; },
    addEventListener(type, listener) { if (type === "DOMContentLoaded") this.ready = listener; },
    querySelectorAll() { return []; },
  };
  const window = {
    NEXAR_SUPABASE_CONFIG: { url: "https://example.supabase.co", anonKey: "anon-key" },
    supabase: { createClient() { return client; } },
    location: { search, href: "", origin: "https://example.com", pathname: "/vendedores/perfil.html" },
    addEventListener() {},
    setTimeout() {},
  };
  const context = { window, document, URLSearchParams, history: { replaceState() {} }, console, Intl, Date, Number, String, Promise };
  vm.runInNewContext(read("vendedores/js/portal-vendedor.js"), context);
  document.ready();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(typeof authStateListener, "function");
  await elements.get("portal-change-password-form").listeners.submit({ preventDefault() {} });
  return { updateAttributes, hiddenAtUpdate, signInCalls, elements };
}

test("?recovery=1 por sí solo no permite omitir la contraseña actual", async () => {
  const result = await runPasswordChange({ search: "?recovery=1", currentPassword: "" });
  assert.equal(result.updateAttributes, undefined);
  assert.equal(result.elements.get("current_password_group").hidden, false);
});

test("el cambio normal usa current_password y no la propiedad camelCase", async () => {
  const result = await runPasswordChange({ search: "", currentPassword: "CurrentPass123!" });
  assert.deepEqual(JSON.parse(JSON.stringify(result.updateAttributes)), {
    password: "ReplacementPass123!",
    current_password: "CurrentPass123!",
  });
  assert.equal(Object.hasOwn(result.updateAttributes, "currentPassword"), false);
  assert.equal(result.signInCalls, 0);
});

test("una contraseña actual inválida no muestra un cambio exitoso", async () => {
  const result = await runPasswordChange({
    search: "",
    currentPassword: "IncorrectPass123!",
    updateError: new Error("Invalid current password"),
  });
  assert.match(result.elements.get("portal-password-status").textContent, /No pudimos actualizar/);
  assert.match(result.elements.get("portal-password-status").className, /is-error/);
  assert.doesNotMatch(result.elements.get("portal-password-status").className, /is-success/);
});

test("el evento PASSWORD_RECOVERY de Auth permite el cambio sin contraseña anterior", async () => {
  const result = await runPasswordChange({ search: "", authEvent: "PASSWORD_RECOVERY", currentPassword: "" });
  assert.deepEqual(JSON.parse(JSON.stringify(result.updateAttributes)), { password: "ReplacementPass123!" });
  assert.equal(result.hiddenAtUpdate, true);
});

test("las páginas Auth cargan una versión fija de supabase-js y no piden código vendedor", () => {
  for (const page of ["vendedores/login.html", "vendedores/recuperar.html", "vendedores/dashboard.html", "vendedores/perfil.html"]) {
    assert.match(read(page), /@supabase\/supabase-js@2\.116\.0/);
  }
  assert.doesNotMatch(read("vendedores/login.html"), /codigo_vendedor/);
  assert.doesNotMatch(read("vendedores/recuperar.html"), /codigo_vendedor/);
  assert.doesNotMatch(read("vendedores/perfil.html"), /profile_dni|profile_apellido/);
});
