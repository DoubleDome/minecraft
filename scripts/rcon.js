#!/usr/bin/env node
/*
 * Zero-dependency RCON client for the live Minecraft server.
 *
 * Connection settings are resolved in this order:
 *   host:     RCON_HOST | MC_HOST | localhost
 *   port:     RCON_PORT | rcon.port from server.properties | 25575
 *   password: RCON_PASSWORD | rcon.password from server.properties
 * server.properties is found via SERVER_PROPERTIES, else <WORLD_PATH>/../server.properties.
 *
 * Usage:
 *   node scripts/rcon.js                       # overview: who's online + objectives list
 *   node scripts/rcon.js "scoreboard objectives list"   # run any single command
 *   node scripts/rcon.js --dump                # every score, every tracked player, by objective id
 *   node scripts/rcon.js --dump killers        # only objectives under the "killers" group
 *
 * Requires enable-rcon=true + a server restart on the server side.
 */
require('dotenv').config();
const net = require('net');
const fs = require('fs');
const path = require('path');

// ---- config resolution ---------------------------------------------------
function readServerProps() {
    const explicit = process.env.SERVER_PROPERTIES;
    const derived = process.env.WORLD_PATH
        ? path.resolve(path.dirname(process.env.WORLD_PATH), 'server.properties')
        : null;
    const p = explicit || derived;
    const props = {};
    if (p && fs.existsSync(p)) {
        for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
            if (!line || line.startsWith('#')) continue;
            const i = line.indexOf('=');
            if (i === -1) continue;
            props[line.slice(0, i).trim()] = line.slice(i + 1).trim();
        }
    }
    return props;
}

const props = readServerProps();
const HOST = process.env.RCON_HOST || process.env.MC_HOST || 'localhost';
const PORT = parseInt(process.env.RCON_PORT || props['rcon.port'] || '25575', 10);
const PASSWORD = process.env.RCON_PASSWORD || props['rcon.password'] || '';

// ---- RCON protocol -------------------------------------------------------
const TYPE_AUTH = 3;
const TYPE_EXEC = 2;

function encode(id, type, body) {
    const buf = Buffer.from(body, 'utf8');
    const pkt = Buffer.alloc(buf.length + 14);
    pkt.writeInt32LE(buf.length + 10, 0); // length of everything after this field
    pkt.writeInt32LE(id, 4);
    pkt.writeInt32LE(type, 8);
    buf.copy(pkt, 12);
    // two trailing NUL bytes already zero-filled by Buffer.alloc
    return pkt;
}

// Connect + authenticate, returning an object with exec()/end().
function connect() {
    return new Promise((resolve, reject) => {
        const socket = net.createConnection({ host: HOST, port: PORT });
        socket.setTimeout(8000);

        let acc = Buffer.alloc(0);
        const pending = new Map(); // cmdId & sentinelId -> { cmdId, sentinel, bodies, resolve }
        let authResolve = null;
        let authId = 1;

        const failAll = (msg) => { for (const e of new Set(pending.values())) e.reject(new Error(msg)); pending.clear(); };
        socket.on('connect', () => socket.write(encode(authId, TYPE_AUTH, PASSWORD)));
        socket.on('timeout', () => { socket.destroy(); reject(new Error(`RCON timeout to ${HOST}:${PORT}`)); failAll('RCON socket timed out'); });
        socket.on('error', (e) => { reject(new Error(e.message || e.code || String(e))); failAll(`RCON socket error: ${e.code || e.message}`); });
        socket.on('close', () => failAll('RCON connection closed by server'));

        socket.on('data', (chunk) => {
            acc = Buffer.concat([acc, chunk]);
            // parse as many complete frames as are buffered
            while (acc.length >= 4) {
                const len = acc.readInt32LE(0);
                if (acc.length < 4 + len) break;
                const id = acc.readInt32LE(4);
                const type = acc.readInt32LE(8);
                const body = acc.toString('utf8', 12, 4 + len - 2);
                acc = acc.slice(4 + len);

                if (authResolve) { // first type-2 frame is the auth result
                    if (type === 2) {
                        const ok = id !== -1;
                        const done = authResolve; authResolve = null;
                        if (ok) done();
                        else { socket.destroy(); reject(new Error('RCON auth failed — wrong rcon.password')); }
                    }
                    continue;
                }
                const entry = pending.get(id);
                if (!entry) continue;
                if (id === entry.sentinel) { // all of cmdId's (possibly fragmented) reply has arrived
                    pending.delete(entry.cmdId);
                    pending.delete(entry.sentinel);
                    entry.resolve(entry.bodies.join(''));
                } else {
                    entry.bodies.push(body);
                }
            }
        });

        // run the auth handshake
        new Promise((res) => { authResolve = res; }).then(() => {
            let nextId = 10; // start clear of authId
            const api = {
                exec(command) {
                    return new Promise((res, rej) => {
                        const cmdId = nextId++;
                        const sentinel = nextId++;
                        const timer = setTimeout(() => {
                            pending.delete(cmdId); pending.delete(sentinel);
                            rej(new Error(`RCON command timed out: ${command}`));
                        }, 10000);
                        const entry = {
                            cmdId, sentinel, bodies: [],
                            resolve: (v) => { clearTimeout(timer); res(v); },
                            reject: (e) => { clearTimeout(timer); rej(e); },
                        };
                        pending.set(cmdId, entry);
                        pending.set(sentinel, entry);
                        socket.write(encode(cmdId, TYPE_EXEC, command));
                        socket.write(encode(sentinel, TYPE_EXEC, '')); // marks end of cmdId's (possibly fragmented) reply
                    });
                },
                end() { socket.end(); },
            };
            resolve(api);
        });
    });
}

