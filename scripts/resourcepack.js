#!/usr/bin/env node
// Build the Madagascar resource pack: (1) generate 16x16 placeholder item textures
// (only if missing — won't clobber hand-drawn art), (2) zip resourcepack/ into a
// store-mode .zip with forward-slash paths (Minecraft rejects packs zipped with
// backslash separators, which is what PowerShell Compress-Archive can emit), and
// (3) compute the SHA-1 the server needs for `resource-pack-sha1`.
//
//   node scripts/resourcepack.js          # build (keeps existing textures)
//   node scripts/resourcepack.js --force  # regenerate placeholder textures too
//
// Zero npm deps: only Node built-ins (zlib for PNG/deflate, crypto for sha1).

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'resourcepack');
const TEX_DIR = path.join(SRC, 'assets', 'jakarta', 'textures', 'item');
const DIST = path.join(ROOT, 'dist');
const ZIP_PATH = path.join(DIST, 'jakarta_rp.zip');
const SHA_PATH = path.join(DIST, 'jakarta_rp.sha1.txt');

const FORCE = process.argv.includes('--force');

// ---- CRC-32 (shared by PNG chunks and ZIP entries) ----
const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();
function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

// ---- minimal PNG encoder (8-bit RGBA) ----
function pngChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(w, h, rgba) {
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 6;  // color type RGBA
    const stride = w * 4;
    const raw = Buffer.alloc((stride + 1) * h);
    for (let y = 0; y < h; y++) {
        raw[y * (stride + 1)] = 0; // filter: none
        rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
    }
    const idat = zlib.deflateSync(raw, { level: 9 });
    return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

// ---- tiny 16x16 canvas helper ----
function canvas() {
    const N = 16;
    const buf = Buffer.alloc(N * N * 4); // transparent
    const set = (x, y, r, g, b, a = 255) => {
        if (x < 0 || y < 0 || x >= N || y >= N) return;
        const i = (y * N + x) * 4;
        buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
    };
    return { N, buf, set };
}

// Placeholder textures — recognizable-ish, clearly stand-ins for real art.
// (Golden Chorus Fruit ships real art at textures/item/golden_chorus_fruit.png,
// so it has no placeholder here.)
function texTradeReroller() {
    // Wooden wand: brown diagonal handle (bottom-left -> top-right) with a faceted
    // emerald gem mounted on the tip.
    const c = canvas();
    // handle (stop short of the tip so the gem sits on the end)
    for (let t = 2; t <= 10; t++) {
        const x = t, y = 15 - t;
        c.set(x, y, 0x8a, 0x5a, 0x2b);          // wood body
        c.set(x + 1, y, 0x9a, 0x66, 0x34);      // lit edge
        c.set(x, y + 1, 0x5e, 0x3c, 0x1c);      // shadow underside
    }
    // emerald gem (7x7 faceted diamond), light upper-left -> dark lower-right
    const EM = {
        o: [0x0d, 0x5c, 0x34], // dark edge / outline
        d: [0x1c, 0x8f, 0x50], // shadowed facet
        m: [0x34, 0xc4, 0x6a], // mid body
        l: [0x6e, 0xf0, 0xa0], // lit facet
        h: [0xc8, 0xff, 0xe0], // specular highlight
    };
    const rows = [
        '   o   ',
        '  olo  ',
        ' ohlmo ',
        'ollmddo',
        ' omddo ',
        '  odo  ',
        '   o   ',
    ];
    const gx = 9, gy = 0;
    for (let ry = 0; ry < rows.length; ry++) {
        for (let rx = 0; rx < rows[ry].length; rx++) {
            const ch = rows[ry][rx];
            if (ch === ' ') continue;
            const [r, g, b] = EM[ch];
            c.set(gx + rx, gy + ry, r, g, b);
        }
    }
    return encodePNG(16, 16, c.buf);
}
function texFireCharge() {
    // Fiery throwable: red outer ring -> orange -> yellow core.
    const c = canvas();
    const cx = 8, cy = 8, R = 7;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x - cx + 0.5, y - cy + 0.5);
        if (d > R) continue;
        if (d > R - 1.5) c.set(x, y, 0xb3, 0x1a, 0x10);      // dark red rim
        else if (d > 3.5) c.set(x, y, 0xee, 0x55, 0x1f);     // red-orange
        else if (d > 1.8) c.set(x, y, 0xff, 0x99, 0x22);     // orange
        else c.set(x, y, 0xff, 0xe0, 0x66);                  // hot yellow core
    }
    return encodePNG(16, 16, c.buf);
}

