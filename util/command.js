class Command {
    /* Variables
    ----------------------------------------------------- */
    command = '';

    /* Body
    ----------------------------------------------------- */
    constructor() {
        this.reset();
    }
    reset() {
        this.command = '';
    }
    append(line) {
        this.command += line + '\n';
    }
    createShulker(location, dimension) {
        if (!dimension) {
            this.append(`setblock ${location} shulker_box`);
        } else {
            this.append(`execute in ${dimension} run setblock ${location} shulker_box`);
        }
    }
    clearBlock(location, dimension) {
        if (!dimension) {
            this.append(`setblock ${location} air`);
        } else {
            this.append(`execute in ${dimension} run setblock ${location} air`);
        }
    }
    clearStorage(namespace, variable) {
        this.append(`data remove storage ${namespace} ${variable}`);
    }
    clearInventory() {
        this.append('clear')
    }
    export() {
        return this.command;
    }
}

module.exports = new Command();