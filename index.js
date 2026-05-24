/* Generate Everything
---------------------------------------------------- */
require('dotenv').config();
const path = require('path');
const resource = require('./app/resource');

// Pick target: CLI arg > TARGET env > 'test' (safer default — won't clobber live).
// Both targets share the same pack folder name; only the base path differs.
// "live" => BASE_PATH      + PACK_FOLDER
// "test" => TEST_BASE_PATH + PACK_FOLDER
const target = (process.argv[2] || process.env.TARGET || 'test').toLowerCase();

let baseVar;
if (target === 'live') {
    baseVar = 'BASE_PATH';
} else if (target === 'test') {
    baseVar = 'TEST_BASE_PATH';
} else {
    console.error(`ERROR: target must be 'live' or 'test', got: '${target}'`);
    process.exit(1);
}
const basePath = process.env[baseVar];
const packFolder = process.env.PACK_FOLDER;

if (!basePath || !packFolder) {
    console.error(`ERROR: ${baseVar} and PACK_FOLDER must be set in .env (target=${target}). The generator wipes its output directory on init and would destroy the project root if these are missing.`);
    process.exit(1);
}

const outputDir = path.resolve(basePath, packFolder);
console.log(`[generator] target=${target}  output=${outputDir}\n`);

const datapackGenerator = require('./app/generator');
datapackGenerator.init(outputDir);
datapackGenerator.create();

// const jakartaGenerator = require('./app/generator');
// jakartaGenerator.init(path.resolve(process.env.BASE_PATH, process.env.JAKARTA_PATH));
// jakartaGenerator.create();

console.log(resource.create(require('./data/resources.json')));
