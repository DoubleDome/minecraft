// Dependencies
const fs = require('fs');

class Creator {
    constructor() {}

    write(path, content) {
        try {
            fs.writeFileSync(path, content);
            console.log(`File created at: ${path}`);
        } catch (err) {
            console.error(err);
        }
    }
}

module.exports = new Creator();
