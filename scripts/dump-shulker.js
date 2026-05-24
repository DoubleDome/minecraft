// Dump raw contents of one ender chest slot for inspection.
const fs = require('fs');
const path = require('path');
const nbt = require('prismarine-nbt');

const uuid = process.argv[2];
const slot = parseInt(process.argv[3], 10);
const datPath = path.resolve('D:\\jakarta-vanilla-26.1.2\\world\\players\\data', `${uuid}.dat`);

(async () => {
    const buf = fs.readFileSync(datPath);
    const { parsed } = await nbt.parse(buf);
    const simple = nbt.simplify(parsed);
    const item = (simple.EnderItems || []).find(i => i.Slot === slot);
    if (!item) { console.log(`no item at slot ${slot}`); return; }
    console.log(JSON.stringify(item, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
