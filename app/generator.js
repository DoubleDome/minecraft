const fs = require('fs');
const path = require('path');

const creator = require('./creator');
const toolSwapper = require('./swapper_tools');
const armorSwapper = require('./swapper_armor');
const shulkerSwapper = require('./swapper_shulker');

const book = require('./book');
const inventory = require('./inventory');
const enderchest = require('./enderchest');
const location = require('./location');

const config = require('../data/config.json');
const data = {
    tools: require('../data/tools.json'),
    armor: require('../data/armor.json'),
    items: require('../data/items.json'),
    shulkers: require('../data/shulkers.json'),
    directions: require('../data/directions.json'),
    locations: require('../data/locations.json')
};

class Generator {
    create(destination) {
        this.createBookFunctions(destination);
        this.createToolFunctions(destination);
        this.createShulkerFunctions(destination);
        this.createLocationFunctions(destination);
        this.createInventoryFunctions(destination);
        this.createEnderFunctions(destination);
    }

    createLocationFunctions(destination) {
        this.validateDestinations(destination);
        data.locations.forEach((group) => {
            group.locations.forEach((item) => {
                creator.write(path.resolve(destination, `${config.filename.location}${item.filename}.mcfunction`), location.create(item.label, item.dimension, item.coordinates, item.filename));
            });
        });
    }

    createToolFunctions(destination) {
        this.validateDestinations(destination, path.resolve(destination, config.filename.gate));
        data.tools.forEach((item) => {
            creator.write(path.resolve(destination, `${config.filename.swap}${item.filename}.mcfunction`), toolSwapper.create('item', item));
            creator.write(path.resolve(destination, config.filename.gate, `${config.filename.swap}${item.filename}.mcfunction`), toolSwapper.create('item_gate', item));
        });
    }
    createArmorFunctions(destination) {
        this.validateDestinations(destination, path.resolve(destination, config.filename.gate));
        data.armor.forEach((item) => {
            creator.write(path.resolve(destination, `${config.filename.swap}${item.filename}.mcfunction`), armorSwapper.create('item', item));
            creator.write(path.resolve(destination, config.filename.gate, `${config.filename.swap}${item.filename}.mcfunction`), armorSwapper.create('item_gate', item));
        });
    }
    createShulkerFunctions(destination) {
        shulkerSwapper.init();
        this.validateDestinations(destination, path.resolve(destination, config.filename.gate));
        data.shulkers.forEach((item) => {
            creator.write(path.resolve(destination, `${config.filename.shulker}export_${item.name}.mcfunction`), shulkerSwapper.create('swapper', item.name, item.label, item.color, item.slot));
            shulkerSwapper.create('append_gate', item.name, item.label, item.color);
        });
        creator.write(path.resolve(destination, config.filename.gate, `${config.filename.shulker}export.mcfunction`), shulkerSwapper.create('gate'));
    }
    createBookFunctions(destination) {
        this.validateDestinations(destination);
        creator.write(path.resolve(destination, 'book_god.mcfunction'), book.create('god', data.locations));
        creator.write(path.resolve(destination, 'book_default.mcfunction'), book.create('default', data.locations));
    }
    createInventoryFunctions(destination) {
        this.validateDestinations(destination, path.resolve(destination, config.filename.gate));
        creator.write(path.resolve(destination, `${config.filename.inventory}import.mcfunction`), inventory.create('import'));
        creator.write(path.resolve(destination, config.filename.gate, `${config.filename.inventory}import.mcfunction`), inventory.create('import_gate'));
        creator.write(path.resolve(destination, `${config.filename.inventory}export.mcfunction`), inventory.create('export', data.items));
        creator.write(path.resolve(destination, config.filename.gate, `${config.filename.inventory}export.mcfunction`), inventory.create('export_gate'));
    }
    createEnderFunctions(destination) {
        this.validateDestinations(destination, path.resolve(destination, config.filename.gate));
        creator.write(path.resolve(destination, `${config.filename.ender}place.mcfunction`), enderchest.create('place', data.directions));
        creator.write(path.resolve(destination, `${config.filename.ender}destroy.mcfunction`), enderchest.create('destroy'));
        creator.write(path.resolve(destination, config.filename.gate, `${config.filename.ender}inventory.mcfunction`), enderchest.create('inventory_gate'));
        creator.write(path.resolve(destination, config.filename.gate, `${config.filename.ender}existence.mcfunction`), enderchest.create('existence_gate'));
        // creator.write(path.resolve(destination, `${config.filename.ender}toggle.mcfunction`), enderchest.create('toggle'));
    }
    /* Validate file destinations and create the folders if not there 
    ----------------------------------------------------------------- */
    validateDestination(destination) {
        if (!fs.existsSync(destination)) {
            fs.mkdirSync(destination);
        }
    }
    validateDestinations(...destinations) {
        destinations.forEach(destination => {
            this.validateDestination(destination);
        });
    }
}

module.exports = new Generator();
