const path = require('path');
const fs = require('fs');

const creator = require('./creator');
const toolSwapper = require('./swapper_tools');
const armorSwapper = require('./swapper_armor');
const shulkerSwapper = require('./swapper_shulker');

const book = require('./book');
const exploration = require('./exploration');
const inventory = require('./inventory');
const ender = require('./ender');
const location = require('./location');
const softcore = require('./softcore');
const dynamite = require('./dynamite');
const Load = require('./load');
const Tick = require('./tick');

const config = require('../data/config.json');

// Re-read JSON each generator init so web-driven edits are picked up without
// restarting the server. Use fs (not require) so the data files stay OUT of the
// module graph — otherwise `node --watch` watches them and a web edit to
// locations.json/exploration.json restarts the server mid-rebuild. Strips BOM.
function freshRead(rel) {
    const p = path.resolve(__dirname, '../data', rel);
    return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''));
}
function reloadData() {
    return {
        tools: freshRead('tools.json'),
        armor: freshRead('armor.json'),
        items: freshRead('items.json'),
        equipment: freshRead('equipment.json'),
        shulkers: freshRead('shulkers.json'),
        directions: freshRead('directions.json'),
        locations: freshRead('locations.json'),
        exploration: freshRead('exploration.json'),
        objectives: freshRead('objectives.json'),
    };
}
let data = reloadData();

class Generator {
    constructor() {
        this.paths = {};
    }

    // Full (destructive) init: wipe the output, then set up paths. Used by create()
    // and the CLI / Rebuild button when the whole pack is regenerated.
    init(base) {
        creator.destroy(base);
        this.setup(base);
    }

    // Non-destructive setup: refresh data from disk and ensure the output dirs
    // exist, WITHOUT wiping anything. This is what targeted in-place updates use
    // (e.g. adding one location) so a small content change doesn't rebuild the world.
    setup(base) {
        // Refresh data from disk so /add edits show up without restarting server.js.
        data = reloadData();

        this.paths.base = creator.validate(path.resolve(base));
        this.paths.data = creator.validate(path.resolve(this.paths.base, config.path.data));
        this.paths.minecraft = creator.validate(path.resolve(this.paths.data, config.path.minecraft));
        this.paths.madagascar = creator.validate(path.resolve(this.paths.data, config.path.madagascar));
        this.paths.functions = creator.validate(path.resolve(this.paths.madagascar, config.path.functions));
        this.paths.pack = path.resolve(__dirname, '../', config.path.pack);
        Object.keys(config.folder).forEach(key => {
            this.paths[key] = creator.validate(path.resolve(this.paths.functions, config.folder[key]));
        });
    }

    create() {
        this.validatePaths();
        creator.clone(this.paths.pack, this.paths.base);

        this.createFoundation();

        this.createBookFunctions();
        this.createToolFunctions();
        this.createShulkerFunctions();
        this.createLocationFunctions();
        this.createInventoryFunctions();
        this.createEnderFunctions();
        this.createSoftcoreFunctions();
        // this.createDynamiteGame();
        this.createLoader();
        this.createTicker();
    }

    createDynamiteGame() {
        this.validatePaths();
        this.writeFiles(this.paths.dynamite, dynamite.create());
    }

    writeFiles(destination, output) {
        Object.entries(output).forEach(([key, value]) => {
            creator.write(path.resolve(destination, `${key}.mcfunction`), value);
        });
    }

    createFoundation() {
        Load.getInstance().append(`team add ${config.team.god.name} "${config.team.god.label}"`);
        Load.getInstance().append(`team join ${config.team.god.name} DoubleDome`);
        Load.getInstance().addObjectives(data.objectives.constants);
        Load.getInstance().addObjectives(data.objectives.temp);
        Load.getInstance().setObjectives(config.player.constants, data.objectives.constants);
        Load.getInstance().setObjectives(config.player.constants, data.objectives.time);
    }

