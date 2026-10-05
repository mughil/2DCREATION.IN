'use strict';

// Blog Studio: fact-bound draft generation, SEO audit and platform exports for 2dcreation.in.
// Drafts only - nothing here publishes anywhere. Content is built from verified business facts;
// it never states an MOQ, prices, client names or factory ownership (see CLAUDE.md).

const SITE = 'https://2dcreation.in';
const DEFAULT_HERO_IMAGE_URL = `${SITE}/og-image.jpg`;
const DEFAULT_HERO_IMAGE_ALT = 'Apparel sourcing and garment production guidance from Tirupur';
const PAGES = {
  services: { url: `${SITE}/apparel-sourcing-services.html`, text: 'apparel sourcing services in Tirupur' },
  tshirt: { url: `${SITE}/tshirt-casualwear-sourcing.html`, text: 'T-shirt and casualwear sourcing' },
  hoodie: { url: `${SITE}/hoodie-sweatshirt-sourcing.html`, text: 'hoodie and sweatshirt sourcing' },
  kids: { url: `${SITE}/womenswear-kidswear-sourcing.html`, text: 'womenswear and kidswear sourcing' },
  sampling: { url: `${SITE}/product-development-sampling.html`, text: 'product development and sampling' },
  qc: { url: `${SITE}/production-quality-control.html`, text: 'quality control and production follow-up' },
  faq: { url: `${SITE}/faq.html`, text: 'apparel sourcing FAQ' },
  home: { url: `${SITE}/`, text: '2D Creation' },
};
const EXTERNAL = {
  oekotex: { url: 'https://www.oeko-tex.com/en/', text: 'OEKO-TEX' },
  gots: { url: 'https://global-standard.org/', text: 'Global Organic Textile Standard (GOTS)' },
};

const PLATFORMS = {
  wordpress: 'WordPress.org',
  wix: 'Wix',
  squarespace: 'Squarespace',
  medium: 'Medium',
  ghost: 'Ghost',
};

