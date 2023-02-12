const CommandObject = require('../util/command');

const config = require('../data/config.json');

class Template {
    create() {
        const command = new CommandObject();
        return command.export();
    }
}

module.exports = new Template();
