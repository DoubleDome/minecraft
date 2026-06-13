const Command = require('../util/command');
const config = require('../data/config.json');

// Player Inventory NBT slot indices: offhand is -106, armor is 100..103 (boots..helmet).
// These live in the same Inventory list as main/hotbar items but are out of range
// for any container's Items list, so we capture and reindex them explicitly.
const ARMOR_SLOTS = ['-106', '100', '101', '102', '103'];
const ARMOR_REPLACE_TARGETS = [
    'weapon.offhand',
    'armor.feet',
    'armor.legs',
    'armor.chest',
    'armor.head',
];

const BARREL_CAPACITY = 27;

class Inventory {
    create(items, equipment, directions) {
        const result = {};
        result.import = this.createImport();
        result.import_gate = this.createImportGate();
        result.export = this.createExport(items);
        result.export_gate = this.createExportGate();
        result.stash = this.createStash(equipment, directions);
        result.stash_gate = this.createStashGate();
        return result;
    }
    createExport(items) {
        const command = new Command();
        this.createStorageCommands(command, items);
        this.reindexItems(command, items.length);
        command.createShulker(config.coordinate.shulker.holder, config.dimension.default);
        command.append(`execute in ${config.dimension.default} run data modify block ${config.coordinate.shulker.holder} Items set value []`);
        command.append(`execute in ${config.dimension.default} run data modify block ${config.coordinate.shulker.holder} Items set from storage ${config.namespace} ${config.storage.inventory}`);
        command.clearStorage(config.namespace, config.storage.inventory);
        command.clearInventory();
        command.append(`give @s ${config.item.wand}`);
        command.append(`function ${config.function.book}`);
        command.append(`gamemode creative @s`);
        return command.export();
    }
    createStorageCommands(command, items) {
        items.forEach((id, index) => {
            command.append(`data modify storage ${config.namespace} ${config.storage.inventory} insert 0 from entity @s Inventory[{id:"${id}"}]`);
        });
    }
    reindexItems(command, count) {
        // `count` is the configured max, not the runtime list length — fewer items
        // may have been captured. Guard each set with `if data ...[i]` so indices
        // past the real end are skipped instead of erroring every run.
        for (let index = 0; index < count; index++) {
            const p = `${config.namespace} ${config.storage.inventory}[${index}]`;
            command.append(`execute if data storage ${p} run data modify storage ${p} merge value {Slot:${index}b}`);
        }
    }

    createExportGate() {
        const command = new Command();
        command.append(`execute in ${config.dimension.default} as @s unless block ${config.coordinate.shulker.holder} ${config.item.shulker} run function ${config.package}:inventory/export`);
        return command.export();
    }

    createImport() {
        const command = new Command();
        command.clearInventory();
        command.append(`execute in ${config.dimension.default} run loot give @s mine ${config.coordinate.shulker.holder} ${config.item.air}`);
        command.clearBlock(config.coordinate.shulker.holder, config.dimension.default);
        command.append(`function ${config.function.book}`);
        command.append(`gamemode survival @s`);
        return command.export();
    }
    createImportGate() {
        const command = new Command();
        command.append(`execute in ${config.dimension.default} as @s if data block ${config.coordinate.shulker.holder} Items run function ${config.package}:inventory/import`);
        return command.export();
    }

    createStash(equipment, directions) {
        const command = new Command();
        const chestPath = `${config.namespace} ${config.storage.stash_chest}`;
        const barrelPath = `${config.namespace} ${config.storage.stash_barrel}`;

        // Capture armor + offhand into chest storage by slot index.
        ARMOR_SLOTS.forEach((slot) => {
            command.append(`data modify storage ${chestPath} insert 0 from entity @s Inventory[{Slot:${slot}b}]`);
        });

        // Capture equipment items into chest storage by id (first matching stack).
        equipment.forEach((id) => {
            command.append(`data modify storage ${chestPath} insert 0 from entity @s Inventory[{id:"${id}"}]`);
        });

        // Reindex chest storage entries into valid container slots (0..N-1). Only
        // present items were inserted, so guard each index to skip the empties
        // (otherwise every absent armor/equipment slot errors on each stash).
        const chestEntries = ARMOR_SLOTS.length + equipment.length;
        for (let i = 0; i < chestEntries; i++) {
            command.append(`execute if data storage ${chestPath}[${i}] run data modify storage ${chestPath}[${i}] merge value {Slot:${i}b}`);
        }

        // Strip captured items off the player so they don't double into the barrel.
        ARMOR_REPLACE_TARGETS.forEach((target) => {
            command.append(`item replace entity @s ${target} with ${config.item.air}`);
        });
        equipment.forEach((id) => {
            command.append(`clear @s ${id}`);
        });

        // Whatever remains in Inventory is "the other crap" -> barrel.
        command.append(`data modify storage ${barrelPath} set from entity @s Inventory`);
        for (let i = 0; i < BARREL_CAPACITY; i++) {
            command.append(`execute if data storage ${barrelPath}[${i}] run data modify storage ${barrelPath}[${i}] merge value {Slot:${i}b}`);
        }

        // Place chest (eye level) + barrel (foot level) per facing.
        Object.values(directions).forEach((dir) => {
            command.append(`execute if entity @s[y_rotation=${dir.range}] run setblock ~${dir.offset.x} ~1 ~${dir.offset.z} ${config.item.chest}[facing=${dir.facing}] destroy`);
            command.append(`execute if entity @s[y_rotation=${dir.range}] run setblock ~${dir.offset.x} ~ ~${dir.offset.z} ${config.item.barrel}[facing=up] destroy`);
        });

        // Pour storage into the placed blocks.
        Object.values(directions).forEach((dir) => {
            command.append(`execute if entity @s[y_rotation=${dir.range}] run data modify block ~${dir.offset.x} ~1 ~${dir.offset.z} Items set from storage ${chestPath}`);
            command.append(`execute if entity @s[y_rotation=${dir.range}] run data modify block ~${dir.offset.x} ~ ~${dir.offset.z} Items set from storage ${barrelPath}`);
        });

        command.clearStorage(config.namespace, config.storage.stash_chest);
        command.clearStorage(config.namespace, config.storage.stash_barrel);
        command.clearInventory();
        command.append(`give @s ${config.item.wand}`);
        command.append(`function ${config.function.book}`);
        command.append(`gamemode creative @s`);
        return command.export();
    }
    createStashGate() {
        const command = new Command();
        command.append(`function ${config.package}:inventory/stash`);
        return command.export();
    }
}

module.exports = new Inventory();
