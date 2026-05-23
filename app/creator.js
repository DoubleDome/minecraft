// Dependencies
const fse = require('fs-extra');
const path = require('path');
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
        // Refuse to nuke anything that looks like a source directory.
        // Why: an unset env var once resolved to the project root and wiped app/, util/, .git, etc.
        if (!target || typeof target !== 'string') {
            throw new Error(`Creator.destroy: invalid target ${target}`);
        }
        const resolved = path.resolve(target);
        const sentinels = ['package.json', '.git', 'node_modules'];
        for (const name of sentinels) {
            if (fse.existsSync(path.join(resolved, name))) {
                throw new Error(`Creator.destroy: refusing to delete ${resolved} — contains ${name}. This looks like a source directory, not a generator output path.`);
            }
        }
        fse.rmSync(resolved, { recursive: true, force: true });
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
