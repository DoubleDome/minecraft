const Command = require('../util/command');
const Game = require('../util/game');
const config = require('../data/config.json');
const settings = require('../data/dynamite.json');
const objectives = require('../data/objectives.json');
const Tick = require('./tick');

class Dynamite {
    create() {
        Game.settings = settings;

        Tick.getInstance().append(`execute if score ${settings.player.temp} ${settings.objectives.timer.name} > ${config.player.constants} ${objectives.constants.zero.name} run function ${config.package}:${settings.folder}/tick`);

        const result = {};
        result.init = this.createInit();
        result.tick = this.createTick();
        result.rules = this.createRules();
        result.start_game = this.createStartGame();
        result.prepare_round = this.createPrepareRound();
        result.start_round = this.createStartRound();
        result.countdown = this.createCountdown();
        result.end_round = this.createEndRound();
        result.progress_gate = this.createProgressGate();
        result.end_game = this.createEndGame();
        result.reset_game = this.createResetGame();
        result.exit = this.createExit();
        return result;
    }

    createInit() {
        const command = new Command();
        command.append(`time set ${settings.time}`);
        command.addObjectives(settings.objectives);
        command.setObjectives(settings.player.temp, settings.objectives);
        Game.addTeams(command, settings.team);
        Game.setupTimer(command, 30);
        command.append(`function ${config.package}:${settings.folder}/rules`);
        command.append(`function ${config.package}:${settings.folder}/reset_game`);
        return command.export();
    }
    createTick() {
        const command = new Command();
        Game.updateTimer(command);
        return command.export();
    }
    createRules() {
        const command = new Command();
        Game.applyGameRules(command, settings.rule);
        return command.export();
    }
    createExit() {
        const command = new Command();
        Game.applyGameRules(command, config.rule);
        Game.removeTeams(command, settings.team);
        Game.removeTimer(command);
        return command.export();
    }
    createPrepareRound() {
        const command = new Command();
        command.append(`clear @a`);

        Game.createBoard(command, settings.position.starting_point, settings.round.size, config.item.tnt);
        Game.createStartingPoints(command, 5);
        Game.teleportPlayers(command);
        Game.setSpawnPoint(command, settings.team);

        command.append(`kill @e[type=${config.item.item}]`);
        command.append(`kill @e[type=${config.item.marker}]`);

        Game.announceRound(command);
        Game.scheduleCountdown(command, 'dynamite', 'start_round');
        return command.export();
    }
    createCountdown() {
        const command = new Command();
        Game.createCountdown(command, '10 30 10');
        return command.export();
    }
    createStartGame() {
        const command = new Command();
        command.append(`function ${config.package}:${settings.folder}/prepare_round`);
        return command.export();
    }
    createStartRound() {
        const command = new Command();
        command.append(`playsound ${Game.settings.round.sound} master @a`);
        command.append(`loot give @a loot ${config.package}:get_dynamite_kit`);
        command.append(`title @a title {"text":"GO!", "color":"white"}`);
        command.append(`tellraw @a [{"text":"Round ","italic":true,"color":"green"}, {"score":{"name":"${settings.player.temp}","objective":"${settings.objectives.round.name}"}}, {"text":" has started!","italic":true,"color":"green"}]`);
        Game.startTimer(command, settings.round.duration);
        Game.applyEffects(command, settings.effect);
        command.append(`schedule function ${config.package}:${settings.folder}/end_round ${settings.round.duration}s replace`);
        return command.export();
    }
    createProgressGate() {
        const command = new Command();
        command.append(`execute if score ${settings.player.temp} ${settings.objectives.round.name} < ${settings.player.temp} ${settings.objectives.total_rounds.name} run function ${config.package}:${settings.folder}/prepare_round`);
        command.append(`execute if score ${settings.player.temp} ${settings.objectives.round.name} >= ${settings.player.temp} ${settings.objectives.total_rounds.name} run function ${config.package}:${settings.folder}/end_game`);
        return command.export();
    }
    createEndRound() {
        const command = new Command();
        command.append(`tellraw @a [{"text":"Round ","italic":true,"color":"gold"}, {"score":{"name":"${settings.player.temp}","objective":"${settings.objectives.round.name}"}}, {"text":" is over!","italic":true,"color":"gold"}]`);
        command.append(`clear @a`);
        Game.hideTimer(command);
        command.append(`scoreboard players add ${settings.player.temp} ${settings.objectives.round.name} 1`);
        command.append(`schedule function ${config.package}:${settings.folder}/progress_gate 2s`);
        return command.export();
    }
    createEndGame() {
        const command = new Command();
        Game.announceGameOver(command);
        Game.clearEffects(command, settings.effect);
        command.append(`scoreboard players operation ${settings.player.red} ${settings.objectives.deaths.name} += @e[team=${settings.team.red.name}] ${settings.objectives.deaths.name}`);
        command.append(`scoreboard players operation ${settings.player.blue} ${settings.objectives.deaths.name} += @e[team=${settings.team.blue.name}] ${settings.objectives.deaths.name}`);
        command.append(`execute if score ${settings.player.red} ${settings.objectives.deaths.name} < ${settings.player.blue} ${settings.objectives.deaths.name} run title @a subtitle {"text":"${settings.message.red_win}","italic":true,"color":"red"}`);
        command.append(`execute if score ${settings.player.blue} ${settings.objectives.deaths.name} < ${settings.player.red} ${settings.objectives.deaths.name} run title @a subtitle {"text":"${settings.message.blue_win}","italic":true,"color":"blue"}`);
        command.append(`execute if score ${settings.player.blue} ${settings.objectives.deaths.name} = ${settings.player.red} ${settings.objectives.deaths.name} run title @a subtitle {"text":"${settings.message.tie}","italic":true,"color":"gold"}`);
        command.append(`function ${config.package}:${settings.folder}/reset_game`);
        return command.export();
    }
    createResetGame() {
        const command = new Command();
        command.append(`scoreboard players set @e[team=${settings.team.red.name}] ${settings.objectives.deaths.name} 0`);
        command.append(`scoreboard players set @e[team=${settings.team.blue.name}] ${settings.objectives.deaths.name} 0`);
        command.append(`scoreboard players set ${settings.player.red} ${settings.objectives.deaths.name} 0`);
        command.append(`scoreboard players set ${settings.player.blue} ${settings.objectives.deaths.name} 0`);
        command.append(`scoreboard players set ${settings.player.temp} ${settings.objectives.round.name} 1`);
        Game.createLobby(command, `/schedule function ${config.package}:${settings.folder}/start_game 1s replace`);
        command.append(`kill @e[type=${config.item.marker}]`);
        return command.export();
    }
}

module.exports = new Dynamite();