// ---- helpers -------------------------------------------------------------
// Flatten data/objectives.json to { id -> dotted.group.path }. A leaf is any
// object with a string `name` (the scoreboard objective id).
function loadObjectives(groupFilter) {
    const data = require('../data/objectives.json');
    const out = [];
    (function walk(node, trail) {
        if (node && typeof node === 'object') {
            if (typeof node.name === 'string') { out.push({ id: node.name, group: trail.join('.') }); return; }
            for (const [k, v] of Object.entries(node)) walk(v, [...trail, k]);
        }
    })(data, []);
    return groupFilter ? out.filter(o => o.group.split('.')[0] === groupFilter) : out;
}

function parseTrackedEntities(text) {
    if (/no tracked entit/i.test(text)) return [];
    const colon = text.indexOf(':');
    if (colon === -1) return [];
    return text.slice(colon + 1).split(',').map(s => s.trim()).filter(Boolean);
}

// Tracked-entity lists are full of datapack internals (#consts, raw numbers,
// UUIDs, resource ids). A real player score holder is a vanilla username:
// 3-16 chars of [A-Za-z0-9_], not all digits.
function looksLikePlayer(name) {
    return /^[A-Za-z0-9_]{3,16}$/.test(name) && !/^\d+$/.test(name);
}

// "There are 2 of a max of 10 players online: Alex, Steve" -> ['Alex','Steve']
function parseOnlinePlayers(text) {
    const colon = text.indexOf(':');
    if (colon === -1) return [];
    return text.slice(colon + 1).split(',').map(s => s.trim()).filter(Boolean);
}

// Pull the payload out of "X has the following entity data: <payload>"
function dataValue(text) {
    const m = text.match(/entity data:\s*([\s\S]*)$/);
    return m ? m[1].trim() : text.trim();
}

const GAMEMODES = ['Survival', 'Creative', 'Adventure', 'Spectator'];

// Resolve a short objective key (e.g. "deaths", "stats.points") to a full id.
function resolveObjective(arg) {
    const all = loadObjectives();
    const hit = all.find(o => o.id === arg)
        || all.find(o => o.id.endsWith('.' + arg))
        || all.find(o => o.group.split('.').pop() === arg)
        || all.find(o => o.id.includes(arg));
    return hit ? hit.id : arg;
}

