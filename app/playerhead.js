const fse = require('fs-extra');
// minecraft.killed_by:minecraft.

// 26.3 loot format: functions are keyed by `type` and live under `modifier`;
// a single `condition` replaces the old `conditions` list.
const killerTemplate = {
    type: 'minecraft:set_lore',
    entity: 'this',
    lore: [
        [
            { text: 'Killed by: ', color: 'gray', italic: false },
            { text: 'KILLER', color: 'gold', italic: false },
        ],
    ],
    condition: {
        type: 'minecraft:entity_scores',
        entity: 'this',
        scores: {
            'jakarta.softcore.deaths': 0,
        },
    },
    replace: false,
};

const objectiveTemplate = {
    name: 'jakarta.stats.flight_distance',
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
        clone.condition.scores = {};
        clone.condition.scores[`jakarta.softcore.killer.${killer.type}`] = 1;
        clone.lore[0][1].text = killer.label;
        source.pools[0].entries[0].modifier.splice(8, 0, clone);
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
        clone.name = `jakarta.killer.${killer.type}`;
        clone.type = `minecraft.killed_by:minecraft.${killer.type}`;
        return clone;
    }
}

module.exports = new Playerhead();
