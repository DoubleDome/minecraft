const Command = require('../util/command');

class Load {
    constructor() {
    }
    static getInstance() {
        if (!Load.command) {
            Load.command = new Command();
        }
        return Load.command;
    }
}

module.exports = Load;
