/* Generate Everything
---------------------------------------------------- */
require('dotenv').config();
const path = require('path');
const generator = require('./app/generator');
const resource = require('./app/resource');

generator.init(path.resolve(process.env.BASE_PATH, process.env.PACK_PATH));
generator.create();

console.log(resource.create(require('./data/resources.json')));