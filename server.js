require('dotenv').config();

const express = require('express');
const app = express();
const path = require('path');
const net = require('net');

const generator = require('./app/generator');

const MC_HOST = process.env.MC_HOST || 'localhost';
const MC_PORT = parseInt(process.env.MC_PORT || '25577', 10);
const SERVER_NAME = process.env.SERVER_NAME || 'Toledo Survival Server';

function checkServer() {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2000);
        socket.once('connect', () => { socket.destroy(); resolve(true); });
        socket.once('timeout', () => { socket.destroy(); resolve(false); });
        socket.once('error', () => resolve(false));
        socket.connect(MC_PORT, MC_HOST);
    });
}

app.get('/', async (req, res) => {
    const up = await checkServer();
    res.set('Cache-Control', 'no-store');
    res.send(`<!doctype html>
<html><head><meta charset="utf-8"><title>${SERVER_NAME}</title>
<meta http-equiv="refresh" content="10">
<style>
  html,body{height:100%;margin:0;background:#0f0f14;color:#e5e5e5;font-family:-apple-system,Segoe UI,Roboto,sans-serif}
  body{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
  h1{font-weight:400;color:#888;margin:0 0 1em;font-size:1.2em;letter-spacing:.1em;text-transform:uppercase}
  .status{font-size:5em;font-weight:700;letter-spacing:.05em}
  .up{color:#4ade80}
  .down{color:#ef4444}
  .meta{color:#666;margin-top:1em;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.9em}
</style></head>
<body>
  <h1>${SERVER_NAME}</h1>
  <div class="status ${up ? 'up' : 'down'}">${up ? 'ONLINE' : 'OFFLINE'}</div>
  <div class="meta">${MC_HOST}:${MC_PORT}</div>
  <div class="meta">checked ${new Date().toLocaleTimeString()}</div>
</body></html>`);
});

app.get('/status.json', async (req, res) => {
    res.json({ online: await checkServer(), host: MC_HOST, port: MC_PORT, checked: new Date().toISOString() });
});

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
            generator.init(path.resolve(process.env.BASE_PATH, process.env.PACK_PATH));
            generator[endpoint.function]();
            res.send('Command generation successful!');
        } catch (error) {
            res.send('Command generation failed!');
            // console.log(error);
        }
    });
});

app.listen(3000);