// Each topic: title, keyword, secondary keywords, internal/external links and body sections.
const TOPICS = {
  tshirt: {
    label: 'T-shirt sourcing guide',
    title: 'T-Shirt Sourcing in Tirupur, India: A Practical Buyer\'s Guide',
    keyword: 't-shirt sourcing in Tirupur',
    secondary: ['t-shirt manufacturer India', 'private label t-shirts', 'Tirupur knitwear'],
    links: ['tshirt', 'sampling', 'qc'],
    sections: [
      ['Why buyers look at Tirupur for T-shirts', [
        'Tirupur in Tamil Nadu is one of India\'s best-known knitwear clusters. Spinning, knitting, dyeing, printing, stitching and finishing units work close to each other, which helps knit programmes such as T-shirts, polos and casual tops move from fabric to finished garment with fewer hand-offs.',
        'For an overseas brand, the practical question is not only "who can make it" but "who will coordinate it". That is the role of a sourcing agent: matching your specification to suitable factories and following the order through each stage.',
      ]],
      ['What to prepare before you ask for a quote', [
        'A clear brief saves weeks. Share the product type, target quantity per style and colour, destination market, reference samples or images, a tech pack if you have one, fabric composition and GSM, print or embroidery details, and your target delivery date.',
        'If certification matters for your market, say which standard you need (for example OEKO-TEX or GOTS) at the start, because it narrows the factories that can be considered.',
      ]],
      ['From sample to bulk production', [
        'A typical T-shirt programme moves through fabric and trim sourcing, proto or fit samples, approval samples, pre-production checks, bulk production, inline and final inspection, and shipment readiness.',
        'Ask for written approval at each sample stage and keep one approved reference sample. Most quality disputes trace back to an unclear approval.',
      ]],
      ['Quality checks that matter for knit tops', [
        'For T-shirts, buyers usually focus on measurements against the size chart, shrinkage and torque after washing, shade consistency across lots, print adhesion, seam strength and neck-rib recovery.',
        'Agree the inspection standard and the acceptable quality level before production starts, not after the goods are packed.',
      ]],
    ],
    faq: [
      ['What information do I need to request a T-shirt quote?', 'Product type, quantity per style and colour, target market, reference images or samples, fabric details and your target delivery date.'],
      ['Is 2D Creation a factory?', '2D Creation is a sourcing agent based in Tirupur. It coordinates factories, sampling, production follow-up and quality control on the buyer\'s behalf.'],
      ['What are the minimum order quantities?', 'Minimums depend on the product, fabric and factory. Contact 2D Creation with your specification to get current requirements.'],
    ],
  },
  hoodie: {
    label: 'Hoodie & sweatshirt sourcing',
    title: 'Hoodie and Sweatshirt Sourcing from India: Fabric, GSM and Finishing Explained',
    keyword: 'hoodie sourcing India',
    secondary: ['sweatshirt manufacturer Tirupur', 'fleece fabric GSM', 'private label hoodies'],
    links: ['hoodie', 'sampling', 'qc'],
    sections: [
      ['Choosing the right fleece fabric', [
        'Most hoodies and sweatshirts use brushed fleece or loopback (French terry). Brushed fleece feels warmer and softer inside; loopback is lighter and more breathable. Fabric weight is described in GSM (grams per square metre), and the right weight depends on season, market and price position.',
        'Confirm the fibre composition, GSM, knit structure and whether the fabric is pre-shrunk before sampling, so that fit and hand-feel are judged on the real material.',
      ]],
      ['Trims and details that change cost and quality', [
        'Rib cuffs and hems, drawcords, eyelets, zips, kangaroo pockets, flatlock seams and hood linings all affect both cost and lead time. List every trim in the tech pack and approve trim samples along with the garment.',
      ]],
      ['Printing, embroidery and washes', [
        'Screen print, puff print, embroidery and garment washes each need their own approval. Ask for strike-offs on the actual fabric and check print durability after washing.',
      ]],
      ['Quality control for fleece programmes', [
        'Key checks include measurements after washing, pilling, colour fastness, shade matching between body and rib, hood symmetry and zip function. Agree the inspection plan before bulk production.',
      ]],
    ],
    faq: [
      ['What GSM is best for a hoodie?', 'It depends on the season and positioning of your range. Share your target market and price point, and compare samples in more than one weight before deciding.'],
      ['Can I get samples before bulk production?', 'Yes. Sampling and approval are part of the product development stage coordinated by 2D Creation.'],
      ['Does 2D Creation hold the factory certificates?', 'No. 2D Creation is a sourcing agent, not the certificate holder. Certificate copies, scope and validity are verified per factory before order confirmation.'],
    ],
  },
  kids: {
    label: 'Kidswear & babywear sourcing',
    title: 'Sourcing Kidswear and Babywear from Tirupur: A Buyer\'s Checklist',
    keyword: 'kidswear sourcing Tirupur',
    secondary: ['babywear manufacturer India', 'organic cotton kidswear', 'children\'s clothing sourcing'],
    links: ['kids', 'qc', 'services'],
    sections: [
      ['Why kidswear needs a stricter brief', [
        'Children\'s and baby clothing carries extra safety and comfort expectations: soft fabrics, secure trims, safe prints and accurate sizing across many small sizes. A detailed brief protects both the buyer and the end customer.',
      ]],
      ['Fabric and certification questions to ask', [
        'Many buyers request organic cotton or tested fabrics for baby and kidswear. If you need a standard such as GOTS or OEKO-TEX, state it at briefing stage. 2D Creation coordinates factory selection against these standards and verifies each factory\'s certificate copy, scope and validity before order confirmation.',
      ]],
      ['Trims, prints and small parts', [
        'Snaps, buttons, zips and appliqués need pull testing and secure attachment. Printing inks and embellishments should meet the rules of your destination market. List every trim and finish in the tech pack.',
      ]],
      ['Size sets and fit approval', [
        'Kidswear ranges often span many sizes. Approve a full size set, not just a base size, and check grading, neck openings and snap placement.',
      ]],
    ],
    faq: [
      ['Can 2D Creation source organic cotton kidswear?', 'It can coordinate factories that work to organic standards; certificate copies and scope are verified per factory before order confirmation.'],
      ['What should a kidswear tech pack include?', 'Measurements for every size, fabric composition and GSM, trims, print and embroidery details, labelling and packing instructions.'],
      ['Which markets does 2D Creation support?', 'It works with international buyers; share your destination market so compliance needs can be planned from the start.'],
    ],
  },
  certification: {
    label: 'Verifying factory certificates',
    title: 'How to Verify a Garment Factory\'s Certificates Before You Place an Order',
    keyword: 'verify garment factory certificates',
    secondary: ['OEKO-TEX certificate check', 'GOTS scope certificate', 'ethical apparel sourcing'],
    links: ['services', 'faq', 'qc'],
    external: ['oekotex', 'gots'],
    sections: [
      ['A certificate logo is not proof', [
        'Buyers often see logos for OEKO-TEX, GOTS, BSCI, SMETA, WRAP or GRS on a supplier\'s profile. A logo on its own does not show which facility is certified, for which products, or whether the certificate is still valid.',
      ]],
      ['Five details to check on every certificate', [
        'Check the certificate number, the exact facility name and address, the scope (which processes and products are covered), the issue and expiry dates, and that the certificate can be confirmed through the issuing body.',
        'Standard owners publish verification information; for example see OEKO-TEX and the Global Organic Textile Standard (GOTS).',
      ]],
      ['Why the agent is not the certificate holder', [
        '2D Creation is a sourcing agent, not the certificate holder. Its role is to match buyers with factories that hold the certifications they need and to verify current certificate copies, scope, facility name, reference number and validity before order confirmation.',
      ]],
      ['Keep verification on file', [
        'Save a dated copy of each certificate with your order records, and recheck validity for repeat orders; certificates expire and scopes change.',
      ]],
    ],
    faq: [
      ['Does 2D Creation hold OEKO-TEX or GOTS certificates?', 'No. 2D Creation is a sourcing agent; certifications belong to the factories, and are verified per factory before order confirmation.'],
      ['What is a GOTS scope certificate?', 'It confirms which processes and products a specific certified entity is approved for. Always check it matches your product.'],
      ['How often should certificates be rechecked?', 'For every new order and whenever a certificate is close to expiry.'],
    ],
  },
  agent: {
    label: 'Sourcing agent vs factory',
    title: 'Sourcing Agent vs Direct Factory: Which Model Suits Your Apparel Brand?',
    keyword: 'apparel sourcing agent',
    secondary: ['sourcing agent India', 'garment sourcing company Tirupur', 'apparel buying agent'],
    links: ['services', 'sampling', 'qc'],
    sections: [
      ['What a sourcing agent actually does', [
        'An apparel sourcing agent sits between the buyer and the factories. 2D Creation coordinates design and product development, fabric and trim sourcing, sampling, production planning, quality control, merchandising follow-up and shipment readiness.',
      ]],
      ['When working directly with a factory fits', [
        'Large, stable programmes with in-house technical and quality teams can work well directly with a factory, especially when the buyer can visit regularly.',
      ]],
      ['When an agent adds value', [
        'Newer or growing brands, multi-category ranges and buyers without a local team often benefit from one point of coordination that can match each product to a suitable factory and follow production on the ground.',
      ]],
      ['Questions to ask any sourcing partner', [
        'Ask how factories are selected, how certificates are verified, what the sampling and approval process is, how quality is inspected and how problems are escalated. Transparent answers matter more than promises.',
      ]],
    ],
    faq: [
      ['Is 2D Creation a factory or an agent?', '2D Creation is a sourcing agent based in Tirupur, not a factory owner.'],
      ['What categories does 2D Creation cover?', 'Menswear, womenswear, kidswear, casualwear, T-shirts, shirts, sweatshirts, hoodies, loungewear and nightwear.'],
      ['How do I start?', 'Send your product type, quantities, target market, references and delivery date through the enquiry form or by email.'],
    ],
  },
};

