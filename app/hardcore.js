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
        result.stop_gate = this.createStopGate();
        result.gamemode_check = this.createGamemodeCheck();
        result.death_check = this.createDeathCheck();
        result.stop = this.createStop();
        result.pause = this.createPause();
        result.resume = this.createResume();
        result.toggle = this.createToggle();
        result.gamemode_lock = this.createGamemodeLock();
        result.player_head = this.createPlayerhead();
        result.prepare_marker = this.createPrepareMarker();
        result.place_marker = this.createPlaceMarker();
        result.dimension_gate = this.createDimensionGate();
        return result;
    }

    createLoad() {
        Load.getInstance().addObjectives(objectives.hardcore);
        Load.getInstance().addObjectives(objectives.killers);
        Load.getInstance().addObjectives(objectives.stats);
        Load.getInstance().addObjectives(objectives.position.start);
        Load.getInstance().addObjectives(objectives.position.death);
        Load.getInstance().addObjectives(objectives.time);
        Load.getInstance().addObjectives(objectives.distance.land);
        Load.getInstance().addObjectives(objectives.distance.air);
        Load.getInstance().addObjectives(objectives.distance.sea);
        Load.getInstance().append(`scoreboard objectives setdisplay list ${objectives.hardcore.deaths.name}`);
    }

    createTick() {
        Tick.getInstance().append(`execute as @p[tag=${config.tag.hardcore}] run function ${config.package}:gate/hardcore_death_check`);
        Tick.getInstance().append(`execute as @p[tag=${config.tag.hardcore}] run function ${config.package}:gate/hardcore_gamemode_check`);
    }

    createStart() {
        const command = new Command();
        command.clearInventory();
        command.clearExperience();
        command.resetRecipes();
        command.resetAdvancements();
        command.setObjectives('@s', objectives.stats);
        command.setObjectives('@s', objectives.killers);

        this.captureLocation(command, objectives.position.start);
        command.append(`tag @s add ${config.tag.hardcore}`);
        command.append(`gamemode survival @s`);
        return command.export();
    }
    createPause(){
        const command = new Command();
        command.append(`tag @s remove ${config.tag.hardcore}`);
        command.append(`tellraw @s {"text":"${config.label.message.pause}","italic":true,"color":"gold"}`);
        return command.export();
    }
    createResume() {
        const command = new Command();
        command.append(`tag @s add ${config.tag.hardcore}`);
        command.append(`tellraw @s {"text":"${config.label.message.resume}","italic":true,"color":"green"}`);
        return command.export();
    }
    createToggle() {
        const command = new Command();
        command.append(`execute store success score ${config.player.temp} ${objectives.temp.status.name} run data get entity @s[tag=${config.tag.hardcore}]`);
        command.append(`execute as @s if score ${config.player.temp} ${objectives.temp.status.name} matches 0 run function ${config.package}:hardcore/resume`);
        command.append(`execute as @s if score ${config.player.temp} ${objectives.temp.status.name} matches 1 run function ${config.package}:hardcore/pause`);
        return command.export();
    }
    createStartGate() {
        const command = new Command();
        command.append(`execute unless entity @s[tag=${config.tag.hardcore}] run function ${config.package}:hardcore/start`);
        return command.export();
    }
    createStopGate() {
        const command = new Command();
        command.append(`execute if entity @s[tag=${config.tag.hardcore}] run function ${config.package}:hardcore/stop`);
        return command.export();
    }
    createGamemodeCheck() {
        const command = new Command();
        command.append(`execute as @p[tag=${config.tag.hardcore},gamemode=!survival] run function ${config.package}:hardcore/gamemode_lock`);
        return command.export();
    }
    createDeathCheck() {
        const command = new Command();
        command.append(`execute as @p[tag=${config.tag.hardcore},scores={${objectives.stats.deaths.name}=1..,${objectives.hardcore.health.name}=1..}] run function ${config.package}:hardcore/stop`);
        return command.export();
    }
    createGamemodeLock() {
        const command = new Command();
        command.append(`tellraw @s {"text":"${config.label.message.locked}","italic":true,"color":"yellow"}`);
        command.append(`gamemode survival @s`);
        return command.export();
    }
    createStop() {
        const command = new Command();
        command.clearInventory();
        command.append(`tellraw @s {"text":"${config.label.message.death}","italic":true,"color":"red"}`);
        command.append(`scoreboard players add @s ${objectives.hardcore.deaths.name} 1`);
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
        command.append(`tag @s remove ${config.tag.hardcore}`);
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
        command.append(`execute store result score ${config.player.temp} ${objectives.temp.rotation.name} run loot spawn ~ ~ ~ loot ${config.function.get_random_number}`);
        // command.append(`execute at @s run setblock ~ ~ ~ minecraft:iron_bars replace`);
        // command.append(`execute at @s run setblock ~ ~1 ~ minecraft:iron_bars replace`);
        for (let index = 0; index <= 9; index++) {
            command.append(`execute at @s if score ${config.player.temp} ${objectives.temp.rotation.name} matches ${index} run setblock ~ ~${config.offset.player_head} ~ ${config.item.player_head}[rotation=${index}] replace`);
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
            command.append(`execute if score ${config.player.temp} ${objectives.hardcore.death_dimension.name} matches ${index} run execute as @s run execute in ${value} run function madagascar:hardcore/prepare_marker`);
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

        command.comment('temp player is needed later on when calling the place marker function, by then the scope of @s has changed');
        dimensions.forEach((value, index) => {
            command.append(`data modify storage ${config.namespace} ${objectives.hardcore.death_dimension.name} set from entity @s LastDeathLocation.dimension`);
            command.append(`execute store success score ${value} ${objectives.temp.status.name} run data modify storage ${config.namespace} ${objectives.hardcore.death_dimension.name} set value "${value}"`);
            command.append(`execute unless score ${value} ${objectives.temp.status.name} matches 1 run scoreboard players set ${config.player.temp} ${objectives.hardcore.death_dimension.name} ${index}`);
            command.append(`execute unless score ${value} ${objectives.temp.status.name} matches 1 run scoreboard players set @s ${objectives.hardcore.death_dimension.name} ${index}`);
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
        command.append(`execute as @s run function ${config.package}:gate/book`);
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
