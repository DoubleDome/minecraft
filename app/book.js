const Command = require('../util/command');

const roman = require('../data/roman.json');
const content = require('../data/book.json');
const config = require('../data/config.json');

const LOCATIONS_PER_PAGE = 12;

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
        let temp = this.generateCommand('give @s written_book[written_book_content=%content%]', result);
        console.log('\n', temp, '\n');
        return temp;
    }

    createBookGate() {
        const command = new Command();
        command.append(`execute if entity @s[team=${config.team.god.name}] run function madagascar:book/god`);
        command.append(`execute unless entity @s[team=${config.team.god.name}] run function madagascar:book/magic`);
        return command.export();
    }

    generatePages(type, locations) {
        let result = '[';
        result += `{raw:${this.generateMagicPage()}}`;
        if (type === 'god') {
            result += ',';
            result += `{raw:${this.generateGodPage()}}`;
        }
        for (let l = 0; l < locations.length; l++) {
            const pages = this.generateLocationPages(locations[l]);
            for (let p = 0; p < pages.length; p++) {
                result += ',';
                result += `{raw:${pages[p]}}`;
            }
        }
        result += ']';
        return result;
    }

    generateGodPage() {
        let result = `[`;
        result += this.generateHeader(content.headings.god_page);
        result += this.generateSpacer();
        result += this.generateBlock(content.pickaxe);
        result += ',';
        result += this.generateBlock(content.axe);
        result += ',';
        result += this.generateBlock(content.shovel);
        result += ',';
        result += this.generateBlock(content.hoe);
        result += ',';
        result += this.generateBlock(content.shears);
        result += ',';
        result += this.generateBlock(content.flint);
        result += ',';
        result += this.generateSpacer();
        result += this.generateBlock(content.inventory);
        result += `]`;
        return result;
    }

    generateMagicPage() {
        let result = `[`;
        result += this.generateHeader(content.headings.magic_page);
        result += this.generateSpacer();
        result += this.generateBlock(content.modes);
        result += ',';
        result += this.generateSpacer();
        result += this.generateBlock(content.players);
        result += ',';
        result += this.generateSpacer();
        result += this.generateBlock(content.utility);
        result += ',';
        result += this.generateSpacer();
        result += this.generateBlock(content.softcore);
        result += `]`;
        return result;
    }

    generateBlock(components) {
        return '[' + components.map(c => JSON.stringify(c)).join(',') + ']';
    }

    generateMetadata(title, author, lore, version, generation) {
        return `{title:"${title} ${roman[version]}",author:"${author}",generation:3,pages:%pages%},lore=[${this.generateLore(lore)}]`;
    }
    generateLore(lore) {
        let result = '';
        for (let l = 0; l < lore.length; l++) {
            result += JSON.stringify({ text: lore[l] });
            if (l < lore.length - 1) result += ',';
        }
        return result;
    }

    generateLocationPages(data) {
        const pages = [];
        const locations = data.locations;
        const chunkSize = Math.max(1, LOCATIONS_PER_PAGE);
        // Always emit at least one page so an empty group still renders its header
        const chunkCount = Math.max(1, Math.ceil(locations.length / chunkSize));
        for (let c = 0; c < chunkCount; c++) {
            const slice = locations.slice(c * chunkSize, (c + 1) * chunkSize);
            let result = `[`;
            result += this.generateHeader(data.header);
            result += this.generateSpacer();
            for (let l = 0; l < slice.length; l++) {
                result += this.generateLocation(slice[l].label, slice[l].filename);
                if (l < slice.length - 1) result += ',';
            }
            result += `]`;
            pages.push(result);
        }
        return pages;
    }

    generateLocation(label, filename) {
        let result = '[';
        result += '{"text":"\\n▶ ","color":"#006600"},';
        // 1.21.5+ renamed clickEvent -> click_event and the value field for run_command -> command
        result += `{"text":"${label}","color":"dark_green","click_event":{"action":"run_command","command":"/function ${config.package}:${config.folder.location}/${filename}"}}`;
        result += ']';
        return result;
    }

    generateHeader(label) {
        return `[{"text":"${label}","color":"dark_purple"}],`;
    }
    generateSpacer() {
        return '[{"text":"\\n","color":"black"}],';
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
