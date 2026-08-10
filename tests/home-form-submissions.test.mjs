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
    if (String(url).includes("?select=id,email")) return new Response("[]", { status: 200 });
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
    if (options.method === "GET" || options.method === undefined) return new Response("[]", { status: 200 });
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

test("un email ya activo renueva el consentimiento por ID sin crear otra fila", async () => {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (options.method === "GET" || options.method === undefined) {
      return new Response('[{"id":1,"email":"ana@example.com"}]', { status: 200 });
    }
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
  assert.match(update.url, /\/rest\/v1\/suscripciones_novedades\?id=eq\.1$/);
  assert.deepEqual(JSON.parse(update.options.body), { consentimiento: true, origen: "web" });
});

test("una re-suscripción tras una baja vuelve a disparar la sincronización", async () => {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (options.method === "GET" || options.method === undefined) {
      return new Response('[{"id":7,"email":"vuelve@example.com"}]', { status: 200 });
    }
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
  const update = requests.find((request) => request.options.method === "PATCH");
  assert.match(update.url, /id=eq\.7$/);
  assert.equal(requests.filter((request) => request.options.method === "POST").length, 0);
});

for (const [email, escapedEmail] of [
  ["a_ice@example.com", "a%5C_ice%40example.com"],
  ["a%ice@example.com", "a%5C%25ice%40example.com"],
  ["a*ice@example.com", "a%5C*ice%40example.com"]
]) {
  test(`un email ${email} no confunde a alice@example.com`, async () => {
    const requests = [];
    globalThis.fetch = async (url, options = {}) => {
      requests.push({ url: String(url), options });
      if (options.method === "GET" || options.method === undefined) {
        return new Response('[{"id":21,"email":"alice@example.com"}]', { status: 200 });
      }
      return new Response("", { status: 201 });
    };

    const response = await handler(
      new Request("https://example.test/.netlify/functions/home-form-submissions", {
        method: "POST",
        body: JSON.stringify({ tipo: "suscripcion_novedades", email, consentimiento: true })
      }),
      { ip: "198.51.100.8" }
    );

    assert.deepEqual(await response.json(), { success: true, duplicate: false });
    const lookup = requests.find((request) => request.options.method === undefined || request.options.method === "GET");
    assert.ok(lookup.url.includes(`email=ilike.${escapedEmail}`));
    assert.equal(requests.filter((request) => request.options.method === "PATCH").length, 0);
    assert.equal(requests.filter((request) => request.options.method === "POST").length, 1);
  });
}

test("una fila existente con mayúsculas se localiza y renueva por su ID", async () => {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (options.method === "GET" || options.method === undefined) {
      return new Response('[{"id":9,"email":"Ana@example.com"}]', { status: 200 });
    }
    return new Response(null, { status: 204 });
  };

  const response = await handler(
    new Request("https://example.test/.netlify/functions/home-form-submissions", {
      method: "POST",
      body: JSON.stringify({ tipo: "suscripcion_novedades", email: "ANA@EXAMPLE.COM", consentimiento: true })
    }),
    { ip: "198.51.100.9" }
  );

  assert.deepEqual(await response.json(), { success: true, duplicate: true });
  const lookup = requests.find((request) => request.options.method === undefined || request.options.method === "GET");
  assert.match(lookup.url, /email=ilike\.ana%40example\.com/);
  const update = requests.find((request) => request.options.method === "PATCH");
  assert.match(update.url, /id=eq\.9$/);
  assert.deepEqual(JSON.parse(update.options.body), { consentimiento: true, origen: "web" });
});

test("tras un 23505 vuelve a buscar la fila y la actualiza por ID", async () => {
  const requests = [];
  let lookups = 0;
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (options.method === "GET" || options.method === undefined) {
      lookups += 1;
      return new Response(lookups === 1 ? "[]" : '[{"id":11,"email":"Ana@example.com"}]', { status: 200 });
    }
    if (options.method === "POST") {
      return new Response(JSON.stringify({ code: "23505", message: "duplicate key" }), {
        status: 409,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(null, { status: 204 });
  };

  const response = await handler(
    new Request("https://example.test/.netlify/functions/home-form-submissions", {
      method: "POST",
      body: JSON.stringify({ tipo: "suscripcion_novedades", email: "ana@example.com", consentimiento: true })
    }),
    { ip: "198.51.100.10" }
  );

  assert.deepEqual(await response.json(), { success: true, duplicate: true });
  assert.equal(lookups, 2);
  const update = requests.find((request) => request.options.method === "PATCH");
  assert.match(update.url, /id=eq\.11$/);
});

test("un vendedor con comodín válido no queda como duplicado de otro email", async () => {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (options.method === "GET" || options.method === undefined) {
      return new Response('[{"id":30,"email":"alice@example.com"}]', { status: 200 });
    }
    return new Response("", { status: 201 });
  };

  const response = await handler(
    new Request("https://example.test/.netlify/functions/home-form-submissions", {
      method: "POST",
      body: JSON.stringify({
        tipo: "solicitud_vendedor",
        nombre: "Alicia Pérez",
        email: "a*ice@example.com",
        whatsapp: "264 555 1234",
        localidad_provincia: "San Juan"
      })
    }),
    { ip: "198.51.100.11" }
  );

  assert.deepEqual(await response.json(), { success: true, duplicate: false });
  const lookup = requests.find((request) => request.options.method === undefined || request.options.method === "GET");
  assert.match(lookup.url, /email=ilike\.a%5C\*ice%40example\.com/);
  const insert = requests.find((request) => request.options.method === "POST");
  assert.match(insert.url, /\/rest\/v1\/solicitudes_vendedores$/);
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
