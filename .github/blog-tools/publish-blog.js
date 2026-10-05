'use strict';

// Publishes a Blog Studio draft as a real, styled page on the live 2dcreation.in site
// (a static GitHub Pages site, repo mughil/2DCREATION.IN - not a CMS). Matches the site's
// existing page template (header/footer/nav, JSON-LD, breadcrumb, related links), maintains
// a /blog/ index page, and appends the new URL to sitemap.xml - all as one atomic set of
// GitHub commits. Publishes at most once per post; idempotent by canonical_url.
//
// Requires GITHUB_TOKEN (or local `gh` login) with write access to mughil/2DCREATION.IN.
// This is separate from the Buyer Leads GITHUB_TOKEN target (mughil/2d-creation-automation) -
// the same token works for both only if it is a broad classic PAT (repo scope), not a
// fine-grained token scoped to one repository.

const { execFile } = require('node:child_process');
const fs = require('node:fs');

const SITE_REPO = 'mughil/2DCREATION.IN';
const SITE = 'https://2dcreation.in';
const GH = 'gh';

// Overridable for tests (no network): fetch implementation and token.
const deps = { fetch: (...args) => globalThis.fetch(...args), token: null };
function setDeps(overrides) { Object.assign(deps, overrides); }

// A failure that retrying cannot fix (the page slot belongs to someone else, the slug is unsafe).
class PermanentPublishError extends Error {
  constructor(code, message) { super(message); this.code = code; this.permanent = true; }
}
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

let cachedToken = null;
function token() {
  if (deps.token) return Promise.resolve(deps.token);
  if (process.env.GITHUB_TOKEN) return Promise.resolve(process.env.GITHUB_TOKEN);
  if (cachedToken) return Promise.resolve(cachedToken);
  return new Promise((resolve, reject) => {
    execFile(GH, ['auth', 'token'], { timeout: 15000, windowsHide: true }, (err, stdout) => {
      if (err) return reject(new Error('GitHub not connected: set GITHUB_TOKEN or sign in with the GitHub CLI'));
      cachedToken = stdout.toString().trim();
      resolve(cachedToken);
    });
  });
}

async function ghApi(method, route, body) {
  const res = await deps.fetch(`https://api.github.com/${route}`, {
    method,
    headers: { Authorization: `Bearer ${await token()}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${method} ${route}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function getFile(path) {
  try {
    const data = await ghApi('GET', `repos/${SITE_REPO}/contents/${path}`);
    return { sha: data.sha, text: Buffer.from(data.content, 'base64').toString('utf8') };
  } catch (e) {
    if (/GitHub 404/.test(e.message)) return null;
    throw e;
  }
}

async function putFile(path, content, message, sha) {
  return ghApi('PUT', `repos/${SITE_REPO}/contents/${path}`, {
    message, content: Buffer.from(content, 'utf8').toString('base64'), ...(sha ? { sha } : {}),
  });
}

// Read-modify-write for files other commits may touch (the blog index, the sitemap). If the file changed
// between our read and our write (GitHub answers 409/422), the new content is recomputed from the FRESH
// file, so a concurrent commit is merged with, never overwritten. Returns false when nothing needed changing.
async function updateFile(path, transform, message, attempts = 3) {
  for (let attempt = 1; ; attempt++) {
    const file = await getFile(path);
    const next = transform(file ? file.text : null);
    if (next === null || (file && next === file.text)) return false;
    try {
      await putFile(path, next, message, file ? file.sha : undefined);
      return true;
    } catch (e) {
      if (attempt >= attempts || !/GitHub (409|422)/.test(e.message)) throw e;
    }
  }
}

// ---------- minimal markdown -> HTML for the site's article body ----------
function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// Only http(s), site-relative, anchor and mailto targets are ever written into a page.
function safeUrl(u) {
  const s = String(u || '').trim();
  return /^(https?:\/\/|\/(?!\/)|#|mailto:)/i.test(s) && !/[\s"'<>]/.test(s) ? s : '#';
}
function inline(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, text, url) => `<a href="${escapeHtml(safeUrl(url))}">${text}</a>`);
}
function mdToHtml(md) {
  const lines = String(md || '').split(/\r?\n/);
  const out = [];
  let list = null;
  const flushList = () => { if (list) { out.push(`<${list}>${out.pop()}`); } };
  let listItems = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) { if (inList) { out.push(`<ul>${listItems.join('')}</ul>`); listItems = []; inList = false; } out.push(`<figure class="blog-hero"><img src="${escapeHtml(safeUrl(image[2]))}" alt="${escapeHtml(image[1])}" width="1200" height="630" loading="eager" decoding="async"></figure>`); continue; }
    if (/^#\s+/.test(line)) continue; // H1 handled separately (post title)
    if (/^##\s+/.test(line)) { if (inList) { out.push(`<ul>${listItems.join('')}</ul>`); listItems = []; inList = false; } out.push(`<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`); continue; }
    if (/^###\s+/.test(line)) { if (inList) { out.push(`<ul>${listItems.join('')}</ul>`); listItems = []; inList = false; } out.push(`<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`); continue; }
    if (/^[-*]\s+/.test(line)) { inList = true; listItems.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`); continue; }
    if (!line) { if (inList) { out.push(`<ul>${listItems.join('')}</ul>`); listItems = []; inList = false; } continue; }
    if (inList) { out.push(`<ul>${listItems.join('')}</ul>`); listItems = []; inList = false; }
    out.push(`<p>${inline(line)}</p>`);
  }
  if (inList) out.push(`<ul>${listItems.join('')}</ul>`);
  return out.join('\n');
}

