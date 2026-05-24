require('dotenv').config();
// Mirror index.js: when TARGET=test, layer .env.test on top of .env so the
// server writes regenerations to the sandbox dir instead of the live pack.
if ((process.env.TARGET || 'test').toLowerCase() === 'test') {
    require('dotenv').config({ path: '.env.test', override: true });
}

const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const net = require('net');

const generator = require('./app/generator');

app.use(express.urlencoded({ extended: false }));

const MC_HOST = process.env.MC_HOST || 'localhost';
const MC_PORT = parseInt(process.env.MC_PORT || '25577', 10);
const SERVER_NAME = process.env.SERVER_NAME || 'Minecraft Server';

const LOCATIONS_PATH = path.resolve(__dirname, 'data/locations.json');
const EXPLORATION_PATH = path.resolve(__dirname, 'data/exploration.json');

function readJson(p) {
    // Strip UTF-8 BOM if present — PowerShell's Set-Content -Encoding UTF8 writes one,
    // and JSON.parse rejects it.
    return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''));
}
function writeJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 4) + '\n'); }

function slugify(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
function defaultY(dim) {
    if (dim === 'the_nether') return 120;
    if (dim === 'the_end') return 80;
    return 200;
}
function regenerate() {
    generator.init(path.resolve(process.env.BASE_PATH, process.env.PACK_FOLDER));
    generator.create();
}

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
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta http-equiv="refresh" content="10">
<style>
  html,body{height:100%;margin:0;background:#0f0f14;color:#e5e5e5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;-webkit-text-size-adjust:100%}
  body{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:1.5em;box-sizing:border-box}
  h1{font-weight:400;color:#888;margin:0 0 1em;font-size:1.1em;letter-spacing:.1em;text-transform:uppercase}
  .status{font-size:clamp(3em,18vw,5em);font-weight:700;letter-spacing:.05em;line-height:1}
  .up{color:#5fc14e}
  .down{color:#ef4444}
  .meta{color:#666;margin-top:1em;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.9em;word-break:break-all}
  .btn{display:inline-block;margin-top:2.5em;background:#5fc14e;color:#0f0f14;text-decoration:none;padding:.9em 1.8em;border-radius:6px;font-weight:600;font-size:1rem;letter-spacing:.03em;min-height:44px;box-sizing:border-box;transition:background .15s}
  .btn:hover,.btn:active{background:#4ba33d}
</style></head>
<body>
  <h1>${SERVER_NAME}</h1>
  <div class="status ${up ? 'up' : 'down'}">${up ? 'ONLINE' : 'OFFLINE'}</div>
  <div class="meta">${MC_HOST}:${MC_PORT}</div>
  <div class="meta">checked ${new Date().toLocaleTimeString()}</div>
  <a class="btn" href="/add-location">+ Add a location</a>
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

// ----- /add-location: form + POST handler for adding locations to either book -----

const FORM_CSS = `
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;background:#0f0f14;color:#e5e5e5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;-webkit-text-size-adjust:100%}
body{max-width:560px;margin:0 auto;padding:1.5em max(1em,env(safe-area-inset-left)) max(2em,env(safe-area-inset-bottom)) max(1em,env(safe-area-inset-right))}
h1{font-weight:400;color:#888;font-size:1.05em;letter-spacing:.1em;text-transform:uppercase;margin:.5em 0 1.5em;line-height:1.3}
form{display:flex;flex-direction:column;gap:1em}
label{display:flex;flex-direction:column;gap:.35em;font-size:.85em;color:#aaa}
/* font-size:16px prevents iOS Safari from auto-zooming inputs on focus */
input,select{width:100%;background:#1a1a22;border:1px solid #333;color:#e5e5e5;padding:.75em .8em;border-radius:6px;font-family:inherit;font-size:16px;min-height:44px;appearance:none;-webkit-appearance:none}
select{background-image:linear-gradient(45deg,transparent 50%,#888 50%),linear-gradient(135deg,#888 50%,transparent 50%);background-position:calc(100% - 18px) 50%,calc(100% - 13px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;padding-right:2.2em}
input:focus,select:focus{outline:none;border-color:#5fc14e}
.row{display:flex;gap:.6em;flex-wrap:wrap}
.row > label{flex:1 1 0;min-width:5.5em}
fieldset{border:1px solid #2a2a35;border-radius:6px;padding:1em;margin:0;display:flex;flex-direction:column;gap:1em;min-width:0}
legend{color:#888;font-size:.8em;padding:0 .5em;letter-spacing:.05em;text-transform:uppercase}
button{background:#5fc14e;color:#0f0f14;border:0;padding:.95em;border-radius:6px;font-weight:600;font-size:1rem;cursor:pointer;margin-top:.5em;min-height:48px;width:100%}
button:hover,button:active{background:#4ba33d}
.target{display:flex;gap:.6em}
.target label{flex:1;background:#1a1a22;border:1px solid #333;padding:.9em .5em;border-radius:6px;cursor:pointer;text-align:center;color:#e5e5e5;font-size:.95em;min-height:48px;display:flex;align-items:center;justify-content:center}
.target input{display:none}
.target input:checked + span{color:#5fc14e;font-weight:600}
.hint{color:#666;font-size:.8em;margin-top:.2em;line-height:1.4}
.msg{padding:1em;border-radius:6px;margin:1em 0;font-size:.95em;line-height:1.4}
.msg.ok{background:#14532d;color:#bbf7d0}
.msg.err{background:#7f1d1d;color:#fecaca}
a{color:#5fc14e;text-decoration:none}
a:hover,a:active{text-decoration:underline}
.magic-only{display:none}
body[data-target=magic] .magic-only{display:block}
body[data-target=magic] fieldset.magic-only{display:flex}
`;

function renderForm({ groups = [], message = '', target = 'exploration', defaults = {} } = {}) {
    const groupOptions = groups.map(g => `<option value="${g}"${g === defaults.group ? ' selected' : ''}>${g}</option>`).join('') +
        `<option value="__new__">+ New group&hellip;</option>`;
    return `<!doctype html>
<html><head><meta charset="utf-8"><title>Add Location</title>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>${FORM_CSS}</style></head>
<body data-target="${target}">
<h1><a href="/">${SERVER_NAME}</a> &rsaquo; Add Location</h1>
${message}
<form method="post" action="/add-location">
  <div class="target">
    <label><input type="radio" name="target" value="exploration" ${target === 'exploration' ? 'checked' : ''}><span>Exploration Book</span></label>
    <label><input type="radio" name="target" value="magic" ${target === 'magic' ? 'checked' : ''}><span>Magic Book</span></label>
  </div>

  <label>Label
    <input name="label" required value="${defaults.label || ''}" placeholder="e.g. Spooky Cave">
  </label>

  <label>Dimension
    <select name="dim">
      <option value="overworld"${defaults.dim === 'overworld' || !defaults.dim ? ' selected' : ''}>Overworld</option>
      <option value="the_nether"${defaults.dim === 'the_nether' ? ' selected' : ''}>Nether</option>
      <option value="the_end"${defaults.dim === 'the_end' ? ' selected' : ''}>End</option>
    </select>
  </label>

  <div class="row">
    <label>X<input name="x" type="number" step="any" required value="${defaults.x ?? ''}"></label>
    <label>Y<input name="y" type="number" step="any" value="${defaults.y ?? ''}" placeholder="auto"></label>
    <label>Z<input name="z" type="number" step="any" required value="${defaults.z ?? ''}"></label>
  </div>
  <div class="hint">Leave Y blank to use a safe drop-in default (200 overworld / 120 nether / 80 end).</div>

  <fieldset class="magic-only">
    <legend>Magic Book extras</legend>
    <label>Group
      <select name="group" onchange="document.getElementById('newgroup').style.display=this.value==='__new__'?'block':'none'">
        ${groupOptions}
      </select>
    </label>
    <label id="newgroup" style="display:none">New group name
      <input name="new_group" placeholder="e.g. Caves">
    </label>
    <div class="row">
      <label>Yaw (optional)<input name="yaw" type="number" step="any" placeholder="e.g. -90"></label>
      <label>Pitch (optional)<input name="pitch" type="number" step="any" placeholder="e.g. 0"></label>
    </div>
    <label>Filename (optional, auto from label)
      <input name="filename" placeholder="auto-derived if blank">
    </label>
  </fieldset>

  <button type="submit">Add &amp; Regenerate</button>
</form>

<script>
  document.querySelectorAll('input[name=target]').forEach(r => {
    r.addEventListener('change', () => { document.body.dataset.target = r.value; });
  });
</script>
</body></html>`;
}

app.get('/add-location', (req, res) => {
    const locations = readJson(LOCATIONS_PATH);
    const groups = locations.map(g => g.header);
    res.set('Cache-Control', 'no-store');
    res.send(renderForm({ groups }));
});

app.post('/add-location', (req, res) => {
    const { target } = req.body;
    try {
        if (target === 'exploration') addToExploration(req.body);
        else if (target === 'magic') addToMagic(req.body);
        else throw new Error(`unknown target: ${target}`);

        regenerate();

        const locations = readJson(LOCATIONS_PATH);
        const groups = locations.map(g => g.header);
        const msg = `<div class="msg ok"><strong>Added.</strong> Datapack regenerated. Run <code>/reload</code> in-game to pick it up.</div>`;
        res.send(renderForm({ groups, message: msg, target }));
    } catch (e) {
        const locations = readJson(LOCATIONS_PATH);
        const groups = locations.map(g => g.header);
        const msg = `<div class="msg err"><strong>Failed:</strong> ${String(e.message || e).replace(/</g, '&lt;')}</div>`;
        res.status(400).send(renderForm({ groups, message: msg, target, defaults: req.body }));
    }
});

function parseCoords(body) {
    const x = Number(body.x);
    const z = Number(body.z);
    const dim = String(body.dim || 'overworld');
    if (!Number.isFinite(x) || !Number.isFinite(z)) throw new Error('X and Z must be numbers');
    const y = body.y === '' || body.y == null ? defaultY(dim) : Number(body.y);
    if (!Number.isFinite(y)) throw new Error('Y must be a number');
    return { x, y, z, dim };
}

function addToExploration(body) {
    const label = String(body.label || '').trim();
    if (!label) throw new Error('Label required');
    const { x, y, z, dim } = parseCoords(body);

    const data = readJson(EXPLORATION_PATH);
    data.entries = data.entries || [];
    data.entries.push({ label, dim, x, y, z });
    writeJson(EXPLORATION_PATH, data);
}

function addToMagic(body) {
    const label = String(body.label || '').trim();
    if (!label) throw new Error('Label required');
    const { x, y, z, dim } = parseCoords(body);

    let groupName = String(body.group || '').trim();
    if (groupName === '__new__') {
        groupName = String(body.new_group || '').trim();
        if (!groupName) throw new Error('New group name required');
    }
    if (!groupName) throw new Error('Group required');

    const filename = String(body.filename || '').trim() || slugify(label);
    if (!filename) throw new Error('Filename required (could not derive from label)');

    const yaw = body.yaw === '' || body.yaw == null ? null : Number(body.yaw);
    const pitch = body.pitch === '' || body.pitch == null ? null : Number(body.pitch);
    const rotation = yaw != null && pitch != null ? `${yaw} ${pitch}` : null;

    const locations = readJson(LOCATIONS_PATH);

    // Filename uniqueness across all groups (location.js keys by filename).
    for (const g of locations) {
        for (const loc of g.locations) {
            if (loc.filename === filename) throw new Error(`Filename "${filename}" already used in group "${g.header}"`);
        }
    }

    let group = locations.find(g => g.header === groupName);
    if (!group) {
        group = { header: groupName, locations: [] };
        locations.push(group);
    }

    const entry = {
        label,
        dimension: `minecraft:${dim}`,
        coordinates: `${x} ${y} ${z}`,
        filename
    };
    if (rotation) entry.rotation = rotation;

    group.locations.push(entry);
    writeJson(LOCATIONS_PATH, locations);
}

endpoints.forEach((endpoint) => {
    app.get(endpoint.path, function (req, res) {
        try {
            generator.init(path.resolve(process.env.BASE_PATH, process.env.PACK_FOLDER));
            generator[endpoint.function]();
            res.send('Command generation successful!');
        } catch (error) {
            res.send('Command generation failed!');
            // console.log(error);
        }
    });
});

app.listen(3000);