function texHeavyStick() {
    // Thick wooden club, diagonal, with a heavy-core orb mounted on the top end
    // (dark teal shell + pale glowing core, echoing the vanilla heavy_core item).
    const c = canvas();
    // thick 3-wide handle, bottom-left -> top-right
    for (let t = 1; t <= 9; t++) {
        const x = t, y = 14 - t;
        c.set(x, y, 0x6b, 0x47, 0x22);          // dark wood core
        c.set(x + 1, y, 0x8a, 0x5a, 0x2b);      // wood body
        c.set(x + 2, y, 0x9c, 0x68, 0x36);      // lit edge
        c.set(x, y + 1, 0x52, 0x36, 0x19);      // underside shadow
    }
    // heavy-core orb (7x7) at the tip
    const HC = {
        o: [0x16, 0x20, 0x20], // near-black rim
        d: [0x2e, 0x44, 0x44], // dark teal
        m: [0x4d, 0x6e, 0x6e], // teal body
        l: [0x86, 0xb0, 0xb0], // lit teal
        c: [0xe9, 0xf4, 0xf0], // pale glowing core
    };
    const rows = [
        '  ooo  ',
        ' olmdo ',
        'olmcmdo',
        'olccmdo',
        'ommmddo',
        ' omddo ',
        '  odo  ',
    ];
    const gx = 8, gy = 0;
    for (let ry = 0; ry < rows.length; ry++) {
        for (let rx = 0; rx < rows[ry].length; rx++) {
            const ch = rows[ry][rx];
            if (ch === ' ') continue;
            const [r, g, b] = HC[ch];
            c.set(gx + rx, gy + ry, r, g, b);
        }
    }
    return encodePNG(16, 16, c.buf);
}

const PLACEHOLDERS = {
    'trade_reroller.png': texTradeReroller,
    'fire_charge.png': texFireCharge,
    'heavy_stick.png': texHeavyStick,
};

function ensureTextures() {
    fs.mkdirSync(TEX_DIR, { recursive: true });
    for (const [name, make] of Object.entries(PLACEHOLDERS)) {
        const p = path.join(TEX_DIR, name);
        if (FORCE || !fs.existsSync(p)) {
            fs.writeFileSync(p, make());
            console.log(`  texture  ${fs.existsSync(p) ? 'wrote' : 'wrote'}  assets/jakarta/textures/item/${name}`);
        } else {
            console.log(`  texture  kept   assets/jakarta/textures/item/${name} (exists; --force to regen)`);
        }
    }
}

// ---- recursively collect pack files as {name, data} with forward-slash names ----
function collect(dir, base = SRC, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) collect(full, base, out);
        else out.push({ name: path.relative(base, full).split(path.sep).join('/'), data: fs.readFileSync(full) });
    }
    return out;
}

// ---- store-mode (no compression) ZIP writer; deterministic, forward-slash paths ----
function buildZip(files) {
    const DOS_DATE = 0x0021, DOS_TIME = 0x0000; // fixed 1980-01-01 for reproducible output
    const local = [], central = [];
    let offset = 0;
    for (const f of files) {
        const nameBuf = Buffer.from(f.name, 'utf8');
        const crc = crc32(f.data), size = f.data.length;
        const lh = Buffer.alloc(30);
        lh.writeUInt32LE(0x04034b50, 0);
        lh.writeUInt16LE(20, 4);
        lh.writeUInt16LE(0, 6);
        lh.writeUInt16LE(0, 8);   // method 0 = store
        lh.writeUInt16LE(DOS_TIME, 10);
        lh.writeUInt16LE(DOS_DATE, 12);
        lh.writeUInt32LE(crc, 14);
        lh.writeUInt32LE(size, 18);
        lh.writeUInt32LE(size, 22);
        lh.writeUInt16LE(nameBuf.length, 26);
        lh.writeUInt16LE(0, 28);
        local.push(lh, nameBuf, f.data);

        const ch = Buffer.alloc(46);
        ch.writeUInt32LE(0x02014b50, 0);
        ch.writeUInt16LE(20, 4);
        ch.writeUInt16LE(20, 6);
        ch.writeUInt16LE(0, 8);
        ch.writeUInt16LE(0, 10);
        ch.writeUInt16LE(DOS_TIME, 12);
        ch.writeUInt16LE(DOS_DATE, 14);
        ch.writeUInt32LE(crc, 16);
        ch.writeUInt32LE(size, 20);
        ch.writeUInt32LE(size, 24);
        ch.writeUInt16LE(nameBuf.length, 28);
        ch.writeUInt32LE(0, 30); // extra len (2) + comment len (2)
        ch.writeUInt16LE(0, 34);
        ch.writeUInt16LE(0, 36);
        ch.writeUInt32LE(0, 38);
        ch.writeUInt32LE(offset, 42);
        central.push(ch, nameBuf);
        offset += lh.length + nameBuf.length + f.data.length;
    }
    const localBuf = Buffer.concat(local);
    const centralBuf = Buffer.concat(central);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(files.length, 8);
    eocd.writeUInt16LE(files.length, 10);
    eocd.writeUInt32LE(centralBuf.length, 12);
    eocd.writeUInt32LE(localBuf.length, 16);
    return Buffer.concat([localBuf, centralBuf, eocd]);
}

function main() {
    if (!fs.existsSync(SRC)) { console.error(`No resourcepack/ at ${SRC}`); process.exit(1); }
    console.log('Building Madagascar resource pack...');
    ensureTextures();

    const files = collect(SRC).sort((a, b) => a.name.localeCompare(b.name));
    const zip = buildZip(files);
    fs.mkdirSync(DIST, { recursive: true });
    fs.writeFileSync(ZIP_PATH, zip);
    const sha1 = crypto.createHash('sha1').update(zip).digest('hex');
    fs.writeFileSync(SHA_PATH, sha1 + '\n');

    console.log(`\n  ${files.length} files -> ${path.relative(ROOT, ZIP_PATH)} (${zip.length} bytes)`);
    console.log(`  sha1: ${sha1}`);
    console.log('\nserver.properties:');
    console.log(`  resource-pack-sha1=${sha1}`);
    console.log('  resource-pack=http://<LAN-IP>:3000/jakarta_rp.zip');
}

main();
