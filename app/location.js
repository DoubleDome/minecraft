const CommandObject = require('../util/command');

const command = new CommandObject();
const config =  require('../data/config');

class Location {
    create(label, dimension, coordinates, color) {
        command.reset();
        command.append(`execute in ${dimension} run tp @s ${coordinates}`);
        command.append(`title @s times ${config.title.time}`);
        command.append(`title @s subtitle {"text":"${config.labels.dimensions[dimension]}", "color":"${color || config.title.color}"}`);
        command.append(`title @a title {"text":"${label}", "color":"${color || config.title.color}"}`);
        return command.export();
    }
}

module.exports = new Location();
