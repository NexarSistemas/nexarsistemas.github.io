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

const { default: handler } = await import("../netlify/functions/home-form-submissions.mjs");

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

test("las suscripciones existentes no generan un segundo insert", async () => {
  let postCalls = 0;
  globalThis.fetch = async (url, options = {}) => {
    if (options.method === "POST") postCalls += 1;
    return new Response("[{\"id\":1}]", { status: 200 });
  };

  const response = await handler(
    new Request("https://example.test/.netlify/functions/home-form-submissions", {
      method: "POST",
      body: JSON.stringify({ tipo: "suscripcion_novedades", email: "ana@example.com", consentimiento: true })
    }),
    { ip: "198.51.100.2" }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, duplicate: true });
  assert.equal(postCalls, 0);
});

test("la Function rechaza metodos, límites inválidos y exceso de intentos", async () => {
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

  for (let index = 0; index < 5; index += 1) {
    await handler(
      new Request("https://example.test", { method: "POST", body: JSON.stringify({ tipo: "invalido" }) }),
      { ip: "198.51.100.5" }
    );
  }
  const limitedResponse = await handler(
    new Request("https://example.test", { method: "POST", body: JSON.stringify({ tipo: "invalido" }) }),
    { ip: "198.51.100.5" }
  );
  assert.equal(limitedResponse.status, 429);
});
