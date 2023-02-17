const fse = require('fs-extra');
// minecraft.killed_by:minecraft.

const killerTemplate = {
    function: 'minecraft:set_lore',
    entity: 'this',
    lore: [
        [
            { text: 'Killed by: ', color: 'gray', italic: false },
            { text: 'KILLER', color: 'gold', italic: false },
        ],
    ],
    conditions: [
        {
            condition: 'minecraft:entity_scores',
            entity: 'this',
            scores: {
                'madagascar.hardcore.deaths': 0,
            },
        },
    ],
    replace: false,
};

const objectiveTemplate = {
    name: 'madagascar.stats.flight_distance',
    type: 'minecraft.custom:minecraft.aviate_one_cm',
    value: 0,
};
let source;
class Playerhead {
    load(path) {
        try {
            source = JSON.parse(fse.readFileSync(path));
        } catch (error) {
            console.log(error);
        }
    }
    create(killers) {
        this.addKillers(killers);
        this.addObjectives(killers);
    }
    addKillers(killers) {
        killers.forEach((killer) => {
            this.addKiller(killer);
        });
        console.log('\n', JSON.stringify(source));
    }
    addKiller(killer) {
        const clone = JSON.parse(JSON.stringify(killerTemplate));
        clone.conditions[0].scores = {};
        clone.conditions[0].scores[`madagascar.hardcore.killer.${killer.type}`] = 1;
        clone.lore[0][1].text = killer.label;
        source.pools[0].entries[0].functions.splice(8, 0, clone);
    }
    addObjectives(killers) {
        const result = {};
        killers.forEach((killer) => {
            result[killer.type] = this.addObjective(killer);
        });
        source.killers = result;
        console.log('\n', JSON.stringify(source));
    }
    addObjective(killer) {
        const clone = JSON.parse(JSON.stringify(objectiveTemplate));
        clone.name = `madagascar.killer.${killer.type}`;
        clone.type = `minecraft.killed_by:minecraft.${killer.type}`;
        return clone;
    }
}

module.exports = new Playerhead();
