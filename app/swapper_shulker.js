const Command = require('../util/command');
const config = require('../data/config.json');

const commands = {};
commands.swap = new Command();
commands.gate = new Command();

class ShulkerSwapper {
    create(shulkers) {
        const result = {shulkers:{}};
        shulkers.forEach(shulker => {
            result.shulkers[shulker.name] = this.createSwapper(shulker.label, shulker.color, shulker.slot);
            this.appendSwapperGate(shulker.name, shulker.label, shulker.color);
        })
        result.gate = commands.gate.export();
        return result;
    }

    createSwapper(label, color, slot) {
        commands.swap.reset();
        commands.swap.clearStorage(config.namespace, config.storage.outbound);
        commands.swap.createShulker(config.coordinate.shulker.item);
        commands.swap.append(`data modify storage ${config.namespace} ${config.storage.outbound} set from entity @s Inventory[{id:"minecraft:${color}_shulker_box",tag:{display:{Name:"{\\"text\\":\\"${label}\\"}"}}}]`);
        commands.swap.append(`data remove storage ${config.namespace} ${config.storage.outbound}.Slot`);
        commands.swap.append(`data modify block ${config.coordinate.shulker.item} Items prepend from storage ${config.namespace} ${config.storage.outbound}`);
        commands.swap.append(`loot replace entity @s enderchest.${slot} 1 mine ${config.coordinate.shulker.item} ${config.item.air}`);
        commands.swap.append(`clear @s minecraft:${color}_shulker_box{display:{Name:"{\\"text\\":\\"${label}\\"}"}} 1`);
        commands.swap.clearBlock(config.coordinate.shulker.item);
        return commands.swap.export();
    }
    appendSwapperGate(name, label, color) {
        commands.gate.append(`execute as @s if data entity @s Inventory[{id:"minecraft:${color}_shulker_box",tag:{display:{Name:"{\\"text\\":\\"${label}\\"}"}}}] run function ${config.package}:${config.folder.shulker}/${name}`);
    }
}

module.exports = new ShulkerSwapper();
