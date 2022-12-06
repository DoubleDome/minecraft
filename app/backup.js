// Dependencies
const fs = require('fs-extra');

class Backup {
    constructor() {}

    init(sourcePath, backupPath, oldPath) {
        this.sourcePath = sourcePath;
        this.backupPath = backupPath;
        this.oldPath = oldPath;
    }

    create() {
        // Build Folder Name
        const folderName = this.getTodaysDate();
        const destinationPath = `${this.backupPath}/${folderName}`;

        if (fs.existsSync(destinationPath)) {
            console.log('Folder already exists!');
            return;
        }

        // Preform copy operation
        try {
            fs.copySync(this.sourcePath, destinationPath);
            console.log(`Backup Complete: ${folderName}`);
            return folderName;
        } catch (error) {
            console.warn(`Backup Failed: ${folderName}`);
            return;
        }
    }

    restore(folderName) {
        const newPath = `${this.oldPath}/${this.getTodaysDate()}`;
        const destinationPath = `${this.backupPath}/${folderName}`;

        if (!fs.existsSync(destinationPath)) {
            console.log('Folder does not exist!');
            return;
        }

        // Rename old directory
        try {
            fs.renameSync(this.sourcePath, newPath);
            console.log('Successfully renamed the directory.');
        } catch (error) {
            console.log(error);
        }
        // Preform copy operation
        try {
            fs.copySync(destinationPath, this.sourcePath);
            console.log(`Successfully restored backup: ${folderName}`);
        } catch (error) {
            console.error(error);
        }
    }

    list() {
        if (!fs.existsSync(this.backupPath)) {
            console.log('Folder does not exist!');
            return [];
        }
        try {
            const files = fs.readdirSync(this.backupPath, { withFileTypes: true })
                .filter((item) => item.isDirectory())
                .map((item) => item.name);
            return files;
        } catch (error) {
            console.error(error);
        }
    }

    /* Utilities
    ----------------------------------------------------*/
    getTodaysDate() {
        const todaysDate = new Date();
        return `${todaysDate.getFullYear()}.${this.getMonth(todaysDate)}.${todaysDate.getDate()}`;
    }

    getMonth(date) {
        const month = date.getMonth() + 1;
        return this.formatNumber(month);
    }
    formatNumber(number) {
        return number < 10 ? `0${number}` : number;
    }
}

module.exports = new Backup();
