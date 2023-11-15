const Command = require('../util/command');
const config = require('../data/config.json');

class Resource {
    create(resources) {
        let result = '';
        // loop through resources.entries
        resources.entries.forEach((entry) => {
            // append entry.create()
            entry.variants.forEach((variant, index) => {
                switch (variant.type) {
                    case 'item':
                        result += this.createNameItem(entry.base, variant.name, index + 1);
                        break;
                    case 'mob':
                        result += this.createNamedEntity(entry.base, variant.name, index + 1);
                        break;
                }
            });
        });
        return result;
    }
    createNameItem(base, name, index) {
        return `type=item\nitems=minecraft:${base}\nnbt.display.Name=ipattern:*${name}*\n`;
    }
    createNamedEntity(name, index) {
        return `${name}\nskins.${index}=${index}\nname.${index}=${name}\n--------------------\n`;
    }
}

module.exports = new Resource();