// ---- main ----------------------------------------------------------------
(async () => {
    const helpArg = process.argv[2];
    if (helpArg === '--help' || helpArg === '-h' || helpArg === 'help') {
        console.log(`rcon.js — query the live server over RCON

  node scripts/rcon.js                      overview (online players + objectives)
  node scripts/rcon.js info                 server snapshot (time, day, seed, difficulty)
  node scripts/rcon.js players              health/coords/dimension/gamemode per online player
  node scripts/rcon.js top <objective>      leaderboard for one objective (e.g. "top deaths")
  node scripts/rcon.js --dump [group]       every score by objective id (optional group filter)
  node scripts/rcon.js "<any command>"      run a raw command (e.g. "time query day")

Connection: rcon.port / rcon.password from server.properties (override with
RCON_HOST / RCON_PORT / RCON_PASSWORD in .env). Needs enable-rcon=true + a
server restart.`);
        return;
    }
    if (!PASSWORD) {
        console.error('No RCON password found. Set rcon.password in server.properties (and enable-rcon=true), or RCON_PASSWORD in .env.');
        process.exit(1);
    }

    let rcon;
    try {
        rcon = await connect();
    } catch (e) {
        console.error(`Could not connect: ${e.message}`);
        console.error(`(host=${HOST} port=${PORT} — is the server up with enable-rcon=true?)`);
        process.exit(1);
    }

    const args = process.argv.slice(2);
    const cmd = args[0];
    try {
        if (cmd === 'info' || cmd === '--info') {
            const list = await rcon.exec('list');
            const seed = await rcon.exec('seed');
            const dayClock = await rcon.exec('time query day');      // daylight clock, ticks (26.1 "timeline")
            const gametime = await rcon.exec('time query gametime'); // total ticks since world start
            const difficulty = await rcon.exec('difficulty');
            const num = (s) => parseInt((s.match(/-?\d+/) || ['0'])[0], 10);
            const cap = list.match(/of a max of (\d+)/);
            const names = parseOnlinePlayers(list);
            const tod = num(dayClock);
            console.log('Online    :', `${names.length}/${cap ? cap[1] : '?'}` + (names.length ? ` — ${names.join(', ')}` : ''));
            console.log('Seed      :', (seed.match(/\[(-?\d+)\]/) || [, String(num(seed))])[1]);
            console.log('Day #     :', Math.floor(num(gametime) / 24000), '(from gametime)');
            console.log('Daytime   :', `${tod} ticks (0=dawn, 6000=noon, 12000=dusk, 18000=midnight)`);
            console.log('Difficulty:', (difficulty.match(/is (\w+)/) || [, difficulty.trim()])[1]);
        } else if (cmd === 'players' || cmd === '--players') {
            const online = parseOnlinePlayers(await rcon.exec('list'));
            if (!online.length) { console.log('No players online.'); return; }
            for (const p of online) {
                const pos = await rcon.exec(`data get entity ${p} Pos`);
                const dim = await rcon.exec(`data get entity ${p} Dimension`);
                const hp = await rcon.exec(`data get entity ${p} Health`);
                const food = await rcon.exec(`data get entity ${p} foodLevel`);
                const gm = await rcon.exec(`data get entity ${p} playerGameType`);
                const coords = (dataValue(pos).match(/-?\d+(\.\d+)?/g) || []).slice(0, 3)
                    .map(n => Math.round(parseFloat(n))).join(' ');
                const health = Math.round(parseFloat(dataValue(hp)) || 0);
                const gmIdx = parseInt((dataValue(gm).match(/\d+/) || [])[0], 10);
                console.log(`\n=== ${p} ===`);
                console.log(`  pos      : ${coords}`);
                console.log(`  dimension: ${dataValue(dim).replace(/"/g, '')}`);
                console.log(`  health   : ${health}/20`);
                console.log(`  food     : ${(dataValue(food).match(/\d+/) || ['?'])[0]}/20`);
                console.log(`  gamemode : ${GAMEMODES[gmIdx] || gm.trim()}`);
            }
        } else if (cmd === 'top' || cmd === '--top') {
            if (!args[1]) { console.error('Usage: node scripts/rcon.js top <objective>'); process.exitCode = 1; return; }
            const obj = resolveObjective(args[1]);
            const players = parseTrackedEntities(await rcon.exec('scoreboard players list')).filter(looksLikePlayer);
            const rows = [];
            for (const p of players) {
                const m = (await rcon.exec(`scoreboard players get ${p} ${obj}`)).match(/\bhas (-?\d+)\b/);
                if (m) rows.push([p, parseInt(m[1], 10)]);
            }
            rows.sort((a, b) => b[1] - a[1]);
            console.log(`Leaderboard — ${obj}`);
            if (!rows.length) { console.log('  (no scores)'); return; }
            const w = Math.max(...rows.map(r => r[0].length));
            rows.forEach(([p, v], i) => console.log(`  ${String(i + 1).padStart(2)}. ${p.padEnd(w)}  ${String(v).padStart(8)}`));
        } else if (cmd === '--dump' || cmd === 'dump') {
            // One `scoreboard players list <player>` per player returns every score as
            // "[objective]: value" pairs — far fewer commands than get-per-objective
            // (which floods RCON and gets the connection dropped). Optional substring filter.
            const group = args[1] ? args[1].toLowerCase() : null;
            const players = parseTrackedEntities(await rcon.exec('scoreboard players list')).filter(looksLikePlayer);
            if (!players.length) { console.log('No player scores found.'); return; }

            for (const player of players) {
                const raw = await rcon.exec(`scoreboard players list ${player}`);
                let pairs = [...raw.matchAll(/\[([^\]]+)\]:\s*(-?\d+)/g)].map(m => [m[1], m[2]]);
                if (group) pairs = pairs.filter(([k]) => k.toLowerCase().includes(group));
                pairs.sort((a, b) => a[0].localeCompare(b[0]));
                console.log(`\n=== ${player} ===`);
                if (!pairs.length) { console.log('  (no matching scores)'); continue; }
                const w = Math.max(...pairs.map(r => r[0].length));
                for (const [k, v] of pairs) console.log(`  ${k.padEnd(w)}  ${v.padStart(10)}`);
            }
        } else if (args.length) {
            const out = await rcon.exec(args.join(' '));
            console.log(out.trim() || '(empty response)');
        } else {
            console.log('--- players online ---');
            console.log((await rcon.exec('list')).trim());
            console.log('\n--- objectives ---');
            console.log((await rcon.exec('scoreboard objectives list')).trim());
        }
    } catch (e) {
        console.error(`Command failed: ${e.message}`);
        process.exitCode = 1;
    } finally {
        rcon.end();
    }
})();
