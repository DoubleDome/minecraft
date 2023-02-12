class Command {
    /* Variables
    ----------------------------------------------------- */
    output = '';

    /* Body
    ----------------------------------------------------- */
    constructor() {
        this.reset();
    }
    reset() {
        this.output = '';
    }
    append(line) {
        this.output = this.output.concat(`${line}\n`);
    }
    comment(comment) {
        this.append(`# ${comment}`);
    }
    say(message) {
        this.append(`say ${message}`);
    }

    clearExperience() {
        this.append(`experience set @s 0 levels`);
        this.append(`experience set @s 0 points`);
    }
    createShulker(location, dimension) {
        if (!dimension) {
            this.append(`setblock ${location} minecraft:shulker_box`);
        } else {
            this.append(`execute in ${dimension} run setblock ${location} minecraft:shulker_box`);
        }
    }
    clearBlock(location, dimension) {
        if (!dimension) {
            this.append(`setblock ${location} minecraft:air`);
        } else {
            this.append(`execute in ${dimension} run setblock ${location} minecraft:air`);
        }
    }
    clearStorage(namespace, variable) {
        this.append(`data remove storage ${namespace} ${variable}`);
    }
    clearInventory() {
        this.append('clear @s');
    }
    export() {
        return this.output;
    }
    /* Objectives
    -------------------------------------------*/
    addObjective(name, type = 'dummy', label) {
        if (label) {
            this.append(`scoreboard objectives add ${name} ${type} "${label}"`);
        } else {
            this.append(`scoreboard objectives add ${name} ${type}`);
        }
    }
    addObjectives(objectives) {
        Object.keys(objectives).forEach((key) => {
            this.addObjective(objectives[key].name, objectives[key].type, objectives[key].label, objectives[key].value);
        });
    }
    resetObjective(target, name) {
        this.append(`scoreboard players reset ${target} ${name}`);
    }
    resetObjectives(target, objectives) {
        Object.keys(objectives).forEach((key) => {
            this.resetObjective(target, objectives[key].name);
        });
    }
    setObjective(target, name, value = null) {
        if (value != undefined) this.append(`scoreboard players set ${target} ${name} ${value || 0}`);
    }
    setObjectives(target, objectives) {
        Object.keys(objectives).forEach((key) => {
            this.setObjective(target, objectives[key].name, objectives[key].value);
        });
    }
}

module.exports = Command;
