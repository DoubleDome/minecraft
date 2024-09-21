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
        let result = this.generateMetadata(content.titles[type], content.author, content.lore, content.version, content.generation);
        // let temp2 = result.replace('%pages%', this.generatePages(type, locations));
        // console.log(temp2);
        result = result.replace('%pages%', this.generatePages(type, locations));
        let temp = this.generateCommand('give @a written_book[written_book_content=%content%]', result);
        console.log('\n', temp, '\n');
        return temp;
    }

    createBookGate() {
        const command = new Command();
        command.append(`execute if entity @s[team=${config.team.god.name}] run function madagascar:book/god`);
        command.append(`execute unless entity @s[team=${config.team.god.name}] run function madagascar:book/default`);
        return command.export();
    }

    generatePages(type, locations) {
        let result = '[';
        // switch (type) {
        //     case 'magic':
        //         result.push(JSON.stringify(this.generateMagicPage()));
        //         break;
        //     case 'god':
        //         result.push(JSON.stringify(this.generateMagicPage()));
        //         result.push(JSON.stringify(this.generateGodPage()));
        //         break;
        // }
        for (let l = 0; l < locations.length; l++) {
            let temp = this.generateLocationPage(locations[l]);
            // console.log(temp);
            result += temp;
            if (l < locations.length - 1) result += ',';
        }
        result += ']';
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
        return `{title:"${title} ${roman[version]}",author:"${author}",generation:3,pages:%pages%},lore=[${this.generateLore(lore)}]`;
    }
    generateLore(lore) {
        let result = '';
        for (let l = 0; l < lore.length; l++) {
            result += `'[${JSON.stringify({ text: lore[l] })}]'`;
            if (l < lore.length - 1) result += ',';
        }
        return result;
    }

    generateLocationPage(data) {
        let result = `'[`;
        result += this.generateHeader(data.header);
        for (let l = 0; l < data.locations.length; l++) {
            result += this.generateLocation(data.locations[l].label, data.locations[l].filename);
            if (l < data.locations.length - 1) result += ',';
        }
        result += `]'`;
        return result;
    }

    generateLocation(label, filename) {
        let result = '[';
        result += '{"text":"\\\\n\\\\u25b6 ","color":"#006600"},';
        result += `{"text":"${label}","color":"dark_green","clickEvent":{"action":"run_command","value":"/function ${config.package}:${config.folder.location}/${filename}"}}`;
        result += ']';
        return result;
    }

    generateHeader(label) {
        return `[{"text":"${label}",color: "dark_purple"}],`;
    }
    generateSpacer() {
        return '[{"text":"\\\\n","color": "black"}],';
    }

    generateCommand(command, data) {
        let result = '';
        result = result.concat(command);
        result = result.replace('%content%', data);

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
