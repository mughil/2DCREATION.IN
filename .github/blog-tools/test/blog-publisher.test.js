'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const pub = require('../publish-blog.js');
const { generateDraft, finalizeDraft } = require('../blog.js');
const { schedulePlan } = require('../blog-scheduler.js');
const { freshSite } = require('./fake-github.js');

const p0 = schedulePlan()[0];
const baseDraft = finalizeDraft(generateDraft({ contact_email: 'a@b.test' }, { topic: p0.topic, keyword: p0.keyword, slug: p0.keyword })).draft;
const POST = { ...baseDraft, id: 1, canonical_url: '', created_at: '2026-10-05T05:00:00Z', updated_at: '2026-10-05T05:00:00Z', status: 'Draft' };
const URL = `https://2dcreation.in/blog/${POST.slug}.html`;
const PATH = `blog/${POST.slug}.html`;

function use(site) {
  pub.setDeps({ fetch: site.fetch, token: 'test-token-not-real' });
  return site;
}

test('publishes the page, merges the index, and adds the sitemap entry once', async () => {
  const site = use(freshSite());
  const result = await pub.publishPost(POST, []);
  assert.deepEqual(result, { url: URL, already: false, resumed: false });
  assert.match(site.files.get(PATH), new RegExp(`<link rel="canonical" href="${URL}">`));
  const index = site.files.get('blog/index.html');
  for (const slug of ['old-guide-one', 'old-guide-two', POST.slug]) assert.ok(index.includes(`/blog/${slug}.html`), slug);
  assert.ok(index.includes('Old &amp; Guide Two'), 'existing entries survive without double-escaping');
  assert.equal((site.files.get('sitemap.xml').match(new RegExp(`<loc>${URL}</loc>`, 'g')) || []).length, 1);
  assert.equal(site.put(PATH).length, 1);
});

test('an article already recorded as published is never published again', async () => {
  const site = use(freshSite());
  const result = await pub.publishPost({ ...POST, canonical_url: URL }, []);
  assert.equal(result.already, true);
  assert.equal(site.commits.length, 0);
  assert.equal(site.requests.length, 0);
});

test('RETRY IDEMPOTENCY: a failure after the page commit is resumed without a second article', async () => {
  const site = use(freshSite());
  site.failNext((m, path) => m === 'PUT' && path === 'blog/index.html', 503, 1);
  await assert.rejects(() => pub.publishPost(POST, []), /GitHub 503/);
  assert.equal(site.put(PATH).length, 1, 'page committed before the failure');
  const result = await pub.publishPost(POST, []);   // the scheduler's automatic retry
  assert.equal(result.resumed, true);
  assert.equal(site.put(PATH).length, 1, 'the page is NOT written a second time');
  const index = site.files.get('blog/index.html');
  assert.equal((index.match(new RegExp(`/blog/${POST.slug}\\.html`, 'g')) || []).length, 1, 'listed exactly once');
  assert.equal((site.files.get('sitemap.xml').match(new RegExp(`<loc>${URL}</loc>`, 'g')) || []).length, 1);
});

test('a retry after the sitemap step failed also finishes cleanly', async () => {
  const site = use(freshSite());
  site.failNext((m, path) => m === 'PUT' && path === 'sitemap.xml', 502, 1);
  await assert.rejects(() => pub.publishPost(POST, []));
  await pub.publishPost(POST, []);
  assert.equal(site.put(PATH).length, 1);
  assert.equal((site.files.get('sitemap.xml').match(/<loc>/g) || []).length, 2);
});

test('SLUG COLLISION: a page that is not ours is never overwritten', async () => {
  const handmade = '<html><head><title>A different hand-written article</title></head><body>precious</body></html>';
  const site = use(freshSite({ [PATH]: handmade }));
  await assert.rejects(() => pub.publishPost(POST, []), (e) => e.permanent === true && e.code === 'slug_collision');
  assert.equal(site.files.get(PATH), handmade);
  assert.equal(site.commits.length, 0);
});

test('unsafe slugs are refused before any request', async () => {
  const site = use(freshSite());
  for (const slug of ['../../etc/passwd', 'a/b', 'Bad Slug', '', 'x.html', '-lead']) {
    await assert.rejects(() => pub.publishPost({ ...POST, slug }, []), (e) => e.code === 'invalid_slug' && e.permanent);
  }
  assert.equal(site.requests.length, 0);
});