    createLoader() {
        this.validatePaths();
        creator.write(path.resolve(this.paths.functions, 'load.mcfunction'), Load.getInstance().export());
    }
    createTicker() {
        this.validatePaths();
        creator.write(path.resolve(this.paths.functions, 'tick.mcfunction'), Tick.getInstance().export());
    }
    createSoftcoreFunctions() {
        this.validatePaths();
        const output = softcore.create(data.objectives);
        creator.write(path.resolve(this.paths.softcore, `start.mcfunction`), output.start);
        creator.write(path.resolve(this.paths.softcore, `stop.mcfunction`), output.stop);
        creator.write(path.resolve(this.paths.softcore, `clear.mcfunction`), output.clear);
        creator.write(path.resolve(this.paths.softcore, `pause.mcfunction`), output.pause);
        creator.write(path.resolve(this.paths.softcore, `resume.mcfunction`), output.resume);
        creator.write(path.resolve(this.paths.softcore, `toggle.mcfunction`), output.toggle);
        creator.write(path.resolve(this.paths.softcore, `gamemode_lock.mcfunction`), output.gamemode_lock);
        creator.write(path.resolve(this.paths.softcore, `player_head.mcfunction`), output.player_head);
        creator.write(path.resolve(this.paths.softcore, `prepare_marker.mcfunction`), output.prepare_marker);
        creator.write(path.resolve(this.paths.softcore, `place_marker.mcfunction`), output.place_marker);
        creator.write(path.resolve(this.paths.gate, `${config.folder.softcore}_dimension.mcfunction`), output.dimension_gate);
        creator.write(path.resolve(this.paths.gate, `${config.folder.softcore}_start.mcfunction`), output.start_gate);
        creator.write(path.resolve(this.paths.gate, `${config.folder.softcore}_stop.mcfunction`), output.stop_gate);
        creator.write(path.resolve(this.paths.gate, `${config.folder.softcore}_gamemode_check.mcfunction`), output.gamemode_check);
        creator.write(path.resolve(this.paths.gate, `${config.folder.softcore}_death_check.mcfunction`), output.death_check);
    }

    createLocationFunctions() {
        this.validatePaths();
        this.writeFiles(this.paths.location, location.create(data.locations));
    }

    createToolFunctions() {
        this.validatePaths();
        const output = toolSwapper.create(data.tools);
        Object.entries(output.tools).forEach(([key, value]) => {
            creator.write(path.resolve(this.paths.tool_swap, `${key}.mcfunction`), value);
        });
        Object.entries(output.gates).forEach(([key, value]) => {
            creator.write(path.resolve(this.paths.gate, `${config.folder.tool_swap}_${key}.mcfunction`), value);
        });
    }
    createArmorFunctions() {
        // this.validatePaths();
        // data.armor.forEach((item) => {
        //     creator.write(path.resolve(this.paths.functions, `${config.filename.swap}${item.filename}.mcfunction`), armorSwapper.create('item', item));
        //     creator.write(path.resolve(this.paths.gate, `${config.filename.swap}${item.filename}.mcfunction`), armorSwapper.create('item_gate', item));
        // });
    }
    createShulkerFunctions() {
        this.validatePaths();
        const output = shulkerSwapper.create(data.shulkers);
        Object.entries(output.shulkers).forEach(([key, value]) => {
            creator.write(path.resolve(this.paths.shulker, `${key}.mcfunction`), value);
        });
        creator.write(path.resolve(this.paths.gate, `${config.folder.shulker}_export.mcfunction`), output.gate);
        creator.write(path.resolve(this.paths.shulker, `list.mcfunction`), output.list);
    }
    createBookFunctions() {
        this.validatePaths();
        const output = book.create(data.locations);

        creator.write(path.resolve(this.paths.book, 'god.mcfunction'), output.god);
        creator.write(path.resolve(this.paths.book, 'magic.mcfunction'), output.magic);
        creator.write(path.resolve(this.paths.gate, 'book.mcfunction'), output.gate);

        creator.write(path.resolve(this.paths.book, 'exploration.mcfunction'), exploration.create(data.exploration));
    }
    createInventoryFunctions() {
        this.validatePaths();
        const output = inventory.create(data.items, data.equipment, data.directions);
        creator.write(path.resolve(this.paths.inventory, `import.mcfunction`), output.import);
        creator.write(path.resolve(this.paths.inventory, `export.mcfunction`), output.export);
        creator.write(path.resolve(this.paths.inventory, `stash.mcfunction`), output.stash);
        creator.write(path.resolve(this.paths.gate, `${config.folder.inventory}_import.mcfunction`), output.import_gate);
        creator.write(path.resolve(this.paths.gate, `${config.folder.inventory}_export.mcfunction`), output.export_gate);
        creator.write(path.resolve(this.paths.gate, `${config.folder.inventory}_stash.mcfunction`), output.stash_gate);
    }
    createEnderFunctions() {
        this.validatePaths();
        const output = ender.create(data.directions, data.objectives.temp.status);
        creator.write(path.resolve(this.paths.ender, `place.mcfunction`), output.place);
        creator.write(path.resolve(this.paths.ender, `destroy.mcfunction`), output.destroy);
        creator.write(path.resolve(this.paths.ender, `toggle.mcfunction`), output.toggle);
        creator.write(path.resolve(this.paths.gate, `${config.folder.ender}_existence.mcfunction`), output.existence_gate);
    }
    /* Validate file destinations and create the folders if not there 
    ----------------------------------------------------------------- */
    validatePaths() {
        if (!this.paths.functions || !this.paths.gate || !this.paths.location) {
            throw new Error('Generator not initialized!');
        }
    }

    get config() {
        return config;
    }
}

module.exports = new Generator();
