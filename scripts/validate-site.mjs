import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

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
  "OPEN-THIS-FIRST.html",
  "apparel-sourcing-services.html",
  "faq.html",
  "hoodie-sweatshirt-sourcing.html",
  "index.html",
  "privacy.html",
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
if (htmlFiles.length !== expectedPages.length) {
  errors.push(`Expected ${expectedPages.length} HTML pages but found ${htmlFiles.length}`);
}
if (webpFiles.length !== 17) {
  errors.push(`Expected 17 WebP images but found ${webpFiles.length}`);
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
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
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

if (errors.length) {
  console.error(`Website validation failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Website validation passed");
console.log(`- ${htmlFiles.length} required HTML pages`);
console.log(`- ${webpFiles.length} valid WebP images`);
console.log(`- ${referenceCount} local references resolved`);
console.log(`- JavaScript syntax and JSON-LD are valid`);
console.log(`- Image accessibility metadata is present`);
