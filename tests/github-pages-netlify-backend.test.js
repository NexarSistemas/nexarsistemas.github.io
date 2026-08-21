const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_ANON_KEY = "anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
process.env.PORTAL_VENDOR_RPC_SECRET = "portal-secret";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("runtime-config resuelve el backend según el host", () => {
  const script = read("assets/js/runtime-config.js");

  function runForLocation(location) {
    const context = {
      window: { location }
    };
    vm.runInNewContext(script, context);
    return context.window.NEXAR_RUNTIME_CONFIG;
  }

  assert.equal(
    runForLocation({ hostname: "nexarsistemas.github.io", origin: "https://nexarsistemas.github.io" }).backendOrigin,
    "https://nexarsistemas.com.ar"
  );
  assert.equal(
    runForLocation({ hostname: "nexarsistemas.com.ar", origin: "https://nexarsistemas.com.ar" }).backendOrigin,
    "https://nexarsistemas.com.ar"
  );
  assert.equal(
    runForLocation({ hostname: "www.nexarsistemas.com.ar", origin: "https://www.nexarsistemas.com.ar" }).backendOrigin,
    "https://www.nexarsistemas.com.ar"
  );
  assert.equal(
    runForLocation({ hostname: "localhost", origin: "http://localhost:8000" }).backendOrigin,
    "http://localhost:8000"
  );
  assert.equal(
    runForLocation({ hostname: "127.0.0.1", origin: "http://127.0.0.1:8000" }).backendOrigin,
    "http://127.0.0.1:8000"
  );
  assert.equal(
    runForLocation({ hostname: "[::1]", origin: "http://[::1]:8000" }).backendOrigin,
    "http://[::1]:8000"
  );
});

test("portal vendedor y home usan la URL centralizada del backend", () => {
  const homeScript = read("assets/js/home-forms.js");
  const portalScript = read("vendedores/js/portal-vendedor.js");
  const hostScript = read("vendedores/js/portal-host.js");

  assert.match(homeScript, /runtimeConfig\.getFunctionUrl\("home-form-submissions"\)/);
  assert.match(portalScript, /getFunctionEndpoint\("portal-login-vendedor"\)/);
  assert.match(portalScript, /getFunctionEndpoint\("portal-password-recovery"\)/);
  assert.match(portalScript, /getFunctionEndpoint\("portal-update-profile"\)/);
  assert.match(portalScript, /getFunctionEndpoint\("portal-change-password"\)/);
  assert.doesNotMatch(homeScript, /window\.location\.replace/);
  assert.doesNotMatch(hostScript, /window\.location\.replace/);
});

test("el helper CORS permite los orígenes esperados y rechaza el resto", () => {
  const cors = require("../netlify/functions/_cors.cjs");

  assert.equal(cors.isAllowedOrigin("https://nexarsistemas.com.ar"), true);
  assert.equal(cors.isAllowedOrigin("https://www.nexarsistemas.com.ar"), true);
  assert.equal(cors.isAllowedOrigin("https://nexarsistemas.github.io"), true);
  assert.equal(cors.isAllowedOrigin("http://localhost:8000"), true);
  assert.equal(cors.isAllowedOrigin("http://127.0.0.1:8000"), true);
  assert.equal(cors.isAllowedOrigin("http://[::1]:8000"), true);
  assert.equal(cors.isAllowedOrigin("https://evil.example.com"), false);
});

test("las functions del portal responden OPTIONS y CORS estricto", async () => {
  const login = require("../netlify/functions/portal-login-vendedor");
  const updateProfile = require("../netlify/functions/portal-update-profile");

  const optionsResponse = await login.handler({
    httpMethod: "OPTIONS",
    headers: { origin: "https://nexarsistemas.github.io" }
  });
  assert.equal(optionsResponse.statusCode, 204);
  assert.equal(optionsResponse.headers["Access-Control-Allow-Origin"], "https://nexarsistemas.github.io");
  assert.match(optionsResponse.headers["Access-Control-Allow-Methods"], /POST/);

  const rejectedOptions = await updateProfile.handler({
    httpMethod: "OPTIONS",
    headers: { origin: "https://evil.example.com" }
  });
  assert.equal(rejectedOptions.statusCode, 403);

  const rejectedRequest = await login.handler({
    httpMethod: "POST",
    headers: { origin: "https://evil.example.com" },
    body: JSON.stringify({ codigo_vendedor: "VEN001", password: "secret" })
  });
  assert.equal(rejectedRequest.statusCode, 403);
});

test("home-form-submissions maneja OPTIONS y rechaza origins no permitidos", async () => {
  globalThis.Netlify = {
    env: {
      get(name) {
        return {
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "service-role-key"
        }[name];
      }
    }
  };

  const { default: handler } = await import("../netlify/functions/home-form-submissions.mjs");

  const optionsResponse = await handler(new Request("https://example.test/.netlify/functions/home-form-submissions", {
    method: "OPTIONS",
    headers: { Origin: "https://nexarsistemas.github.io" }
  }));
  assert.equal(optionsResponse.status, 204);
  assert.equal(optionsResponse.headers.get("Access-Control-Allow-Origin"), "https://nexarsistemas.github.io");

  const rejectedResponse = await handler(new Request("https://example.test/.netlify/functions/home-form-submissions", {
    method: "POST",
    headers: {
      Origin: "https://evil.example.com",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ tipo: "suscripcion_novedades", email: "ana@example.com", consentimiento: true })
  }));
  assert.equal(rejectedResponse.status, 403);
});
