const CommandObject = require('../util/command');
const command = new CommandObject();

class Tick {
    constructor() {
    }
    static getInstance() {
        if (!Tick.command) {
            Tick.command = new CommandObject();
        }
        return Tick.command;
    }
}

module.exports = Tick;
