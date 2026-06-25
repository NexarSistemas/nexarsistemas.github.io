const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
process.env.PORTAL_VENDOR_RPC_SECRET = 'portal-secret';

const login = require('../netlify/functions/portal-login-vendedor');
const changePassword = require('../netlify/functions/portal-change-password');

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('login con password_change_required=true crea sesion temporal valida', async () => {
  const passwordHash = login.generateWerkzeugPasswordHash('Temp1234!');
  const requests = [];

  global.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });

    if (String(url).includes('/rest/v1/vendedores?')) {
      return new Response(JSON.stringify([{
        id: 'vendor-1',
        codigo_vendedor: 'VEN001',
        nombre: 'Ada',
        apellido: 'Lovelace',
        activo: true,
        es_admin: false,
        cobra_comision: true,
        password_hash: passwordHash,
        password_change_required: true
      }]), { status: 200 });
    }

    if (String(url).includes('/rest/v1/portal_vendedor_sessions')) {
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.Authorization, 'Bearer service-key');
      const body = JSON.parse(options.body);
      assert.equal(body.vendedor_id, 'vendor-1');
      assert.ok(body.session_token);
      assert.ok(Date.parse(body.created_at) < Date.parse(body.expires_at));
      const durationMs = Date.parse(body.expires_at) - Date.parse(body.created_at);
      assert.equal(durationMs, 60 * 60 * 1000);
      return new Response('', { status: 201 });
    }

    if (String(url).includes('/rest/v1/vendedores?id=')) {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  const response = await login.handler({
    httpMethod: 'POST',
    body: JSON.stringify({ codigo_vendedor: 'ven001', password: 'Temp1234!' })
  });
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.vendedor.password_change_required, true);
  assert.equal('pass_temp' in payload.vendedor, false);
  assert.ok(payload.session_token);

  const vendorSelectRequest = requests.find((request) => request.url.includes('/rest/v1/vendedores?'));
  assert.ok(vendorSelectRequest);
  assert.equal(vendorSelectRequest.url.includes('pass_temp'), false);
  assert.ok(requests.some((request) => request.url.includes('portal_vendedor_sessions')));
});

test('cambio de contrasena con sesion recien creada deja password_change_required=false', async () => {
  const currentHash = login.generateWerkzeugPasswordHash('Temp1234!');
  const now = Date.now();
  const patches = [];

  global.fetch = async (url, options = {}) => {
    if (String(url).includes('/rest/v1/portal_vendedor_sessions?')) {
      assert.equal(options.headers.Authorization, 'Bearer service-key');
      return new Response(JSON.stringify([{
        id: 'session-1',
        vendedor_id: 'vendor-1',
        session_token: 'token-123',
        created_at: new Date(now).toISOString(),
        expires_at: new Date(now + 60 * 60 * 1000).toISOString()
      }]), { status: 200 });
    }

    if (String(url).includes('/rest/v1/vendedores?id=')) {
      const body = JSON.parse(options.body);
      patches.push(body);
      assert.equal(body.password_change_required, false);
      assert.equal(Object.hasOwn(body, 'pass_temp'), false);
      assert.ok(login.verifyWerkzeugPassword('Nueva1234!', body.password_hash));
      return new Response(null, { status: 204 });
    }

    if (String(url).includes('/rest/v1/vendedores?')) {
      assert.equal(String(url).includes('pass_temp'), false);
      return new Response(JSON.stringify([{
        id: 'vendor-1',
        codigo_vendedor: 'VEN001',
        nombre: 'Ada',
        apellido: 'Lovelace',
        activo: true,
        es_admin: false,
        cobra_comision: true,
        password_hash: currentHash,
        password_change_required: true
      }]), { status: 200 });
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  const response = await changePassword.handler({
    httpMethod: 'POST',
    body: JSON.stringify({
      session_token: 'token-123',
      current_password: 'Temp1234!',
      new_password: 'Nueva1234!',
      confirm_password: 'Nueva1234!'
    })
  });

  const payload = JSON.parse(response.body);
  assert.equal(response.statusCode, 200, response.body);
  assert.equal(payload.vendedor.password_change_required, false);
  assert.equal(Object.hasOwn(payload.vendedor, 'pass_temp'), false);
  assert.equal(patches.length, 1);
});

test('sesion vencida rechaza correctamente', () => {
  const now = Date.parse('2026-06-25T12:00:00.000Z');
  const status = changePassword.getSessionExpiryStatus({ expires_at: '2026-06-25T11:59:59.000Z' }, now);

  assert.equal(status.expired, true);
  assert.equal(status.reason, 'expires_at_lte_now');
});

test('login normal con password_change_required=false conserva sesion larga', async () => {
  const passwordHash = login.generateWerkzeugPasswordHash('Normal1234!');
  let sessionBody;

  global.fetch = async (url, options = {}) => {
    if (String(url).includes('/rest/v1/vendedores?')) {
      return new Response(JSON.stringify([{
        id: 'vendor-2',
        codigo_vendedor: 'VEN002',
        nombre: 'Grace',
        apellido: 'Hopper',
        activo: true,
        es_admin: false,
        cobra_comision: true,
        password_hash: passwordHash,
        password_change_required: false
      }]), { status: 200 });
    }

    if (String(url).includes('/rest/v1/portal_vendedor_sessions')) {
      sessionBody = JSON.parse(options.body);
      return new Response('', { status: 201 });
    }

    if (String(url).includes('/rest/v1/vendedores?id=')) {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  const response = await login.handler({
    httpMethod: 'POST',
    body: JSON.stringify({ codigo_vendedor: 'VEN002', password: 'Normal1234!' })
  });

  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).vendedor.password_change_required, false);
  assert.equal(Date.parse(sessionBody.expires_at) - Date.parse(sessionBody.created_at), 12 * 60 * 60 * 1000);
});

test('pass_temp no aparece en el codigo ejecutable del portal vendedor', () => {
  const executableFiles = [
    'netlify/functions/portal-login-vendedor.js',
    'netlify/functions/portal-change-password.js',
    'netlify/functions/portal-update-profile.js',
    'vendedores/js/portal-vendedor.js'
  ];

  executableFiles.forEach((relativePath) => {
    const content = readRepoFile(relativePath);
    assert.equal(content.includes('pass_temp'), false, `${relativePath} todavia contiene pass_temp`);
  });
});