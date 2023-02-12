const Page = require('../util/page');

const roman = require('../data/roman.json');
const content = require('../data/book.json');
const config = require('../data/config.json');

class Book {
    create(type, locations) {
        const result = this.generateMetadata(content.titles[type], content.author, content.lore, content.version);
        result.pages = this.generateBook(type, locations);

        return this.generateCommand('give @s written_book', result);
    }

    generateBook(type, pages) {
        const result = [];
        switch (type) {
            case 'god':
                result.push(JSON.stringify(this.generateGodPage()));
            default:
                result.push(JSON.stringify(this.generateMagicPage()));
                for (let page of pages) {
                    result.push(JSON.stringify(this.generateLocationPage(page)));
                }
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
                    value: `/execute in ${dimension} run tp @s ${coordinates}`,
                    value: `/function ${config.package}:${config.folder.location}/${filename}`,
                },
            },
        ];
    }

    generateMetadata(title, author, lore, version) {
        return {
            title: `${title} ${roman[version]}`,
            author: author,
            display: { Lore: [this.generateLore(lore)] },
        };
    }
    generateLore(lore) {
        let result = '';
        lore.forEach((line) => {
            result += `'${JSON.stringify({ text: line })}',`;
        });
        return result.substring(0, result.length - 1).toString();
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
        return { text: '\\n', color: 'reset' };
    }

    generateCommand(command, data) {
        let result = '';
        result = result.concat(command);
        result = result.concat(JSON.stringify(data));

        result = this.santizeProperty(result, 'title');
        result = this.santizeProperty(result, 'author');
        result = this.santizeProperty(result, 'pages');
        result = this.santizeProperty(result, 'display');
        result = this.santizeProperty(result, 'Lore');

        result = this.sanitizeQuotes(result);

        result = this.sanitizeSlashes(result);
        result = this.wrapWithQuote(result);

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
