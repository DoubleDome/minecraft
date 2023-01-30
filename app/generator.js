const path = require('path');

const creator = require('./creator');
const toolSwapper = require('./swapper_tools');
const armorSwapper = require('./swapper_armor');
const book = require('./book');
const inventory = require('./inventory');
const enderchest = require('./enderchest');

const config = require('../data/config.json');
const tools = require('../data/tools.json');
const armor = require('../data/armor.json');
const items = require('../data/items.json');
const directions = require('../data/directions.json');

class Generator {
    create(destination) {
        this.createBookFunctions(destination);
        this.createToolFunctions(destination);
        this.createInventoryFunctions(destination);
        this.createEnderFunctions(destination);
    }

    createToolFunctions(destination) {
        tools.forEach((item) => {
            creator.write(path.resolve(destination, `${item.file}.mcfunction`), toolSwapper.create('item', config, item));
            creator.write(path.resolve(destination, `${item.file}_gate.mcfunction`), toolSwapper.create('item_gate', config, item));
        });
    }
    createArmorFunctions(destination) {
        armor.forEach((item) => {
            creator.write(path.resolve(destination, `${item.file}.mcfunction`), armorSwapper.create('item', config, item));
            creator.write(path.resolve(destination, `${item.file}_gate.mcfunction`), armorSwapper.create('item_gate', config, item));
        });
    }
    createBookFunctions(destination) {
        creator.write(path.resolve(destination, 'book_god.mcfunction'), book.create('god'));
        creator.write(path.resolve(destination, 'book_default.mcfunction'), book.create('default'));
    }
    createInventoryFunctions(destination) {
        creator.write(path.resolve(destination, 'inventory_import.mcfunction'), inventory.create('import', config));
        creator.write(path.resolve(destination, 'inventory_import_gate.mcfunction'), inventory.create('import_gate', config));
        creator.write(path.resolve(destination, 'inventory_export.mcfunction'), inventory.create('export', config, items));
        creator.write(path.resolve(destination, 'inventory_export_gate.mcfunction'), inventory.create('export_gate', config));
    }
    createEnderFunctions(destination) {
        creator.write(path.resolve(destination, 'ender_place.mcfunction'), enderchest.create('place', config, directions));
        creator.write(path.resolve(destination, 'ender_destroy.mcfunction'), enderchest.create('destroy', config, directions));
        creator.write(path.resolve(destination, 'ender_inventory_gate.mcfunction'), enderchest.create('inventory_gate', config, directions));
        creator.write(path.resolve(destination, 'ender_existence_gate.mcfunction'), enderchest.create('existence_gate', config, directions));
        creator.write(path.resolve(destination, 'ender_toggle.mcfunction'), enderchest.create('toggle', config, directions));
    }
}

module.exports = new Generator();
