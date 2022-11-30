class Transformer {
    formatForAutoComplete(blocks) {
        const result = [];
        blocks.forEach(block => {
            result.push({label:block.name, value:block.namespace})
        });
        return JSON.stringify(result);
    }
}

module.exports = new Transformer;