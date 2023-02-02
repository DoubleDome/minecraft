require('dotenv').config();

const express = require('express');
const app = express();
const path = require('path');

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
        path: '/export/tools',
        function: 'createToolFunctions',
    },
    {
        path: '/export/armor',
        function: 'createArmorFunctions',
    },
    {
        path: '/export/shulkers',
        function: 'createShulkerFunctions',
    },
    {
        path: '/export/locations',
        function: 'createLocationFunctions',
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
            generator[endpoint.function](path.resolve(process.env.BASE_PATH, process.env.FUNCTIONS_PATH));
            res.send('Command generation successful!');
        } catch (error) {
            res.send('Command generation failed!');
        }
    });
});

app.listen(3000);
