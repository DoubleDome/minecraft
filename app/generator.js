const path = require('path');

const creator = require('./creator');
const toolSwapper = require('./swapper_tools');
const armorSwapper = require('./swapper_armor');
const book = require('./book');
const inventory = require('./inventory');
const enderchest = require('./enderchest');
const location = require('./location');

const config = require('../data/config.json');
const tools = require('../data/tools.json');
const armor = require('../data/armor.json');
const items = require('../data/items.json');
const directions = require('../data/directions.json');
const locations = require('../data/locations.json');

class Generator {
    create(destination) {
        this.createBookFunctions(destination);
        this.createToolFunctions(destination);
        this.createLocationFunctions(destination);
        this.createInventoryFunctions(destination);
        this.createEnderFunctions(destination);
    }

    createLocationFunctions(destination) {
        locations.forEach((group) => {
            group.locations.forEach((item) => {
                creator.write(path.resolve(destination, `${config.filename.location}${item.filename}.mcfunction`), location.create(item.label, item.dimension, item.coordinates, item.filename));
            });
        });
    }

    createToolFunctions(destination) {
        tools.forEach((item) => {
            creator.write(path.resolve(destination, `${config.filename.swap}${item.filename}.mcfunction`), toolSwapper.create('item', item));
            creator.write(path.resolve(destination, `${config.filename.swap}${item.filename}${config.filename.gate}.mcfunction`), toolSwapper.create('item_gate', item));
        });
    }
    createArmorFunctions(destination) {
        armor.forEach((item) => {
            creator.write(path.resolve(destination, `${config.filename.swap}${item.filename}.mcfunction`), armorSwapper.create('item', item));
            creator.write(path.resolve(destination, `${config.filename.swap}${item.filename}${config.filename.gate}.mcfunction`), armorSwapper.create('item_gate', item));
        });
    }
    createBookFunctions(destination) {
        creator.write(path.resolve(destination, 'book_god.mcfunction'), book.create('god', locations));
        creator.write(path.resolve(destination, 'book_default.mcfunction'), book.create('default', locations));
    }
    createInventoryFunctions(destination) {
        creator.write(path.resolve(destination, `${config.filename.inventory}import.mcfunction`), inventory.create('import'));
        creator.write(path.resolve(destination, `${config.filename.inventory}import${config.filename.gate}.mcfunction`), inventory.create('import_gate'));
        creator.write(path.resolve(destination, `${config.filename.inventory}export.mcfunction`), inventory.create('export', items));
        creator.write(path.resolve(destination, `${config.filename.inventory}export${config.filename.gate}.mcfunction`), inventory.create('export_gate'));
    }
    createEnderFunctions(destination) {
        creator.write(path.resolve(destination, `${config.filename.inventory}place.mcfunction`), enderchest.create('place', directions));
        creator.write(path.resolve(destination, `${config.filename.inventory}destroy.mcfunction`), enderchest.create('destroy', directions));
        creator.write(path.resolve(destination, `${config.filename.inventory}inventory${config.filename.gate}.mcfunction`), enderchest.create('inventory_gate', directions));
        creator.write(path.resolve(destination, `${config.filename.inventory}existence${config.filename.gate}.mcfunction`), enderchest.create('existence_gate', directions));
        creator.write(path.resolve(destination, `${config.filename.inventory}toggle.mcfunction`), enderchest.create('toggle', directions));
    }
}

module.exports = new Generator();
