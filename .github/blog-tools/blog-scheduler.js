'use strict';

// Daily blog run on GitHub Actions (replaces the Railway dashboard's scheduler). Stateless: what is already published is read
// from the live repo (blog/ directory), and one small marker file records the day's outcome so a re-run never publishes twice.
//
//   PICK next unwritten topic -> GENERATE -> AUTO-FIX -> HARD SEO GATE -> PUBLISH (commit) -> BUILD PAGES -> VERIFY LIVE
//
// Idempotent: a re-run on a day that is already published exits at once; a day that was committed but not yet verified only
// verifies again (it never starts a second article).

const { TOPICS, generateDraft, finalizeDraft, gateAudit } = require('./blog.js');
const publisher = require('./publish-blog.js');

const RUN_HOUR_IST = 10;
const MAX_CANDIDATES = 60;
const VERIFY_ATTEMPTS = 20;
const VERIFY_WAIT_MS = 45 * 1000;
const MARKER_PATH = '.github/blog-tools/state/last-run.json';

function istNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t).value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24 };
}

// Every (topic, keyword) pair once, topics interleaved so consecutive days differ.
function schedulePlan() {
  const keys = Object.keys(TOPICS);
  const perTopic = keys.map((k) => [TOPICS[k].keyword, ...TOPICS[k].secondary].map((kw) => ({ topic: k, keyword: kw })));
  const plan = [];
  for (let i = 0; perTopic.some((list) => i < list.length); i++) for (const list of perTopic) if (list[i]) plan.push(list[i]);
  return plan;
}

function defaultDeps() {
  return {
    now: () => new Date(),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    readMarker: async () => { const f = await publisher.getFile(MARKER_PATH); return f ? JSON.parse(f.text) : null; },
    writeMarker: (marker) => publisher.updateFile(MARKER_PATH, () => JSON.stringify(marker, null, 2) + '\n', `blog: record ${marker.date} run (${marker.status})`),
    listSlugs: publisher.listBlogSlugs,
    publish: publisher.publishPost,
    verify: publisher.verifyPublication,
    buildPages: publisher.requestPagesBuild,
    finalize: finalizeDraft,
  };
}

async function verifyWithRetries(d, post) {
  let verdict = { ok: false, problems: ['not checked'] };
  for (let attempt = 1; attempt <= VERIFY_ATTEMPTS; attempt++) {
    verdict = await d.verify(post);
    if (verdict.ok) return verdict;
    await d.sleep(VERIFY_WAIT_MS);
  }
  return verdict;
}

async function runDailyBlog({ force = false, deps = {} } = {}) {
  const d = { ...defaultDeps(), ...deps };
  const now = d.now();
  const { date, hour } = istNow(now);
  if (!force && hour < RUN_HOUR_IST) return { status: 'skipped', reason: `before ${RUN_HOUR_IST}:00 IST` };

  const marker = await d.readMarker();
  if (marker && marker.date === date) {
    if (marker.status === 'published') return { status: 'published', skipped: `already published for ${date}`, url: marker.url };
    // committed earlier today but not verified: verify (and re-request the Pages build); never start a second article
    await d.buildPages();
    const post = { slug: marker.slug, title: marker.title, body_md: marker.hero ? `![x](${marker.hero})` : '' };
    const verdict = await verifyWithRetries(d, post);
    if (!verdict.ok) return { status: 'verify_failed', url: marker.url, problems: verdict.problems };
    await d.writeMarker({ ...marker, status: 'published' });
    return { status: 'published', url: marker.url };
  }

  const existing = await d.listSlugs();
  const ts = now.toISOString();
  const rejected = [];
  let tried = 0;
  for (const c of schedulePlan()) {
    if (tried >= MAX_CANDIDATES) break;
    const raw = generateDraft(null, { topic: c.topic, keyword: c.keyword, slug: c.keyword });
    const { draft, gate } = d.finalize(raw);
    if (existing.has(draft.slug)) continue;                 // already written (by this or an earlier run): not a candidate
    tried++;
    if (!gate.passed) { rejected.push(`${c.keyword}: ${gate.hard_failures.join(', ')}`); continue; }
    const post = { ...draft, id: 0, created_at: ts, updated_at: ts, canonical_url: '' };
    if (!gateAudit(post).passed) { rejected.push(`${c.keyword}: failed the final gate`); continue; }
    try {
      const result = await d.publish(post, []);
      const hero = (String(post.body_md).match(/!\[[^\]]+\]\((https:\/\/[^)\s]+)\)/) || [])[1] || '';
      const record = { date, status: 'committed', slug: post.slug, title: post.title, url: result.url, hero, at: ts };
      await d.writeMarker(record);
      await d.buildPages();
      const verdict = await verifyWithRetries(d, post);
      if (!verdict.ok) return { status: 'verify_failed', url: result.url, problems: verdict.problems };
      await d.writeMarker({ ...record, status: 'published' });
      return { status: 'published', url: result.url };
    } catch (e) {
      if (e.permanent) { rejected.push(`${c.keyword}: ${e.code}`); continue; }   // this slot is unusable: next topic
      throw e;                                                                    // transient (GitHub down): the next scheduled run retries
    }
  }
  return { status: 'no_topic', rejected };
}

module.exports = { runDailyBlog, schedulePlan, istNow, MARKER_PATH, RUN_HOUR_IST };
