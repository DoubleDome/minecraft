// Dependencies
const fse = require('fs-extra');
const clc = require('cli-color');

class Creator {

    write(path, content) {
        try {
            fse.writeFileSync(path, content);
            console.log(clc.green('Created:'), path);
        } catch (err) {
            console.error(err);
        }
    }

    destroy(target) {
        fse.rmSync(target, { recursive: true, force: true });
    }

    clone(source, destination) {
        fse.copySync(source, destination, { overwrite: true });
    }

    validate(destination) {
        if (!fse.existsSync(destination)) {
            fse.mkdirSync(destination);
            console.log(clc.green('Created:'), destination);
        }
        return destination;
    }
}

module.exports = new Creator();