const NAV = `<header class="site-header"><div class="wrap header-inner"><a class="brand" href="/" aria-label="2D Creation homepage"><strong>2D</strong> CREATION</a><nav class="desktop-nav" aria-label="Primary"><a href="/">Home</a><a href="/apparel-sourcing-services.html">Services</a><a href="/blog/">Blog</a><a href="/#certifications">Standards</a></nav><a class="header-cta" href="/#quote">Request a quote</a><details class="mobile-menu"><summary>Menu</summary><nav aria-label="Mobile"><a href="/">Home</a><a href="/apparel-sourcing-services.html">Services</a><a href="/blog/">Blog</a><a href="/#quote">Request a quote</a></nav></details></div></header>`;
const FOOTER = `<footer class="site-footer"><div class="wrap"><div class="footer-grid"><div class="footer-brand"><a class="brand" href="/"><strong>2D</strong> CREATION</a><p>Apparel sourcing, development and production coordination from Tirupur, Tamil Nadu, India.</p></div><div class="footer-group"><h2>Services</h2><a href="/apparel-sourcing-services.html">Apparel sourcing</a><a href="/product-development-sampling.html">Development &amp; sampling</a><a href="/production-quality-control.html">Production &amp; quality</a></div><div class="footer-group"><h2>Blog</h2><a href="/blog/">All articles</a></div></div><div class="copyright"><span>© 2026 2D Creation. All Rights Reserved.</span><span><a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a> · <a href="/faq.html">FAQ</a></span></div></div></footer>`;

// Same <head> additions the site's other pages carry (analytics loader first, hreflang pair right after the canonical).
const ANALYTICS_HEAD = `<!-- Privacy-first Google Analytics 4 -->
<link rel="preload" href="/analytics-consent.v2.css" as="style">
<link rel="stylesheet" href="/analytics-consent.v2.css" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="/analytics-consent.v2.css"></noscript>
<script defer src="/analytics-consent.v2.js"></script>
`;
const hreflang = (url) => `\n<link rel="alternate" hreflang="en" href="${url}">\n<link rel="alternate" hreflang="x-default" href="${url}">`;

