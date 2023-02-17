const Command = require('../util/command');
const config = require('../data/config');

class Location {
    create(locations) {
        const result = {};
        locations.forEach((group) => {
            group.locations.forEach((location) => {
                result[location.filename] = this.createLocation(location.label, location.dimension, location.coordinates, location.rotation, location.color, location.gamemode);
            });
        });
        return result;
    }
    createLocation(label, dimension, coordinates, rotation, color, gamemode = null) {
        const command = new Command();
        command.append(`execute as @s in ${dimension} run tp @s ${coordinates} ${rotation || ''}`);
        command.append(`execute as @s in ${dimension} run spawnpoint @s ${coordinates}`);
        command.append(`execute as @s run title @s times ${config.title.time}`);
        command.append(`execute as @s run title @s subtitle {"text":"${config.label.dimension[dimension]}", "color":"${color || config.title.color}"}`);
        command.append(`execute as @s run title @s title {"text":"${label}", "color":"${color || config.title.color}"}`);
        if (gamemode) command.append(`gamemode ${gamemode} @s`);
        return command.export();
    }
}

module.exports = new Location();
