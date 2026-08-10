import assert from "node:assert/strict";
import test from "node:test";

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

const { config, default: handler } = await import("../netlify/functions/home-form-submissions.mjs");

test("la Function delega el rate limiting distribuido a Netlify", () => {
  assert.deepEqual(config, {
    path: "/.netlify/functions/home-form-submissions",
    rateLimit: {
      action: "rate_limit",
      aggregateBy: ["ip"],
      windowLimit: 5,
      windowSize: 180
    }
  });
});

test("la solicitud de vendedor se valida e inserta desde la Function", async () => {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (String(url).includes("?select=id")) return new Response("[]", { status: 200 });
    return new Response("", { status: 201 });
  };

  const response = await handler(
    new Request("https://example.test/.netlify/functions/home-form-submissions", {
      method: "POST",
      body: JSON.stringify({
        tipo: "solicitud_vendedor",
        nombre: "Ana Pérez",
        email: "ANA@EXAMPLE.COM",
        whatsapp: "264 555 1234",
        localidad_provincia: "San Juan",
        mensaje: "Quiero conocer la propuesta"
      })
    }),
    { ip: "198.51.100.1" }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, duplicate: false });
  const insert = requests.find((request) => request.options.method === "POST");
  assert.match(insert.url, /\/rest\/v1\/solicitudes_vendedores$/);
  assert.equal(JSON.parse(insert.options.body).email, "ana@example.com");
});

test("la primera suscripción se inserta normalmente", async () => {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (options.method === "GET") return new Response("[]", { status: 200 });
    return new Response("", { status: 201 });
  };

  const response = await handler(
    new Request("https://example.test/.netlify/functions/home-form-submissions", {
      method: "POST",
      body: JSON.stringify({ tipo: "suscripcion_novedades", email: "ana@example.com", consentimiento: true })
    }),
    { ip: "198.51.100.2" }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, duplicate: false });
  assert.equal(requests.filter((request) => request.options.method === "POST").length, 1);
  assert.equal(requests.filter((request) => request.options.method === "PATCH").length, 0);
});

test("un email ya activo renueva el consentimiento sin crear otra fila", async () => {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (options.method === "GET") return new Response("[{\"id\":1}]", { status: 200 });
    return new Response(null, { status: 204 });
  };

  const response = await handler(
    new Request("https://example.test/.netlify/functions/home-form-submissions", {
      method: "POST",
      body: JSON.stringify({ tipo: "suscripcion_novedades", email: "ana@example.com", consentimiento: true })
    }),
    { ip: "198.51.100.6" }
  );

  assert.deepEqual(await response.json(), { success: true, duplicate: true });
  assert.equal(requests.filter((request) => request.options.method === "POST").length, 0);
  const update = requests.find((request) => request.options.method === "PATCH");
  assert.match(update.url, /\/rest\/v1\/suscripciones_novedades\?email=ilike\.ana%40example\.com/);
  assert.deepEqual(JSON.parse(update.options.body), { email: "ana@example.com", consentimiento: true, origen: "web" });
});

test("una re-suscripción tras una baja vuelve a disparar la sincronización", async () => {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (options.method === "GET") return new Response("[{\"id\":1}]", { status: 200 });
    return new Response(null, { status: 204 });
  };

  const response = await handler(
    new Request("https://example.test/.netlify/functions/home-form-submissions", {
      method: "POST",
      body: JSON.stringify({ tipo: "suscripcion_novedades", email: "vuelve@example.com", consentimiento: true })
    }),
    { ip: "198.51.100.7" }
  );

  assert.deepEqual(await response.json(), { success: true, duplicate: true });
  const updates = requests.filter((request) => request.options.method === "PATCH");
  assert.equal(updates.length, 1);
  assert.equal(requests.filter((request) => request.options.method === "POST").length, 0);
});

test("la Function rechaza métodos y límites inválidos", async () => {
  const methodResponse = await handler(new Request("https://example.test", { method: "GET" }), { ip: "198.51.100.3" });
  assert.equal(methodResponse.status, 405);

  const invalidResponse = await handler(
    new Request("https://example.test", {
      method: "POST",
      body: JSON.stringify({
        tipo: "solicitud_vendedor",
        nombre: "A",
        email: "a@b.co",
        whatsapp: "12345",
        localidad_provincia: "SJ"
      })
    }),
    { ip: "198.51.100.4" }
  );
  assert.equal(invalidResponse.status, 400);
  assert.match((await invalidResponse.json()).error, /Nombre y apellido debe tener entre 2 y 200/);

});
