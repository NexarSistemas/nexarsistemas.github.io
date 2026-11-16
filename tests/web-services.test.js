const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("la página de desarrollo publica la oferta de servicios web", () => {
  const html = read("desarrollo-web.html");

  assert.match(html, /id="precios"/);
  assert.match(html, /Presencia Web[\s\S]*?Desde \$250\.000/);
  assert.match(html, /Web Profesional[\s\S]*?Desde \$450\.000/);
  assert.match(html, /Web Empresa[\s\S]*?Desde \$590\.000/);
  assert.match(html, /Sistemas web a medida[\s\S]*?Solicitar presupuesto/);
  assert.match(html, /Básico[\s\S]*?Desde \$20\.000\/mes/);
  assert.match(html, /Profesional[\s\S]*?Desde \$35\.000\/mes/);
  assert.match(html, /Empresarial[\s\S]*?Desde \$60\.000\/mes/);
  assert.match(html, /El precio final depende del alcance, las funcionalidades, las integraciones y los servicios externos\./);
});

test("Inicio conserva el ancla histórica y enlaza directamente a precios", () => {
  const home = read("index.html");
  const web = read("desarrollo-web.html");
  assert.equal((home.match(/id="servicios-web"/g) || []).length, 1);
  assert.match(home, /<article class="product-card" id="servicios-web">[\s\S]*?Desarrollo web[\s\S]*?href="\.\/desarrollo-web\.html#precios"/);
  assert.doesNotMatch(home, /web-service-package|web-maintenance|Presencia Web|Desde \$250\.000/);
  assert.equal((web.match(/id="precios"/g) || []).length, 1);
  assert.equal((web.match(/href="#precios">Precios<\/a>/g) || []).length, 2);
  assert.equal((web.match(/class="web-service-package-grid"/g) || []).length, 1);
  assert.equal((web.match(/class="web-maintenance-grid"/g) || []).length, 1);
  assert.match(web, /Todos los valores son desde\. El precio final depende del alcance, las funcionalidades, las integraciones y los servicios externos\. Los sistemas web a medida se presupuestan individualmente\./);
});

test("la home publica Nexar Play con sus accesos independientes", () => {
  const html = read("index.html");

  assert.match(html, /id="nexar-play"/);
  assert.match(html, /Tetris Deluxe/);
  assert.match(html, /href="https:\/\/tetris\.nexarsistemas\.com\.ar\/" target="_blank" rel="noopener">Jugar Tetris Deluxe/);
  assert.match(html, /href="https:\/\/sudoku\.nexarsistemas\.com\.ar\/" target="_blank" rel="noopener">Jugar Sudoku Nexar/);
  assert.match(html, /Nexar Ruta/);
  assert.match(html, /href="https:\/\/ruta\.nexarsistemas\.com\.ar\/" target="_blank" rel="noopener">Jugar Nexar Ruta/);
  assert.doesNotMatch(html, /Crucigrama Nexar|\.\/Tetris\/|nexar-sudoku|nexar-crucigrama|crucigrama\.nexarsistemas\.com\.ar/);
});

test("la solicitud de presupuesto usa el formulario existente", () => {
  const html = read("index.html");

  assert.match(read("desarrollo-web.html"), /<a class="text-link" href="\.\/index\.html#contacto">Solicitar presupuesto/);
  assert.match(html, /<section class="section contact-section" id="contacto">/);
  assert.match(html, /<option value="Diseño y desarrollo web">Diseño y desarrollo web<\/option>/);
  assert.match(html, /<option value="Solicitar presupuesto web">Solicitar presupuesto web<\/option>/);
  assert.doesNotMatch(html, /href="[^\"]*servicios-web\.html/);
});

test("la sección detallada conserva sus estilos responsivos", () => {
  const html = read("desarrollo-web.html");
  const cssPath = path.join(root, "css/web-services.css");

  assert.equal(fs.existsSync(cssPath), true);
  assert.match(html, /href="\.\/css\/web-services\.css"/);

  const css = read("css/web-services.css");
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 980px\)/);
  assert.match(css, /grid-template-columns: 1fr/);
});