function postPage(post) {
  const url = `${SITE}/blog/${post.slug}.html`;
  const title = escapeHtml(post.title);
  const meta = escapeHtml(post.meta_description);
  const bodyHtml = mdToHtml(post.body_md.replace(/^# .*$/m, '')); // drop the H1 line; rendered separately below
  const dateIso = (post.updated_at || post.created_at || new Date().toISOString()).slice(0, 10);
  return `<!doctype html>
<html lang="en">
<head>
${ANALYTICS_HEAD}<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${meta}">
<meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${url}">${hreflang(url)}
<meta property="og:type" content="article"><meta property="og:site_name" content="2D Creation"><meta property="og:title" content="${title}"><meta property="og:description" content="${meta}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/og-image.jpg">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/seo-pages.css">
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Article', headline: post.title, description: post.meta_description,
    datePublished: dateIso, dateModified: dateIso, mainEntityOfPage: url,
    author: { '@type': 'Organization', name: '2D Creation' }, publisher: { '@type': 'Organization', name: '2D Creation', url: `${SITE}/` },
  })}</script>
</head>
<body>
<a class="skip" href="#main">Skip to main content</a>
${NAV}
<main id="main">
<section class="page-hero"><div class="wrap"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/blog/">Blog</a><span aria-hidden="true">/</span><span>${title}</span></nav><h1>${title}</h1><p class="lede">${meta}</p></div></section>
<section class="section"><div class="wrap"><article class="blog-article">${bodyHtml}</article></div></section>
<section class="cta-band"><div class="wrap cta-inner"><div><h2>Have a sourcing brief in mind?</h2><p>Send your style references, fabric direction, quantity, destination and required date.</p></div><a class="button" href="/#quote">Request a sourcing discussion</a></div></section>
</main>
${FOOTER}
</body></html>`;
}

function indexPage(posts) {
  const items = posts.map((p) => `<article class="card"><h3><a href="/blog/${p.slug}.html">${escapeHtml(p.title)}</a></h3><p>${escapeHtml(p.meta_description)}</p><p class="small">${(p.updated_at || p.created_at || '').slice(0, 10)}</p></article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Blog | 2D Creation - Apparel Sourcing in Tirupur</title>
<meta name="description" content="Practical guides on apparel sourcing, sampling and quality control from 2D Creation, a sourcing agent in Tirupur, India.">
<meta name="robots" content="index,follow"><link rel="canonical" href="${SITE}/blog/">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/seo-pages.css">
</head>
<body>
<a class="skip" href="#main">Skip to main content</a>
${NAV}
<main id="main">
<section class="page-hero"><div class="wrap"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>Blog</span></nav><h1>Sourcing guides from Tirupur</h1><p class="lede">Practical guidance for apparel buyers, published as 2D Creation coordinates sourcing, sampling and production for international brands.</p></div></section>
<section class="section"><div class="wrap"><div class="card-grid">${items || '<p>New articles are published here regularly.</p>'}</div></div></section>
</main>
${FOOTER}
</body></html>`;
}

function cardFor(post) {
  const date = String(post.updated_at || post.created_at || new Date().toISOString()).slice(0, 10);
  return `<article class="card"><h3><a href="/blog/${post.slug}.html">${escapeHtml(post.title)}</a></h3><p>${escapeHtml(post.meta_description)}</p><p class="small">${date}</p></article>`;
}

// Adds the new article's card at the top of the existing index, leaving everything else on the page untouched.
function addCardToIndex(html, post) {
  if (html.includes(`href="/blog/${post.slug}.html"`)) return html;
  const marker = '<div class="card-grid">';
  if (!html.includes(marker)) throw new Error('blog/index.html has no card grid to add the article to');
  return html.replace(/<div class="card-grid">(<p>New articles are published here regularly\.<\/p>)?/, `${marker}${cardFor(post)}`);
}

async function updateSitemap(url) {
  const entry = `  <url><loc>${url}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>
`;
  await updateFile('sitemap.xml', (text) => {
    if (text === null) return null;                       // no sitemap on this site: nothing to do
    if (text.includes(`<loc>${url}</loc>`)) return text;  // already listed
    return text.replace('</urlset>', `${entry}</urlset>`);
  }, `blog: add ${url} to sitemap`);
}

function unescapeHtml(s) {
  return String(s || '').replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
}

// Entries already listed on the live /blog/ index page (so a rebuilt index never drops an article that
// this server's own database does not know about, e.g. after a restored or replaced database).
function parseIndex(html) {
  const entries = [];
  const card = /<article class="card"><h3><a href="\/blog\/([a-z0-9-]+)\.html">([\s\S]*?)<\/a><\/h3><p>([\s\S]*?)<\/p><p class="small">([^<]*)<\/p><\/article>/g;
  for (const m of String(html || '').matchAll(card)) {
    entries.push({ slug: m[1], title: unescapeHtml(m[2]), meta_description: unescapeHtml(m[3]), updated_at: m[4].trim() });
  }
  return entries;
}

function mergeIndexEntries(existingHtml, posts) {
  const bySlug = new Map(parseIndex(existingHtml).map((e) => [e.slug, e]));
  for (const p of posts) bySlug.set(p.slug, { slug: p.slug, title: p.title, meta_description: p.meta_description, updated_at: String(p.updated_at || p.created_at || '').slice(0, 10) });
  return [...bySlug.values()].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)) || a.slug.localeCompare(b.slug));
}

// True when an existing live page is the one THIS post produced (same title and canonical), i.e. a
// previous attempt that was interrupted before the index/sitemap commits. Anything else is someone
// else's page and is never overwritten.
function isOurPage(text, post) {
  const url = `${SITE}/blog/${post.slug}.html`;
  return text.includes(`<title>${escapeHtml(post.title)}</title>`) && text.includes(`<link rel="canonical" href="${url}">`);
}

// Pushes made with the workflow's GITHUB_TOKEN do not start GitHub Pages' own build, so ask for one explicitly.
async function requestPagesBuild() {
  try { await ghApi('POST', `repos/${SITE_REPO}/pages/builds`); return true; } catch (e) { console.error(`[blog] pages build request failed: ${e.message}`); return false; }
}

