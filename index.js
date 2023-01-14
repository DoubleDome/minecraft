require('dotenv').config();
// console.log(process.env);

const generator = require('./app/generator');

// generator.create(`${process.env.BASE}${process.env.FUNCTIONS}`);
generator.createBookFunctions(`${process.env.BASE}${process.env.FUNCTIONS}`);
// generator.create('./function');