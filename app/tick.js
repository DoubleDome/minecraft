const Command = require('../util/command');

class Tick {
    constructor() {
    }
    static getInstance() {
        if (!Tick.command) {
            Tick.command = new Command();
        }
        return Tick.command;
    }
}

module.exports = Tick;
