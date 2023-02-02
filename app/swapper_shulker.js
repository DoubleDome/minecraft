const CommandObject = require('../util/command');

const commands = {};
commands.swap = new CommandObject();
commands.gate = new CommandObject();
const config = require('../data/config.json');


class ShulkerSwapper {
    init() {
        commands.swap.reset();
        commands.gate.reset();
    }
    create(type, name, label, color, slot) {
        switch (type) {
            case 'swapper':
                return this.createSwapper(label, color, slot);
            case 'append_gate':
                return this.appendSwapperGate(name, label, color);
            case 'gate':
                return commands.gate.export();
            default:
                console.log('[ShulkerSwapper] Invalid Type');
                break;
        }
        return this.createSwapper(label, slot);
    }

    createSwapper(label, color, slot) {
        commands.swap.reset();
        commands.swap.clearStorage(config.namespace, config.storage.outbound);
        commands.swap.createShulker(config.shulkerLocation.item);
        commands.swap.append(`data modify storage ${config.namespace} ${config.storage.outbound} set from entity @s Inventory[{id:"minecraft:${color}_shulker_box",tag:{display:{Name:"{\\"text\\":\\"${label}\\"}"}}}]`);
        commands.swap.append(`data remove storage ${config.namespace} ${config.storage.outbound}.Slot`);
        commands.swap.append(`data modify block ${config.shulkerLocation.item} Items prepend from storage ${config.namespace} ${config.storage.outbound}`);
        commands.swap.append(`loot replace entity @s enderchest.${slot} 1 mine ${config.shulkerLocation.item} air`);
        commands.swap.append(`clear @s minecraft:${color}_shulker_box{display:{Name:"{\\"text\\":\\"${label}\\"}"}} 1`);
        commands.swap.clearBlock(config.shulkerLocation.item);
        return commands.swap.export();
    }
    appendSwapperGate(name, label, color) {
        commands.gate.append(`execute as @s if data entity @s Inventory[{id:"minecraft:${color}_shulker_box",tag:{display:{Name:"{\\"text\\":\\"${label}\\"}"}}}] run function ${config.package}:${config.filename.shulker}export_${name}`);
    }
    
}

module.exports = new ShulkerSwapper();
