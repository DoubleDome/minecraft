/* Generate Everything
---------------------------------------------------- */
require('dotenv').config();
const path = require('path');
const generator = require('./app/generator');

generator.init(path.resolve(process.env.BASE_PATH, process.env.PACK_PATH));
generator.create();