const CommandObject = require('../util/command');

const config = require('../data/config.json');

const command = new CommandObject();

class Load {
    constructor() {
    }
    static getInstance() {
        if (!Load.command) {
            Load.command = new CommandObject();
        }
        return Load.command;
    }
}

module.exports = Load;
