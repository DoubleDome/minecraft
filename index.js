/* Generate Everything
---------------------------------------------------- */
require('dotenv').config();
const path = require('path');
const resource = require('./app/resource');

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

const basePath = process.env.BASE_PATH;
const packFolder = process.env.PACK_FOLDER;

if (!basePath || !packFolder) {
    const missing = !basePath && !packFolder ? 'BASE_PATH and PACK_FOLDER' : (!basePath ? 'BASE_PATH' : 'PACK_FOLDER');
    const source = target === 'test' ? '.env (or .env.test)' : '.env';
    console.error(`ERROR: ${missing} must be set in ${source} (target=${target}). The generator wipes its output directory on init and would destroy the project root if these are missing.`);
    process.exit(1);
}

const outputDir = path.resolve(basePath, packFolder);
console.log(`[generator] target=${target}  output=${outputDir}\n`);

const datapackGenerator = require('./app/generator');
datapackGenerator.init(outputDir);
datapackGenerator.create();

console.log(resource.create(require('./data/resources.json')));
