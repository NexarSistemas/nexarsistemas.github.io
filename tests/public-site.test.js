const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const publicPages = [
  "index.html",
  "nexar-comercio.html",
  "nexar-finanzas.html",
  "nexar-tienda.html",
  "nexar-almacen.html",
  "mercadopago-exito.html",
  "mercadopago-pendiente.html",
  "mercadopago-fallo.html",
  "vendedores/login.html",
  "vendedores/recuperar.html",
  "vendedores/dashboard.html",
  "vendedores/perfil.html",
  "vendedores/material-comercial.html"
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
  const pagesToCheck = publicPages.slice(0, 9);
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

test("las páginas legacy redirigen a Nexar Comercio sin indexarse", () => {
  const tienda = read("nexar-tienda.html");
  assert.match(tienda, /<meta name="robots" content="noindex,follow">/);
  assert.match(tienda, /<link rel="canonical" href="https:\/\/nexarsistemas\.com\.ar\/nexar-comercio\.html">/);
  assert.match(tienda, /<meta http-equiv="refresh" content="2; url=\.\/nexar-comercio\.html">/);
  assert.match(tienda, /href="\.\/nexar-comercio\.html"/);

  const almacen = read("nexar-almacen.html");
  assert.match(almacen, /<meta name="robots" content="noindex,follow">/);
  assert.match(almacen, /<link rel="canonical" href="https:\/\/nexarsistemas\.com\.ar\/nexar-comercio\.html">/);
  assert.match(almacen, /<meta http-equiv="refresh" content="2; url=\.\/nexar-comercio\.html#modo-almacen">/);
  assert.match(almacen, /href="\.\/nexar-comercio\.html#modo-almacen"/);
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

  for (const page of ["vendedores/dashboard.html", "vendedores/perfil.html", "vendedores/material-comercial.html"]) {
    const html = read(page);
    assert.match(html, />Dashboard</);
    assert.match(html, />Material comercial</);
    assert.match(html, />Perfil</);
    assert.match(html, /id="portal-logout-link">Salir</);
  }
});

test("el material comercial del portal no se publica ni se indexa", () => {
  const material = read("vendedores/material-comercial.html");
  const portalScript = read("vendedores/js/portal-vendedor.js");
  const portalCss = read("vendedores/css/portal-vendedor.css");
  assert.match(material, /<meta name="robots" content="noindex,nofollow">/);
  assert.match(material, /data-portal-page="material"/);
  assert.doesNotMatch(material, /data-portal-page="(?:dashboard|profile)"/);
  assert.doesNotMatch(portalScript, /page === "material"/);
  assert.doesNotMatch(portalScript, /function initMaterialPage\(\)/);
  assert.match(portalScript, /document\.addEventListener\("DOMContentLoaded", \(\) => \{\s*bindLogout\(\);/);
  assert.doesNotMatch(portalScript, /function isLocalHost\(\)/);
  assert.doesNotMatch(portalScript, /\["localhost", "127\.0\.0\.1", "0\.0\.0\.0"\]/);
  assert.match(material, /id="commercial-sheet-comercio"/);
  assert.match(material, /id="commercial-sheet-finanzas"/);
  assert.match(material, /data-print-sheet="commercial-sheet-comercio"/);
  assert.match(material, /data-print-sheet="commercial-sheet-finanzas"/);
  assert.match(portalScript, /function bindPrintSheets\(\)/);
  assert.match(portalScript, /document\.querySelectorAll\("\[data-print-sheet\]"\)/);
  assert.match(portalScript, /window\.print\(\)/);
  assert.match(portalScript, /afterprint/);
  assert.match(portalCss, /@media print/);
  assert.match(portalCss, /@page[\s\S]*?size: A4/);
  assert.match(portalCss, /body\.portal-page\.is-printing-sheet > \*[\s\S]*?display: none !important/);
  assert.match(portalCss, /\.commercial-sheet\.is-print-target/);
  assert.match(portalCss, /\.portal-material-grid > :not\(\.is-print-target\)[\s\S]*?display: none !important/);
  assert.match(portalCss, /\.commercial-sheet-actions[\s\S]*?display: none !important/);
  assert.match(portalCss, /position: static/);
  assert.match(portalCss, /inset: auto/);
  assert.match(portalCss, /min-height: 0/);
  assert.match(portalCss, /overflow: visible/);
  assert.match(portalCss, /transform: none/);
  assert.doesNotMatch(portalCss.match(/@media print[\s\S]*/)[0], /visibility: hidden|100vh|min-height: calc/);
  for (const scriptId of [
    "sales-script-general",
    "sales-script-comercio",
    "sales-script-finanzas",
    "sales-script-seguimiento"
  ]) {
    assert.match(material, new RegExp(`id="${scriptId}"`), scriptId);
    assert.match(material, new RegExp(`data-copy-target="${scriptId}"`), scriptId);
  }
  assert.equal((material.match(/data-copy-target=/g) || []).length, 4);
  assert.match(portalScript, /function bindCopyTargets\(\)/);
  assert.match(portalScript, /navigator\.clipboard\.writeText/);
  assert.match(portalScript, /function copyTextFallback\(text\)/);
  assert.match(portalScript, /document\.execCommand\("copy"\)/);
  assert.match(material, /aria-live="polite"/);
  assert.match(portalScript, /Mensaje copiado/);
  assert.match(portalScript, /No se pudo copiar/);
  assert.match(portalCss, /\.portal-sales-scripts/);
  assert.doesNotMatch(material, /wa\.me|api\.whatsapp\.com|send\?phone/i);
  assert.doesNotMatch(material + portalScript, /jspdf|html2pdf|html2canvas/i);
  assert.match(read("robots.txt"), /Disallow: \/vendedores\/material-comercial\.html/);
  assert.doesNotMatch(read("sitemap.xml"), /material-comercial\.html/);
  assert.doesNotMatch(read("index.html"), /material-comercial\.html/);
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

test("los retornos de Mercado Pago vuelven al inicio sin enlaces a Nexar Comercio", () => {
  const script = read("js/mercadopago-success.js");
  assert.match(script, /window\.location\.href = "\.\/index\.html"/);

  for (const page of ["mercadopago-exito.html", "mercadopago-pendiente.html", "mercadopago-fallo.html"]) {
    const html = read(page);
    assert.match(html, /Nexar Sistemas/);
    assert.match(html, /id="payment-countdown">20</);
    assert.match(html, /Volver a Nexar Sistemas/);
    assert.doesNotMatch(html, /href="\.\/nexar-comercio\.html/);
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
