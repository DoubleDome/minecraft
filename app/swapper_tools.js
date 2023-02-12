const Command = require('../util/command');
const config = require('../data/config.json');

class ToolSwapper {
    create(tools) {
        const result = { tools: {}, gates: {} };
        tools.forEach((tool) => {
            result.tools[tool.filename] = this.createItem(tool.id, tool.filename, tool.enchantment, tool.level);
            result.gates[tool.filename] = this.createItem(tool.id, tool.filename, tool.enchantment, tool.level);
        });
        return result;
    }
    createItem(id, filename, enchantment = null, level = null) {
        const command = new Command();
        // Wipe storage
        command.clearStorage(config.namespace, config.storage.inbound);
        command.clearStorage(config.namespace, config.storage.outbound);
        // create the shulkers
        command.createShulker(config.coordinate.shulker.gear);
        command.createShulker(config.coordinate.shulker.item);
        // Add the gearbox in from enderchest
        command.append(`data modify block ${config.coordinate.shulker.gear} Items prepend from entity @s EnderItems[{Slot:${config.slot.ender_chest}b}]`);
        // Copy the item into storage
        if (enchantment) {
            command.append(`data modify storage ${config.namespace} ${config.storage.inbound} set from block ${config.coordinate.shulker.gear} Items[{Slot:${config.slot.ender_chest}b}].tag.BlockEntityTag.Items[{id:"${id}", tag:{Enchantments:[{id:"${enchantment}", lvl:${level}s}]}}]`);
        } else {
            command.append(`data modify storage ${config.namespace} ${config.storage.inbound} set from block ${config.coordinate.shulker.gear} Items[{Slot:${config.slot.ender_chest}b}].tag.BlockEntityTag.Items[{id:"${id}"}]`);
        }
        // Store the slot of inbound item before overriding it
        command.append(`data modify storage ${config.namespace} ${config.storage.slot} set from storage ${config.namespace} ${config.storage.inbound}.Slot`);
        // Change it's slot number
        command.append(`data modify storage ${config.namespace} ${config.storage.inbound}.Slot set value 0b`);
        // Add the copy to the shulker
        command.append(`data modify block ${config.coordinate.shulker.item} Items prepend from storage ${config.namespace} ${config.storage.inbound}`);
        // Copy item in player slot to storage
        command.append(`data modify storage ${config.namespace} ${config.storage.outbound} set from entity @s Inventory[{Slot:${config.slot.player}b}]`);
        // Change the slot number of whatever was in their hand to the slot number of the item just taken out
        command.append(`data modify storage ${config.namespace} ${config.storage.outbound}.Slot set from storage ${config.namespace} ${config.storage.slot}`);
        // Wipe item from the gear box
        if (enchantment) {
            command.append(`data remove block ${config.coordinate.shulker.gear} Items[{Slot:${config.slot.ender_chest}b}].tag.BlockEntityTag.Items[{id:"${id}", tag:{Enchantments:[{id:"${enchantment}", lvl:${level}s}]}}]`);
        } else {
            command.append(`data remove block ${config.coordinate.shulker.gear} Items[{Slot:${config.slot.ender_chest}b}].tag.BlockEntityTag.Items[{id:"${id}"}]`);
        }
        // Append item that was in slot to the gear shulker
        command.append(`data modify block ${config.coordinate.shulker.gear} Items[{Slot:${config.slot.ender_chest}b}].tag.BlockEntityTag.Items append from storage ${config.namespace} ${config.storage.outbound}`);
        // Loot the shulker into the player's slot
        command.append(`loot replace entity @s hotbar.${config.slot.player} 1 mine ${config.coordinate.shulker.item} ${config.item.air}`);
        // Replace the gear box in the enderchest with the updated one
        command.append(`loot replace entity @s enderchest.${config.slot.ender_chest} 1 mine ${config.coordinate.shulker.gear} ${config.item.air}`);
        // Wipe storage
        command.clearStorage(config.namespace, config.storage.inbound);
        command.clearStorage(config.namespace, config.storage.outbound);
        // Wipe the shulkers
        command.clearBlock(config.coordinate.shulker.gear);
        command.clearBlock(config.coordinate.shulker.item);

        return command.export();
    }
    createItemGate(id, filename, enchantment = null, level = null) {
        const command = new Command();
        // Look for the tool in the gear box in the enderchest, if its there, run the function
        const functionPath = `${config.package}:${config.folder.tool_swap}/${filename}`;
        if (enchantment) {
            command.append(`execute as @s if data entity @s EnderItems[{Slot:${config.slot.ender_chest}b}].tag.BlockEntityTag.Items[{id:"${id}", tag:{Enchantments:[{id:"${enchantment}", lvl:${level}s}]}}] run function ${functionPath}`);
        } else {
            command.append(`execute as @s if data entity @s EnderItems[{Slot:${config.slot.ender_chest}b}].tag.BlockEntityTag.Items[{id:"${id}"}] run function ${functionPath}`);
        }
        return command.export();
    }
}

module.exports = new ToolSwapper();
