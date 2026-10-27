const { execFileSync } = require("node:child_process");
const { selectIndexNowUrls } = require("./indexnow-urls");

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function validSha(value) {
  return /^[0-9a-f]{40}$/i.test(value || "");
}

const from = argument("--from");
const to = argument("--to");
if (!validSha(from) || !validSha(to)) {
  throw new Error("Se requieren SHAs completos y válidos para --from y --to.");
}

const changedFiles = execFileSync("git", ["diff", "--name-only", from, to], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean);
let previousSitemap = "";
try {
  previousSitemap = execFileSync("git", ["show", `${from}:sitemap.xml`], { encoding: "utf8" });
} catch {
  // Sin sitemap previo, el selector no presupone que haya que avisar todo el sitio.
}

const urls = selectIndexNowUrls({
  root: process.cwd(),
  canonicalOrigin: "https://nexarsistemas.com.ar",
  changedFiles,
  previousSitemap
});
process.stderr.write(`IndexNow: ${urls.length} URL(s) canónica(s) seleccionada(s) de ${changedFiles.length} archivo(s) cambiado(s).\n`);
process.stdout.write(`${JSON.stringify(urls)}\n`);
