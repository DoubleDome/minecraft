/* Generate Everything
---------------------------------------------------- */
require('dotenv').config();
const path = require('path');
const resource = require('./app/resource');

if (!process.env.BASE_PATH || !process.env.PACK_PATH) {
    console.error('ERROR: BASE_PATH and PACK_PATH must be set in .env before running. The generator wipes its output directory on init and would destroy the project root if these are missing.');
    process.exit(1);
}

const datapackGenerator = require('./app/generator');
datapackGenerator.init(path.resolve(process.env.BASE_PATH, process.env.PACK_PATH));
datapackGenerator.create();

// const jakartaGenerator = require('./app/generator');
// jakartaGenerator.init(path.resolve(process.env.BASE_PATH, process.env.JAKARTA_PATH));
// jakartaGenerator.create();

console.log(resource.create(require('./data/resources.json')));
