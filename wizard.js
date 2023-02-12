require('dotenv').config();

const prompts = require('prompts');
const path = require('path');

const backup = require('./app/backup');
const generator = require('./app/generator');

const config = {
    jakarta: {
        label: 'Jakarta',
        base: '/Users/aletoled/Library/Application Support/minecraft/saves/',
        pack: 'Jakarta/datapacks/madagascar_pack',
    },
    datapack: {
        label: 'Datapack',
        base: '/Users/aletoled/Library/Application Support/minecraft/saves/',
        pack: 'Datapack/datapacks/madagascar_pack',
    },
    local: {
        label: 'Local',
        base: `${__dirname}`,
        pack: '/functions',
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

function generatePath(location) {
    return path.join(config[location].base, config[location].root);
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
    if (response.location == 'local') generator.config.path.functions = '';
    generator.init(generatePath(response.location));
    generator[config.functions[response.command]]();
})();
