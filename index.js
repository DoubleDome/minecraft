const swap = require('./app/swap');
const creator = require('./app/creator');
const locations = require('./data/locations.json');
const book = require('./app/book');
const inventory = require('./app/inventory');
const enderchest = require('./app/enderchest');

const tools = require('./data/tools.json');
const items = require('./data/items.json');
const directions = require('./data/directions.json');

const destination = '/Users/aletoled/Library/Application Support/minecraft/saves/Datapack/datapacks/madagascar_pack/data/madagascar/functions';

const config = {
    namespace: 'minecraft:madagascar',
    package: 'madagascar',
    dimension: 'minecraft:overworld',
    storage: {
        inbound: 'inbound',
        outbound: 'outbound',
        inventory: 'inventory',
        slot: 'slot',
        ender: 'ender',
    },
    shulkerLocation: {
        gear: '~ 250 ~',
        item: '~ 251 ~',
        holder: '-17 60 -1',
    },
    slots: {
        player: 2,
        enderchest: 0,
    },
    markers: {
        ender: 'EnderMarker',
    },
    functions: {
        book: 'madagascar:god_book',
    },
    worldedit: {
        tool: 'minecraft:wooden_axe',
    },
    mineWith: 'air',
};

function generateFunctions(path) {
    tools.forEach((tool) => {
        creator.write(`${path}/${tool.file}.mcfunction`, swap.create('item', config, tool));
        creator.write(`${path}/${tool.file}_gate.mcfunction`, swap.create('item_gate', config, tool));
    });

    creator.write(`${path}/god_book.mcfunction`, book.create('god', locations));
    creator.write(`${path}/default_book.mcfunction`, book.create('default', locations));
    creator.write(`${path}/inventory_import.mcfunction`, inventory.create('import', config));
    creator.write(`${path}/inventory_import_gate.mcfunction`, inventory.create('import_gate', config));
    creator.write(`${path}/inventory_export.mcfunction`, inventory.create('export', config, items));
    creator.write(`${path}/inventory_export_gate.mcfunction`, inventory.create('export_gate', config));

    creator.write(`${path}/ender_place.mcfunction`, enderchest.create('place', config, directions));
    creator.write(`${path}/ender_destroy.mcfunction`, enderchest.create('destroy', config, directions));
    creator.write(`${path}/ender_inventory_gate.mcfunction`, enderchest.create('inventory_gate', config, directions));
    creator.write(`${path}/ender_existence_gate.mcfunction`, enderchest.create('existence_gate', config, directions));
    creator.write(`${path}/ender_toggle.mcfunction`, enderchest.create('toggle', config, directions));
}

generateFunctions(destination);
generateFunctions('./function');
