const command = require('../util/command');

class Inventory {
    create(type, config, items) {
        command.reset();
        switch (type) {
            case 'import':
                return this.createImport(config);
            case 'import_gate':
                return this.createImportGate(config);
            case 'export':
                return this.createExport(config, items);
            case 'export_gate':
                return this.createExportGate(config);
            default:
                throw new Error('[Inventory] Unknown Type');
        }
    }
    createExport(config, items) {
        this.createStorageCommands(config, items);
        this.reindexItems(config, items.length);
        command.createShulker(config.shulkerLocation.holder, config.dimension);

        command.append(`execute in ${config.dimension} run data modify block ${config.shulkerLocation.holder} Items set value []`);
        command.append(`execute in ${config.dimension} run data modify block ${config.shulkerLocation.holder} Items set from storage ${config.namespace} ${config.storage.inventory}`);
        command.clearStorage(config.namespace, config.storage.inventory);
        command.clearInventory();
        command.append(`function ${config.functions.book}`);
        command.append(`gamemode creative @s`);
        return command.export();
    }
    createStorageCommands(config, items) {
        items.forEach((id, index) => {
            command.append(`data modify storage ${config.namespace} ${config.storage.inventory} insert 0 from entity @s Inventory[{id:"${id}"}]`);
        });
    }
    reindexItems(config, count) {
        for (let index = 0; index < count; index++) {
            command.append(`data modify storage ${config.namespace} ${config.storage.inventory}[${index}] merge value {Slot:${index}b}`);
        }
    }

    createExportGate(config) {
        command.append(`execute in ${config.dimension} as @s unless block ${config.shulkerLocation.holder} minecraft:shulker_box run function ${config.package}:inventory_export`);
        return command.export();
    }

    createImport(config) {
        command.clearInventory();
        command.append(`execute in ${config.dimension} run loot give @s mine ${config.shulkerLocation.holder} air`);
        command.clearBlock(config.shulkerLocation.holder, config.dimension);
        command.append(`function ${config.functions.book}`);
        command.append(`gamemode survival @s`);
        return command.export();
    }
    createImportGate(config) {
        command.append(`execute in ${config.dimension} as @s if data block ${config.shulkerLocation.holder} Items run function ${config.package}:inventory_import`);
        return command.export();
    }
}

module.exports = new Inventory();
