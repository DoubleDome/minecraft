const backup = require('./app/backup');
const book = require('./app/book');
const operator = require('./app/operator');
const creator = require('./app/creator');
const transformer = require('./app/transformer');
const inventory = require('./app/inventory');
const swapper = require('./app/swap');
const path = require('path');

const locations = require('./app/data/locations.json');

const config = {
    jakarta: {
        label: 'Jakarta',
        base: '/Users/aletoled/Library/Application Support/minecraft/saves/',
        root: 'Jakarta/datapacks/madagascar_pack',
        functions: '/data/madagascar/functions',
    },
    datapack: {
        label: 'Datapack',
        base: '/Users/aletoled/Library/Application Support/minecraft/saves/',
        root: 'Datapack/datapacks/madagascar_pack',
        functions: '/data/madagascar/functions',
    },
    temp: {
        label: 'Temp',
        base: __dirname,
        root: '/commands',
        functions: '',
    }
};

function generatePath(world, type, filename) {
    return `${config[world].base}${config[world].root}${config[world][type]}/${filename}`;
}

// backup.init('./Marzipan', './_backup');
// backup.create();

// console.log(book.create(locations));
// console.log(inventory.create());
// console.log(swapper.create('minecraft:netherite_pickaxe'));
// console.log(swapper.create('minecraft:netherite_hoe'));
// console.log(swapper.create('minecraft:netherite_axe'));
// console.log(swapper.create('minecraft:netherite_shovel'));

// creator.write('./commands/swap_pickaxe.mcfunction', swapper.create('minecraft:netherite_pickaxe'));
// creator.write('./commands/swap_axe.mcfunction', swapper.create('minecraft:netherite_axe'));
// creator.write('./commands/swap_shovel.mcfunction', swapper.create('minecraft:netherite_shovel'));
// creator.write('./commands/swap_hoe.mcfunction', swapper.create('minecraft:netherite_hoe'));

const prompts = require('prompts');

(async () => {
    const response = await prompts([
        {
            type: 'select',
            name: 'world',
            message: 'Choose a world:',
            choices: [
                { title: 'Datapack', value: 'datapack' },
                { title: 'Jakarta', value: 'jakarta' },
                { title: 'Temp', value: 'temp' },
            ],
        },
        {
            type: 'select',
            name: 'command',
            message: 'Choose a command:',
            choices: [
                { title: 'Inventory Export/Import', value: 'inventory' },
                { title: 'Tool Swap', value: 'swap' },
                { title: 'Book', value: 'book' },
            ],
        },
    ]);

    switch (response.command) {
        case 'inventory':
            creator.write(generatePath(response.world, 'functions', 'inventory_export.mcfunction'), inventory.create('export'));
            creator.write(generatePath(response.world, 'functions', 'inventory_import.mcfunction'), inventory.create('import'));
            break;
        case 'swap':
            break;
        case 'book':
            creator.write(generatePath(response.world, 'functions', 'book.mcfunction'), book.create(locations));
            break;
    }
})();
