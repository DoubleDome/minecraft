// Dependencies
const { exec } = require('child_process');

class Operator {
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
}

module.exports = new Operator();
