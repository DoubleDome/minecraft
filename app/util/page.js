const { reset } = require('./util/command');
const command = require('./util/command');

class Page {
    lines = [];

    constructor() {}

    add(data) {
        switch (typeof data) {
            case 'object':
                this.lines = this.lines.concat(data);
                break;
            default:
                this.lines.push(data);
                break;
        }
    }

    reset() {
        this.lines = [];
    }
    export() {
        return this.lines;
    }
}

module.exports = Page;
