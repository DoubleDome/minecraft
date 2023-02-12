const Command = require('../util/command');
const config = require('../data/config.json');
const Load = require('./load');
const Tick = require('./tick');
let objectives = {};

class Hardcore {
    create(data) {
        objectives = data;

        this.createLoad();
        this.createTick();

        const result = {};
        result.start = this.createStart();
        result.start_gate = this.createStartGate();
        result.gamemode_check = this.createGamemodeCheck();
        result.death_check = this.createDeathCheck();
        result.reset = this.createReset();
        result.gamemode_lock = this.createGamemodeLock();
        result.player_head = this.createPlayerhead();
        result.prepare_marker = this.createPrepareMarker();
        result.place_marker = this.createPlaceMarker();
        result.dimension_gate = this.createDimensionGate();
        return result;
    }

    createLoad() {
        Load.getInstance().addObjectives(objectives.constants);
        Load.getInstance().addObjectives(objectives.hardcore);
        Load.getInstance().addObjectives(objectives.stats);
        Load.getInstance().addObjectives(objectives.position.start);
        Load.getInstance().addObjectives(objectives.position.death);
        Load.getInstance().addObjectives(objectives.time);
        Load.getInstance().addObjectives(objectives.distance.land);
        Load.getInstance().addObjectives(objectives.distance.air);
        Load.getInstance().addObjectives(objectives.distance.sea);
        Load.getInstance().setObjectives('#constants', objectives.constants);
        Load.getInstance().setObjectives('#constants', objectives.time);
        Load.getInstance().append(`scoreboard objectives setdisplay list ${objectives.hardcore.hardcore_deaths.name}`);
    }

    createTick() {
        Tick.getInstance().append(`execute as @p[tag=${config.tag.hardcore}] run function ${config.package}:gate/hardcore_death_check`);
        Tick.getInstance().append(`execute as @p[tag=${config.tag.hardcore}] run function ${config.package}:gate/hardcore_gamemode_check`);
    }

    createStart() {
        const command = new Command();
        command.clearInventory();
        command.clearExperience();
        command.setObjectives('@s', objectives.stats);
        this.captureLocation(command, objectives.position.start);
        command.append(`tag @s add hardcore`);
        command.append(`gamemode survival @s`);
        return command.export();
    }
    createStartGate() {
        const command = new Command();
        command.append(`execute unless entity @s[tag=${config.tag.hardcore}] run function ${config.package}:hardcore/start`);
        return command.export();
    }
    createGamemodeCheck() {
        const command = new Command();
        command.append(`execute as @p[tag=${config.tag.hardcore},gamemode=!survival] run function ${config.package}:hardcore/gamemode_lock`);
        return command.export();
    }
    createDeathCheck() {
        const command = new Command();
        command.append(`execute as @p[tag=${config.tag.hardcore},scores={${objectives.stats.deaths.name}=1..,${objectives.hardcore.health.name}=1..}] run function ${config.package}:hardcore/reset`);
        return command.export();
    }
    createGamemodeLock() {
        const command = new Command();
        command.append(`tellraw @s {"text":"${config.label.message.locked}","italic":true,"color":"gold"}`);
        command.append(`gamemode survival @s`);
        return command.export();
    }
    createReset() {
        const command = new Command();
        command.clearInventory();
        command.append(`tellraw @s {"text":"${config.label.message.death}","italic":true,"color":"red"}`);
        command.append(`scoreboard players add @s ${objectives.hardcore.hardcore_deaths.name} 1`);
        this.calculateTime(command);
        this.calculateDistance(command, 'land');
        this.calculateDistance(command, 'sea');
        this.calculateDistance(command, 'air');
        this.captureDeathLocation(command);
        this.captureLocation(command, objectives.position.death);
        this.captureDimension(command);
        command.append(`execute as @s run function ${config.package}:hardcore/player_head`);
        command.append(`execute as @s run function ${config.package}:gate/hardcore_dimension`);
        command.clearExperience();
        command.append(`tag @s remove hardcore`);
        return command.export();
    }
    createPrepareMarker() {
        const command = new Command();
        command.append(`summon ${config.item.marker} ~ ~ ~ {Tags:["${config.tag.death}"]}`);
        command.append(`execute as @e[type=${config.item.marker},tag=${config.tag.death}] run function ${config.package}:hardcore/place_marker`);
        return command.export();
    }

    createPlaceMarker() {
        const command = new Command();
        command.comment('scope of @s is now the marker');
        command.append(`data modify entity @s Pos set from storage ${config.namespace} ${config.storage.location}`);
        command.append(`execute store result score ${config.player.temp} ${objectives.hardcore.rotation.name} run loot spawn ~ ~ ~ loot ${config.function.get_random_number}`);
        // command.append(`execute at @s run setblock ~ ~ ~ minecraft:iron_bars replace`);
        // command.append(`execute at @s run setblock ~ ~1 ~ minecraft:iron_bars replace`);
        for (let index = 0; index <= 9; index++) {
            command.append(`execute at @s if score ${config.player.temp} ${objectives.hardcore.rotation.name} matches ${index} run setblock ~ ~${config.offset.player_head} ~ ${config.item.player_head}[rotation=${index}] replace`);
        }
        command.append(`execute at @s run setblock ~ ~${config.offset.light} ~ ${config.item.light}[level=5] replace`);
        command.append(`execute at @s run data modify block ~ ~${config.offset.player_head} ~ ExtraType set from storage ${config.namespace} ${config.storage.player_name}`);
        command.append(`kill @s`);
        return command.export();
    }

