// Dependencies
const fs = require('fs');

class Creator {
    constructor() {}

    init() {}

    test() {
        exec('ls -la', (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
        });
    }

    write(path, content) {
        try {
            fs.writeFileSync(path, content);
            console.log(`File created at: ${path}`);
        } catch (err) {
            console.error(err);
        }
    }

    /* Utilities
    ----------------------------------------------------*/

    getMonth(date) {}
}

module.exports = new Creator();
