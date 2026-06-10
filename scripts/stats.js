#!/usr/bin/env node
/*
 * Full player stat breakdown straight from the world's stat files
 * (world/players/stats/<uuid>.json) — authoritative LIFETIME totals,
 * independent of the in-game scoreboard. Works offline.
 *
 * Usage:
 *   node scripts/stats.js                 # every player
 *   node scripts/stats.js DoubleDome      # one player (name or uuid)
 *   node scripts/stats.js --top 25 Filbert
 *
 * Data comes from app/playerstats.js, shared with the web view in server.js.
 */
require('dotenv').config();
const { listPlayers, readStats, compareStats, customGroups, fmt } = require('../app/playerstats');

const args = process.argv.slice(2);
let topN = 15;
const ti = args.indexOf('--top');
if (ti !== -1) { topN = parseInt(args[ti + 1], 10) || 15; args.splice(ti, 2); }
const who = args[0];

const section = (title) => console.log('\n' + title + '\n' + '-'.repeat(title.length));

function table(rows, { limit = topN, conv = fmt.num } = {}) {
    const shown = rows.slice(0, limit);
    const w = Math.max(...shown.map(r => r.key.length), 0);
    for (const r of shown) console.log('  ' + r.key.padEnd(w) + '  ' + String(conv(r.value)).padStart(12));
    if (rows.length > limit) console.log(`  …and ${rows.length - limit} more`);
    return rows.reduce((s, r) => s + r.value, 0);
}

function breakdown(d) {
    console.log('\n' + '='.repeat(52));
    console.log('  ' + d.name + '   (' + d.uuid + ')');
    console.log('='.repeat(52));

    section('Travel (by mode)');
    const dw = Math.max(...d.travel.map(t => t.mode.length), 5);
    for (const t of d.travel) console.log('  ' + t.mode.padEnd(dw) + '  ' + fmt.cmToKm(t.cm).padStart(12));
    console.log('  ' + 'TOTAL'.padEnd(dw) + '  ' + fmt.cmToKm(d.travelTotalCm).padStart(12));

    // Every custom stat, grouped — nothing hidden.
    for (const grp of customGroups(d.custom)) {
        section(grp.name);
        const w = Math.max(...grp.entries.map(e => e.label.length));
        for (const e of grp.entries) console.log('  ' + e.label.padEnd(w) + '  ' + e.display.padStart(12));
    }

    section(`Mobs killed (top ${topN})`);
    const killed = table(d.killed);
    console.log('  → ' + fmt.num(killed) + ' total across ' + d.killed.length + ' types');

    section('Killed by');
    table(d.killed_by, { limit: 99 });

    section(`Blocks mined (top ${topN})`);
    const mined = table(d.mined);
    console.log('  → ' + fmt.num(mined) + ' total across ' + d.mined.length + ' block types');

    section(`Items used (top ${topN})`);
    table(d.used);

    section(`Items crafted (top ${topN})`);
    console.log('  → ' + fmt.num(table(d.crafted)) + ' total');

    section(`Items picked up (top ${topN})`);
    table(d.picked_up);

    section(`Items dropped (top ${topN})`);
    table(d.dropped);

    section(`Tools/items broken (top ${topN})`);
    table(d.broken);
}

if (who === 'compare') {
    const cmp = compareStats();
    const names = cmp.players.map(p => p.name);
    const labelW = Math.max(...cmp.rows.map(r => r.label.length));
    const colW = Math.max(12, ...names.map(n => n.length));
    console.log('\n' + ''.padEnd(labelW) + '  ' + names.map(n => n.padStart(colW)).join('  '));
    console.log('-'.repeat(labelW + (colW + 2) * names.length));
    for (const r of cmp.rows) {
        const cells = r.values.map(v => (v.uuid === r.leader ? '*' : ' ') + v.display.padStart(colW - 1)).join('  ');
        console.log(r.label.padEnd(labelW) + '  ' + cells);
    }
    console.log('\n(* = leader in that row)');
} else if (who) {
    const d = readStats(who);
    if (!d) { console.error('Unknown player or no stats file:', who); process.exit(1); }
    breakdown(d);
} else {
    const players = listPlayers();
    if (!players.length) { console.error('No stat files found.'); process.exit(1); }
    for (const p of players) breakdown(readStats(p.uuid));
}
