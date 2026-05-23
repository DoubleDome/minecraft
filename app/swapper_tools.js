const Command = require('../util/command');
const config = require('../data/config.json');

class ToolSwapper {
    create(tools) {
        const result = { tools: {}, gates: {} };
        tools.forEach(tool => {
            result.tools[tool.filename] = this.createResolver(tool);
            result.gates[tool.filename] = this.createGate(tool);
        });
        result.tools.swap = this.createSwapMacro();
        return result;
    }

    // Predicate matching a {slot:<int>, item:{...}} entry inside a container component.
    // For enchanted tools we match id + the specific enchantment level on the item's components.
    // For unenchanted tools (shears, flint_and_steel) we match by id alone.
    itemPredicate(tool) {
        if (tool.enchantment) {
            return `{item:{id:"${tool.id}",components:{"minecraft:enchantments":{levels:{"${tool.enchantment}":${tool.level}}}}}}`;
        }
        return `{item:{id:"${tool.id}"}}`;
    }

    // Predicate matching an EnderItems entry: must be marked with custom_data {gear:1b}
    // AND have the target tool inside its container component. Both conditions in one
    // predicate so the gate only fires when both are present.
    gearPredicate(tool) {
        return `{components:{"minecraft:custom_data":{gear:1b},"minecraft:container":[${this.itemPredicate(tool)}]}}`;
    }

    createGate(tool) {
        const command = new Command();
        const playerSlot = `${config.slot.player}b`;
        const target = `${config.package}:${config.folder.tool_swap}/${tool.filename}`;
        command.append(
            `execute as @s if data entity @s EnderItems[${this.gearPredicate(tool)}] if data entity @s Inventory[{Slot:${playerSlot}}] run function ${target}`
        );
        return command.export();
    }

    createResolver(tool) {
        const command = new Command();
        const ns = config.namespace;
        const macroTarget = `${config.package}:${config.folder.tool_swap}/swap`;
        command.append(`data remove storage ${ns} args`);
        command.append(
            `data modify storage ${ns} args.shulker_slot set from entity @s EnderItems[${this.gearPredicate(tool)}].Slot`
        );
        command.append(
            `data modify storage ${ns} args.tool_slot set from entity @s EnderItems[${this.gearPredicate(tool)}].components."minecraft:container"[${this.itemPredicate(tool)}].slot`
        );
        command.append(`function ${macroTarget} with storage ${ns} args`);
        return command.export();
    }

    // Shared macro body. Lines starting with $ are macro lines; $(shulker_slot) substitutes
    // the byte-typed EnderItems Slot (prints as `0b` etc.); $(tool_slot) substitutes the int
    // container slot (prints as `0` etc.). No `b` suffix is appended after $(shulker_slot)
    // because the byte type already serializes with one.
    createSwapMacro() {
        const command = new Command();
        const ns = config.namespace;
        const playerSlot = `${config.slot.player}b`;
        const lines = [
            `data remove storage ${ns} inbound`,
            `data remove storage ${ns} outbound`,
            `data remove storage ${ns} hand_entry`,
            `data remove storage ${ns} gear_entry`,
            `$data modify storage ${ns} inbound set from entity @s EnderItems[{Slot:$(shulker_slot)}].components."minecraft:container"[{slot:$(tool_slot)}]`,
            `data modify storage ${ns} outbound set from entity @s Inventory[{Slot:${playerSlot}}]`,
            `$data remove entity @s EnderItems[{Slot:$(shulker_slot)}].components."minecraft:container"[{slot:$(tool_slot)}]`,
            `data remove entity @s Inventory[{Slot:${playerSlot}}]`,
            `data modify storage ${ns} hand_entry set from storage ${ns} inbound.item`,
            `data modify storage ${ns} hand_entry.Slot set value ${playerSlot}`,
            `data modify entity @s Inventory append from storage ${ns} hand_entry`,
            `data remove storage ${ns} outbound.Slot`,
            `data modify storage ${ns} gear_entry.item set from storage ${ns} outbound`,
            `$data modify storage ${ns} gear_entry.slot set value $(tool_slot)`,
            `$data modify entity @s EnderItems[{Slot:$(shulker_slot)}].components."minecraft:container" append from storage ${ns} gear_entry`,
            `data remove storage ${ns} inbound`,
            `data remove storage ${ns} outbound`,
            `data remove storage ${ns} hand_entry`,
            `data remove storage ${ns} gear_entry`,
            `data remove storage ${ns} args`,
        ];
        lines.forEach(l => command.append(l));
        return command.export();
    }
}

module.exports = new ToolSwapper();
