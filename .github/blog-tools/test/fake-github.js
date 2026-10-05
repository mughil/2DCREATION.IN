'use strict';
// In-memory stand-in for the GitHub contents API of the site repo (no network). Enforces the real
// API's sha rules: updating a file needs its current sha (409 otherwise); creating over an existing
// file without a sha is rejected (422).
const crypto = require('node:crypto');

const sha = (text) => crypto.createHash('sha1').update(text).digest('hex');

class FakeGithub {
  constructor(files = {}) {
    this.files = new Map(Object.entries(files));
    this.commits = [];
    this.failures = [];      // [{ when: (method, path) => bool, status, times }]
    this.requests = [];
  }

  failNext(when, status = 503, times = 1) {
    this.failures.push({ when, status, times });
  }

  put(path) { return this.commits.filter((c) => c.path === path); }

  fetch = async (url, init = {}) => {
    const method = (init.method || 'GET').toUpperCase();
    const match = String(url).match(/api\.github\.com\/repos\/[^/]+\/[^/]+\/contents\/(.+)$/);
    if (!match) throw new Error(`unexpected URL ${url}`);
    const path = decodeURIComponent(match[1]);
    this.requests.push({ method, path });
    const failure = this.failures.find((f) => f.times > 0 && f.when(method, path));
    if (failure) {
      failure.times -= 1;
      return new Response('upstream failure', { status: failure.status });
    }
    if (method === 'GET') {
      if (!this.files.has(path)) return new Response('{"message":"Not Found"}', { status: 404 });
      const text = this.files.get(path);
      return new Response(JSON.stringify({ sha: sha(text), content: Buffer.from(text).toString('base64') }), { status: 200 });
    }
    const body = JSON.parse(init.body);
    const exists = this.files.has(path);
    if (exists && !body.sha) return new Response('{"message":"sha wasn\'t supplied"}', { status: 422 });
    if (exists && body.sha !== sha(this.files.get(path))) return new Response('{"message":"does not match"}', { status: 409 });
    const text = Buffer.from(body.content, 'base64').toString('utf8');
    this.files.set(path, text);
    this.commits.push({ path, message: body.message });
    return new Response(JSON.stringify({ content: { sha: sha(text) } }), { status: 200 });
  };
}

const SITEMAP = '<?xml version="1.0"?>\n<urlset>\n  <url><loc>https://2dcreation.in/</loc></url>\n</urlset>\n';
const OLD_INDEX_CARDS = [
  ['old-guide-one', 'Old Guide One', 'First meta.', '2026-09-28'],
  ['old-guide-two', 'Old &amp; Guide Two', 'Second meta.', '2026-10-02'],
].map(([slug, title, meta, date]) => `<article class="card"><h3><a href="/blog/${slug}.html">${title}</a></h3><p>${meta}</p><p class="small">${date}</p></article>`).join('\n');
const OLD_INDEX = `<!doctype html><html><body><div class="card-grid">${OLD_INDEX_CARDS}</div></body></html>`;

function freshSite(extra = {}) {
  return new FakeGithub({
    'sitemap.xml': SITEMAP,
    'blog/index.html': OLD_INDEX,
    'blog/old-guide-one.html': '<html><head><title>Old Guide One</title></head></html>',
    ...extra,
  });
}

module.exports = { FakeGithub, freshSite, sha };
