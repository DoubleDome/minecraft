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
const { listPlayers, readStats, fmt } = require('../app/playerstats');

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
    const g = (k) => d.custom[k] || 0;
    console.log('\n' + '='.repeat(52));
    console.log('  ' + d.name + '   (' + d.uuid + ')');
    console.log('='.repeat(52));

    section('Overview');
    const overview = [
        ['Playtime', fmt.ticksToH(g('play_time'))],
        ['World time loaded', fmt.ticksToH(g('total_world_time'))],
        ['Deaths', fmt.num(g('deaths'))],
        ['Mob kills', fmt.num(g('mob_kills'))],
        ['Player kills', fmt.num(g('player_kills'))],
        ['Damage dealt', fmt.num(g('damage_dealt'))],
        ['Damage taken', fmt.num(g('damage_taken'))],
        ['Damage blocked (shield)', fmt.num(g('damage_blocked_by_shield'))],
        ['Jumps', fmt.num(g('jump'))],
        ['Sleep in bed', fmt.num(g('sleep_in_bed'))],
        ['Fish caught', fmt.num(g('fish_caught'))],
        ['Animals bred', fmt.num(g('animals_bred'))],
        ['Items enchanted', fmt.num(g('enchant_item'))],
        ['Villager trades', fmt.num(g('traded_with_villager'))],
        ['Raids won', fmt.num(g('raid_win'))],
    ];
    const ow = Math.max(...overview.map(([k]) => k.length));
    for (const [k, v] of overview) console.log('  ' + k.padEnd(ow) + '  ' + String(v).padStart(12));

    section('Travel (by mode)');
    const dw = Math.max(...d.travel.map(t => t.mode.length), 5);
    for (const t of d.travel) console.log('  ' + t.mode.padEnd(dw) + '  ' + fmt.cmToKm(t.cm).padStart(12));
    console.log('  ' + 'TOTAL'.padEnd(dw) + '  ' + fmt.cmToKm(d.travelTotalCm).padStart(12));

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

    section(`Tools/items broken (top ${topN})`);
    table(d.broken);
}

if (who) {
    const d = readStats(who);
    if (!d) { console.error('Unknown player or no stats file:', who); process.exit(1); }
    breakdown(d);
} else {
    const players = listPlayers();
    if (!players.length) { console.error('No stat files found.'); process.exit(1); }
    for (const p of players) breakdown(readStats(p.uuid));
}
