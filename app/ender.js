const CommandObject = require('../util/command');

const config = require('../data/config.json');

const Load = require('./load');

class Ender {
    create(directions, objective) {
        this.createLoad(objective);
        const result = {};
        result.place = this.createPlace(directions);
        result.destroy = this.createDestroy();
        result.inventory_gate = this.createInventoryGate();
        result.existence_gate = this.createExistenceGate();
        result.toggle = this.createToggle(objective);
        return result;
    }
    createLoad(objective) {
        Load.getInstance().addObjective(objective.name, 'dummy');
    }
    createPlace(directions) {
        const command = new CommandObject();
        this.createDirection(command, directions.north);
        this.createDirection(command, directions.east);
        this.createDirection(command, directions.south);
        this.createDirection(command, directions.west);
        return command.export();
    }
    createDirection(command, direction) {
        command.append(`execute if entity @s[y_rotation=${direction.range}] run setblock ~${direction.offset.x} ~ ~${direction.offset.z} ${config.item.ender_chest}[facing=${direction.facing}] destroy`);
        command.append(`execute if entity @s[y_rotation=${direction.range}] align xyz run summon ${config.item.marker} ~${direction.offset.x} ~ ~${direction.offset.z} {Tags:["${config.tag.ender}"]}`);
    }

    createDestroy() {
        const command = new CommandObject();
        command.append(`execute at @e[tag=${config.tag.ender},limit=1] run setblock ~ ~ ~ ${config.item.air}`);
        command.append(`kill @e[tag=${config.tag.ender},limit=1]`);
        return command.export();
    }
    createInventoryGate() {
        const command = new CommandObject();
        command.append(`execute as @s if data entity @s Inventory[{id:"${config.item.ender_chest}"}] run function ${config.package}:gate/ender_existence`);
        return command.export();
    }
    createExistenceGate() {
        const command = new CommandObject();
        command.append(`execute unless entity @e[tag=${config.tag.ender},limit=1] run function ${config.package}:ender/place`);
        return command.export();
    }
    createToggle() {
        const command = new CommandObject();
        command.append(`execute store success score @s ${config.score.ender_status} run data get entity @e[tag=${config.tag.ender},limit=1]`);
        command.append(`execute if score @s ${config.score.ender_status} matches 0 run function ${config.package}:gate/ender_inventory`);
        command.append(`execute if score @s ${config.score.ender_status} matches 1 run function ${config.package}:ender/destroy`);
        return command.export();
    }
    
}

module.exports = new Ender();
