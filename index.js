/* Generate Everything
---------------------------------------------------- */
require('dotenv').config();

// Pick target: CLI arg > TARGET env > 'test' (safer default — won't clobber live).
// "test" loads .env.test on top of .env (override:true) so test-only values
// (typically a sandbox BASE_PATH) win without duplicating the rest of .env.
const target = (process.argv[2] || process.env.TARGET || 'test').toLowerCase();
if (target !== 'live' && target !== 'test') {
    console.error(`ERROR: target must be 'live' or 'test', got: '${target}'`);
    process.exit(1);
}
if (target === 'test') {
    require('dotenv').config({ path: '.env.test', override: true });
}

// Shared rebuild — same safeguards as the web endpoint (env guard, live backup
// before wipe, source-dir sentinel). See app/rebuild.js / .claude/rules/rebuild.md.
const { rebuild } = require('./app/rebuild');
try {
    const { outputDir, resourceResult, backup } = rebuild(target);
    console.log(`[generator] target=${target}  output=${outputDir}`);
    if (backup) console.log(`[generator] backed up previous live pack -> ${backup}`);
    if (resourceResult) console.log(resourceResult);
} catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
}
