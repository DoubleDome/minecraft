// Shared reader for the world's player stat files (world/players/stats/<uuid>.json).
// Authoritative LIFETIME totals, independent of the in-game scoreboard. Consumed by
// both scripts/stats.js (CLI text) and server.js (web page) so the data is identical.
const fs = require('fs');
const path = require('path');

function paths() {
    const WORLD = process.env.WORLD_PATH || 'D:/jakarta-vanilla-26.1.2/world';
    const ROOT = path.dirname(WORLD);
    const STATS_DIR = [path.join(WORLD, 'players/stats'), path.join(WORLD, 'stats')].find(fs.existsSync);
    return { WORLD, ROOT, STATS_DIR };
}

function usercache() {
    const { ROOT } = paths();
    try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'usercache.json'), 'utf8')); } catch { return []; }
}

const clean = (k) => k.replace(/^minecraft:/, '');
const sortedCat = (obj) => Object.entries(obj || {}).map(([k, v]) => ({ key: clean(k), value: v })).sort((a, b) => b.value - a.value);

function nameOf(uuid) {
    const e = usercache().find(c => c.uuid === uuid);
    return e ? e.name : uuid.slice(0, 8);
}

function resolveUuid(who) {
    if (/^[0-9a-f-]{36}$/i.test(who)) return who;
    const e = usercache().find(c => c.name && c.name.toLowerCase() === String(who).toLowerCase());
    return e ? e.uuid : null;
}

// All players that have a stat file, with playtime, sorted most-played first.
function listPlayers() {
    const { STATS_DIR } = paths();
    if (!STATS_DIR) return [];
    const uc = usercache();
    const nm = (u) => { const e = uc.find(c => c.uuid === u); return e ? e.name : u.slice(0, 8); };
    return fs.readdirSync(STATS_DIR).filter(f => f.endsWith('.json')).map(f => {
        const uuid = f.replace('.json', '');
        let playtime = 0;
        try {
            const j = JSON.parse(fs.readFileSync(path.join(STATS_DIR, f), 'utf8'));
            playtime = (j.stats && j.stats['minecraft:custom'] && j.stats['minecraft:custom']['minecraft:play_time']) || 0;
        } catch {}
        return { uuid, name: nm(uuid), playtime };
    }).sort((a, b) => b.playtime - a.playtime);
}

// Full structured breakdown for one player (name or uuid). null if not found.
function readStats(who) {
    const { STATS_DIR } = paths();
    if (!STATS_DIR) return null;
    const uuid = resolveUuid(who);
    if (!uuid) return null;
    const file = path.join(STATS_DIR, uuid + '.json');
    if (!fs.existsSync(file)) return null;
    const s = JSON.parse(fs.readFileSync(file, 'utf8')).stats || {};
    const custom = {};
    for (const [k, v] of Object.entries(s['minecraft:custom'] || {})) custom[clean(k)] = v;
    const travel = Object.entries(custom)
        .filter(([k]) => k.endsWith('_one_cm'))
        .map(([k, v]) => ({ mode: k.replace('_one_cm', ''), cm: v }))
        .sort((a, b) => b.cm - a.cm);
    return {
        uuid, name: nameOf(uuid), custom, travel,
        travelTotalCm: travel.reduce((s, t) => s + t.cm, 0),
        killed: sortedCat(s['minecraft:killed']),
        killed_by: sortedCat(s['minecraft:killed_by']),
        mined: sortedCat(s['minecraft:mined']),
        used: sortedCat(s['minecraft:used']),
        crafted: sortedCat(s['minecraft:crafted']),
        picked_up: sortedCat(s['minecraft:picked_up']),
        dropped: sortedCat(s['minecraft:dropped']),
        broken: sortedCat(s['minecraft:broken']),
    };
}

const fmt = {
    num: (x) => Number(x).toLocaleString('en-US'),
    ticksToH: (t) => (t / 72000).toFixed(1) + ' h',
    cmToKm: (c) => (c / 100000).toFixed(2) + ' km',
};

module.exports = { listPlayers, readStats, resolveUuid, nameOf, fmt, clean };
