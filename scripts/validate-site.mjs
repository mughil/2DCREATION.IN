import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { htmlMetadata } from "./html-metadata.mjs";
import { isHomepageIndexLink, HOMEPAGE_LINK_MESSAGE } from "./homepage-links.mjs";

const root = process.cwd();
const errors = [];
let referenceCount = 0;

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".git" || entry.name === "node_modules") return [];
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function fail(file, message) {
  errors.push(`${relative(file)}: ${message}`);
}

function attributes(tag) {
  const values = new Map();
  for (const match of tag.matchAll(/\b([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)) {
    values.set(match[1].toLowerCase(), match[3]);
  }
  return values;
}

const files = walk(root);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const cssFiles = files.filter((file) => file.endsWith(".css"));
const jsFiles = files.filter((file) => file.endsWith(".js"));
const webpFiles = files.filter((file) => file.endsWith(".webp"));

const expectedPages = [
  "404.html",
  "faq.html",
  "hoodie-sweatshirt-sourcing.html",
  "index.html",
  "privacy.html",
  "private-label-clothing-sourcing.html",
  "product-development-sampling.html",
  "production-quality-control.html",
  "terms.html",
  "thank-you.html",
  "tshirt-casualwear-sourcing.html",
  "womenswear-kidswear-sourcing.html"
];

for (const page of expectedPages) {
  if (!fs.existsSync(path.join(root, page))) errors.push(`${page}: required page is missing`);
}
// Required entry pages must exist; every discovered HTML file is validated
// below without a fixed total page count.
// Keep every approved original; responsive derivatives may be added.
const requiredImages = [
  ...Array.from({ length: 7 }, (_, i) => `embedded-${String(i + 1).padStart(2, "0")}-opt.webp`),
  "embedded-08-720.webp",
  ...Array.from({ length: 9 }, (_, i) => `embedded-${String(i + 9).padStart(2, "0")}.webp`)
];
for (const image of requiredImages) {
  if (!fs.existsSync(path.join(root, image))) {
    errors.push(`${image}: required approved image is missing`);
  }
}

const cname = path.join(root, "CNAME");
if (!fs.existsSync(cname) || fs.readFileSync(cname, "utf8").trim() !== "2dcreation.in") {
  errors.push("CNAME: expected exactly 2dcreation.in");
}

const homepage = path.join(root, "index.html");
const mirror = path.join(root, "OPEN-THIS-FIRST.html");
if (fs.existsSync(homepage) && fs.existsSync(mirror)) {
  if (!fs.readFileSync(homepage).equals(fs.readFileSync(mirror))) {
    errors.push("OPEN-THIS-FIRST.html must remain identical to index.html");
  }
}

const htmlByFile = new Map();
const idsByFile = new Map();

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  htmlByFile.set(file, html);

  if (/data:image\//i.test(html)) fail(file, "embedded data images are not allowed");

  const ids = new Set();
  for (const match of html.matchAll(/\bid\s*=\s*(["'])(.*?)\1/gi)) {
    if (ids.has(match[2])) fail(file, `duplicate id \"${match[2]}\"`);
    ids.add(match[2]);
  }
  idsByFile.set(file, ids);

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (!attrs.has("alt")) fail(file, "image is missing an alt attribute");
    if (!/^\d+$/.test(attrs.get("width") || "")) fail(file, "image is missing a numeric width attribute");
    if (!/^\d+$/.test(attrs.get("height") || "")) fail(file, "image is missing a numeric height attribute");
  }

  let scriptNumber = 0;
  // Recognize whitespace and attributes on browser-accepted script end tags.
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script(?=[\t\n\f\r />])[^>]*>/gi)) {
    scriptNumber += 1;
    const attrs = attributes(`<script ${match[1]}>`);
    if (attrs.has("src")) continue;
    const source = match[2].trim();
    if (!source) continue;
    try {
      if ((attrs.get("type") || "").toLowerCase() === "application/ld+json") JSON.parse(source);
      else new vm.Script(source, { filename: `${relative(file)}#script-${scriptNumber}` });
    } catch (error) {
      fail(file, `inline script ${scriptNumber} is invalid: ${error.message}`);
    }
  }
}

for (const file of jsFiles) {
  try {
    new vm.Script(fs.readFileSync(file, "utf8"), { filename: relative(file) });
  } catch (error) {
    fail(file, `JavaScript syntax error: ${error.message}`);
  }
}

for (const file of cssFiles) {
  if (/data:image\//i.test(fs.readFileSync(file, "utf8"))) {
    fail(file, "embedded data images are not allowed");
  }
}

function resolveReference(sourceFile, rawReference) {
  let value = rawReference.trim();
  if (!value || /^(?:mailto:|tel:|data:|blob:|javascript:)/i.test(value) || value.startsWith("//")) return null;

  let fragment = "";
  try {
    if (/^https?:/i.test(value)) {
      const url = new URL(value);
      if (!/^(?:www\.)?2dcreation\.in$/i.test(url.hostname)) return null;
      value = url.pathname;
      fragment = url.hash.slice(1);
    } else {
      const hashIndex = value.indexOf("#");
      if (hashIndex >= 0) {
        fragment = value.slice(hashIndex + 1);
        value = value.slice(0, hashIndex);
      }
      value = value.split("?")[0];
    }
    value = decodeURIComponent(value);
    fragment = decodeURIComponent(fragment);
  } catch {
    return { error: `invalid URL \"${rawReference}\"` };
  }

  let target;
  if (!value) target = sourceFile;
  else if (value.startsWith("/")) target = path.join(root, value.slice(1));
  else target = path.resolve(path.dirname(sourceFile), value);

  if (value === "/" || value === "." || value === "./" || target.endsWith(path.sep)) {
    target = path.join(target, "index.html");
  }

  if (!target.startsWith(root + path.sep) && target !== root) {
    return { error: `reference leaves the repository: \"${rawReference}\"` };
  }
  return { target, fragment };
}

function checkReference(sourceFile, rawReference) {
  const resolved = resolveReference(sourceFile, rawReference);
  if (!resolved) return;
  if (resolved.error) {
    fail(sourceFile, resolved.error);
    return;
  }
  referenceCount += 1;
  if (!fs.existsSync(resolved.target) || !fs.statSync(resolved.target).isFile()) {
    fail(sourceFile, `missing local reference \"${rawReference}\"`);
    return;
  }
  if (resolved.fragment && resolved.target.endsWith(".html")) {
    const ids = idsByFile.get(resolved.target);
    if (!ids || !ids.has(resolved.fragment)) {
      fail(sourceFile, `missing fragment #${resolved.fragment} in ${relative(resolved.target)}`);
    }
  }
}

for (const file of htmlFiles) {
  const html = htmlByFile.get(file);
  for (const match of html.matchAll(/\b(?:href|src|poster)\s*=\s*(["'])(.*?)\1/gi)) {
    checkReference(file, match[2]);
  }
  for (const match of html.matchAll(/<a\b[^>]*?\bhref\s*=\s*(["'])(.*?)\1/gi)) {
    const dir = path.dirname(relative(file));
    if (isHomepageIndexLink(match[2], dir === "." ? "" : dir)) {
      fail(file, `${HOMEPAGE_LINK_MESSAGE}: "${match[2]}"`);
    }
  }
  for (const match of html.matchAll(/\bsrcset\s*=\s*(["'])(.*?)\1/gi)) {
    for (const candidate of match[2].split(",")) checkReference(file, candidate.trim().split(/\s+/)[0]);
  }
  for (const match of html.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    checkReference(file, match[2]);
  }
}

for (const file of cssFiles) {
  const css = fs.readFileSync(file, "utf8");
  for (const match of css.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    checkReference(file, match[2]);
  }
}

for (const file of webpFiles) {
  const bytes = fs.readFileSync(file);
  const valid = bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (!valid) fail(file, "invalid WebP file signature");
}

// ---- Unclosed meta tag checks ---------------------------------------------
// Every <meta> tag must be properly closed with '>'. An unclosed meta tag
// absorbs following content into the tag in the parser, silently breaking
// description, Open Graph and Twitter card metadata.
for (const file of htmlFiles) {
  const html = htmlByFile.get(file);
  for (const match of html.matchAll(/<meta\b[^>]*$/gim)) {
    fail(file, `unclosed meta tag missing closing '>': ${match[0].trim()}`);
  }
}

// ---- SEO metadata checks -------------------------------------------------
// Every indexable page needs one H1, a title and description of sensible length,
// a canonical that matches its own URL, matching hreflang tags, and a sitemap entry.
const SITE_ORIGIN = "https://2dcreation.in";
const SITEMAP_EXEMPT = new Set(["privacy.html", "terms.html"]);
const sitemapPath = path.join(root, "sitemap.xml");
const sitemapLocs = new Set();
if (fs.existsSync(sitemapPath)) {
  for (const match of fs.readFileSync(sitemapPath, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)) {
    sitemapLocs.add(match[1].trim());
  }
} else {
  errors.push("sitemap.xml: file is missing");
}

function expectedCanonical(rel) {
  if (rel === "index.html") return `${SITE_ORIGIN}/`;
  if (rel.endsWith("/index.html")) return `${SITE_ORIGIN}/${rel.slice(0, -"index.html".length)}`;
  return `${SITE_ORIGIN}/${rel}`;
}

const indexableCanonicals = new Set();
for (const file of htmlFiles) {
  const html = htmlByFile.get(file);
  const rel = relative(file);
  const robots = (html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']*)["']/i) || [])[1] || "";
  if (/noindex/i.test(robots)) continue;

  const canonicalTag = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  const canonical = canonicalTag ? canonicalTag[1] : "";
  if (!canonical) fail(file, "indexable page is missing a canonical link");
  else if (canonical !== expectedCanonical(rel)) fail(file, `canonical "${canonical}" does not match the page URL`);
  else indexableCanonicals.add(canonical);

  const openGraphUrls = [...html.matchAll(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/gi)].map(match => match[1]);
  if (openGraphUrls.length !== 1) fail(file, `expected exactly one Open Graph URL, found ${openGraphUrls.length}`);
  else if (openGraphUrls[0] !== canonical) fail(file, `Open Graph URL "${openGraphUrls[0]}" does not match the canonical URL`);

  const { title, description, h1Count } = htmlMetadata(html);
  if (!title) fail(file, "indexable page is missing a title");
  else if (title.length > 60) fail(file, `title is ${title.length} characters (maximum 60)`);

  if (!description) fail(file, "indexable page is missing a meta description");
  else if (description.length < 120 || description.length > 160) {
    fail(file, `meta description is ${description.length} characters (expected 120-160)`);
  }

  if (h1Count !== 1) fail(file, `expected exactly one h1, found ${h1Count}`);

  const hreflangs = new Map();
  for (const match of html.matchAll(/<link\s+rel=["']alternate["']\s+hreflang=["']([^"']+)["']\s+href=["']([^"']+)["']/gi)) {
    hreflangs.set(match[1], match[2]);
  }
  for (const code of ["en", "x-default"]) {
    if (hreflangs.get(code) !== canonical) fail(file, `hreflang="${code}" must equal the canonical URL`);
  }

  if (!SITEMAP_EXEMPT.has(rel) && !sitemapLocs.has(canonical)) fail(file, "indexable page is missing from sitemap.xml");
}
for (const loc of sitemapLocs) {
  if (!indexableCanonicals.has(loc)) errors.push(`sitemap.xml: ${loc} is not an indexable page in this repository`);
}

// ---- Structured data and removed-page checks -----------------------------
// Every @id reference must resolve (site-level ids live on the homepage graph),
// and FAQPage answers must appear in the visible page text.
const REMOVED_REFERENCES = [/\/blog(\/|\b)/i, /apparel-sourcing-india/i, /apparel-sourcing-services/i];
function collectIds(node, ids, refs) {
  if (Array.isArray(node)) return node.forEach(child => collectIds(child, ids, refs));
  if (!node || typeof node !== "object") return;
  const keys = Object.keys(node);
  if (keys.length === 1 && keys[0] === "@id") refs.push(node["@id"]);
  else if (node["@id"]) ids.add(node["@id"]);
  for (const value of Object.values(node)) collectIds(value, ids, refs);
}
function plainText(html) {
  return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<\/(p|h\d|li|summary|article|div)>/gi, "$& ").replace(/<[^>]+>/g, "")
    .replace(/&rsquo;|&#8217;/g, "\u2019").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").toLowerCase();
}
const siteIds = new Set();
for (const file of htmlFiles) {
  const html = htmlByFile.get(file);
  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    if (relative(file) !== "index.html") continue;
    collectIds(JSON.parse(block[1]), siteIds, []);
  }
}
for (const file of htmlFiles) {
  const html = htmlByFile.get(file);
  const rel = relative(file);
  for (const pattern of REMOVED_REFERENCES) {
    if (pattern.test(html)) fail(file, `references a removed page (${pattern})`);
  }
  const visible = plainText(html);
  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const data = JSON.parse(block[1]);
    const ids = new Set();
    const refs = [];
    collectIds(data, ids, refs);
    for (const ref of refs) {
      if (!ids.has(ref) && !siteIds.has(ref)) fail(file, `JSON-LD @id reference ${ref} does not resolve`);
    }
    for (const node of data["@graph"] || [data]) {
      if (node["@type"] !== "FAQPage") continue;
      for (const question of node.mainEntity || []) {
        const answer = question.acceptedAnswer.text.replace(/\s+/g, " ").toLowerCase();
        if (!visible.includes(question.name.toLowerCase())) fail(file, `FAQ question not visible on page: ${question.name}`);
        if (!visible.includes(answer.replace(/ \./g, "."))) fail(file, `FAQ answer differs from visible text: ${question.name}`);
      }
    }
  }
}
for (const extra of ["llms.txt", "robots.txt", "sitemap.xml", "manifest.webmanifest", "_headers"]) {
  const target = path.join(root, extra);
  if (!fs.existsSync(target)) continue;
  const text = fs.readFileSync(target, "utf8");
  for (const pattern of REMOVED_REFERENCES) {
    if (pattern.test(text)) errors.push(`${extra}: references a removed page (${pattern})`);
  }
}

if (errors.length) {
  console.error(`Website validation failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Website validation passed");
console.log(`- ${htmlFiles.length} HTML pages validated; ${expectedPages.length} required entry pages present`);
console.log(`- ${webpFiles.length} valid WebP images`);
console.log(`- ${referenceCount} local references resolved`);
console.log(`- JavaScript syntax and JSON-LD are valid`);
console.log(`- Image accessibility metadata is present`);
console.log(`- ${indexableCanonicals.size} indexable pages: titles, descriptions, H1, canonical, hreflang and sitemap checked`);
