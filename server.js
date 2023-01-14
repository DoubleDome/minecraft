require('dotenv').config();

const express = require('express');
const app = express();

const generator = require('./app/generator');

const endpoints = [
    {
        path: '/export/',
        function: 'create',
    },
    {
        path: '/export/book',
        function: 'createBookFunctions',
    },
    {
        path: '/export/swap',
        function: 'createSwapFunctions',
    },
    {
        path: '/export/inventory',
        function: 'createInventoryFunctions',
    },
    {
        path: '/export/ender',
        function: 'createEnderFunctions',
    },
];

endpoints.forEach((endpoint) => {
    app.get(endpoint.path, function (req, res) {
        try {
            generator[endpoint.function](`${process.env.BASE}${process.env.FUNCTIONS}`);
            res.send('Command generation successful!');
        } catch (error) {
            res.send('Command generation failed!');
        }
    });
});

app.listen(3000);
