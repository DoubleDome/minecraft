const CommandObject = require('../util/command');

const command = new CommandObject();
const config = require('../data/config.json');

class EnderChest {
    create(type, directions) {
        command.reset();
        switch (type) {
            case 'place':
                return this.createPlace(directions);
            case 'destroy':
                return this.createDestroy();
            case 'inventory_gate':
                return this.createInventoryGate();
            case 'existence_gate':
                return this.createExistenceGate();
            case 'toggle':
                return this.createToggle();
            default:
                throw new Error('[Ender] Unknown Type');
        }
    }
    createPlace(directions) {
        this.createDirection(directions.north);
        this.createDirection(directions.east);
        this.createDirection(directions.south);
        this.createDirection(directions.west);
        return command.export();
    }
    createDirection(direction) {
        // command.append(`data modify storage ${config.namespace} ${config.storage.ender} set value 1`);
        command.append(`execute if entity @s[y_rotation=${direction.range}] run setblock ~${direction.offset.x} ~ ~${direction.offset.z} minecraft:ender_chest[facing=${direction.facing}]`);
        // command.append(`execute if entity @s[y_rotation=${direction.range}] align xyz run summon minecraft:armor_stand ~${direction.offset.x} ~ ~${direction.offset.z} {CustomName:"{\\"text\\":\\"${config.marker.ender}\\"}",Invisible:1,NoGravity:1b}`);
        command.append(`execute if entity @s[y_rotation=${direction.range}] align xyz run summon minecraft:marker ~${direction.offset.x} ~ ~${direction.offset.z} {CustomName:"{\\"text\\":\\"${config.marker.ender}\\"}"}`);
    }
    createDestroy() {
        // command.append(`data remove storage ${config.namespace} ${config.storage.ender}`);
        command.append(`execute at @e[nbt={CustomName:"{\\"text\\":\\"${config.marker.ender}\\"}"},limit=1] run setblock ~ ~ ~ minecraft:air`);
        command.append(`kill @e[nbt={CustomName:"{\\"text\\":\\"${config.marker.ender}\\"}"},limit=1]`);
        return command.export();
    }
    createInventoryGate() {
        command.append(`execute as @s if data entity @s Inventory[{id:"minecraft:ender_chest"}] run function ${config.package}:${config.filename.gate}/ender_existence`);
        return command.export();
    }
    createExistenceGate() {
        command.append(`execute unless entity @e[nbt={CustomName:"{\\"text\\":\\"${config.marker.ender}\\"}"},limit=1] run function ${config.package}:ender_place`);
        return command.export();
    }
    createToggle() {
        return command.export();
    }
}

module.exports = new EnderChest();
