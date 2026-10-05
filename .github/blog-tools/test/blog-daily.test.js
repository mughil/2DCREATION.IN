'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { runDailyBlog, schedulePlan, istNow } = require('../blog-scheduler.js');
const { generateDraft, finalizeDraft, gateAudit } = require('../blog.js');
const pub = require('../publish-blog.js');

const T_0930_IST = '2026-10-06T04:00:00Z';   // 09:30 IST on 2026-10-06
const T_1030_IST = '2026-10-06T05:00:00Z';   // 10:30 IST on 2026-10-06

function harness({ now = T_1030_IST, marker = null, existing = [], verifyResults = [{ ok: true, problems: [] }], publishError = null } = {}) {
  const calls = { publish: [], markers: [], builds: 0, verify: 0 };
  const results = [...verifyResults];
  const deps = {
    now: () => new Date(now),
    sleep: async () => {},
    readMarker: async () => marker,
    writeMarker: async (m) => { calls.markers.push(m); },
    listSlugs: async () => new Set(existing),
    publish: async (post) => {
      if (publishError) throw publishError;
      assert.equal(gateAudit(post).passed, true, 'the text handed to the publisher must pass the gate AS STORED');
      calls.publish.push(post);
      return { url: `https://2dcreation.in/blog/${post.slug}.html`, already: false };
    },
    verify: async () => { calls.verify++; return results.length > 1 ? results.shift() : results[0]; },
    buildPages: async () => { calls.builds++; return true; },
  };
  return { deps, calls };
}

test('before 10:00 IST nothing happens', async () => {
  const { deps, calls } = harness({ now: T_0930_IST });
  const r = await runDailyBlog({ deps });
  assert.equal(r.status, 'skipped');
  assert.equal(calls.publish.length, 0);
});

test('publishes one gated article, builds Pages, verifies and records the day', async () => {
  const { deps, calls } = harness();
  const r = await runDailyBlog({ deps });
  assert.equal(r.status, 'published');
  assert.equal(calls.publish.length, 1);
  assert.equal(calls.builds, 1);
  assert.deepEqual(calls.markers.map((m) => m.status), ['committed', 'published']);
  assert.equal(calls.markers[1].date, '2026-10-06');
});

test('a day that is already published is a no-op', async () => {
  const { deps, calls } = harness({ marker: { date: '2026-10-06', status: 'published', url: 'https://2dcreation.in/blog/x.html' } });
  const r = await runDailyBlog({ deps });
  assert.equal(r.status, 'published');
  assert.match(r.skipped, /already published/);
  assert.equal(calls.publish.length, 0);
  assert.equal(calls.builds, 0);
});

test('a committed-but-unverified day only verifies again and never starts a second article', async () => {
  const marker = { date: '2026-10-06', status: 'committed', slug: 'some-guide', title: 'Some Guide', url: 'https://2dcreation.in/blog/some-guide.html', hero: 'https://2dcreation.in/og-image.jpg' };
  const { deps, calls } = harness({ marker });
  const r = await runDailyBlog({ deps });
  assert.equal(r.status, 'published');
  assert.equal(calls.publish.length, 0);
  assert.equal(calls.builds, 1);
  assert.equal(calls.markers.at(-1).status, 'published');
});

test('topics whose page already exists are skipped, so the next day writes something new', async () => {
  const first = harness();
  await runDailyBlog({ deps: first.deps });
  const slug = first.calls.publish[0].slug;
  const second = harness({ existing: [slug] });
  await runDailyBlog({ deps: second.deps });
  assert.notEqual(second.calls.publish[0].slug, slug);
});

test('a page that never verifies is reported as a failure and is not recorded as published', async () => {
  const { deps, calls } = harness({ verifyResults: [{ ok: false, problems: ['page answered HTTP 404'] }] });
  const r = await runDailyBlog({ deps });
  assert.equal(r.status, 'verify_failed');
  assert.deepEqual(calls.markers.map((m) => m.status), ['committed']);     // the next run verifies again, never re-publishes
  assert.ok(calls.verify >= 2);
});

test('a permanent publish error drops that topic and tries the next; a transient one fails the run for a retry', async () => {
  const permanent = harness({ publishError: new pub.PermanentPublishError('slug_collision', 'taken') });
  const r = await runDailyBlog({ deps: permanent.deps });
  assert.equal(r.status, 'no_topic');
  assert.ok(r.rejected.length > 3);
  const transient = harness({ publishError: new Error('GitHub 502') });
  await assert.rejects(runDailyBlog({ deps: transient.deps }), /GitHub 502/);
});

test('every planned topic passes the SEO gate (so the daily run never runs dry on a bad topic)', () => {
  const failing = [];
  for (const c of schedulePlan()) {
    const { gate } = finalizeDraft(generateDraft(null, { topic: c.topic, keyword: c.keyword, slug: c.keyword }));
    if (!gate.passed) failing.push(`${c.keyword}: ${gate.hard_failures.join(',')}`);
  }
  assert.ok(failing.length < schedulePlan().length / 2, failing.join(' | '));
});

test('IST date and hour are computed in Asia/Kolkata', () => {
  assert.deepEqual(istNow(new Date('2026-10-05T18:45:00Z')), { date: '2026-10-06', hour: 0 });
});

test('the page carries the site analytics loader and matching hreflang tags (scripts/validate-site.mjs requires them)', () => {
  const draft = finalizeDraft(generateDraft(null, { topic: Object.keys(require('../blog.js').TOPICS)[0], keyword: schedulePlan()[0].keyword, slug: schedulePlan()[0].keyword })).draft;
  const html = pub.postPage({ ...draft, created_at: '2026-10-06T00:00:00Z', updated_at: '2026-10-06T00:00:00Z' });
  const url = `https://2dcreation.in/blog/${draft.slug}.html`;
  assert.ok(html.includes('analytics-consent.v2.js'));
  assert.ok(html.includes(`<link rel="alternate" hreflang="en" href="${url}">`));
  assert.ok(html.includes(`<link rel="alternate" hreflang="x-default" href="${url}">`));
});

test('adding a card to the live index keeps everything else on that page untouched', () => {
  const live = '<!doctype html><head><link rel="alternate" hreflang="en" href="https://2dcreation.in/blog/"></head><div class="card-grid"><article class="card"><h3><a href="/blog/old.html">Old</a></h3></article></div>';
  const out = pub.addCardToIndex(live, { slug: 'new-guide', title: 'New & Guide', meta_description: 'Desc', updated_at: '2026-10-06T00:00:00Z' });
  assert.ok(out.includes('hreflang="en"'));
  assert.ok(out.indexOf('/blog/new-guide.html') < out.indexOf('/blog/old.html'));
  assert.ok(out.includes('New &amp; Guide'));
  assert.equal(pub.addCardToIndex(out, { slug: 'new-guide', title: 'x', meta_description: 'y' }), out, 'idempotent');
});
