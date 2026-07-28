const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const publicPages = [
  "index.html",
  "nexar-comercio.html",
  "nexar-finanzas.html",
  "mercadopago-exito.html",
  "mercadopago-pendiente.html",
  "mercadopago-fallo.html",
  "vendedores/login.html",
  "vendedores/recuperar.html",
  "vendedores/dashboard.html",
  "vendedores/perfil.html"
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("las superficies públicas principales existen y usan el sistema visual compartido", () => {
  for (const page of publicPages) {
    assert.equal(fs.existsSync(path.join(root, page)), true, page);
    assert.match(read(page), /css\/site\.css/, page);
  }
});

test("los enlaces internos esenciales apuntan a archivos existentes", () => {
  const pagesToCheck = publicPages.slice(0, 7);
  for (const page of pagesToCheck) {
    const html = read(page);
    const linkPattern = /href="([^"#?]+(?:\.html|\.css|\.png))[^"]*"/g;
    for (const match of html.matchAll(linkPattern)) {
      if (/^(?:https?:|mailto:|tel:)/.test(match[1])) {
        continue;
      }
      const target = path.resolve(path.dirname(path.join(root, page)), match[1]);
      assert.equal(fs.existsSync(target), true, `${page} -> ${match[1]}`);
    }
  }
});

test("los fragmentos de rubros de Nexar Comercio siguen disponibles", () => {
  const commerce = read("nexar-comercio.html");
  assert.match(commerce, /id="modo-almacen"/);
  assert.match(commerce, /id="rubros"/);
  assert.match(read("nexar-almacen.html"), /href="\.\/nexar-comercio\.html#modo-almacen"/);
});

test("los logos oficiales usan rutas existentes y mayúsculas exactas", () => {
  const expectedLogos = {
    "Nexar Sistemas": "assets/nexar_sistemas.png",
    "Nexar Comercio": "assets/nexar-tienda.png",
    "Nexar Finanzas": "assets/nexar-finanzas.png"
  };

  for (const [alt, asset] of Object.entries(expectedLogos)) {
    assert.equal(fs.existsSync(path.join(root, asset)), true, asset);
    const pages = publicPages.map(read).join("\n");
    assert.match(pages, new RegExp(`src="(?:\\.\\.?\\/)?${asset.replace("assets/", "assets\\/")}" alt="${alt}"`));
  }

  for (const page of publicPages) {
    const html = read(page);
    for (const match of html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
      const target = path.resolve(path.dirname(path.join(root, page)), match[1]);
      assert.equal(fs.existsSync(target), true, `${page} -> ${match[1]}`);
    }
  }
});

test("la navegación autenticada del portal permanece visible hasta 960 px", () => {
  const portalCss = read("vendedores/css/portal-vendedor.css");
  assert.match(portalCss, /@media \(max-width: 960px\)[\s\S]*?\.portal-page \.header-nav[\s\S]*?display: flex/);

  for (const page of ["vendedores/dashboard.html", "vendedores/perfil.html"]) {
    const html = read(page);
    assert.match(html, />Dashboard</);
    assert.match(html, />Perfil</);
    assert.match(html, /id="portal-logout-link">Salir</);
  }
});

test("solo se publican los contactos oficiales", () => {
  const scannedFiles = publicPages.concat(["js/main.js", "js/mercadopago-success.js"]);
  const combined = scannedFiles.map(read).join("\n");
  const emails = new Set(combined.match(/[A-Z0-9._%+-]+@(?:[A-Z0-9-]+\.)+[A-Z]{2,}/gi) || []);
  const allowedEmails = new Set([
    "ventas@nexarsistemas.com.ar",
    "soporte@nexarsistemas.com.ar",
    "vendedores@nexarsistemas.com.ar"
  ]);
  for (const email of emails) {
    assert.equal(allowedEmails.has(email.toLowerCase()), true, email);
  }
  assert.doesNotMatch(combined, /549264(?:4123456|5858874)/);
  assert.match(combined, /5492646616948/);
});

test("los parámetros contractuales de Mercado Pago se preservan", () => {
  const script = read("js/mercadopago-success.js");
  for (const parameter of [
    "status",
    "collection_status",
    "payment_id",
    "collection_id",
    "merchant_order_id",
    "external_reference",
    "preference_id"
  ]) {
    assert.match(script, new RegExp(`"${parameter}"`), parameter);
  }
});

test("los IDs funcionales del portal de vendedores se preservan", () => {
  const combined = publicPages.filter((page) => page.startsWith("vendedores/")).map(read).join("\n");
  for (const id of [
    "portal-login-form",
    "portal-recovery-form",
    "portal-summary",
    "portal-update-profile-form",
    "portal-change-password-form"
  ]) {
    assert.match(combined, new RegExp(`id="${id}"`), id);
  }
});
