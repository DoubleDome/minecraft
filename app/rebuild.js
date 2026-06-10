// Single source of truth for "rebuild the whole pack with safeguards".
// Both entry points call this so the CLI (`node index.js <target>`) and the web
// endpoint (POST /rebuild) behave identically. Safeguards (see .claude/rules/rebuild.md):
//   1. Refuse to run with BASE_PATH/PACK_FOLDER unset — init() wipes its output dir,
//      and an unset var once resolved to the project root and wiped it.
//   2. On the LIVE target, snapshot the world pack to .temp/madagascar_pack.live.bak
//      before init()'s destroy wipes it. creator.destroy has no sentinel inside the
//      live folder, so this backup is the only undo.
//   3. creator.destroy's source-dir sentinel still runs inside init() either way.
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');

const generator = require('./generator');
const resource = require('./resource');

// Keep only the latest pre-rebuild snapshot of the live pack.
const LIVE_PACK_BACKUP = path.resolve(__dirname, '../.temp/madagascar_pack.live.bak');

function readJson(p) {
    // Strip UTF-8 BOM (PowerShell's Set-Content -Encoding UTF8 writes one; JSON.parse rejects it).
    return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''));
}

// Rebuild into whatever BASE_PATH/PACK_FOLDER currently resolve to. The caller is
// responsible for loading the right .env layer for `target` before calling this.
function rebuild(target) {
    const basePath = process.env.BASE_PATH;
    const packFolder = process.env.PACK_FOLDER;
    if (!basePath || !packFolder) {
        const missing = !basePath && !packFolder ? 'BASE_PATH and PACK_FOLDER' : (!basePath ? 'BASE_PATH' : 'PACK_FOLDER');
        throw new Error(`${missing} unset (target=${target}) — refusing to rebuild: init() wipes its output dir and would destroy an unintended directory.`);
    }
    const outputDir = path.resolve(basePath, packFolder);

    let backup = null;
    if (target === 'live' && fse.existsSync(outputDir)) {
        fse.removeSync(LIVE_PACK_BACKUP);          // keep only the latest snapshot
        fse.copySync(outputDir, LIVE_PACK_BACKUP); // before init() destroys the live pack
        backup = LIVE_PACK_BACKUP;
    }

    generator.init(outputDir);
    generator.create();
    const resourceResult = resource.create(readJson(path.resolve(__dirname, '../data/resources.json')));
    return { target, outputDir, resourceResult, backup };
}

module.exports = { rebuild, LIVE_PACK_BACKUP };
