const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

function setup(fetchImpl = async () => ({ ok: true })) {
  let focused;
  let submit;
  let resetCount = 0;
  const fields = Object.fromEntries(["nombre", "email", "telefono", "producto", "consulta", "mensaje"].map((name) => [name, {
    value: "", focus() { focused = name; }
  }]));
  Object.assign(fields.nombre, { value: " Ana " });
  Object.assign(fields.email, { value: " ana@example.com " });
  Object.assign(fields.producto, { value: "Nexar Comercio" });
  Object.assign(fields.consulta, { value: "Solicitar licencia" });
  Object.assign(fields.mensaje, { value: " Hola " });
  const button = { disabled: false, textContent: "Enviar solicitud" };
  const status = { innerHTML: "", style: {}, attributes: { "aria-live": "polite" } };
  const form = {
    querySelector(selector) {
      if (selector === "#cf-submit") return button;
      return fields[selector.replace("#cf-", "")] || null;
    },
    addEventListener(type, callback) { if (type === "submit") submit = callback; },
    reset() { resetCount++; for (const field of Object.values(fields)) field.value = ""; }
  };
  const calls = [];
  const document = {
    addEventListener(type, callback) { if (type === "DOMContentLoaded") callback(); },
    getElementById(id) { return id === "contactForm" ? form : id === "solicitud-demo-status" ? status : null; }
  };
  vm.runInNewContext(read("assets/js/solicitud-demo.js"), {
    document, window: { NEXAR_SUPABASE_CONFIG: { url: "https://example.test", anonKey: "public-test-key" } },
    fetch: (url, options) => { calls.push({ url, options }); return fetchImpl(); },
    console: { warn() {}, error() {} }
  });
  return { fields, button, status, calls, get focused() { return focused; }, get resets() { return resetCount; },
    submit: () => submit({ preventDefault() {} }) };
}

test("valida obligatorios y correo antes de enviar, con foco en el primer error", async () => {
  for (const [field, value] of [["nombre", "   "], ["email", "  "], ["email", "invalido"], ["producto", ""], ["consulta", ""], ["mensaje", "  \n "]]) {
    const app = setup();
    app.fields[field].value = value;
    await app.submit();
    assert.equal(app.focused, field);
    assert.equal(app.calls.length, 0);
    assert.equal(app.resets, 0);
    assert.match(app.status.innerHTML, /status-error/);
    assert.equal(app.status.attributes["aria-live"], "polite");
  }
  const app = setup();
  app.fields.nombre.value = " "; app.fields.mensaje.value = " ";
  await app.submit();
  assert.equal(app.focused, "nombre");
});

test("mantiene la derivación y los payloads de soporte y demo", async () => {
  const cases = [
    ["Solicitud de soporte", "Solicitar licencia", "soporte", "licencia"],
    ["Otro / Consulta general", "Consulta de precios", "soporte", "consulta"],
    ["Nexar Comercio", "Soporte técnico", "soporte", "consulta"],
    ["Nexar Comercio", "Información general", "soporte", "consulta"],
    ["Nexar Comercio", "Otra consulta", "soporte", "otro"],
    ["Diseño y desarrollo web", "Solicitar presupuesto web", "demo"],
    ["Nexar Finanzas", "Solicitar descarga", "demo"],
    ["Nexar Comercio", "Consulta de precios", "demo"]
  ];
  for (const [producto, consulta, table, motivo] of cases) {
    const app = setup(); app.fields.producto.value = producto; app.fields.consulta.value = consulta;
    await app.submit();
    assert.equal(app.calls[0].url, `https://example.test/rest/v1/solicitudes_${table}`);
    const request = app.calls[0].options;
    assert.equal(request.method, "POST");
    assert.equal(request.headers.Prefer, "return=minimal");
    const payload = JSON.parse(request.body);
    const base = { nombre: "Ana", email: "ana@example.com" };
    assert.deepEqual(payload, table === "demo" ? {
      ...base, telefono: null, negocio: null, producto, plan_interes: consulta, mensaje: "Hola", estado: "pendiente", origen: "web", leida: false
    } : {
      ...base, whatsapp: null, negocio: null, producto, motivo, mensaje: "Hola", plan: consulta, estado: "pendiente",
      technical_details: { origen: "web", telefono: null, plan_interes: consulta }
    });
    assert.equal(app.resets, 1);
    assert.equal((app.status.innerHTML.match(/solicitud fue enviada correctamente/g) || []).length, 1);
  }
});

