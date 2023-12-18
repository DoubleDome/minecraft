const config = require('../data/config.json');

class Game {
    static settings = {};

    static createBoard(command, center, width, block) {
        const max = Game.settings.max_board_size;
        command.append(`execute in ${Game.settings.dimension} run summon ${config.item.marker} ${center} {Tags: ["${Game.settings.tag.center}"]}`);

        command.append(`execute in ${Game.settings.dimension} run execute as @e[type=${config.item.marker},tag=${Game.settings.tag.center}] align xyz run execute at @s run summon ${config.item.marker} ~-${width / 2} ~ ~-${width / 2} {Tags: ["${Game.settings.tag.corner}"]}`);
        command.append(`execute in ${Game.settings.dimension} run execute as @e[type=${config.item.marker},tag=${Game.settings.tag.center}] align xyz run execute at @s run summon ${config.item.marker} ~-${max / 2} ~ ~-${max / 2} {Tags: ["${Game.settings.tag.max_corner}"]}`);

        command.comment('clears everything...');
        command.append(`execute in ${Game.settings.dimension} run execute at @e[type=${config.item.marker},tag=${Game.settings.tag.max_corner}] align xyz run fill ~ ~ ~ ~${max} ~10 ~${max} ${config.item.air} replace`);
        command.append(`execute in ${Game.settings.dimension} run execute at @e[type=${config.item.marker},tag=${Game.settings.tag.corner}] align xyz run fill ~ ~ ~ ~${width} ~ ~${width} ${block} replace`);
    }
    static createStartingPoints(command, offset) {
        command.append(`execute in ${Game.settings.dimension} run execute at @e[type=${config.item.marker},tag=${Game.settings.tag.center}] run summon ${config.item.marker} ~${offset} ~1 ~ {Tags: ["${Game.settings.team.red.name}", "${config.tag.starting_point}"],Rotation:[90f,0f]}`);
        command.append(`execute in ${Game.settings.dimension} run execute at @e[type=${config.item.marker},tag=${Game.settings.tag.center}] run summon ${config.item.marker} ~-${offset} ~1 ~ {Tags: ["${Game.settings.team.blue.name}", "${config.tag.starting_point}"],Rotation:[-90f,0f]}`);
    }
    static scheduleCountdown(command, folder, callback) {
        command.append(`scoreboard players set ${Game.settings.player.temp} ${Game.settings.objectives.countdown.name} 3`);
        command.append(`schedule function ${config.package}:${Game.settings.folder}/countdown 2s append`);
        command.append(`schedule function ${config.package}:${Game.settings.folder}/countdown 3s append`);
        command.append(`schedule function ${config.package}:${Game.settings.folder}/countdown 4s append`);
        command.append(`schedule function ${config.package}:${Game.settings.folder}/${callback} 5s append`);
    }
    static createCountdown(command, times) {
        command.append(`title @a times ${times}`);
        command.append(`execute if score ${Game.settings.player.temp} ${Game.settings.objectives.countdown.name} matches 3 run title @a title {"text":"3", "color":"red"}`);
        command.append(`execute if score ${Game.settings.player.temp} ${Game.settings.objectives.countdown.name} matches 2 run title @a title {"text":"2", "color":"yellow"}`);
        command.append(`execute if score ${Game.settings.player.temp} ${Game.settings.objectives.countdown.name} matches 1 run title @a title {"text":"1", "color":"green"}`);
        command.append(`scoreboard players remove ${Game.settings.player.temp} ${Game.settings.objectives.countdown.name} 1`);
    }
    static createLobby(command, callback) {
        Game.createBoard(command, Game.settings.position.starting_point, 20, 'minecraft:black_concrete');
        command.comment('Place some lobby blocks');
        Game.createBlock(command, 'minecraft:white_concrete', { y: 1 });
        Game.createBlock(command, 'minecraft:red_concrete', { y: 1, z: 2 });
        Game.createBlock(command, 'minecraft:blue_concrete', { y: 1, z: -2 });
        Game.createButton(command, 'minecraft:polished_blackstone_button', { y: 2 });
        Game.createButton(command, 'minecraft:polished_blackstone_button', { y: 2, z: 2 });
        Game.createButton(command, 'minecraft:polished_blackstone_button', { y: 2, z: -2 });
        Game.createCommandBlock(command, {}, callback);
        Game.createCommandBlock(command, { z: 2 }, `/team join ${Game.settings.team.red.name} @p[sort=nearest,limit=1]`);
        Game.createCommandBlock(command, { z: -2 }, `/team join ${Game.settings.team.blue.name} @p[sort=nearest,limit=1]`);
    }
    static setupTimer(command, seconds) {
        command.comment('This is in ticks per second...');
        command.append(`bossbar add ${Game.settings.timer} "Time Remaining"`);
        command.append(`bossbar set ${Game.settings.timer} max ${seconds * 20}`);
        command.append(`bossbar set ${Game.settings.timer} visible false`);
        command.append(`bossbar set ${Game.settings.timer} players @a`);
    }
    static startTimer(command, seconds) {
        command.append(`scoreboard players set ${Game.settings.player.temp} ${Game.settings.objectives.timer.name} ${seconds * 20}`);
        command.append(`bossbar set ${Game.settings.timer} visible true`);
    }
    static setSpawnPoint(command, teams) {
        command.comment('Each team needs a starting point...');
        Object.entries(teams).forEach(([key, value]) => {
            command.append(`execute in ${Game.settings.dimension} run execute as @e[type=${config.item.marker},tag=${value.name}] run execute at @s run spawnpoint @p[team=${value.name}] ~ ~ ~`);
        });
    }
    static updateTimer(command) {
        command.append(
            `execute if score ${Game.settings.player.temp} ${Game.settings.objectives.timer.name} >= ${Game.settings.player.constants} ${Game.settings.objectives.zero.name} run execute store result bossbar ${Game.settings.timer} value run scoreboard players remove ${Game.settings.player.temp} ${Game.settings.objectives.timer.name} 1`
        );
    }
    static hideTimer(command) {
        command.append(`bossbar set ${Game.settings.timer} visible false`);
    }
    static removeTimer(command) {
        command.append(`bossbar remove ${Game.settings.timer}`);
    }
    static createBlock(command, type, offset) {
        command.append(`execute at @e[type=${config.item.marker},tag=${Game.settings.tag.center}] run setblock ~${offset.x || ''} ~${offset.y || ''} ~${offset.z || ''} ${type}`);
    }
    static createButton(command, type, offset) {
        command.append(`execute at @e[type=${config.item.marker},tag=${Game.settings.tag.center}] run setblock ~${offset.x || ''} ~${offset.y || ''} ~${offset.z || ''} ${type}[face=floor,facing=east]`);
    }
    static createCommandBlock(command, offset, callback) {
        command.append(`execute at @e[type=${config.item.marker},tag=${Game.settings.tag.center}] run setblock ~${offset.x || ''} ~${offset.y || ''} ~${offset.z || ''} minecraft:command_block{Command:"${callback}"} replace`);
    }
    static teleportPlayers(command) {
        command.append(`execute in ${Game.settings.dimension} run tp @e[team=${Game.settings.team.red.name}] @e[type=${config.item.marker},tag=${Game.settings.team.red.name},limit=1]`);
        command.append(`execute in ${Game.settings.dimension} run tp @e[team=${Game.settings.team.blue.name}] @e[type=${config.item.marker},tag=${Game.settings.team.blue.name},limit=1]`);
    }
    static announceRound(command, times = '10 50 10') {
        command.append(`title @a times ${times}`);
        command.append(`title @a title [{"text":"Round ", "color":"white"}, {"score":{"name":"${Game.settings.player.temp}","objective":"${Game.settings.objectives.round.name}"}}]`);
    }
    static announceGameOver(command, times = '10 60 10') {
        command.append(`title @a times ${times}`);
        command.append(`title @a title {"text":"${Game.settings.message.game_over}","italic":true,"color":"white"}`);
    }
    static addTeams(command, teams) {
        Object.entries(teams).forEach(([key, value]) => {
            command.append(`team add ${value.name} "${value.label}"`);
        });
    }
    static removeTeams(command, teams) {
        Object.entries(teams).forEach(([key, value]) => {
            command.append(`team remove ${value.name}`);
        });
    }
    static applyGameRules(command, rules) {
        Object.entries(rules).forEach(([key, value]) => {
            command.append(`gamerule ${key} ${value}`);
        });
    }
    static applyEffects(command, effects) {
        effects.forEach(effect => {
            command.append(`effect give @a ${effect.type} ${effect.duration} ${effect.level} ${effect.invisible || false}`);
        });
    }
    static clearEffects(command, effects) {
        effects.forEach(effect => {
            command.append(`effect clear @a ${effect.type}`);
        });
    }
}

module.exports = Game;
