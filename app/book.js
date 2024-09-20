const Page = require('../util/page');
const Command = require('../util/command');

const roman = require('../data/roman.json');
const content = require('../data/book.json');
const config = require('../data/config.json');

class Book {
    create(locations) {
        const result = {};
        result.god = this.createBook('god', locations);
        result.magic = this.createBook('magic', locations);
        result.gate = this.createBookGate();
        return result;
    }
    createBook(type, locations) {
        const result = this.generateMetadata(content.titles[type], content.author, content.lore, content.version, content.generation);
        console.log(result);
        // result.pages = this.generateBook(type, locations);
        let temp = this.generateCommand('/give @a written_book[written_book_content=${content}]', result);
        console.log(temp);
        return temp;
    }

    createBookGate() {
        const command = new Command();
        command.append(`execute if entity @s[team=${config.team.god.name}] run function madagascar:book/god`);
        command.append(`execute unless entity @s[team=${config.team.god.name}] run function madagascar:book/default`);
        return command.export();
    }

    generateBook(type, pages) {
        const result = [];
        switch (type) {
            case 'magic':
                result.push(JSON.stringify(this.generateMagicPage()));
                break;
            case 'god':
                result.push(JSON.stringify(this.generateMagicPage()));
                result.push(JSON.stringify(this.generateGodPage()));
                break;
        }
        for (let page of pages) {
            result.push(JSON.stringify(this.generateLocationPage(page)));
        }
        return result;
    }

    generateGodPage() {
        const page = new Page();
        page.add(this.generateHeader(content.headings.god_page));
        page.add(this.generateSpacer());
        page.add(content.pickaxe);
        page.add(content.axe);
        page.add(content.shovel);
        page.add(content.hoe);
        page.add(content.shears);
        page.add(content.flint);
        page.add(this.generateSpacer());
        page.add(content.inventory);
        return page.export();
    }

    generateMagicPage() {
        const page = new Page();
        page.add(this.generateHeader(content.headings.magic_page));
        page.add(this.generateSpacer());
        page.add(content.modes);
        page.add(this.generateSpacer());
        page.add(content.players);
        page.add(this.generateSpacer());
        page.add(content.utility);
        page.add(this.generateSpacer());
        page.add(content.hardcore);
        return page.export();
    }

    generateMetadata(title, author, lore, version, generation) {
        return `{title:"${title} ${roman[version]}",author:"${author}",generation: 3},lore=[${this.generateLore(lore)}]`;
    }
    generateLore(lore) {
        let result = '';
        for (let l = 0; l < lore.length; l++) {
            result += `'[${JSON.stringify({ text: lore[l] })}]'`;
            if (l < lore.length - 1) {
                result += ',';
            }
        }
        // result += "]'";
        return result;
    }

    generateLocationPage(page) {
        let result = [];
        result.push(this.generateHeader(page.header));
        for (let location of page.locations) {
            result = result.concat(this.generateLocation(location.label, location.dimension, location.coordinates, location.filename));
        }
        return result;
    }

    generateLocation(label, dimension, coordinates, filename) {
        return [
            { text: '\\n\\u25b6 ', color: '#006600' },
            {
                text: label,
                color: 'dark_green',
                clickEvent: {
                    action: 'run_command',
                    value: `/function ${config.package}:${config.folder.location}/${filename}`,
                },
            },
        ];
    }

    generateHeader(label) {
        return {
            text: label,
            color: 'dark_purple',
        };
    }
    generateSubheader(label) {
        return {
            text: `\\n${label}:`,
            color: 'black',
        };
    }
    generateSpacer() {
        return { text: '\\n', color: 'black' };
    }

    generateCommand(command, data) {
        let result = '';
        result = result.concat(command);
        result = result.replace('${content}', data);

        // result = this.santizeProperty(result, 'title');
        // result = this.santizeProperty(result, 'author');
        // result = this.santizeProperty(result, 'lore');
        // result = this.santizeProperty(result, 'pages');
        // result = this.santizeProperty(result, 'display');

        // result = this.sanitizeQuotes(result);
        // result = this.sanitizeSlashes(result);

        // result = this.wrapWithQuote(result);
        return result;
    }

    santizeProperty(command, property) {
        return command.replace(`"${property}"`, property);
    }

    sanitizeQuotes(command) {
        let result = command.replace(/\\"/g, '"');
        // Clear out the quotes for Lore
        result = result.replace(/\"\'/g, "'").replace(/\'\"/g, "'");
        return result;
    }

    sanitizeSlashes(command) {
        return command.replace(/\\\\/g, '\\');
    }

    santizeBrackets(command) {
        return command.replace(/\[\"/g, '[').replace(/\"\]/g, ']');
    }

    wrapWithQuote(command) {
        return command.replace(/\"\[\{/g, "'[{").replace(/\}\}\]\"/g, "}}]'");
    }
}

module.exports = new Book();
