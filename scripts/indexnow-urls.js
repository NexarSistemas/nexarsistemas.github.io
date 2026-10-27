const fs = require("node:fs");
const path = require("node:path");

function readFile(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function sitemapUrls(sitemap) {
  return [...sitemap.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) => match[1]);
}

function robotsRules(robots) {
  const rules = [];
  let appliesToAll = false;

  for (const rawLine of robots.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;

    const field = match[1].toLowerCase();
    const value = match[2].trim();
    if (field === "user-agent") {
      appliesToAll = value === "*";
    } else if (field === "disallow" && appliesToAll && value) {
      rules.push(value);
    }
  }

  return rules;
}

function blockedByRobots(pathname, rules) {
  return rules.some((rule) => {
    const escaped = rule.replace(/[.+^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
    return new RegExp(`^${escaped.replace(/\$$/, "$")}`).test(pathname);
  });
}

function pagePathForUrl(url) {
  const pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") return "index.html";
  if (pathname.endsWith("/")) return `${pathname.slice(1)}index.html`;
  return pathname.slice(1);
}

function isNoindex(html) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].some((tag) =>
    /\bname\s*=\s*["']robots["']/i.test(tag[0]) && /\bnoindex\b/i.test(tag[0])
  );
}

function hasCanonical(html, expectedUrl) {
  return [...html.matchAll(/<link\b[^>]*>/gi)].some((tag) =>
    /\brel\s*=\s*["']canonical["']/i.test(tag[0]) &&
    new RegExp(`\\bhref\\s*=\\s*["']${expectedUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i").test(tag[0])
  );
}

function attributeValue(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1] || null;
}

function referencedAssets(html, pageUrl, origin) {
  const references = [];

  for (const tag of html.matchAll(/<(?:link|script)\b[^>]*>/gi)) {
    const element = tag[0];
    const isStylesheet = /^<link\b/i.test(element) && /\brel\s*=\s*["'][^"']*\bstylesheet\b[^"']*["']/i.test(element);
    const isScript = /^<script\b/i.test(element);
    if (!isStylesheet && !isScript) continue;

    const reference = attributeValue(element, isStylesheet ? "href" : "src");
    if (!reference) continue;

    try {
      const assetUrl = new URL(reference, pageUrl);
      if (assetUrl.origin === origin.origin && /\.(?:css|m?js)$/i.test(assetUrl.pathname)) {
        references.push(decodeURIComponent(assetUrl.pathname).replace(/^\//, ""));
      }
    } catch {
      // Una referencia inválida no autoriza una URL para IndexNow.
    }
  }

  return new Set(references);
}

function normalizedChangedFiles(changedFiles) {
  return new Set(changedFiles.map((file) => file.replaceAll("\\", "/")));
}

function selectIndexNowUrls({ root, canonicalOrigin, changedFiles, previousSitemap = "" }) {
  const origin = new URL(canonicalOrigin);
  const changed = normalizedChangedFiles(changedFiles);
  const sitemap = readFile(root, "sitemap.xml");
  const rules = robotsRules(readFile(root, "robots.txt"));
  const previouslyAuthorized = new Set(sitemapUrls(previousSitemap));
  const selected = [];

  for (const value of sitemapUrls(sitemap)) {
    let url;
    try {
      url = new URL(value);
    } catch {
      continue;
    }

    if (url.origin !== origin.origin || url.protocol !== "https:" || url.search || url.hash) continue;
    if (blockedByRobots(url.pathname, rules)) continue;

    const pagePath = pagePathForUrl(url);
    const fullPath = path.resolve(root, pagePath);
    const relativeToRoot = path.relative(root, fullPath);
    if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) continue;
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) continue;

    const html = fs.readFileSync(fullPath, "utf8");
    if (isNoindex(html) || !hasCanonical(html, url.href)) continue;
    const dependsOnChangedAsset = [...referencedAssets(html, url, origin)].some((asset) => changed.has(asset));
    if (changed.has(pagePath) || dependsOnChangedAsset || !previouslyAuthorized.has(url.href)) selected.push(url.href);
  }

  return [...new Set(selected)];
}

module.exports = { blockedByRobots, referencedAssets, robotsRules, selectIndexNowUrls, sitemapUrls };
