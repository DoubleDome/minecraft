/* Generate Everything
---------------------------------------------------- */
require('dotenv').config();
const path = require('path');
const resource = require('./app/resource');

const datapackGenerator = require('./app/generator');
datapackGenerator.init(path.resolve(process.env.BASE_PATH, process.env.PACK_PATH));
datapackGenerator.create();

// const jakartaGenerator = require('./app/generator');
// jakartaGenerator.init(path.resolve(process.env.BASE_PATH, process.env.JAKARTA_PATH));
// jakartaGenerator.create();

console.log(resource.create(require('./data/resources.json')));
