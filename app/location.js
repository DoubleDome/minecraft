const CommandObject = require('../util/command');

const command = new CommandObject();
const config =  require('../data/config');

class Location {
    create(label, dimension, coordinates, color) {
        command.reset();
        command.append(`execute as @s in ${dimension} run tp @s ${coordinates}`);
        command.append(`execute as @s run title @s times ${config.title.time}`);
        command.append(`execute as @s run title @s subtitle {"text":"${config.label.dimension[dimension]}", "color":"${color || config.title.color}"}`);
        command.append(`execute as @s run title @s title {"text":"${label}", "color":"${color || config.title.color}"}`);
        return command.export();
    }
}

module.exports = new Location();
