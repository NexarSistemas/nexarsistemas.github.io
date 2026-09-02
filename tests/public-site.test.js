const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

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
  "mercadopago-suscripcion.html",
  "confirmar-novedades.html",
  "vendedores/index.html",
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
  const pagesToCheck = publicPages.slice(0, 10);
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
  const scannedFiles = publicPages.concat([
    "js/main.js",
    "js/mercadopago-success.js",
    "js/mercadopago-subscription.js"
  ]);
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

test("el retorno de suscripción agradece la adhesión y vuelve al inicio", () => {
  const html = read("mercadopago-suscripcion.html");
  const script = read("js/mercadopago-subscription.js");

  assert.match(html, /¡Gracias por suscribirte!/);
  assert.match(html, /id="subscription-countdown">15</);
  assert.match(html, /src="\.\/js\/mercadopago-subscription\.js"/);
  assert.match(html, /Volver a Nexar Sistemas/);
  assert.doesNotMatch(html, /href="\.\/nexar-comercio\.html/);
  assert.match(script, /let remainingSeconds = 15/);
  assert.match(script, /window\.location\.href = "\.\/index\.html"/);
});

test("la confirmación de novedades requiere una acción explícita y no expone secretos", () => {
  const html = read("confirmar-novedades.html");
  const script = read("js/confirmar-novedades.js");

  assert.match(html, /<meta name="referrer" content="no-referrer">/);
  assert.match(html, /<link rel="stylesheet" href="\.\/css\/site\.css">/);
  assert.match(html, /<article class="payment-panel" aria-live="polite" aria-atomic="true">/);
  assert.match(html, /<form[^>]+method="post"[^>]+action="https:\/\/qwlngclrhpezelqddlsp\.supabase\.co\/functions\/v1\/newsletter-preference"/);
  assert.match(html, /<input type="hidden" name="confirm_token" id="confirm-token">/);
  assert.match(html, /id="newsletter-close-note" hidden>Ya podés cerrar esta pestaña o ventana\.<\/p>/);
  assert.match(html, /id="newsletter-email" hidden/);
  assert.match(html, />Confirmar</);
  assert.match(html, /src="\.\/js\/confirmar-novedades\.js"/);
  assert.match(script, /\^\[A-Za-z0-9_-\]\{1,100\}\$/);
  assert.match(script, /window\.history\.replaceState/);
  assert.match(script, /const previewEndpoint = "https:\/\/qwlngclrhpezelqddlsp\.supabase\.co\/functions\/v1\/newsletter-preference-preview"/);
  assert.match(script, /fetch\(`\$\{previewEndpoint\}\?token=\$\{encodeURIComponent\(token\)\}`/);
  assert.match(script, /method: "GET"/);
  assert.match(script, /const confirmationEndpoint = "https:\/\/qwlngclrhpezelqddlsp\.supabase\.co\/functions\/v1\/newsletter-preference"/);
  assert.match(script, /method: "POST"/);
  assert.match(script, /confirm_token: confirmToken\.value/);
  assert.match(script, /!response\.ok \|\| !result \|\| \(Object\.prototype\.hasOwnProperty\.call\(result, "ok"\) && result\.ok !== true\)/);
  assert.doesNotMatch(script, /Object\.hasOwn\(/);
  assert.doesNotMatch(script, /params\.get\("status"\)|params\.get\("action"\)/);
  assert.doesNotMatch(script, /XMLHttpRequest|\.submit\s*\(/);
  assert.doesNotMatch(html + script, /service_role|SUPABASE_ANON_KEY|RESEND_API_KEY|api[_-]?key/i);
});

test("la confirmación de novedades verifica la solicitud antes de habilitar el formulario", async () => {
  const script = read("js/confirmar-novedades.js");
  const runPage = async ({ search = "", state = null, fetchImpl } = {}) => {
    const elements = new Map();
    const panelClasses = new Set();
    const panel = {
      classList: {
        toggle(name, enabled) {
          if (enabled) panelClasses.add(name);
          else panelClasses.delete(name);
        }
      }
    };
    for (const id of [
      "newsletter-badge",
      "newsletter-icon",
      "newsletter-title",
      "newsletter-message",
      "newsletter-email",
      "newsletter-confirmation-form",
      "confirm-token",
      "newsletter-close-note"
    ]) {
      const listeners = {};
      elements.set(id, {
        hidden: true,
        setAttribute() {},
        addEventListener(event, callback) {
          listeners[event] = callback;
        },
        closest() {
          return panel;
        },
        listeners,
        textContent: "",
        value: ""
      });
    }

    let onDOMContentLoaded;
    let replacedState;
    let replacedUrl;
    const fetchCalls = [];
    const body = { dataset: {} };
    vm.runInNewContext(script, {
      URLSearchParams,
      fetch: async (...args) => {
        fetchCalls.push(args);
        return fetchImpl(...args);
      },
      document: {
        body,
        addEventListener(event, callback) {
          assert.equal(event, "DOMContentLoaded");
          onDOMContentLoaded = callback;
        },
        getElementById(id) {
          return elements.get(id);
        }
      },
      window: {
        history: {
          state,
          replaceState(nextState, unused, nextUrl) {
            replacedState = nextState;
            replacedUrl = nextUrl;
          }
        },
        location: {
          search,
          pathname: "/confirmar-novedades.html",
          hash: ""
        }
      }
    });
    await onDOMContentLoaded();
    return { body, elements, fetchCalls, panelClasses, replacedState, replacedUrl };
  };

  const token = "valid_base64url-token";
  const preview = (payload, ok = true) => async () => ({ ok, json: async () => payload });
  const firstLoad = await runPage({
    search: `?token=${token}`,
    fetchImpl: preview({ ok: true, status: "pending", action: "opt_in", email_masked: "m***@ejemplo.com" })
  });
  assert.equal(firstLoad.replacedState.newsletterConfirmationToken, token);
  assert.equal(firstLoad.replacedUrl, "/confirmar-novedades.html");
  assert.equal(firstLoad.elements.get("newsletter-confirmation-form").hidden, false);
  assert.equal(firstLoad.elements.get("confirm-token").value, token);
  assert.equal(firstLoad.elements.get("newsletter-title").textContent, "Confirmar suscripción");
  assert.equal(firstLoad.elements.get("newsletter-email").textContent, "m***@ejemplo.com");
  assert.equal(firstLoad.fetchCalls[0][0], "https://qwlngclrhpezelqddlsp.supabase.co/functions/v1/newsletter-preference-preview?token=valid_base64url-token");
  assert.equal(firstLoad.fetchCalls[0][1].method, "GET");

  const submit = async (page) => {
    let prevented = false;
    await page.elements.get("newsletter-confirmation-form").listeners.submit({
      preventDefault() { prevented = true; }
    });
    assert.equal(prevented, true);
  };
  const plainTextResponse = (ok, text) => ({
    ok,
    headers: { get: () => "text/plain; charset=utf-8" },
    text: async () => text
  });

  const confirmedOptIn = await runPage({
    search: `?token=${token}`,
    fetchImpl: async (url) => url.startsWith("https://qwlngclrhpezelqddlsp.supabase.co/functions/v1/newsletter-preference-preview")
      ? { ok: true, json: async () => ({ ok: true, status: "pending", action: "opt_in", email_masked: "m***@ejemplo.com" }) }
      : plainTextResponse(true, "Suscripción confirmada. Ya podés recibir Novedades Nexar.")
  });
  await submit(confirmedOptIn);
  assert.equal(confirmedOptIn.fetchCalls.length, 2);
  assert.equal(confirmedOptIn.fetchCalls[1][0], "https://qwlngclrhpezelqddlsp.supabase.co/functions/v1/newsletter-preference");
  assert.equal(confirmedOptIn.fetchCalls[1][1].method, "POST");
  assert.equal(confirmedOptIn.fetchCalls[1][1].body, `confirm_token=${token}`);
  assert.equal(confirmedOptIn.elements.get("newsletter-title").textContent, "Suscripción confirmada");
  assert.equal(confirmedOptIn.elements.get("newsletter-confirmation-form").hidden, true);
  assert.equal(confirmedOptIn.elements.get("newsletter-close-note").hidden, false);
  assert.equal(confirmedOptIn.panelClasses.has("newsletter-confirmation-complete"), true);

  const confirmedOptOut = await runPage({
    search: `?token=${token}`,
    fetchImpl: async (url) => url.includes("-preview")
      ? { ok: true, json: async () => ({ ok: true, status: "pending", action: "opt_out", email_masked: "m***@ejemplo.com" }) }
      : plainTextResponse(true, "Baja confirmada. Dejaste de recibir Novedades Nexar.")
  });
  await submit(confirmedOptOut);
  assert.equal(confirmedOptOut.elements.get("newsletter-title").textContent, "Baja confirmada");

  const alreadyConfirmed = await runPage({
    search: `?token=${token}`,
    fetchImpl: async (url) => url.includes("-preview")
      ? { ok: true, json: async () => ({ ok: true, status: "pending", action: "opt_in", email_masked: "m***@ejemplo.com" }) }
      : plainTextResponse(true, "Esta solicitud ya fue confirmada.")
  });
  await submit(alreadyConfirmed);
  assert.equal(alreadyConfirmed.elements.get("newsletter-title").textContent, "Solicitud ya confirmada");

  for (const postResponse of [
    plainTextResponse(true, "Respuesta no reconocida."),
    plainTextResponse(false, "Suscripción confirmada. Ya podés recibir Novedades Nexar.")
  ]) {
    const failedConfirmation = await runPage({
      search: `?token=${token}`,
      fetchImpl: async (url) => {
        if (url.includes("-preview")) {
          return { ok: true, json: async () => ({ ok: true, status: "pending", action: "opt_in", email_masked: "m***@ejemplo.com" }) };
        }
        return postResponse;
      }
    });
    await submit(failedConfirmation);
    assert.equal(failedConfirmation.elements.get("newsletter-title").textContent, "No se pudo confirmar la solicitud");
    assert.equal(failedConfirmation.elements.get("newsletter-confirmation-form").hidden, true);
    assert.equal(failedConfirmation.elements.get("newsletter-close-note").hidden, true);
    assert.equal(failedConfirmation.body.dataset.statusDefault, "rejected");
  }

  const optOut = await runPage({
    search: `?token=${token}`,
    fetchImpl: preview({ ok: true, status: "pending", action: "opt_out", email_masked: "m***@ejemplo.com" })
  });
  assert.equal(optOut.elements.get("newsletter-confirmation-form").hidden, false);
  assert.equal(optOut.elements.get("newsletter-title").textContent, "Confirmar baja");
  assert.equal(optOut.elements.get("newsletter-email").textContent, "m***@ejemplo.com");

  const refresh = await runPage({
    state: firstLoad.replacedState,
    fetchImpl: preview({ ok: true, status: "pending", action: "opt_in", email_masked: "m***@ejemplo.com" })
  });
  assert.equal(refresh.elements.get("newsletter-confirmation-form").hidden, false);
  assert.equal(refresh.elements.get("confirm-token").value, token);
  assert.equal(refresh.fetchCalls.length, 1);

  const confirmedLoad = await runPage({
    search: `?token=${token}`,
    fetchImpl: preview({ ok: true, status: "confirmed" })
  });
  assert.equal(confirmedLoad.elements.get("newsletter-title").textContent, "Solicitud ya confirmada");
  assert.equal(confirmedLoad.elements.get("newsletter-confirmation-form").hidden, true);
  assert.notEqual(confirmedLoad.body.dataset.statusDefault, "rejected");
  assert.equal(confirmedLoad.elements.get("newsletter-icon").textContent, "✓");

  const unexpectedConfirmed = await runPage({
    search: `?token=${token}`,
    fetchImpl: preview({ ok: false, status: "confirmed" }, false)
  });
  assert.equal(unexpectedConfirmed.elements.get("newsletter-title").textContent, "No se pudo verificar la solicitud");
  assert.equal(unexpectedConfirmed.elements.get("newsletter-confirmation-form").hidden, true);
  assert.equal(unexpectedConfirmed.body.dataset.statusDefault, "rejected");

  for (const [status, title] of [
    ["expired", "Enlace vencido"],
    ["invalid", "Enlace inválido"],
    ["error", "No se pudo verificar la solicitud"]
  ]) {
    const invalidLoad = await runPage({ search: `?token=${token}`, fetchImpl: preview({ ok: false, status }, false) });
    assert.equal(invalidLoad.elements.get("newsletter-title").textContent, title, status);
    assert.equal(invalidLoad.elements.get("newsletter-confirmation-form").hidden, true, status);
    assert.equal(invalidLoad.body.dataset.statusDefault, "rejected", status);
  }

  const replacedInvalidToken = await runPage({
    search: "?token=no válido",
    state: { newsletterConfirmationToken: "old_valid_token", unrelated: "preserved" },
    fetchImpl: preview({})
  });
  assert.equal(Object.prototype.hasOwnProperty.call(replacedInvalidToken.replacedState, "newsletterConfirmationToken"), false);
  assert.equal(replacedInvalidToken.replacedState.unrelated, "preserved");
  const invalidRefresh = await runPage({ state: replacedInvalidToken.replacedState, fetchImpl: preview({}) });
  assert.equal(invalidRefresh.elements.get("newsletter-confirmation-form").hidden, true);
  assert.equal(invalidRefresh.fetchCalls.length, 0);

  for (const fetchImpl of [
    async () => { throw new Error("network"); },
    async () => ({ ok: true, json: async () => { throw new Error("invalid json"); } })
  ]) {
    const invalidLoad = await runPage({ search: `?token=${token}`, fetchImpl });
    assert.equal(invalidLoad.elements.get("newsletter-title").textContent, "No se pudo verificar la solicitud");
    assert.equal(invalidLoad.elements.get("newsletter-confirmation-form").hidden, true);
    assert.equal(invalidLoad.body.dataset.statusDefault, "rejected");
  }

  for (const search of ["", "?token=no válido"]) {
    const invalidLoad = await runPage({ search, fetchImpl: preview({}) });
    assert.equal(invalidLoad.elements.get("newsletter-title").textContent, "Enlace inválido");
    assert.equal(invalidLoad.elements.get("newsletter-message").textContent, "El enlace no es válido.");
    assert.equal(invalidLoad.elements.get("newsletter-confirmation-form").hidden, true);
    assert.equal(invalidLoad.body.dataset.statusDefault, "rejected");
  }

  const craftedStatus = await runPage({ search: "?status=confirmed&action=opt_out", fetchImpl: preview({}) });
  assert.equal(craftedStatus.elements.get("newsletter-title").textContent, "Enlace inválido");
  assert.equal(craftedStatus.body.dataset.statusDefault, "rejected");
  assert.equal(craftedStatus.fetchCalls.length, 0);
  assert.doesNotMatch(script, /params\.get\("status"\)|params\.get\("action"\)/);
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

test("la home mantiene los accesos y formularios comerciales nuevos", () => {
  const html = read("index.html");
  const frontendScript = read("assets/js/home-forms.js");
  const runtimeConfig = read("assets/js/runtime-config.js");
  const sql = read("docs/supabase_home_vendedores_novedades.sql");

  assert.match(html, />Hablar por WhatsApp</);
  assert.match(html, /href="\.\/vendedores\/login\.html">Acceso vendedores/);
  assert.match(html, /id="sellerApplicationForm"/);
  assert.match(html, /name="localidad_provincia"/);
  assert.match(html, /id="newsletterForm"/);
  assert.match(html, /id="newsletter-consent"/);
  assert.match(html, /Podés darte de baja cuando quieras\./);
  assert.match(html, /src="\.\/assets\/js\/runtime-config\.js"/);
  assert.match(html, /src="\.\/assets\/js\/home-forms\.js"/);
  assert.match(frontendScript, /runtimeConfig\.getFunctionUrl\("home-form-submissions"\)/);
  assert.doesNotMatch(frontendScript, /\/rest\/v1\//);
  assert.doesNotMatch(frontendScript, /anonKey|service_role|RESEND_API_KEY/i);
  assert.doesNotMatch(frontendScript, /result\.duplicate/);
  assert.match(frontendScript, /Tu solicitud fue recibida\. Te contactaremos pronto\./);
  assert.match(frontendScript, /¡Listo! Procesamos tu suscripción\./);
  assert.match(runtimeConfig, /backendOrigin/);
  assert.match(runtimeConfig, /functionBasePath: "\/\.netlify\/functions"/);
  assert.match(runtimeConfig, /https:\/\/api\.nexarsistemas\.com\.ar/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /create unique index if not exists solicitudes_vendedores_email_unico_idx/);
  assert.match(sql, /create unique index if not exists suscripciones_novedades_email_unico_idx/);
  assert.match(sql, /private\.notify_admin_email\(\)/);
});

test("la home presenta clientes con enlaces y estados públicos correctos", () => {
  const html = read("index.html");
  const siteCss = read("css/site.css");
  const ineditaCard = html.match(/<article class="product-card client-card" id="cliente-inedita">([\s\S]*?)<\/article>/);
  const tecmaCard = html.match(/<article class="product-card client-card" id="cliente-tecma">([\s\S]*?)<\/article>/);

  assert.match(html, /<section class="section" id="clientes">/);
  assert.match(html, /<h2>Quiénes confían en nosotros<\/h2>/);
  assert.match(html, /href="#clientes">Clientes<\/a>/);
  assert.equal(fs.existsSync(path.join(root, "assets/clientes/inedita_san_juan.png")), true);
  assert.equal(fs.existsSync(path.join(root, "assets/clientes/iso_corporeo_interior.png")), true);
  assert.equal(fs.existsSync(path.join(root, "assets/clientes/tecma-logo.png")), true);
  assert.ok(ineditaCard);
  assert.match(ineditaCard[1], /INÉDITA SAN JUAN/);
  assert.match(ineditaCard[1], /href="https:\/\/www\.instagram\.com\/ineditasanjuan\/" target="_blank" rel="noopener noreferrer"/);
  assert.ok(tecmaCard);
  assert.match(tecmaCard[1], /TeCMA SAN JUAN/);
  assert.doesNotMatch(tecmaCard[1], /<a\b/);
  assert.doesNotMatch(html, /Proyecto confirmado|En conversación|Próximamente/);
  assert.match(siteCss, /@media \(max-width: 960px\)[\s\S]*?\.clients-grid\s*\{\s*grid-template-columns: 1fr;/);
});

test("la home incluye la insignia oficial de LinkedIn del fundador una sola vez", () => {
  const html = read("index.html");
  const thirdParty = read("docs/legal/THIRD_PARTY.md");
  const profileUrl = "https://ar.linkedin.com/in/rolando-navarta-b033b3428?trk=profile-badge";
  const badgeScript = "https://platform.linkedin.com/badges/js/profile.js";

  assert.match(html, /data-vanity="rolando-navarta-b033b3428"/);
  assert.match(html, new RegExp(profileUrl.replace(/[.?]/g, "\\$&")));
  assert.equal((html.match(new RegExp(badgeScript.replace(/[.?]/g, "\\$&"), "g")) || []).length, 1);
  assert.match(html, /class="founder-profile-fallback"/);
  assert.match(html, /Fundador y desarrollador de Nexar Sistemas/);
  assert.match(html, /has-linkedin-badge/);
  assert.match(thirdParty, /## 9\. LinkedIn/);
  assert.match(thirdParty, new RegExp(badgeScript.replace(/[.?]/g, "\\$&")));
  assert.match(thirdParty, /fallback local y funcional/);
});

test("Nexar Play usa exclusivamente los subdominios vigentes", () => {
  const home = read("index.html");
  const portalIndex = read("vendedores/index.html");

  for (const [name, url] of [
    ["Tetris Deluxe", "https://tetris.nexarsistemas.com.ar/"],
    ["Sudoku Nexar", "https://sudoku.nexarsistemas.com.ar/"],
    ["Nexar Ruta", "https://ruta.nexarsistemas.com.ar/"]
  ]) {
    assert.match(home, new RegExp(`<h3>${name}<\\/h3>[\\s\\S]*?href="${url.replace(/[./]/g, "\\$&")}" target="_blank" rel="noopener"`));
  }
  assert.doesNotMatch(home, /Crucigrama|nexar-crucigrama|nexar-sudoku|\.\/Tetris\/|https:\/\/nexarsistemas\.github\.io\/nexar-sudoku\//);
  assert.equal(fs.existsSync(path.join(root, "Tetris")), false);
  assert.equal(fs.existsSync(path.join(root, "sudoku")), false);
  assert.equal(fs.existsSync(path.join(root, "nexar-crucigrama")), false);
  assert.match(portalIndex, /http-equiv="refresh" content="0; url=\.\/login\.html"/);
  assert.match(portalIndex, /href="\.\/login\.html"/);
});
