// Minimal RCON client (Source RCON protocol, as spoken by vanilla Minecraft).
// The password is read from the live server's server.properties at call time —
// it sits next to WORLD_PATH, outside this repo, and must never be copied in.
const fs = require('fs');
const net = require('net');
const path = require('path');

function serverDir() {
    if (!process.env.WORLD_PATH) throw new Error('WORLD_PATH is not set in .env');
    return path.dirname(path.resolve(process.env.WORLD_PATH));
}

function readProps() {
    const file = path.join(serverDir(), 'server.properties');
    const props = {};
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) props[m[1].trim()] = m[2].trim();
    }
    return props;
}

function packet(id, type, body) {
    const b = Buffer.from(body, 'utf8');
    const p = Buffer.alloc(14 + b.length);
    p.writeInt32LE(10 + b.length, 0);
    p.writeInt32LE(id, 4);
    p.writeInt32LE(type, 8);
    b.copy(p, 12);
    return p;
}

// Run commands in order over one connection; resolves to their responses.
function run(commands, { timeoutMs = 5000 } = {}) {
    const props = readProps();
    if (props['enable-rcon'] !== 'true') return Promise.reject(new Error('RCON is disabled in server.properties'));
    const port = Number(props['rcon.port'] || 25575);
    return new Promise((resolve, reject) => {
        const replies = [];
        let buf = Buffer.alloc(0);
        let next = 0;
        const sock = net.connect(port, '127.0.0.1');
        sock.setTimeout(timeoutMs, () => { sock.destroy(); reject(new Error('RCON timed out')); });
        sock.on('connect', () => sock.write(packet(1, 3, props['rcon.password'] || '')));
        sock.on('data', (d) => {
            buf = Buffer.concat([buf, d]);
            while (buf.length >= 4 && buf.length >= 4 + buf.readInt32LE(0)) {
                const len = buf.readInt32LE(0);
                const id = buf.readInt32LE(4);
                const body = buf.subarray(12, 4 + len - 2).toString('utf8');
                buf = buf.subarray(4 + len);
                if (id === -1) { sock.destroy(); return reject(new Error('RCON authentication failed')); }
                if (id !== 1) replies.push(body);
                if (next < commands.length) sock.write(packet(100 + next, 2, commands[next++]));
                else sock.end();
            }
        });
        sock.on('close', () => resolve(replies));
        sock.on('error', reject);
    });
}

module.exports = { run, readProps };
