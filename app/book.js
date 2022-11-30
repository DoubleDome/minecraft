const fs = require('fs');
const roman = require('../data/roman.json');
const commands = require('../data/commands.json');
const Page = require('../util/page');

class Book {
    create(type, book) {
        const result = this.generateMetadata(book.title, book.author, book.lore, book.version);
        result.pages = this.generatePages(type, book.pages);

        return this.generateCommand('give @s written_book', result);
    }

    generateGodPage() {
        const page = new Page();
        page.add(this.generateHeader('God Powers'));
        page.add(this.generateSpacer());
        page.add(commands.modes);
        page.add(this.generateSpacer());
        page.add(commands.players);
        page.add(this.generateSpacer());
        page.add(commands.utility);
        page.add(this.generateSpacer());
        page.add(commands.inventory);
        return page.export();
    }
    generateMagicPage() {
        const page = new Page();
        page.add(this.generateHeader('Magic Powers'));
        page.add(this.generateSpacer());
        page.add(commands.silk_tools);
        page.add(this.generateSpacer());
        page.add(commands.fortune_tools);
        page.add(this.generateSpacer());
        page.add(commands.other_tools);
        return page.export();
    }

    generatePages(type, pages) {
        const result = [];
        switch (type) {
            case 'god':
                result.push(JSON.stringify(this.generateMagicPage()));
                result.push(JSON.stringify(this.generateGodPage()));
            default:
                for (let page of pages) {
                    result.push(JSON.stringify(this.generatePage(page)));
                }
        }
        return result;
    }

    generatePage(page) {
        const result = [];
        result.push(this.generateHeader(page.header));
        result.push(this.generateSpacer());
        for (let location of page.locations) {
            result.push(this.generateLocation(location.label, location.dimension, location.coordinates));
        }
        return result;
    }

    generateLocation(label, dimension, coordinates) {
        return {
            text: `\\n\\u25b6 ${label}`,
            color: 'dark_green',
            clickEvent: {
                action: 'run_command',
                value: `/execute in ${dimension} run tp @s ${coordinates}`,
            },
        };
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
            bold: true,
            color: 'dark_purple',
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
