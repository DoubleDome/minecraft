const prompts = require('prompts');
const path = require('path');

const backup = require('./app/backup');
const generator = require('./app/generator');

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
    },
    functions: {
        all: 'create',
        book: 'createBookFunctions',
        swap: 'createSwapFunctions',
        inventory: 'createInventoryFunctions',
        ender: 'createEnderFunctions',
    },
};

function generatePath(world, type) {
    return `${config[world].base}${config[world].root}${config[world][type]}`;
}

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
                { title: 'All', value: 'all' },
                { title: 'Book', value: 'book' },
                { title: 'Tool Swap', value: 'swap' },
                { title: 'Inventory Export/Import', value: 'inventory' },
                { title: 'Quick Access Enderchest', value: 'ender' },
            ],
        },
    ]);

    generator[config.functions[response.command]](generatePath(response.world, 'functions'));
})();