function slugify(s) {
  return String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
}

function linkMd(p) { return `[${p.text}](${p.url})`; }

function generateDraft(profile, input) {
  const topic = TOPICS[input.topic];
  if (!topic) throw new Error('unknown topic');
  const keyword = (input.keyword || topic.keyword).trim();
  const secondary = input.secondary ? input.secondary.split(',').map((s) => s.trim()).filter(Boolean) : topic.secondary;
  const audience = (input.audience || 'international apparel brands and importers').trim();
  const title = input.title?.trim() || topic.title;
  const internal = topic.links.map((k) => PAGES[k]);
  const external = (topic.external || []).map((k) => EXTERNAL[k]);

  const intro = `If you are one of the ${audience} looking into ${keyword}, this guide explains what to prepare, how the process works and which checks protect your order. `
    + `It is written by ${profile ? '2D Creation' : 'our team'}, an apparel sourcing agent in Tirupur, Tamil Nadu, that coordinates product development, sampling, production and quality control for international buyers.`;
  const lines = [`# ${title}`, '', intro, ''];
  topic.sections.forEach(([h, paras], i) => {
    lines.push(`## ${h}`, '');
    paras.forEach((p) => {
      let text = p;
      for (const e of external) text = text.replace(e.text, linkMd(e));
      lines.push(text, '');
    });
    if (i < internal.length) lines.push(`Read more about ${linkMd(internal[i])}.`, '');
  });
  lines.push('## Frequently asked questions', '');
  topic.faq.forEach(([q, a]) => lines.push(`### ${q}`, '', a, ''));
  const contact = profile?.contact_email ? ` or email ${profile.contact_email}` : '';
  lines.push('## Work with 2D Creation', '',
    `Share your product brief through the ${linkMd({ url: `${SITE}/#contact`, text: 'enquiry form' })}${contact}. `
    + `Include the product type, quantities, target market, reference files and delivery date so the right factories can be matched to your programme.`, '');

  const meta = trimTo(`${capital(keyword)}: a practical guide from 2D Creation, a Tirupur apparel sourcing agent, covering briefs, sampling, quality checks and certificates.`, 158);
  return {
    title, slug: slugify(input.slug || keyword), keyword, secondary: secondary.join(', '), audience,
    topic: input.topic, meta_description: meta, body_md: lines.join('\n').trim() + '\n',
    faq_json: JSON.stringify(topic.faq), platform: PLATFORMS[input.platform] ? input.platform : 'wordpress',
    canonical_url: (input.canonical_url || '').trim(),
  };
}

