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
    if (changed.has(pagePath) || !previouslyAuthorized.has(url.href)) selected.push(url.href);
  }

  return [...new Set(selected)];
}

module.exports = { blockedByRobots, robotsRules, selectIndexNowUrls, sitemapUrls };
