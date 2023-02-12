const Command = require('../util/command');
const config = require('../data/config.json');

class Template {
    create() {
        const command = new Command();
        return command.export();
    }
}

module.exports = new Template();
