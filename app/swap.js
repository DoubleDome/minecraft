const command = require('./util/command');

// /data get entity @s Inventory[{tag:{display:{Name:"{\"text\":\"Ass\"}"}}}]

class Swapper {
    create(type, config, item) {
        switch (type) {
            case 'item':
                return this.createItem(config, item);
            case 'item_gate':
                return this.createItemGate(config, item);
            default:
                console.log('[Swap] Invalid Type');
                break;
        }
    }
    createItem(config, item) {
        command.reset();
        // Wipe storage
        command.clearStorage(config.namespace, config.storage.inbound);
        command.clearStorage(config.namespace, config.storage.outbound);
        // create the shulkers
        command.createShulker(config.shulkerLocation.gear);
        command.createShulker(config.shulkerLocation.item);
        // Add the gearbox in from enderchest
        command.append(`data modify block ${config.shulkerLocation.gear} Items prepend from entity @s EnderItems[{Slot:${config.slots.enderchest}b}]`);
        // Copy the item into storage
        if (item.enchantment) {
            command.append(`data modify storage ${config.namespace} ${config.storage.inbound} set from block ${config.shulkerLocation.gear} Items[{Slot:${config.slots.enderchest}b}].tag.BlockEntityTag.Items[{id:"${item.id}", tag:{Enchantments:[{id:"${item.enchantment}", lvl:${item.level}s}]}}]`);
        } else {
            command.append(`data modify storage ${config.namespace} ${config.storage.inbound} set from block ${config.shulkerLocation.gear} Items[{Slot:${config.slots.enderchest}b}].tag.BlockEntityTag.Items[{id:"${item.id}"}]`);
        }
        // Store the slot of inbound item before overriding it
        command.append(`data modify storage ${config.namespace} ${config.storage.slot} set from storage ${config.namespace} ${config.storage.inbound}.Slot`);
        // Change it's slot number
        command.append(`data modify storage ${config.namespace} ${config.storage.inbound}.Slot set value 0b`);
        // Add the copy to the shulker
        command.append(`data modify block ${config.shulkerLocation.item} Items prepend from storage ${config.namespace} ${config.storage.inbound}`);
        // Copy item in player slot to storage
        command.append(`data modify storage ${config.namespace} ${config.storage.outbound} set from entity @s Inventory[{Slot:${config.slots.player}b}]`);
        // Change the slot number of whatever was in their hand to the slot number of the item just taken out
        command.append(`data modify storage ${config.namespace} ${config.storage.outbound}.Slot set from storage ${config.namespace} ${config.storage.slot}`);
        // Wipe item from the gear box
        if (item.enchantment) {
            command.append(`data remove block ${config.shulkerLocation.gear} Items[{Slot:${config.slots.enderchest}b}].tag.BlockEntityTag.Items[{id:"${item.id}", tag:{Enchantments:[{id:"${item.enchantment}", lvl:${item.level}s}]}}]`);
        } else {
            command.append(`data remove block ${config.shulkerLocation.gear} Items[{Slot:${config.slots.enderchest}b}].tag.BlockEntityTag.Items[{id:"${item.id}"}]`);
        }
        // Append item that was in slot to the gear shulker
        command.append(`data modify block ${config.shulkerLocation.gear} Items[{Slot:${config.slots.enderchest}b}].tag.BlockEntityTag.Items append from storage ${config.namespace} ${config.storage.outbound}`);
        // Loot the shulker into the player's slot
        command.append(`loot replace entity @s hotbar.${config.slots.player} 1 mine ${config.shulkerLocation.item} ${config.mineWith}`);
        // Replace the gear box in the enderchest with the updated one
        command.append(`loot replace entity @s enderchest.${config.slots.enderchest} 1 mine ${config.shulkerLocation.gear} ${config.mineWith}`);
        // Wipe storage
        command.clearStorage(config.namespace, config.storage.inbound);
        command.clearStorage(config.namespace, config.storage.outbound);
        // Wipe the shulkers
        command.clearBlock(config.shulkerLocation.gear);
        command.clearBlock(config.shulkerLocation.item);

        return command.export();
    }
    createItemGate(config, item) {
        command.reset();
        // Look for the tool in the gear box in the enderchest, if its there, run the function
        if (item.enchantment) {
            command.append(`execute as @s if data entity @s EnderItems[{Slot:${config.slots.enderchest}b}].tag.BlockEntityTag.Items[{id:"${item.id}", tag:{Enchantments:[{id:"${item.enchantment}", lvl:${item.level}s}]}}] run function ${config.package}:${item.file}`);
        } else {
            command.append(`execute as @s if data entity @s EnderItems[{Slot:${config.slots.enderchest}b}].tag.BlockEntityTag.Items[{id:"${item.id}"}] run function ${config.package}:${item.file}`);
        }

        return command.export();
    }
}

module.exports = new Swapper();
