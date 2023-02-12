const CommandObject = require('../util/command');

const config =  require('../data/config');

class Location {
    create(locations) {
        const result = {};
        locations.forEach(location => {
            result[location.filename] = this.createLocation(location.label, location.dimension, location.color, location.gamemode);
        });
        return result;
    }
    createLocation(label, dimension, coordinates, color, gamemode = null) {
        const command = new CommandObject();
        command.append(`execute as @s in ${dimension} run tp @s ${coordinates}`);
        command.append(`execute as @s run title @s times ${config.title.time}`);
        command.append(`execute as @s run title @s subtitle {"text":"${config.label.dimension[dimension]}", "color":"${color || config.title.color}"}`);
        command.append(`execute as @s run title @s title {"text":"${label}", "color":"${color || config.title.color}"}`);
        return command.export();
    }
}

module.exports = new Location();
