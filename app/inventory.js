const Command = require('../util/command');
const config = require('../data/config.json');

class Inventory {
    create(items) {
        const result = {};
        result.import = this.createImport();
        result.import_gate = this.createImportGate();
        result.export = this.createExport(items);
        result.export_gate = this.createExportGate();
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
        for (let index = 0; index < count; index++) {
            command.append(`data modify storage ${config.namespace} ${config.storage.inventory}[${index}] merge value {Slot:${index}b}`);
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
}

module.exports = new Inventory();
