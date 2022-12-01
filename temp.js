const backup = require('./app/backup');

backup.init('./Marzipan', './_backup', './_old');

backup.create();

console.log(backup.list());
// backup.restore('2022.11.30')