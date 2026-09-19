const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

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

test("las páginas Auth cargan una versión fija de supabase-js y no piden código vendedor", () => {
  for (const page of ["vendedores/login.html", "vendedores/recuperar.html", "vendedores/dashboard.html", "vendedores/perfil.html"]) {
    assert.match(read(page), /@supabase\/supabase-js@2\.116\.0/);
  }
  assert.doesNotMatch(read("vendedores/login.html"), /codigo_vendedor/);
  assert.doesNotMatch(read("vendedores/recuperar.html"), /codigo_vendedor/);
  assert.doesNotMatch(read("vendedores/perfil.html"), /profile_dni|profile_apellido/);
});
