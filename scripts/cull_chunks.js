#!/usr/bin/env node
// Cull chunks outside a radius around a center point, across a dimension's
// region/entities/poi folders. "Deleting" a chunk = zeroing its 4-byte entry in
// the region-file location table (and timestamp); the game regenerates absent
// chunks on next load. Region files entirely outside the radius are deleted
// whole. SERVER MUST BE STOPPED. Pass --apply to actually write; default dry-run.
//
//   node scripts/cull_chunks.js --dir <dimPath> --x 111 --z 223 --radius 600 [--apply]
//
// A region r.X.Z.mca holds chunks cx in [X*32, X*32+31], cz in [Z*32, Z*32+31].
// Location-table index for a chunk = (cx & 31) + (cz & 31) * 32, 4 bytes each.

const fs = require('fs');
const path = require('path');

function arg(name, def) {
    const i = process.argv.indexOf(`--${name}`);
    return i !== -1 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}
const DIR = arg('dir');
const CX = Number(arg('x'));
const CZ = Number(arg('z'));
const R = Number(arg('radius'));
const APPLY = process.argv.includes('--apply');

if (!DIR || !Number.isFinite(CX) || !Number.isFinite(CZ) || !Number.isFinite(R)) {
    console.error('usage: --dir <path> --x <int> --z <int> --radius <blocks> [--apply]');
    process.exit(1);
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// keep iff the nearest point of [bxmin..bxmax]x[bzmin..bzmax] is within R of (CX,CZ)
function within(bxmin, bxmax, bzmin, bzmax) {
    const dx = CX - clamp(CX, bxmin, bxmax);
    const dz = CZ - clamp(CZ, bzmin, bzmax);
    return dx * dx + dz * dz <= R * R;
}

const SUBS = ['region', 'entities', 'poi'];
const totals = { keptFiles: 0, deletedFiles: 0, trimmedFiles: 0, keptChunks: 0, deletedChunks: 0 };

for (const sub of SUBS) {
    const folder = path.join(DIR, sub);
    if (!fs.existsSync(folder)) { console.log(`${sub}: (absent)`); continue; }
    const files = fs.readdirSync(folder).filter(f => /^r\.-?\d+\.-?\d+\.mca$/.test(f));
    let delF = 0, trimF = 0, keepF = 0, delC = 0, keepC = 0;

    for (const file of files) {
        const m = file.match(/^r\.(-?\d+)\.(-?\d+)\.mca$/);
        const RX = Number(m[1]), RZ = Number(m[2]);
        const full = path.join(folder, file);

        // whole-region test (512-block span)
        const rxmin = RX * 512, rzmin = RZ * 512;
        if (!within(rxmin, rxmin + 511, rzmin, rzmin + 511)) {
            delF++;
            if (APPLY) fs.unlinkSync(full);
            continue;
        }

        // region straddles the boundary: read 8 KB header, trim per chunk
        const fd = fs.openSync(full, APPLY ? 'r+' : 'r');
        const header = Buffer.alloc(8192);
        fs.readSync(fd, header, 0, 8192, 0);
        let present = 0, changed = false;
        for (let i = 0; i < 1024; i++) {
            const o = i * 4;
            const off = (header[o] << 16) | (header[o + 1] << 8) | header[o + 2];
            if (off === 0) continue; // chunk absent already
            const lx = i % 32, lz = Math.floor(i / 32);
            const cx = RX * 32 + lx, cz = RZ * 32 + lz;
            const bx = cx * 16, bz = cz * 16;
            if (within(bx, bx + 15, bz, bz + 15)) {
                present++; keepC++;
            } else {
                // zero location + timestamp entry -> chunk treated as absent
                header.writeUInt32BE(0, o);
                header.writeUInt32BE(0, 4096 + o);
                changed = true; delC++;
            }
        }
        if (present === 0) {
            delF++;
            fs.closeSync(fd);
            if (APPLY) fs.unlinkSync(full);
        } else {
            if (changed) { trimF++; if (APPLY) fs.writeSync(fd, header, 0, 8192, 0); }
            else keepF++;
            fs.closeSync(fd);
        }
    }
    console.log(`${sub}: ${files.length} files -> delete ${delF}, trim ${trimF}, keep-intact ${keepF} | chunks keep ${keepC}, drop ${delC}`);
    totals.deletedFiles += delF; totals.trimmedFiles += trimF; totals.keptFiles += keepF;
    totals.keptChunks += keepC; totals.deletedChunks += delC;
}

console.log('----');
console.log(`center (${CX}, ${CZ}) radius ${R} | ${APPLY ? 'APPLIED' : 'DRY-RUN (no changes written)'}`);
console.log(`files: delete ${totals.deletedFiles}, trim ${totals.trimmedFiles}, keep ${totals.keptFiles}`);
console.log(`chunks kept ${totals.keptChunks}, dropped ${totals.deletedChunks}`);