test('a sha conflict (another article was added meanwhile) is merged with, never overwritten', async () => {
  const site = use(freshSite());
  const realFetch = site.fetch;
  let injected = false;
  pub.setDeps({
    fetch: async (url, init = {}) => {
      if (!injected && (init.method || 'GET') === 'PUT' && String(url).endsWith('blog/index.html')) {
        injected = true;
        const card = '<article class="card"><h3><a href="/blog/raced-in-article.html">Raced In Article</a></h3><p>Added by another commit.</p><p class="small">2026-10-05</p></article>';
        site.files.set('blog/index.html', site.files.get('blog/index.html').replace('</div>', `${card}</div>`));
      }
      return realFetch(url, init);
    },
  });
  await pub.publishPost(POST, []);
  assert.ok(site.files.get('blog/index.html').includes(`/blog/${POST.slug}.html`));
  assert.ok(site.files.get('blog/index.html').includes('/blog/raced-in-article.html'), 'the concurrent article is kept');
  assert.ok(site.files.get('blog/index.html').includes('/blog/old-guide-one.html'));
});

test('the index keeps live entries this server does not know about, and puts the new article first', async () => {
  const site = use(freshSite());
  await pub.publishPost(POST, []);
  const entries = pub.parseIndex(site.files.get('blog/index.html'));
  // the new article goes first; the live index is edited in place, so the entries already on it keep their order
  assert.deepEqual(entries.map((e) => e.slug), [POST.slug, 'old-guide-one', 'old-guide-two']);
  assert.equal(entries[2].title, 'Old & Guide Two');
});

test('siteHasSlug reports live pages', async () => {
  use(freshSite());
  assert.equal(await pub.siteHasSlug('old-guide-one'), true);
  assert.equal(await pub.siteHasSlug('never-written'), false);
});

test('markdown conversion never writes dangerous URLs or markup', () => {
  const html = pub.mdToHtml('[a](javascript:alert(1)) [b](https://2dcreation.in/x) ![h](data:text/html,x) <script>alert(1)</script>\n![ok](https://2dcreation.in/og-image.jpg)');
  assert.ok(!/href="javascript:/i.test(html));
  assert.ok(!/<script/i.test(html));
  assert.ok(!/src="data:/i.test(html));
  assert.ok(html.includes('href="https://2dcreation.in/x"'));
  assert.ok(html.includes('src="https://2dcreation.in/og-image.jpg"'));
});

test('the rendered page escapes the title and carries canonical, og:image and the hero', () => {
  const html = pub.postPage({ ...POST, title: 'A <b>"quoted"</b> & title' });
  assert.ok(html.includes('<title>A &lt;b&gt;&quot;quoted&quot;&lt;/b&gt; &amp; title</title>'));
  const page = pub.postPage(POST);
  assert.ok(page.includes(`<link rel="canonical" href="${URL}">`));
  assert.ok(/<meta property="og:image" content="https:\/\/2dcreation\.in\/og-image\.jpg">/.test(page));
  assert.ok(/<figure class="blog-hero"><img src="https:\/\/2dcreation\.in\/og-image\.jpg"/.test(page));
  assert.equal((page.match(/<h1>/g) || []).length, 1);
});

// ---------------------------------------------------------------- verification of the live page
const livePage = () => pub.postPage(POST);
const fakePublic = ({ page = livePage(), pageStatus = 200, imageStatus = 200, imageType = 'image/jpeg', throwPage = false } = {}) => async (url) => {
  if (String(url).includes('/blog/')) {
    if (throwPage) throw new Error('connect ECONNRESET');
    return new Response(page, { status: pageStatus });
  }
  return new Response('img', { status: imageStatus, headers: { 'content-type': imageType } });
};

test('verification passes for a correct live page', async () => {
  assert.deepEqual(await pub.verifyPublication(POST, { fetch: fakePublic() }), { ok: true, problems: [] });
});

test('verification fails when the page is not live, wrong, or its hero image is broken', async () => {
  const cases = {
    'HTTP 404': fakePublic({ pageStatus: 404 }),
    'canonical': fakePublic({ page: livePage().replace(URL, 'https://2dcreation.in/blog/other.html') }),
    'title': fakePublic({ page: livePage().replace(/<title>[^<]*<\/title>/, '<title>Other</title>') }),
    'og:image': fakePublic({ page: livePage().replace(/<meta property="og:image"[^>]*>/, '') }),
    'hero image': fakePublic({ imageStatus: 404 }),
    'hero not an image': fakePublic({ imageType: 'text/html' }),
    'request failed': fakePublic({ throwPage: true }),
  };
  for (const [name, fetchImpl] of Object.entries(cases)) {
    const verdict = await pub.verifyPublication(POST, { fetch: fetchImpl });
    assert.equal(verdict.ok, false, name);
    assert.ok(verdict.problems.length > 0, name);
  }
});
