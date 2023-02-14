const backup = require('./app/backup');
const operator = require('./app/operator');

backup.init('./Marzipan', './_backup', './_old');

backup.create();

console.log(backup.list());
// backup.restore('2022.11.30');

operator.test();



const playerhead = require('./playerhead');
// playerhead.load(path.resolve(__dirname, '../pack/data/madagascar/loot_tables/get_player_head.json'));
// playerhead.create(require('../data/killers.json'));

playerhead.load(path.resolve(__dirname, '../data/objectives.json'));
playerhead.addObjectives(require('../data/killers.json'));