    createDimensionGate() {
        const command = new Command();
        const dimensions = Object.values(config.dimension);
        dimensions.shift();

        dimensions.forEach((value, index) => {
            command.append(`execute if score ${config.player.temp} ${config.score.death_dimension} matches ${index} run execute as @s run execute in ${value} run function madagascar:hardcore/prepare_marker`);
        });
        return command.export();
    }

    captureLocation(command, position) {
        Object.keys(position).forEach((key) => {
            command.append(`execute store result score @s ${position[key].name} run data get entity @s ${position[key].value}`);
        });
    }

    captureDeathLocation(command) {
        command.append(`data modify storage ${config.namespace} ${config.storage.location} set value [0.0d,0.0d,0.0d]`);
        for (let index = 0; index <= 2; index++) {
            command.append(`execute store result storage ${config.namespace} ${config.storage.location}[${index}] double 1.0 run data get entity @s LastDeathLocation.pos[${index}]`);
        }
    }
    captureDimension(command) {
        const dimensions = Object.values(config.dimension);
        dimensions.shift();

        command.append(`scoreboard objectives add ${config.score.dimension_change} dummy`);
        command.append(`scoreboard objectives add ${config.score.death_dimension} dummy`);
        command.comment('temp player is needed later on when calling the place marker function, by then the scope of @s has changed');
        dimensions.forEach((value, index) => {
            command.append(`data modify storage ${config.namespace} ${config.score.death_dimension} set from entity @s LastDeathLocation.dimension`);
            command.append(`execute store success score ${value} ${config.score.dimension_change} run data modify storage ${config.namespace} ${config.score.death_dimension} set value "${value}"`);
            command.append(`execute unless score ${value} ${config.score.dimension_change} matches 1 run scoreboard players set ${config.player.temp} ${config.score.death_dimension} ${index}`);
            command.append(`execute unless score ${value} ${config.score.dimension_change} matches 1 run scoreboard players set @s ${config.score.death_dimension} ${index}`);
        });
    }

    calculateTime(command) {
        command.append(`scoreboard players operation @s ${objectives.time.seconds.name} = @s ${objectives.stats.play_time.name}`);
        command.append(`scoreboard players operation @s ${objectives.time.seconds.name} /= #constants ${objectives.constants.ticks_per_second.name}`);
        command.append(`scoreboard players operation @s ${objectives.time.minutes.name} = @s ${objectives.time.seconds.name}`);
        command.append(`scoreboard players operation @s ${objectives.time.minutes.name} /= #constants ${objectives.constants.seconds_per_minute.name}`);
        command.append(`scoreboard players operation @s ${objectives.time.hours.name} = @s ${objectives.time.minutes.name}`);
        command.append(`scoreboard players operation @s ${objectives.time.hours.name} /= #constants ${objectives.constants.minutes_per_hour.name}`);
        command.append(`scoreboard players operation @s ${objectives.time.seconds.name} %= #constants ${objectives.constants.seconds_per_minute.name}`);
        command.append(`scoreboard players operation @s ${objectives.time.minutes.name} %= #constants ${objectives.constants.minutes_per_hour.name}`);
    }

    calculateDistance(command, type) {
        const data = objectives.distance[type];
        this.aggregateObjectives(command, data.m);
        this.aggregateObjectives(command, data.km);

        command.append(`scoreboard players operation @s ${objectives.distance[type].m.name} /= #constants ${objectives.constants.cm_to_m.name}`);
        command.append(`scoreboard players operation @s ${objectives.distance[type].km.name} /= #constants ${objectives.constants.cm_to_km.name}`);
        command.append(`scoreboard players operation @s ${objectives.distance[type].m.name} %= #constants ${objectives.constants.m_to_km.name}`);
    }

    createPlayerhead() {
        const command = new Command();
        command.createShulker(config.coordinate.shulker.item);
        command.append(`loot replace block ${config.coordinate.shulker.item} container.0 loot ${config.function.get_player_head}`);
        command.append(`data modify storage ${config.namespace} ${config.storage.player_name} set from block ${config.coordinate.shulker.item} Items[{Slot:0b}].tag.SkullOwner.Name`);
        command.append(`loot give @s mine ${config.coordinate.shulker.item} ${config.item.air}`);
        command.clearBlock(config.coordinate.shulker.item);
        return command.export();
    }

    aggregateObjectives(command, objective) {
        if (objective.collection) {
            objective.collection.forEach((item) => {
                command.append(`scoreboard players operation @s ${objective.name} += @s ${objectives.stats[item].name}`);
            });
        }
    }
}

module.exports = new Hardcore();
