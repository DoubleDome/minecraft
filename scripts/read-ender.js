// One-off: read a player's EnderItems, recurse into shulker boxes, print written_book contents.
// Usage: node read-ender.js <uuid> [name-filter]
const fs = require('fs');
const path = require('path');
const nbt = require('prismarine-nbt');

const uuid = process.argv[2];
const nameFilter = (process.argv[3] || '').toLowerCase();
if (!uuid) {
    console.error('Usage: node read-ender.js <uuid> [name-filter]');
    process.exit(1);
}

const datPath = path.resolve('D:\\jakarta-vanilla-26.1.2\\world\\players\\data', `${uuid}.dat`);
console.log(`Reading: ${datPath}`);
if (nameFilter) console.log(`Name filter (contains, case-insensitive): "${nameFilter}"`);
console.log();

function itemName(item) {
    const comps = item.components || {};
    const custom = comps['minecraft:custom_name'];
    const itemName = comps['minecraft:item_name'];
    return custom || itemName || null;
}

function printBook(item, path) {
    const comps = item.components || {};
    const wbc = comps['minecraft:written_book_content'];
    console.log(`\n=== WRITTEN BOOK @ ${path} ===`);
    if (!wbc) {
        console.log('  (no minecraft:written_book_content component)');
        console.log('  full item:', JSON.stringify(item, null, 2));
        return;
    }
    const title = wbc.title?.raw ?? wbc.title;
    console.log(`  title:  ${JSON.stringify(title)}`);
    console.log(`  author: ${wbc.author}`);
    console.log(`  generation: ${wbc.generation}`);
    const pages = wbc.pages || [];
    console.log(`  pages:  ${pages.length}`);
    pages.forEach((p, pi) => {
        const raw = p?.raw ?? (typeof p === 'string' ? p : JSON.stringify(p));
        console.log(`  --- page ${pi + 1} ---`);
        console.log(`  ${raw}`);
    });
}

function walk(item, pathStr) {
    const comps = item.components || {};
    const container = comps['minecraft:container']; // array of {slot, item}
    const name = itemName(item);
    const label = name ? `${item.id} "${name}"` : item.id;
    const here = pathStr ? `${pathStr} > ${label}` : label;

    if (item.id?.includes('written_book') || comps['minecraft:written_book_content']) {
        if (!nameFilter || here.toLowerCase().includes(nameFilter)) printBook(item, here);
    }
    if (Array.isArray(container)) {
        for (const entry of container) {
            walk(entry.item, here);
        }
    }
}

(async () => {
    const buf = fs.readFileSync(datPath);
    const { parsed } = await nbt.parse(buf);
    const simple = nbt.simplify(parsed);

    const ender = simple.EnderItems || [];
    console.log(`EnderItems count: ${ender.length}\n`);

    ender.forEach((item) => {
        const slot = item.Slot;
        const name = itemName(item);
        const tag = name ? ` "${name}"` : '';
        console.log(`slot ${slot}: ${item.count ?? item.Count}x ${item.id}${tag}`);
        walk(item, `slot ${slot} (${item.id}${tag})`);
    });
})().catch(e => { console.error(e); process.exit(1); });
