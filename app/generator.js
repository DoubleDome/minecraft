const path = require('path');

const creator = require('./creator');
const toolSwapper = require('./swapper_tools');
const armorSwapper = require('./swapper_armor');
const shulkerSwapper = require('./swapper_shulker');

const book = require('./book');
const inventory = require('./inventory');
const ender = require('./ender');
const location = require('./location');
const hardcore = require('./hardcore');
const dynamite = require('./dynamite');
const Load = require('./load');
const Tick = require('./tick');

const config = require('../data/config.json');
const data = {
    tools: require('../data/tools.json'),
    armor: require('../data/armor.json'),
    items: require('../data/items.json'),
    shulkers: require('../data/shulkers.json'),
    directions: require('../data/directions.json'),
    locations: require('../data/locations.json'),
    objectives: require('../data/objectives.json'),
};

class Generator {
    constructor() {
        this.paths = {};
    }

    init(base) {
        creator.destroy(base);

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
        this.createHardcoreFunctions();
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
    createHardcoreFunctions() {
        this.validatePaths();
        const output = hardcore.create(data.objectives);
        creator.write(path.resolve(this.paths.hardcore, `start.mcfunction`), output.start);
        creator.write(path.resolve(this.paths.hardcore, `stop.mcfunction`), output.stop);
        creator.write(path.resolve(this.paths.hardcore, `pause.mcfunction`), output.pause);
        creator.write(path.resolve(this.paths.hardcore, `resume.mcfunction`), output.resume);
        creator.write(path.resolve(this.paths.hardcore, `toggle.mcfunction`), output.toggle);
        creator.write(path.resolve(this.paths.hardcore, `gamemode_lock.mcfunction`), output.gamemode_lock);
        creator.write(path.resolve(this.paths.hardcore, `player_head.mcfunction`), output.player_head);
        creator.write(path.resolve(this.paths.hardcore, `prepare_marker.mcfunction`), output.prepare_marker);
        creator.write(path.resolve(this.paths.hardcore, `place_marker.mcfunction`), output.place_marker);
        creator.write(path.resolve(this.paths.gate, `${config.folder.hardcore}_dimension.mcfunction`), output.dimension_gate);
        creator.write(path.resolve(this.paths.gate, `${config.folder.hardcore}_start.mcfunction`), output.start_gate);
        creator.write(path.resolve(this.paths.gate, `${config.folder.hardcore}_stop.mcfunction`), output.stop_gate);
        creator.write(path.resolve(this.paths.gate, `${config.folder.hardcore}_gamemode_check.mcfunction`), output.gamemode_check);
        creator.write(path.resolve(this.paths.gate, `${config.folder.hardcore}_death_check.mcfunction`), output.death_check);
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
    }
    createBookFunctions() {
        this.validatePaths();
        const output = book.create(data.locations);

        creator.write(path.resolve(this.paths.book, 'god.mcfunction'), output.god);
        creator.write(path.resolve(this.paths.book, 'magic.mcfunction'), output.magic);
        creator.write(path.resolve(this.paths.gate, 'book.mcfunction'), output.gate);
    }
    createInventoryFunctions() {
        this.validatePaths();
        const output = inventory.create(data.items);
        creator.write(path.resolve(this.paths.inventory, `import.mcfunction`), output.import);
        creator.write(path.resolve(this.paths.inventory, `export.mcfunction`), output.export);
        creator.write(path.resolve(this.paths.gate, `${config.folder.inventory}_import.mcfunction`), output.import_gate);
        creator.write(path.resolve(this.paths.gate, `${config.folder.inventory}_export.mcfunction`), output.export_gate);
    }
    createEnderFunctions() {
        this.validatePaths();
        const output = ender.create(data.directions, data.objectives.temp.status);
        creator.write(path.resolve(this.paths.ender, `place.mcfunction`), output.place);
        creator.write(path.resolve(this.paths.ender, `destroy.mcfunction`), output.destroy);
        creator.write(path.resolve(this.paths.ender, `toggle.mcfunction`), output.toggle);
        creator.write(path.resolve(this.paths.gate, `${config.folder.ender}_inventory.mcfunction`), output.inventory_gate);
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
