require('dotenv').config();

const generator = require('./app/generator');

// generator.create(`${process.env.BASE}${process.env.FUNCTIONS}`);
generator.createBookFunctions(`${process.env.BASE_PATH}${process.env.FUNCTIONS_PATH}`);
// generator.create('./function');