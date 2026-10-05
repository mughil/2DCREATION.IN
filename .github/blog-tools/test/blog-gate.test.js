'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { generateDraft, finalizeDraft, gateAudit, seoAudit, applyFixes } = require('../blog.js');
const { schedulePlan } = require('../blog-scheduler.js');

const draftFor = (p) => generateDraft({ contact_email: 'karthick@2dcreation.in' }, { topic: p.topic, keyword: p.keyword, slug: p.keyword });
const plan = schedulePlan();
const finals = plan.map((p) => ({ p, ...finalizeDraft(draftFor(p)) }));
const passing = finals.filter((f) => f.gate.passed);

test('REGRESSION: seoAudit() passes drafts whose own text fails; the gate judges the real text', () => {
  const sample = draftFor(plan[0]);
  assert.equal(seoAudit(sample).passed, true, 'seoAudit describes a hypothetical fixed copy and says "passed"');
  assert.equal(gateAudit(sample).passed, false, 'the unfixed text itself is NOT publishable');
  assert.ok(gateAudit(sample).hard_failures.length >= 3);
});

test('most planned topics pass the gate once fixes are applied; the rest are rejected, not published', () => {
  assert.ok(passing.length >= 15, `only ${passing.length} of ${plan.length} pass`);
  for (const f of finals.filter((x) => !x.gate.passed)) assert.ok(f.gate.hard_failures.length > 0);
});

test('every draft that passes really has what the gate promises, on the exact final text', () => {
  for (const { p, draft, gate } of passing) {
    const label = p.keyword;
    assert.ok(draft.title.length >= 50 && draft.title.length <= 60, `${label}: title length ${draft.title.length}`);
    assert.ok(draft.meta_description.length >= 150 && draft.meta_description.length <= 160, `${label}: meta length`);
    assert.match(draft.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, label);
    assert.equal((draft.body_md.match(/^# /gm) || []).length, 1, `${label}: exactly one H1`);
    assert.equal(draft.body_md.match(/^# (.*)$/m)[1].trim(), draft.title, `${label}: H1 equals title`);
    assert.match(draft.body_md, /!\[[^\]]+\]\(https:\/\/[^)\s]+\)/, `${label}: hero image`);
    assert.match(draft.body_md, /Written by the 2D Creation sourcing team/, `${label}: author line`);
    assert.ok((draft.body_md.match(/\]\(https:\/\/2dcreation\.in/g) || []).length >= 3, `${label}: internal links`);
    assert.ok(gate.score >= 90, label);
    assert.deepEqual(gateAudit(draft).hard_failures, [], `${label}: audit of the stored text`);
  }
});

test('applying the fixes again changes nothing (no drift, no duplicated sections)', () => {
  for (const { draft } of passing) {
    const again = finalizeDraft(draft);
    assert.equal(again.passes, 0);
    for (const k of ['title', 'meta_description', 'slug', 'body_md']) assert.equal(again.draft[k], draft[k]);
    for (const heading of ['## Key takeaways', '## Related topics', '## Related guides']) {
      assert.ok((draft.body_md.match(new RegExp(`^${heading}$`, 'gm')) || []).length <= 1, heading);
    }
    const twice = { ...draft, ...applyFixes(draft) };
    assert.equal(twice.body_md, draft.body_md);
  }
});

function mutate(draft, fn) { return { ...draft, ...fn(draft) }; }
const good = passing[0].draft;

const DEFECTS = {
  'missing title': (d) => ({ title: '', body_md: d.body_md.replace(/^# .*$/m, '# ') }),
  'missing meta description': () => ({ meta_description: '' }),
  'unsafe slug (path traversal)': () => ({ slug: '../../index' }),
  'unsafe slug (uppercase/space)': () => ({ slug: 'Bad Slug' }),
  'missing H1': (d) => ({ body_md: d.body_md.replace(/^# .*\n/m, '') }),
  'two H1s': (d) => ({ body_md: `${d.body_md}\n# Another top heading\n` }),
  'H1 differs from the title': (d) => ({ body_md: d.body_md.replace(/^# .*$/m, '# A different heading about knitwear sourcing') }),
  'missing hero image': (d) => ({ body_md: d.body_md.replace(/^!\[[^\n]*$/m, '') }),
  'hero image over http': (d) => ({ body_md: d.body_md.replace(/!\[([^\]]+)\]\(https:/, '![$1](http:') }),
  'too few internal links': (d) => ({ body_md: d.body_md.replace(/\(https:\/\/2dcreation\.in[^)]*\)/g, '(https://example.com/x)') }),
  'states a price': (d) => ({ body_md: `${d.body_md}\nPrices start at $4 per piece.\n` }),
  'states an MOQ': (d) => ({ body_md: `${d.body_md}\nOur MOQ is 500 pieces.\n` }),
  'claims factory ownership': (d) => ({ body_md: `${d.body_md}\nMade in our factory.\n` }),
  'script injection': (d) => ({ body_md: `${d.body_md}\n<script>alert(1)</script>\n` }),
  'javascript: link': (d) => ({ body_md: `${d.body_md}\n[click](javascript:alert(1))\n` }),
  'event handler attribute': (d) => ({ body_md: `${d.body_md}\n<img src=x onerror=alert(1)>\n` }),
};

for (const [name, fn] of Object.entries(DEFECTS)) {
  test(`HARD GATE blocks: ${name}`, () => {
    const broken = mutate(good, fn);
    const gate = gateAudit(broken);
    assert.equal(gate.passed, false, `${name} must fail the gate`);
    assert.ok(gate.hard_failures.length > 0);
  });
}

test('the gate is computed from the final text, not the original draft: a defect added after fixing still fails', () => {
  const fixed = finalizeDraft(draftFor(plan[1])).draft;
  assert.equal(gateAudit(fixed).passed, true);
  assert.equal(gateAudit({ ...fixed, body_md: `${fixed.body_md}\nPrices from $2.\n` }).passed, false);
});

test('finalizeDraft(raw) returns the audited text itself (what is audited is what is stored)', () => {
  const { draft, gate } = finalizeDraft(draftFor(plan[2]));
  assert.deepEqual(gateAudit(draft), gate);
});
