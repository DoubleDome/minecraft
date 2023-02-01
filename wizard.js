require('dotenv').config();

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
    local: {
        label: 'Local',
        base: `${__dirname}`,
        root: '',
        functions: '/functions',
    },
    functions: {
        all: 'create',
        book: 'createBookFunctions',
        tools: 'createToolFunctions',
        armor: 'createArmorFunctions',
        inventory: 'createInventoryFunctions',
        ender: 'createEnderFunctions',
    },
};

function generatePath(location, type) {
    return path.join(config[location].base, config[location].root, config[location][type]);
}

(async () => {
    const response = await prompts([
        {
            type: 'select',
            name: 'location',
            message: 'Choose a location:',
            choices: [
                { title: 'Local', value: 'local' },
                { title: 'Datapack', value: 'datapack' },
                { title: 'Jakarta', value: 'jakarta' },
            ],
        },
        {
            type: 'select',
            name: 'command',
            message: 'Choose a command:',
            choices: [
                { title: 'All', value: 'all' },
                { title: 'Book', value: 'book' },
                { title: 'Tool Swap', value: 'tools' },
                { title: 'Armor Swap', value: 'armor' },
                { title: 'Inventory Export/Import', value: 'inventory' },
                { title: 'Quick Access Enderchest', value: 'ender' },
            ],
        },
    ]);
    generator[config.functions[response.command]](generatePath(response.location, 'functions'));
})();
