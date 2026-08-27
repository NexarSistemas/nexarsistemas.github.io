const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("la página principal publica la oferta de servicios web", () => {
  const html = read("index.html");

  assert.match(html, /id="servicios-web"/);
  assert.match(html, /Webs para tu proyecto/);
  assert.match(html, /profesionales, comercios y emprendimientos/);
  assert.match(html, /Landing pages para promocionar servicios/);
  assert.match(html, /Webs profesionales e institucionales/);
  assert.match(html, /Planes desde \$250\.000/);
  assert.match(html, /id="servicios-web"/);
  assert.match(html, /Presencia Web[\s\S]*?Desde \$250\.000/);
  assert.match(html, /Web Profesional[\s\S]*?Desde \$450\.000/);
  assert.match(html, /Web Empresa[\s\S]*?Desde \$590\.000/);
  assert.match(html, /Sistemas web a medida[\s\S]*?Solicitar presupuesto/);
  assert.match(html, /Básico[\s\S]*?Desde \$20\.000\/mes/);
  assert.match(html, /Profesional[\s\S]*?Desde \$35\.000\/mes/);
  assert.match(html, /Empresarial[\s\S]*?Desde \$60\.000\/mes/);
  assert.match(html, /El precio final depende del alcance, las funcionalidades, las integraciones y los servicios externos\./);
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

  assert.match(html, /<a class="text-link" href="#contacto">Solicitar presupuesto/);
  assert.match(html, /<section class="section contact-section" id="contacto">/);
  assert.match(html, /<option value="Diseño y desarrollo web">Diseño y desarrollo web<\/option>/);
  assert.match(html, /<option value="Solicitar presupuesto web">Solicitar presupuesto web<\/option>/);
  assert.doesNotMatch(html, /href="[^\"]*servicios-web\.html/);
});

test("la tarjeta usa el icono oficial y estilos responsivos", () => {
  const html = read("index.html");
  const cssPath = path.join(root, "css/web-services.css");
  const iconPath = path.join(root, "assets/nexar-web.png");

  assert.equal(fs.existsSync(cssPath), true);
  assert.equal(fs.existsSync(iconPath), true);
  assert.match(html, /href="\.\/css\/web-services\.css"/);

  const css = read("css/web-services.css");
  assert.match(css, /\.product-grid-services/);
  assert.match(css, /url\("\.\.\/assets\/nexar-web\.png"\)/);
  assert.match(css, /background:[^;]*contain no-repeat/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 980px\)/);
  assert.match(css, /grid-template-columns: 1fr/);
});
