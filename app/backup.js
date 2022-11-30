// Dependencies
const fs = require('fs-extra');

class Backup {
    constructor() {}

    init(sourcePath, backupPath) {
        this.sourcePath = sourcePath;
        this.backupPath = backupPath;
    }

    create() {
        // Build Folder Name
        const todaysDate = new Date();

        const folderName = `${todaysDate.getFullYear()}.${this.getMonth(todaysDate)}.${todaysDate.getDate()}`;
        const destinationPath = `${this.backupPath}/${folderName}`;

        // Preform copy operation
        try {
            fs.copySync(this.sourcePath, destinationPath);
            console.log(`Backup Complete: ${folderName}`);
            return folderName;
          } catch (err) {
            console.warn(`Backup Failed: ${folderName}`);
            return;
        }
    }

    restore(folderName) {
        const newPath = './_old';
        const destinationPath = `${this.backupPath}/${folderName}`;

        // Rename old directory
        try {
            fs.renameSync(this.sourcePath, newPath);
            console.log('Successfully renamed the directory.');
        } catch (err) {
            console.log(err);
        }
        // Preform copy operation
        try {
            fs.copySync(destinationPath, this.sourcePath);
            console.log(`Successfully restored backup: ${folderName}`);
        } catch (err) {
            console.error(err);
        }
    }

    /* Utilities
    ----------------------------------------------------*/

    getMonth(date) {
        const month = date.getMonth() + 1;
        return this.formatUnder10(month);
    }
    formatUnder10(number) {
        return number < 10 ? `0${number}` : number;
    }
}

module.exports = new Backup();
