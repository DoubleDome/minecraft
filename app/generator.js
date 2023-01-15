const creator = require('./creator');
const swap = require('./swap');
const book = require('./book');
const inventory = require('./inventory');
const enderchest = require('./enderchest');

const config = require('../data/config.json');
const tools = require('../data/tools.json');
const items = require('../data/items.json');
const directions = require('../data/directions.json');

class Generator {

    create(path) {
        this.createBookFunctions(path);
        this.createSwapFunctions(path);
        this.createInventoryFunctions(path);
        this.createEnderFunctions(path);
    }

    createSwapFunctions(path) {
        tools.forEach((tool) => {
            creator.write(`${path}${process.env.DELIMETER}${tool.file}.mcfunction`, swap.create('item', config, tool));
            creator.write(`${path}${process.env.DELIMETER}${tool.file}_gate.mcfunction`, swap.create('item_gate', config, tool));
        });
    }
    createBookFunctions(path) {
        creator.write(`${path}${process.env.DELIMETER}book_god.mcfunction`, book.create('god'));
        creator.write(`${path}${process.env.DELIMETER}book_default.mcfunction`, book.create('default'));
    }
    createInventoryFunctions(path) {
        creator.write(`${path}${process.env.DELIMETER}inventory_import.mcfunction`, inventory.create('import', config));
        creator.write(`${path}${process.env.DELIMETER}inventory_import_gate.mcfunction`, inventory.create('import_gate', config));
        creator.write(`${path}${process.env.DELIMETER}inventory_export.mcfunction`, inventory.create('export', config, items));
        creator.write(`${path}${process.env.DELIMETER}inventory_export_gate.mcfunction`, inventory.create('export_gate', config));
    }
    createEnderFunctions(path) {
        creator.write(`${path}${process.env.DELIMETER}ender_place.mcfunction`, enderchest.create('place', config, directions));
        creator.write(`${path}${process.env.DELIMETER}ender_destroy.mcfunction`, enderchest.create('destroy', config, directions));
        creator.write(`${path}${process.env.DELIMETER}ender_inventory_gate.mcfunction`, enderchest.create('inventory_gate', config, directions));
        creator.write(`${path}${process.env.DELIMETER}ender_existence_gate.mcfunction`, enderchest.create('existence_gate', config, directions));
        creator.write(`${path}${process.env.DELIMETER}ender_toggle.mcfunction`, enderchest.create('toggle', config, directions));
    }
}

module.exports = new Generator();
