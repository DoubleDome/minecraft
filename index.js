/* Generate Everything
---------------------------------------------------- */
require('dotenv').config();
const path = require('path');
const resource = require('./app/resource');

// Pick target: CLI arg > TARGET env > 'test' (safer default — won't clobber live).
// "live" => BASE_PATH      + PACK_PATH
// "test" => TEST_BASE_PATH + TEST_PACK_PATH
const target = (process.argv[2] || process.env.TARGET || 'test').toLowerCase();

let basePath, packPath, baseVar, packVar;
if (target === 'live') {
    [baseVar, packVar] = ['BASE_PATH', 'PACK_PATH'];
} else if (target === 'test') {
    [baseVar, packVar] = ['TEST_BASE_PATH', 'TEST_PACK_PATH'];
} else {
    console.error(`ERROR: target must be 'live' or 'test', got: '${target}'`);
    process.exit(1);
}
basePath = process.env[baseVar];
packPath = process.env[packVar];

if (!basePath || !packPath) {
    console.error(`ERROR: ${baseVar} and ${packVar} must be set in .env (target=${target}). The generator wipes its output directory on init and would destroy the project root if these are missing.`);
    process.exit(1);
}

const outputDir = path.resolve(basePath, packPath);
console.log(`[generator] target=${target}  output=${outputDir}\n`);

const datapackGenerator = require('./app/generator');
datapackGenerator.init(outputDir);
datapackGenerator.create();

// const jakartaGenerator = require('./app/generator');
// jakartaGenerator.init(path.resolve(process.env.BASE_PATH, process.env.JAKARTA_PATH));
// jakartaGenerator.create();

console.log(resource.create(require('./data/resources.json')));