test("controla el botón y restaura el formulario solo tras éxito", async () => {
  let resolve;
  const app = setup(() => new Promise((done) => { resolve = done; }));
  const pending = app.submit();
  assert.equal(app.button.disabled, true);
  assert.equal(app.button.textContent, "Enviando...");
  assert.match(app.status.innerHTML, /status-loading/);
  assert.equal(app.resets, 0);
  resolve({ ok: true }); await pending;
  assert.equal(app.button.disabled, false);
  assert.equal(app.button.textContent, "Enviar solicitud");
  assert.equal(app.resets, 1);
  assert.match(app.status.innerHTML, /status-success/);
});

test("los errores HTTP y de red conservan datos y restauran el botón", async () => {
  for (const fetchImpl of [async () => ({ ok: false, status: 400, json: async () => ({ message: "rechazado" }) }), async () => { throw new Error("red caída"); }]) {
    const app = setup(fetchImpl); await app.submit();
    assert.equal(app.resets, 0);
    assert.equal(app.fields.mensaje.value, " Hola ");
    assert.equal(app.button.disabled, false);
    assert.equal(app.button.textContent, "Enviar solicitud");
    assert.match(app.status.innerHTML, /status-error/);
  }
});

test("mantiene opciones, CTA y una sola región de confirmación accesible", () => {
  const html = read("index.html");
  const options = (id) => [...html.match(new RegExp(`<select id="${id}"[\\s\\S]*?<\\/select>`))[0].matchAll(/<option value="([^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(options("cf-producto"), ["", "Nexar Comercio", "Nexar Finanzas", "Nexar Fidelización", "Diseño y desarrollo web", "Solicitud de soporte", "Otro / Consulta general"]);
  assert.deepEqual(options("cf-consulta"), ["", "Solicitar licencia", "Solicitar descarga", "Solicitar presupuesto web", "Información general", "Consulta de precios", "Soporte técnico", "Otra consulta"]);
  for (const label of ["Consultar por un sistema a medida", "Consultar por digitalización", "Consultar por automatización", "Contanos cómo trabajás"]) assert.ok(html.includes(`href="#contacto">${label}`));
  assert.match(html, /href="\.\/desarrollo-web\.html#precios">Ver precios de desarrollo web/);
  assert.match(html, /id="solicitud-demo-status" aria-live="polite"/);
  assert.doesNotMatch(html, /id="cf-success"/);
  assert.equal((html.match(/id="contactForm"/g) || []).length, 1);
});

test("los enlaces de consulta conservan el autocompletado y no pisan mensajes existentes", () => {
  const listeners = {};
  const fields = { "cf-producto": { value: "" }, "cf-consulta": { value: "" }, "cf-mensaje": { value: "" } };
  const link = { dataset: { product: "Nexar Comercio", inquiry: "Solicitar licencia" }, addEventListener(type, fn) { listeners[type] = fn; } };
  const document = { addEventListener(type, fn) { fn(); }, querySelectorAll(selector) { return selector === ".downloadInquiry" ? [link] : []; }, getElementById(id) { return fields[id]; } };
  vm.runInNewContext(read("js/main.js"), { document });
  listeners.click();
  assert.equal(fields["cf-producto"].value, "Nexar Comercio");
  assert.equal(fields["cf-consulta"].value, "Solicitar licencia");
  assert.match(fields["cf-mensaje"].value, /solicitar una licencia de Nexar Comercio/);
  fields["cf-mensaje"].value = "Mi mensaje"; listeners.click();
  assert.equal(fields["cf-mensaje"].value, "Mi mensaje");
  link.dataset.inquiry = "Solicitar descarga"; fields["cf-mensaje"].value = " "; listeners.click();
  assert.equal(fields["cf-consulta"].value, "Solicitar descarga");
  assert.match(fields["cf-mensaje"].value, /solicitar la descarga de Nexar Comercio/);
});