function capital(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function trimTo(s, n) { return s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1)) + '.'; }

// ---------- On-page SEO (SearchFit on-page-seo skill checklist; cannot guarantee rankings) ----------
const FORBIDDEN = [
  [/\bMOQ\s*(of|is|:)?\s*\d/i, 'states a specific MOQ'],
  [/(\$|₹|€|£|USD|INR)\s?\d/i, 'states a price'],
  [/\b(our|own) (factory|factories)\b/i, 'implies factory ownership'],
  [/\bwe manufacture\b/i, 'implies manufacturing'],
  [/\b(guaranteed|#1|number one|best in (india|the world))\b/i, 'unsupported absolute claim'],
];
const TITLE_SUFFIXES = ["A Practical Buyer's Guide", 'What Apparel Buyers Should Know', 'A Practical Guide for Buyers', 'A Guide for Apparel Brands',
  'What Buyers Should Know', "Buyer's Checklist", "A Buyer's Guide"];
const RELATED_PAGES = ['services', 'sampling', 'qc', 'faq', 'tshirt', 'hoodie', 'kids'];
const AUTHOR_LINE = '*Written by the 2D Creation sourcing team in Tirupur, India, who coordinate product development, sampling, production follow-up and quality control for international apparel buyers.*';
const BAD_ANCHORS = /\[(click here|here|read more|this page|link)\]\(/i;

function titleCase(s) { return s.replace(/\b([a-z])/g, (m, c, i) => (i && /^(in|of|and|for|to|a|an|the|vs)\b/.test(s.slice(i)) ? c : c.toUpperCase())); }

function optimizedTitle(post) {
  const kw = titleCase(String(post.keyword || '').trim());
  if (!kw) return post.title;
  const current = String(post.title || '');
  if (current.length >= 50 && current.length <= 60 && current.toLowerCase().startsWith(kw.toLowerCase())) return current;
  const options = TITLE_SUFFIXES.map((s) => `${kw}: ${s}`);
  return options.find((t) => t.length >= 50 && t.length <= 60)
    || options.find((t) => t.length <= 60)
    || trimTo(`${kw}: ${TITLE_SUFFIXES[0]}`, 60).replace(/\.$/, '');
}

function optimizedMeta(post) {
  const kw = capital(String(post.keyword || '').trim());
  const cta = ' Send your brief today.';
  // Keyword first, call to action always kept, 150-160 characters when possible.
  const middles = [
    ': how to brief, sample and quality-check your order, with 2D Creation coordinating factories in Tirupur, India.',
    ': how to brief, sample and quality-check your order, with 2D Creation coordinating factories in Tirupur.',
    ': brief, sampling and quality checks explained by 2D Creation, a sourcing agent in Tirupur, India.',
    ': brief, sampling and quality checks, explained by 2D Creation in Tirupur, India.',
    ': brief, sampling and quality checks, explained by 2D Creation in Tirupur.',
  ];
  const options = middles.map((m) => kw + m + cta);
  return options.find((m) => m.length >= 150 && m.length <= 160)
    || options.filter((m) => m.length <= 160).sort((x, y) => y.length - x.length)[0]
    || trimTo(kw + middles[4], 160 - cta.length) + cta;
}

function analyse(post) {
  const body = post.body_md || '';
  // Keep hyphens inside words (t-shirt, OEKO-TEX); strip only list markers and markdown symbols.
  const text = body.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^\s*[-*]\s+/gm, ' ').replace(/[#*>`_]/g, ' ');
  const words = text.split(/\s+/).filter(Boolean);
  const kw = String(post.keyword || '').toLowerCase().trim();
  const low = text.toLowerCase();
  const kwCount = kw ? low.split(kw).length - 1 : 0;
  const density = words.length ? (kwCount * kw.split(' ').length * 100) / words.length : 0;
  const h1s = body.match(/^# .*/gm) || [];
  const headings = (body.match(/^#{1,6} .*/gm) || []).map((h) => ({ level: h.match(/^#+/)[0].length, text: h.replace(/^#+ /, '') }));
  const skipped = headings.some((h, i) => i > 0 && h.level > headings[i - 1].level + 1);
  const internalUrls = [...new Set((body.match(/\]\((https:\/\/2dcreation\.in[^)]*)\)/g) || []).map((m) => m.slice(2, -1).replace(/#.*$/, '')))];
  const secondary = String(post.secondary || '').split(',').map((s) => s.trim()).filter(Boolean);
  const missingSecondary = secondary.filter((s) => !low.includes(s.toLowerCase()));
  const sentences = text.split(/[.!?]+\s/).filter((s) => s.trim().split(/\s+/).length > 3);
  const avgSentence = sentences.length ? words.length / sentences.length : 0;
  const hasList = /^\s*[-*] |\n\|.+\|/m.test(body);
  const hasAuthor = /written by the 2d creation/i.test(body);
  const hasImage = /!\[[^\]]+\]\([^)]+\)/.test(body);
  const bad = FORBIDDEN.filter(([re]) => re.test(body) || re.test(post.title || '') || re.test(post.meta_description || '')).map(([, why]) => why);
  return { body, words, kw, kwCount, density, h1s, headings, skipped, internalUrls, secondary, missingSecondary, avgSentence, hasList, hasAuthor, hasImage, bad };
}

function checksFor(post, a) {
  const t = String(post.title || ''); const m = String(post.meta_description || ''); const slug = String(post.slug || '');
  const kwSlug = slugify(a.kw);
  return [
    ['Title 50-60 characters', t.length >= 50 && t.length <= 60],
    ['Keyword near the start of the title', !!a.kw && t.toLowerCase().indexOf(a.kw) >= 0 && t.toLowerCase().indexOf(a.kw) <= 15],
    ['Meta description 150-160 characters', m.length >= 150 && m.length <= 160],
    ['Keyword and call to action in meta description', !!a.kw && m.toLowerCase().includes(a.kw) && /(send|contact|get|request|start|talk|share)\b/i.test(m)],
    ['Short, hyphenated slug containing the keyword', !!a.kw && slug.length <= 60 && !/_/.test(slug) && slug.includes(kwSlug.split('-').slice(0, 3).join('-'))],
    ['Exactly one H1 containing the keyword', a.h1s.length === 1 && a.h1s[0].toLowerCase().includes(a.kw.split(' ')[0])],
    ['4+ H2 subtopics, no skipped heading levels', a.headings.filter((h) => h.level === 2).length >= 4 && !a.skipped],
    ['Keyword in the first 100 words', !!a.kw && a.words.slice(0, 100).join(' ').toLowerCase().includes(a.kw)],
    ['Natural keyword use (density 0.3-2.5%)', a.density >= 0.3 && a.density <= 2.5],
    ['Secondary (related) keywords covered', a.secondary.length > 0 && a.missingSecondary.length === 0],
    ['800+ words (depth for an informational guide)', a.words.length >= 800],
    ['3-5 internal links to 2dcreation.in with descriptive anchors', a.internalUrls.length >= 3 && !BAD_ANCHORS.test(a.body)],
    ['List or table for featured snippets', a.hasList],
    ['FAQ section (FAQPage schema)', /^## Frequently asked questions/m.test(a.body)],
    ['Author / expertise line (E-E-A-T)', a.hasAuthor],
    ['Hero image with descriptive alt text', a.hasImage],
    ['Readable sentences (average 22 words or fewer)', a.avgSentence > 0 && a.avgSentence <= 22],
    ['No MOQ, price, ownership or absolute claims', a.bad.length === 0],
  ];
}

function scoreOf(checks) { return Math.round((checks.filter(([, ok]) => ok).length / checks.length) * 100); }

// Deterministic fixes; never adds unverifiable facts.
function applyFixes(post) {
  const a = analyse(post);
  const title = optimizedTitle(post);
  const meta_description = optimizedMeta(post);
  const slug = slugify(post.keyword || post.slug);
  let body = a.body.replace(/^# .*$/m, `# ${title}`);
  if (!a.hasAuthor) body = body.replace(/^(# .*\n)/m, `$1\n${AUTHOR_LINE}\n`);
  if (!a.hasList) {
    const kw = a.kwCount < 3 ? `${post.keyword} ` : ''; // never push density into keyword stuffing
    const takeaways = ['## Key takeaways', '',
      `- Start any ${kw}enquiry with a clear brief: product type, quantity per style and colour, target market and delivery date.`,
      '- Approve samples in writing at each stage and keep one approved reference sample.',
      '- Agree the inspection standard before production starts, not after packing.',
      '- Ask for certificate copies, scope and validity for every factory when certification matters.', ''].join('\n');
    body = body.replace(/(\n## )/, `\n${takeaways}$1`);
  }
  if (a.missingSecondary.length) {
    const lines = a.missingSecondary.map((s) => `- **${capital(s)}:** plan it with the same brief, sampling and quality-control steps described above.`);
    body = body.replace(/(\n## Frequently asked questions)/, `\n## Related topics\n\n${lines.join('\n')}\n$1`);
  }
  if (!a.hasImage) {
    const hero = `![${DEFAULT_HERO_IMAGE_ALT}](${DEFAULT_HERO_IMAGE_URL})`;
    body = body.replace(/(\n## )/, `\n${hero}\n$1`);
  }
  if (a.internalUrls.length < 3) {
    const have = new Set(a.internalUrls);
    const add = RELATED_PAGES.map((k) => PAGES[k]).filter((p) => !have.has(p.url)).slice(0, 3 - a.internalUrls.length);
    body = body.replace(/(\n## Work with 2D Creation)/, `\n## Related guides\n\n${add.map((p) => `- ${linkMd(p)}`).join('\n')}\n$1`);
  }
  return { title, meta_description, slug, body_md: body };
}

function seoAudit(post) {
  const a = analyse(post);
  const checks = checksFor(post, a);
  const fixed = { ...post, ...applyFixes(post) };
  const optimizedChecks = checksFor(fixed, analyse(fixed));
  const optimizedScore = scoreOf(optimizedChecks);
  const hardFailures = optimizedChecks.filter(([label, ok]) => !ok && !['800+ words (depth for an informational guide)'].includes(label));
  const gaps = [];
  if (a.words.length < 800) gaps.push(`Expand to 800+ words (now ${a.words.length}): add a worked example, timeline table or buyer checklist from your own experience.`);
  if (a.missingSecondary.length) gaps.push(`Cover related keywords: ${a.missingSecondary.join(', ')}.`);
  if (!a.hasList) gaps.push('Add a bulleted list or table to target featured snippets.');
  if (!a.hasImage) gaps.push(`Add a hero image, e.g. file "${slugify(post.keyword || post.slug)}-hero.webp" with alt text "${capital(post.keyword || '')} - garment sampling and quality checks".`);
  if (!a.hasAuthor) gaps.push('Add an author/expertise line (E-E-A-T).');
  const linkSuggestions = RELATED_PAGES.map((k) => PAGES[k]).filter((p) => !a.internalUrls.includes(p.url)).slice(0, 5)
    .map((p) => ({ url: p.url, anchor: p.text }));
  return {
    score: scoreOf(checks),
    optimized_score: optimizedScore,
    passed: hardFailures.length === 0 && optimizedScore >= 90,
    hard_failures: hardFailures.map(([label]) => label),
    warnings: optimizedChecks.filter(([label, ok]) => !ok && ['800+ words (depth for an informational guide)'].includes(label)).map(([label]) => label),
    checks: checks.map(([label, ok]) => ({ label, ok })),
    stats: { words: a.words.length, keyword_count: a.kwCount, density: Math.round(a.density * 100) / 100, h2: a.headings.filter((h) => h.level === 2).length,
      internal_links: a.internalUrls.length, avg_sentence_words: Math.round(a.avgSentence * 10) / 10 },
    claim_issues: a.bad,
    report: {
      title: { before: post.title, after: optimizedTitle(post) },
      meta: { before: post.meta_description, after: optimizedMeta(post) },
      slug: { before: post.slug, after: slugify(post.keyword || post.slug) },
      headings: a.headings.map((h) => `${'  '.repeat(h.level - 1)}H${h.level}: ${h.text}`),
      content_gaps: gaps,
      internal_links: linkSuggestions,
      schema: `${articleJsonLd(post)}\n\n${faqJsonLd(post)}`,
    },
    note: 'On-page best practices from the SearchFit on-page-seo checklist. Rankings also depend on competition, backlinks, site authority and time; no tool can guarantee a top position.',
  };
}

// ---------- Publication gate (what the daily scheduler may publish) ----------
//
// seoAudit() above answers "would this pass AFTER the automatic fixes are applied?" (its `passed` and
// `optimized_score` describe a hypothetical fixed copy) and is meant for the editor UI. It must NOT be used
// to decide whether text may be published: it passes drafts whose own text still fails most checks.
// The scheduler therefore (1) applies the fixes until the text stops changing, then (2) judges that exact
// text, as it is, with gateAudit(). What is audited is byte-for-byte what is stored and published.
const SOFT_CHECKS = ['800+ words (depth for an informational guide)'];
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UNSAFE_MARKUP = /<\s*(script|iframe|object|embed|style|link|meta)\b|\bon[a-z]+\s*=|javascript:|data:text\/html/i;

function gateAudit(post) {
  const a = analyse(post);
  const checks = checksFor(post, a);
  const title = String(post.title || '').trim();
  const meta = String(post.meta_description || '').trim();
  const slug = String(post.slug || '');
  const body = String(post.body_md || '');
  const hero = body.match(/!\[[^\]]+\]\(([^)]+)\)/);
  // Requirements that must hold for the page that is actually rendered (see publish-blog.js postPage()).
  const publishable = [
    ['Title present', title.length > 0],
    ['Meta description present', meta.length > 0],
    ['Slug is a safe URL path segment', SAFE_SLUG.test(slug) && slug.length <= 70],
    ['Canonical URL can be built from the slug', SAFE_SLUG.test(slug)],
    ['H1 present and identical to the title', a.h1s.length === 1 && a.h1s[0].replace(/^#\s+/, '').trim() === title],
    ['Hero image is an https image URL', !!hero && /^https:\/\/[^\s)]+$/i.test(hero[1])],
    ['No script, embed, event-handler or javascript: content', !UNSAFE_MARKUP.test(body) && !UNSAFE_MARKUP.test(title) && !UNSAFE_MARKUP.test(meta)],
    ['Internal links point at https://2dcreation.in', a.internalUrls.length >= 3],
  ];
  const all = [...checks, ...publishable];
  const hardFailures = all.filter(([label, ok]) => !ok && !SOFT_CHECKS.includes(label)).map(([label]) => label);
  const score = scoreOf(checks);
  return {
    passed: hardFailures.length === 0 && score >= 90,
    score,
    hard_failures: hardFailures,
    warnings: all.filter(([label, ok]) => !ok && SOFT_CHECKS.includes(label)).map(([label]) => label),
    stats: { words: a.words.length, internal_links: a.internalUrls.length, h2: a.headings.filter((h) => h.level === 2).length },
  };
}

const FIX_FIELDS = ['title', 'meta_description', 'slug', 'body_md'];

// Applies the deterministic fixes until the text stops changing (they are idempotent, so this normally
// takes one pass), then audits the RESULT as it stands. `draft` is exactly what must be stored/published.
function finalizeDraft(raw, maxPasses = 4) {
  let draft = { ...raw };
  let passes = 0;
  for (let i = 0; i < maxPasses; i++) {
    const next = { ...draft, ...applyFixes(draft) };
    const changed = FIX_FIELDS.some((k) => next[k] !== draft[k]);
    draft = next;
    passes += changed ? 1 : 0;
    if (!changed) break;
  }
  return { draft, gate: gateAudit(draft), passes };
}

// ---------- Rendering / exports ----------
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function mdToHtml(md) {
  const inline = (s) => esc(s).replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${u.replace(/"/g, '&quot;')}">${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const out = [];
  for (const block of md.split(/\n{2,}/)) {
    const b = block.trim();
    if (!b) continue;
    const h = b.match(/^(#{1,3}) (.*)$/);
    if (h) out.push({ type: `h${h[1].length}`, html: inline(h[2]) });
    else if (/^[-*] /m.test(b)) out.push({ type: 'ul', html: b.split('\n').map((l) => `<li>${inline(l.replace(/^[-*] /, ''))}</li>`).join('') });
    else out.push({ type: 'p', html: inline(b.replace(/\n/g, ' ')) });
  }
  return out;
}

function faqJsonLd(post) {
  const faq = JSON.parse(post.faq_json || '[]');
  return JSON.stringify({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  }, null, 2);
}

function articleJsonLd(post) {
  return JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: post.meta_description,
    keywords: [post.keyword, ...String(post.secondary || '').split(',').map((s) => s.trim()).filter(Boolean)].join(', '),
    author: { '@type': 'Organization', name: '2D Creation', url: `${SITE}/` },
    publisher: { '@type': 'Organization', name: '2D Creation', url: `${SITE}/` },
    ...(post.canonical_url ? { mainEntityOfPage: post.canonical_url } : {}),
  }, null, 2);
}

function bodyWithoutH1(md) { return md.replace(/^# .*\n+/, ''); }

function exportFor(platformKey, post) {
  const platform = PLATFORMS[platformKey];
  if (!platform) throw new Error('unknown platform');
  const blocks = mdToHtml(bodyWithoutH1(post.body_md));
  const html = blocks.map((b) => `<${b.type}>${b.html}</${b.type}>`).join('\n');
  const schema = `<script type="application/ld+json">\n${articleJsonLd(post)}\n</script>\n<script type="application/ld+json">\n${faqJsonLd(post)}\n</script>`;
  const seo = { 'SEO title': post.title, 'Meta description': post.meta_description, 'URL slug': post.slug, 'Focus keyword': post.keyword, 'Tags': post.secondary, ...(post.canonical_url ? { 'Canonical URL': post.canonical_url } : {}) };
  let content; let format; let steps;
  if (platformKey === 'wordpress') {
    format = 'Gutenberg block HTML';
    content = blocks.map((b) => {
      if (b.type.startsWith('h')) { const lvl = b.type[1]; return `<!-- wp:heading {"level":${lvl}} -->\n<${b.type} class="wp-block-heading">${b.html}</${b.type}>\n<!-- /wp:heading -->`; }
      if (b.type === 'ul') return `<!-- wp:list -->\n<ul>${b.html}</ul>\n<!-- /wp:list -->`;
      return `<!-- wp:paragraph -->\n<p>${b.html}</p>\n<!-- /wp:paragraph -->`;
    }).join('\n\n') + `\n\n<!-- wp:html -->\n${schema}\n<!-- /wp:html -->`;
    steps = ['Posts > Add New. Enter the title in the title field.', 'Open the top-right menu > Code editor, paste the content, then switch back to the Visual editor.', 'In your SEO plugin (Yoast or Rank Math) fill in the SEO title, meta description, focus keyword and slug below.', 'Save as draft and preview before publishing.'];
  } else if (platformKey === 'ghost') {
    format = 'Markdown (Ghost Markdown card)';
    content = bodyWithoutH1(post.body_md);
    steps = ['New post. Enter the title.', 'Type /markdown to add a Markdown card and paste the content.', 'Post settings > Meta data: set meta title, description and URL; set Canonical URL if the post lives elsewhere first.', 'Post settings > Code injection > Post header: paste the structured data below.'];
  } else if (platformKey === 'medium') {
    format = 'Markdown for Medium import/paste (no structured data support)';
    content = `# ${post.title}\n\n${bodyWithoutH1(post.body_md)}\n\n_Originally published by 2D Creation (${post.canonical_url || SITE})._`;
    steps = ['Best for SEO: publish on your primary site first, then use Medium > Import a story with that URL so Medium sets the canonical link back to you.', 'If pasting instead: paste into a new story, then Story settings > Advanced settings > set the canonical link to the primary URL.', 'Add up to 5 tags from the list below. Medium does not support custom meta descriptions or JSON-LD.'];
  } else if (platformKey === 'wix') {
    format = 'HTML (paste into the Wix blog editor)';
    content = html;
    steps = ['Blog > Create New Post. Enter the title.', 'Paste the content (formatting is kept) or add an HTML embed element for exact markup.', 'Post settings > SEO: set the title tag, meta description and URL slug.', 'SEO > Advanced SEO > Structured data markup: add the JSON-LD below.'];
  } else {
    format = 'HTML (Squarespace Code or Text block)';
    content = html;
    steps = ['Blog page > + New post. Enter the title.', 'Add a Text block and paste, or a Code block (HTML) for exact markup.', 'Post settings > SEO: set SEO title and description; Options: set the post URL slug.', 'Post settings > Advanced > Post blog item code injection: paste the structured data below.'];
  }
  return { platform, format, title: post.title, seo, content, structured_data: platformKey === 'medium' ? '' : schema, steps,
    filename: `${post.slug}-${platformKey}.${platformKey === 'ghost' || platformKey === 'medium' ? 'md' : 'html'}` };
}

module.exports = { TOPICS, PLATFORMS, generateDraft, seoAudit, applyFixes, exportFor, slugify, gateAudit, finalizeDraft, SITE };
