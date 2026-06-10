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
const { rebuild } = require('./app/rebuild');
const playerstats = require('./app/playerstats');

const TARGET = (process.env.TARGET || 'test').toLowerCase();

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

// Full rebuild — delegates to the shared app/rebuild.js so the web endpoint and
// `node index.js <target>` run identical safeguards (env guard, live backup before
// wipe, source-dir sentinel). Writes to whatever target server.js was started under.

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
<style>
  html,body{height:100%;margin:0;background:#0f0f14;color:#e5e5e5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;-webkit-text-size-adjust:100%}
  body{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:1.5em;box-sizing:border-box}
  h1{font-weight:400;color:#888;margin:0 0 1em;font-size:1.1em;letter-spacing:.1em;text-transform:uppercase}
  .status{font-size:clamp(3em,18vw,5em);font-weight:700;letter-spacing:.05em;line-height:1}
  .up{color:#5fc14e}
  .down{color:#ef4444}
  .meta{color:#666;margin-top:1em;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.9em;word-break:break-all}
  .btn{display:inline-block;margin-top:1em;background:#5fc14e;color:#0f0f14;text-decoration:none;padding:.9em 1.8em;border-radius:6px;font-weight:600;font-size:1rem;letter-spacing:.03em;min-height:44px;box-sizing:border-box;transition:background .15s;border:0;cursor:pointer;font-family:inherit}
  .btn:hover,.btn:active{background:#4ba33d}
  .btn.secondary{background:#1a1a22;color:#e5e5e5;border:1px solid #333}
  .btn.secondary:hover,.btn.secondary:active{background:#23232e}
  .btn:disabled{opacity:.5;cursor:default}
  .actions{display:flex;flex-direction:column;gap:.6em;margin-top:2.5em}
  #rebuild-msg{min-height:1.2em;margin-top:1em;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.85em;line-height:1.4}
  #rebuild-msg.ok{color:#5fc14e}
  #rebuild-msg.err{color:#ef4444}
</style></head>
<body>
  <h1>${SERVER_NAME}</h1>
  <div class="status ${up ? 'up' : 'down'}">${up ? 'ONLINE' : 'OFFLINE'}</div>
  <div class="meta">${MC_HOST}:${MC_PORT}</div>
  <div class="meta">checked ${new Date().toLocaleTimeString()}</div>
  <div class="actions">
    <a class="btn" href="/add-location">+ Add a location</a>
    <a class="btn secondary" href="/stats">Player stats</a>
    <button class="btn secondary" id="rebuild-btn" onclick="rebuild()">Rebuild pack (${TARGET})</button>
  </div>
  <div id="rebuild-msg"></div>
<script>
  // Refresh the page every 10s to re-check server status — but skip the reload
  // while a rebuild is in flight so the result message isn't wiped mid-request.
  let busy = false;
  setInterval(() => { if (!busy) location.reload(); }, 10000);
  async function rebuild() {
    if (busy) return;
    busy = true;
    const btn = document.getElementById('rebuild-btn');
    const msg = document.getElementById('rebuild-msg');
    btn.disabled = true;
    msg.className = '';
    msg.textContent = 'Rebuilding\\u2026';
    try {
      const r = await fetch('/rebuild', { method: 'POST' });
      const j = await r.json();
      if (j.ok) {
        msg.className = 'ok';
        msg.textContent = '\\u2713 Rebuilt ' + j.target + (j.backup ? ' (backed up)' : '') + ' \\u2014 run /reload in-game';
      } else {
        msg.className = 'err';
        msg.textContent = '\\u2717 ' + (j.error || 'rebuild failed');
      }
    } catch (e) {
      msg.className = 'err';
      msg.textContent = '\\u2717 ' + e;
    } finally {
      btn.disabled = false;
      busy = false;
    }
  }
</script>
</body></html>`);
});

app.get('/status.json', async (req, res) => {
    res.json({ online: await checkServer(), host: MC_HOST, port: MC_PORT, checked: new Date().toISOString() });
});

// Rebuild the whole pack on demand. GET so it's a trivial curl/browser hit,
// matching the /export/* endpoints. Run /reload in-game afterward (a server
// restart is still needed for dynamic registries — see rebuild rules).
app.post('/rebuild', handleRebuild);
app.get('/rebuild', handleRebuild);
function handleRebuild(req, res) {
    res.set('Cache-Control', 'no-store');
    try {
        const { outputDir, resourceResult, backup } = rebuild(TARGET);
        res.json({ ok: true, target: TARGET, output: outputDir, backup, resource: resourceResult, rebuilt: new Date().toISOString() });
    } catch (e) {
        res.status(500).json({ ok: false, target: TARGET, error: String(e.message || e) });
    }
}

// Serve the built resource pack over the LAN so the server can push it to clients
// (server.properties resource-pack=http://<lan-ip>:3000/madagascar_rp.zip). Rebuild with
// `node scripts/resourcepack.js`; the zip + its sha1 live in dist/.
const RP_ZIP = path.resolve(__dirname, 'dist/madagascar_rp.zip');
app.get('/madagascar_rp.zip', (req, res) => {
    if (!fs.existsSync(RP_ZIP)) {
        return res.status(404).send('Resource pack not built. Run: node scripts/resourcepack.js');
    }
    res.download(RP_ZIP, 'madagascar_rp.zip');
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

// ----- /stats: player stat breakdown from the world's stat files -----

const STATS_CSS = `
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;background:#0f0f14;color:#e5e5e5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;-webkit-text-size-adjust:100%}
body{max-width:820px;margin:0 auto;padding:1.5em max(1em,env(safe-area-inset-left)) max(2em,env(safe-area-inset-bottom)) max(1em,env(safe-area-inset-right))}
h1{font-weight:400;color:#888;font-size:1.05em;letter-spacing:.08em;text-transform:uppercase;margin:.5em 0 1em;line-height:1.3}
h2{font-weight:600;color:#5fc14e;font-size:.8em;letter-spacing:.08em;text-transform:uppercase;margin:1.8em 0 .6em;border-bottom:1px solid #2a2a35;padding-bottom:.4em}
a{color:#5fc14e;text-decoration:none}a:hover{text-decoration:underline}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.6em}
.card{background:#1a1a22;border:1px solid #2a2a35;border-radius:8px;padding:.8em .9em}
.card .v{font-size:1.3em;font-weight:700;color:#fff;font-variant-numeric:tabular-nums}
.card .k{font-size:.72em;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-top:.2em}
table{width:100%;border-collapse:collapse;font-size:.9em}
td{padding:.32em .5em;border-bottom:1px solid #1d1d26}
td.v{text-align:right;font-variant-numeric:tabular-nums;color:#cfcfcf;width:8em}
tr:hover td{background:#16161d}
.more{color:#666;font-size:.8em;padding:.5em}
.plist{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:.5em}
.plist a{display:flex;justify-content:space-between;background:#1a1a22;border:1px solid #2a2a35;border-radius:8px;padding:.9em 1em;color:#e5e5e5}
.plist a:hover{border-color:#5fc14e;text-decoration:none}
.plist .pt{color:#888;font-variant-numeric:tabular-nums}
`;

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
const prettify = (k) => k.replace(/_/g, ' ');

function statTable(rows, topN, conv) {
    if (!rows.length) return '<table><tr><td class="more">none</td></tr></table>';
    const body = rows.slice(0, topN).map(r => `<tr><td>${esc(prettify(r.key))}</td><td class="v">${conv(r.value)}</td></tr>`).join('');
    const more = rows.length > topN ? `<div class="more">…and ${rows.length - topN} more</div>` : '';
    return `<table>${body}</table>${more}`;
}

function renderStatsIndex(players) {
    const rows = players.map(p =>
        `<li><a href="/stats/${esc(p.uuid)}"><span>${esc(p.name)}</span><span class="pt">${playerstats.fmt.ticksToH(p.playtime)}</span></a></li>`
    ).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>Player Stats</title>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>${STATS_CSS}</style></head><body>
<h1><a href="/">${SERVER_NAME}</a> &rsaquo; Player Stats</h1>
<ul class="plist">${rows || '<li class="more">No stat files found.</li>'}</ul>
</body></html>`;
}

function renderStatsPlayer(d, topN) {
    const f = playerstats.fmt;
    const g = (k) => d.custom[k] || 0;
    const card = (k, v) => `<div class="card"><div class="v">${v}</div><div class="k">${k}</div></div>`;
    const cards = [
        card('Playtime', f.ticksToH(g('play_time'))),
        card('Total distance', f.cmToKm(d.travelTotalCm)),
        card('Deaths', f.num(g('deaths'))),
        card('Mob kills', f.num(g('mob_kills'))),
        card('Player kills', f.num(g('player_kills'))),
        card('Damage dealt', f.num(g('damage_dealt'))),
        card('Damage taken', f.num(g('damage_taken'))),
        card('Villager trades', f.num(g('traded_with_villager'))),
        card('Items enchanted', f.num(g('enchant_item'))),
        card('Animals bred', f.num(g('animals_bred'))),
        card('Fish caught', f.num(g('fish_caught'))),
        card('Raids won', f.num(g('raid_win'))),
    ].join('');
    const travelRows = d.travel.map(t => `<tr><td>${esc(t.mode)}</td><td class="v">${f.cmToKm(t.cm)}</td></tr>`).join('')
        + `<tr><td><strong>TOTAL</strong></td><td class="v"><strong>${f.cmToKm(d.travelTotalCm)}</strong></td></tr>`;
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.name)} — Stats</title>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>${STATS_CSS}</style></head><body>
<h1><a href="/">${SERVER_NAME}</a> &rsaquo; <a href="/stats">Stats</a> &rsaquo; ${esc(d.name)}</h1>
<h2>Overview</h2><div class="cards">${cards}</div>
<h2>Travel by mode</h2><table>${travelRows}</table>
<h2>Mobs killed (${d.killed.length} types)</h2>${statTable(d.killed, topN, f.num)}
<h2>Killed by</h2>${statTable(d.killed_by, 99, f.num)}
<h2>Blocks mined (${d.mined.length} types)</h2>${statTable(d.mined, topN, f.num)}
<h2>Items used</h2>${statTable(d.used, topN, f.num)}
<h2>Items crafted</h2>${statTable(d.crafted, topN, f.num)}
<h2>Items picked up</h2>${statTable(d.picked_up, topN, f.num)}
<h2>Tools/items broken</h2>${statTable(d.broken, topN, f.num)}
</body></html>`;
}

app.get('/stats', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.send(renderStatsIndex(playerstats.listPlayers()));
});

app.get('/stats/:player', (req, res) => {
    const d = playerstats.readStats(req.params.player);
    if (!d) return res.status(404).send('No stats for that player. <a href="/stats">Back</a>');
    if (req.query.format === 'json') return res.json(d);
    const topN = Math.min(Math.max(parseInt(req.query.top, 10) || 20, 1), 500);
    res.set('Cache-Control', 'no-store');
    res.send(renderStatsPlayer(d, topN));
});

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

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
    console.log('========================================');
    console.log(`  ${SERVER_NAME} dashboard is RUNNING`);
    console.log(`  Target : ${(process.env.TARGET || 'test').toLowerCase()}`);
    console.log(`  URL    : http://localhost:${PORT}`);
    console.log(`  Started: ${new Date().toLocaleString()}`);
    console.log('========================================');
    console.log('Leave this window open. Closing it stops the server.');
});
