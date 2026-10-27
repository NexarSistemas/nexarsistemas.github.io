const fs = require("node:fs");
const path = require("node:path");

const canonicalOrigin = "https://nexarsistemas.com.ar";
const endpoint = "https://api.indexnow.org/indexnow";
const keyFile = "14b6140b-84c3-4548-9b01-4d27442e8b1d.txt";
const urlsFile = process.argv[2];

if (!urlsFile) throw new Error("Se requiere un archivo JSON de URLs.");
const key = fs.readFileSync(path.join(process.cwd(), keyFile), "utf8").trim();
if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) throw new Error("La clave de IndexNow no tiene un formato válido.");

const urls = JSON.parse(fs.readFileSync(urlsFile, "utf8"));
if (!Array.isArray(urls)) throw new Error("El archivo de URLs debe contener un arreglo JSON.");
for (const url of urls) {
  if (new URL(url).origin !== canonicalOrigin) throw new Error("Se intentó enviar una URL fuera del dominio canónico.");
}

const dryRun = process.env.INDEXNOW_DRY_RUN === "true";
async function submit() {
  for (let offset = 0; offset < urls.length; offset += 100) {
    const batch = urls.slice(offset, offset + 100);
    if (dryRun) {
      console.log(`IndexNow (simulación): lote ${offset / 100 + 1}, ${batch.length} URL(s); no se realizó ningún envío.`);
      continue;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ host: "nexarsistemas.com.ar", key, keyLocation: `${canonicalOrigin}/${keyFile}`, urlList: batch })
    });
    console.log(`IndexNow: lote ${offset / 100 + 1}, ${batch.length} URL(s), HTTP ${response.status}.`);
    if (![200, 202].includes(response.status)) {
      throw new Error(`IndexNow rechazó el lote con HTTP ${response.status}.`);
    }
  }
}

submit().catch((error) => {
  console.error(`IndexNow: ${error.message}`);
  process.exitCode = 1;
});
