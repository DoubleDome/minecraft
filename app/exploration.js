// Generates the standalone "Coordinates" exploration book from a flat entries list.
// Mirrors app/book.js conventions but operates on data/exploration.json directly.

const ENTRIES_PER_PAGE = 12;

const DIM_LABEL = {
    overworld: 'Overworld',
    the_nether: 'Nether',
    the_end: 'End'
};
const DIM_COLOR = {
    overworld: 'dark_green',
    the_nether: 'dark_red',
    the_end: 'dark_purple'
};

class Exploration {
    create(data) {
        const entries = data.entries || [];
        const pageCount = Math.max(1, Math.ceil(entries.length / ENTRIES_PER_PAGE));
        const pages = [];
        for (let i = 0; i < pageCount; i++) {
            const slice = entries.slice(i * ENTRIES_PER_PAGE, (i + 1) * ENTRIES_PER_PAGE);
            pages.push({ raw: this.buildPage(data.title, slice, i + 1, pageCount) });
        }
        const content = {
            title: data.title,
            author: data.author,
            generation: 3,
            pages: pages.map(p => ({ raw: p.raw }))
        };
        const contentSnbt = JSON.stringify(content);
        const loreSnbt = JSON.stringify((data.lore || []).map(l => ({ text: l })));
        return `give @s written_book[written_book_content=${contentSnbt},lore=${loreSnbt}]`;
    }

    buildPage(title, entries, n, total) {
        const blocks = [];
        blocks.push([{ text: `${title} ${n}/${total}`, color: 'dark_purple' }]);
        blocks.push([{ text: '\n', color: 'black' }]);
        for (const e of entries) blocks.push(this.entryBlock(e));
        return blocks;
    }

    entryBlock(entry) {
        const dim = entry.dim || 'overworld';
        const cmd = `/execute in minecraft:${dim} run tp @s ${entry.x} ${entry.y} ${entry.z}`;
        return [
            { text: '\n▶ ', color: '#006600' },
            {
                text: entry.label,
                color: DIM_COLOR[dim] || 'dark_green',
                click_event: { action: 'run_command', command: cmd },
                hover_event: {
                    action: 'show_text',
                    value: `${DIM_LABEL[dim] || dim}  ${entry.x} ${entry.y} ${entry.z}`
                }
            }
        ];
    }
}

module.exports = new Exploration();