async function listBlogSlugs() {
  const files = await ghApi('GET', `repos/${SITE_REPO}/contents/blog`);
  return new Set(files.filter((f) => f.type === 'file' && f.name.endsWith('.html') && f.name !== 'index.html').map((f) => f.name.slice(0, -5)));
}

async function siteHasSlug(slug) {
  return Boolean(await getFile(`blog/${slug}.html`));
}

// Publishes one post live. Idempotent and resumable:
// - a post that already has its canonical_url recorded is never published again;
// - the page file is created only if absent. If a page with that slug already exists and is not this
//   post's own, the publish stops with a permanent `slug_collision` (nothing is overwritten);
// - if our own page is already there (an earlier attempt died before the index/sitemap commits) the
//   remaining steps simply continue, so a retry can never create a second article.
async function publishPost(post, allPublishedPosts) {
  if (!SAFE_SLUG.test(String(post.slug || ''))) throw new PermanentPublishError('invalid_slug', `unsafe slug "${post.slug}"`);
  const expectedUrl = `${SITE}/blog/${post.slug}.html`;
  if (post.canonical_url === expectedUrl) return { url: expectedUrl, already: true };

  const path = `blog/${post.slug}.html`;
  const existing = await getFile(path);
  if (existing && !isOurPage(existing.text, post)) {
    throw new PermanentPublishError('slug_collision', `${path} already exists on the live site and was not written by this post`);
  }
  if (!existing) {
    try {
      await putFile(path, postPage(post), `blog: publish "${post.title}"`);
    } catch (e) {
      // 422 = the page appeared between our check and our write. Ours (a parallel retry) is fine; anything else is a collision.
      if (!/GitHub (409|422)/.test(e.message)) throw e;
      const raced = await getFile(path);
      if (!raced || !isOurPage(raced.text, post)) throw new PermanentPublishError('slug_collision', `${path} was created by someone else while publishing`);
    }
  }

  await updateFile('blog/index.html', (text) => (text ? addCardToIndex(text, post) : indexPage(mergeIndexEntries('', [post, ...allPublishedPosts]))),
    `blog: update index with "${post.title}"`);

  await updateSitemap(expectedUrl);
  return { url: expectedUrl, already: false, resumed: Boolean(existing) };
}

// Checks the PUBLIC page, not the commit: the URL answers 200 with the canonical, title, H1 and social
// image, and the hero image itself loads. Used after publishing; GitHub Pages can take a few minutes to
// deploy, so callers retry rather than treating the first miss as a failure.
async function verifyPublication(post, options = {}) {
  const get = options.fetch || deps.fetch;
  const url = `${SITE}/blog/${post.slug}.html`;
  const problems = [];
  let html = '';
  try {
    const res = await get(`${url}?verify=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(20000) });
    if (res.status !== 200) problems.push(`page answered HTTP ${res.status}`);
    else html = await res.text();
  } catch (e) {
    return { ok: false, problems: [`page request failed: ${e.message}`] };
  }
  if (html) {
    if (!html.includes(`<link rel="canonical" href="${url}">`)) problems.push('canonical link missing or wrong');
    if (!html.includes(`<title>${escapeHtml(post.title)}</title>`)) problems.push('title missing or different');
    if (!new RegExp(`<h1>${escapeHtml(post.title).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h1>`).test(html)) problems.push('H1 missing or different');
    if (!/<meta property="og:image" content="https:\/\/[^"]+">/.test(html)) problems.push('og:image missing');
    const hero = String(post.body_md || '').match(/!\[[^\]]+\]\((https:\/\/[^)\s]+)\)/);
    if (!hero) problems.push('hero image missing from the article');
    else {
      try {
        const img = await get(hero[1], { signal: AbortSignal.timeout(20000) });
        if (img.status !== 200 || !/^image\//i.test(img.headers.get('content-type') || '')) problems.push(`hero image did not load (HTTP ${img.status})`);
      } catch (e) {
        problems.push(`hero image request failed: ${e.message}`);
      }
    }
  }
  return { ok: problems.length === 0, problems };
}

module.exports = {
  getFile, putFile, updateFile, requestPagesBuild, listBlogSlugs, addCardToIndex, ANALYTICS_HEAD, publishPost, postPage, indexPage, mdToHtml, SITE_REPO, SITE, verifyPublication, siteHasSlug,
  mergeIndexEntries, parseIndex, isOurPage, setDeps, PermanentPublishError, SAFE_SLUG, safeUrl,
};
