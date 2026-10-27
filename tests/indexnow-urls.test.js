const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { selectIndexNowUrls } = require("../scripts/indexnow-urls");

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "indexnow-"));
  for (const [relativePath, content] of Object.entries(files)) {
    const destination = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content);
  }
  return root;
}

const origin = "https://nexarsistemas.com.ar";
const page = (url, extra = "") => `<link rel="canonical" href="${url}">${extra}`;

test("IndexNow selecciona solo páginas canónicas modificadas autorizadas por el sitemap", () => {
  const root = fixture({
    "robots.txt": "User-agent: *\nDisallow: /privada.html\n",
    "sitemap.xml": `<urlset><url><loc>${origin}/</loc></url><url><loc>${origin}/publica.html</loc></url><url><loc>${origin}/privada.html</loc></url><url><loc>${origin}/noindex.html</loc></url><url><loc>${origin}/redireccion.html</loc></url><url><loc>https://otro.ejemplo/pagina.html</loc></url></urlset>`,
    "index.html": page(`${origin}/`),
    "publica.html": page(`${origin}/publica.html`),
    "privada.html": page(`${origin}/privada.html`),
    "noindex.html": page(`${origin}/noindex.html`, '<meta name="robots" content="noindex,follow">'),
    "redireccion.html": page(`${origin}/otra.html`)
  });

  assert.deepEqual(selectIndexNowUrls({
    root,
    canonicalOrigin: origin,
    changedFiles: ["publica.html", "privada.html", "noindex.html", "redireccion.html"],
    previousSitemap: `<urlset><url><loc>${origin}/</loc></url><url><loc>${origin}/publica.html</loc></url><url><loc>${origin}/privada.html</loc></url><url><loc>${origin}/noindex.html</loc></url><url><loc>${origin}/redireccion.html</loc></url></urlset>`
  }), [`${origin}/publica.html`]);
});

test("IndexNow incluye altas nuevas del sitemap sin reenviar las URL existentes", () => {
  const root = fixture({
    "robots.txt": "User-agent: *\nAllow: /\n",
    "sitemap.xml": `<urlset><url><loc>${origin}/</loc></url><url><loc>${origin}/nueva.html</loc></url></urlset>`,
    "index.html": page(`${origin}/`),
    "nueva.html": page(`${origin}/nueva.html`)
  });

  assert.deepEqual(selectIndexNowUrls({
    root,
    canonicalOrigin: origin,
    changedFiles: ["sitemap.xml"],
    previousSitemap: `<urlset><url><loc>${origin}/</loc></url></urlset>`
  }), [`${origin}/nueva.html`]);
});
