'use strict';
// CLI for the daily-blog workflow. Exit 0 = published (or already published / not yet time); non-zero = needs a retry.
const { runDailyBlog } = require('./blog-scheduler.js');

runDailyBlog({ force: process.env.FORCE === 'true' })
  .then((r) => {
    console.log(JSON.stringify(r));
    process.exit(['published', 'skipped'].includes(r.status) ? 0 : 1);
  })
  .catch((e) => { console.error(`[blog] run failed: ${e.message}`); process.exit(1); });
