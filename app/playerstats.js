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

// Full catalog of minecraft:custom stats (minecraft.wiki/w/Statistics), grouped for
// display. Distance (_one_cm) stats are handled by the dedicated travel section, so
// they're excluded here. Any custom key not listed falls into "Other" so new/unknown
// stats are never dropped.
const TIME_STATS = new Set(['play_time', 'total_world_time', 'time_since_death', 'time_since_rest', 'sneak_time']);
const CUSTOM_GROUPS = [
    ['Time', ['play_time', 'total_world_time', 'time_since_death', 'time_since_rest', 'sneak_time']],
    ['Combat', ['mob_kills', 'player_kills', 'deaths', 'animals_bred', 'jump', 'fish_caught']],
    ['Damage', ['damage_dealt', 'damage_dealt_absorbed', 'damage_dealt_resisted', 'damage_taken', 'damage_absorbed', 'damage_blocked_by_shield', 'damage_resisted']],
    ['Villagers & Trading', ['talked_to_villager', 'traded_with_villager']],
    ['Containers', ['open_chest', 'open_barrel', 'open_shulker_box', 'open_enderchest', 'inspect_dispenser', 'inspect_dropper', 'inspect_hopper']],
    ['Stations', ['interact_with_crafting_table', 'interact_with_furnace', 'interact_with_blast_furnace', 'interact_with_smoker', 'interact_with_anvil', 'interact_with_grindstone', 'interact_with_brewingstand', 'interact_with_beacon', 'interact_with_cartography_table', 'interact_with_loom', 'interact_with_smithing_table', 'interact_with_stonecutter', 'interact_with_lectern', 'interact_with_campfire']],
    ['Usage & Toys', ['enchant_item', 'play_record', 'play_noteblock', 'tune_noteblock', 'target_hit', 'bell_ring', 'fill_cauldron', 'use_cauldron', 'pot_flower', 'eat_cake_slice']],
    ['Cleaning', ['clean_armor', 'clean_banner', 'clean_shulker_box']],
    ['Raids & Traps', ['raid_trigger', 'raid_win', 'trigger_trapped_chest']],
    ['Misc', ['leave_game', 'sleep_in_bed', 'drop']],
];

function fmtCustom(id, v) {
    if (id.endsWith('_one_cm')) return fmt.cmToKm(v);
    if (TIME_STATS.has(id)) return fmt.ticksToH(v);
    return fmt.num(v);
}

// Every custom stat the player has, bucketed into the groups above. Returns ordered
// [{ name, entries:[{id,label,value,display}] }]; empty groups dropped.
function customGroups(custom) {
    const used = new Set();
    const mk = (id) => ({ id, label: id.replace(/_/g, ' '), value: custom[id], display: fmtCustom(id, custom[id]) });
    const groups = CUSTOM_GROUPS.map(([name, ids]) => {
        const entries = ids.filter(id => id in custom).map(id => { used.add(id); return mk(id); });
        return { name, entries };
    }).filter(g => g.entries.length);
    const other = Object.keys(custom).filter(id => !used.has(id) && !id.endsWith('_one_cm')).sort();
    if (other.length) groups.push({ name: 'Other', entries: other.map(mk) });
    return groups;
}

// Side-by-side comparison across all players. Returns { players, rows } where each
// row is one metric with a per-player value and the uuid of the row leader (max).
function compareStats() {
    const data = listPlayers().map(p => readStats(p.uuid)).filter(Boolean);
    const sum = (arr) => arr.reduce((s, r) => s + r.value, 0);
    const metrics = [
        ['Playtime', d => d.custom.play_time || 0, fmt.ticksToH],
        ['Total distance', d => d.travelTotalCm, fmt.cmToKm],
        ['Deaths', d => d.custom.deaths || 0, fmt.num],
        ['Mob kills', d => d.custom.mob_kills || 0, fmt.num],
        ['Player kills', d => d.custom.player_kills || 0, fmt.num],
        ['Damage dealt', d => d.custom.damage_dealt || 0, fmt.num],
        ['Damage taken', d => d.custom.damage_taken || 0, fmt.num],
        ['Villager trades', d => d.custom.traded_with_villager || 0, fmt.num],
        ['Items enchanted', d => d.custom.enchant_item || 0, fmt.num],
        ['Animals bred', d => d.custom.animals_bred || 0, fmt.num],
        ['Fish caught', d => d.custom.fish_caught || 0, fmt.num],
        ['Raids won', d => d.custom.raid_win || 0, fmt.num],
        ['Nights slept', d => d.custom.sleep_in_bed || 0, fmt.num],
        ['Bells rung', d => d.custom.bell_ring || 0, fmt.num],
        ['Jumps', d => d.custom.jump || 0, fmt.num],
        ['Blocks mined', d => sum(d.mined), fmt.num],
        ['Items crafted', d => sum(d.crafted), fmt.num],
        ['Mob types killed', d => d.killed.length, fmt.num],
    ];
    const rows = metrics.map(([label, get, format]) => {
        const values = data.map(d => ({ uuid: d.uuid, name: d.name, raw: get(d), display: format(get(d)) }));
        const max = Math.max(...values.map(v => v.raw));
        return { label, leader: max > 0 ? values.find(v => v.raw === max).uuid : null, values };
    });
    return { players: data.map(d => ({ uuid: d.uuid, name: d.name })), rows };
}

module.exports = { listPlayers, readStats, compareStats, customGroups, resolveUuid, nameOf, fmt, clean };
