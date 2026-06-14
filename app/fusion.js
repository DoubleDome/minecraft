const Command = require('../util/command');
const config = require('../data/config.json');
const roman = require('../data/roman.json');
const Load = require('./load');
const Tick = require('./tick');

const pkg = config.package;            // "jakarta"
const storage = `${pkg}:fusion`;       // storage id for macro args + roman table

// Fusion Altar: drop two same-tier swords + a Nether Star on top of a smithing
// table; a tick detector fuses them into the next tier. All 7 sword materials,
// unlimited tiers. Pure functions (no recipes) so it reloads live — no restart.
//
// Tier lives in the result's custom_data (vanilla swords = tier 1). Material is
// the base item id, unchanged across tiers, so detection is per-material.
// shown damage = base + (tier-1)*STEP ; attribute amount = shown - 1 (player base 1).
const STEP = 2;
const UNBREAK_TIER = 4;
const RADIUS = 1.6;                     // items resting on the table near the star

// base = vanilla shown attack damage for that material's sword
const materials = [
    { mat: 'wooden', matName: 'Wooden', base: 4 },
    { mat: 'stone', matName: 'Stone', base: 5 },
    { mat: 'copper', matName: 'Copper', base: 5 },
    { mat: 'iron', matName: 'Iron', base: 6 },
    { mat: 'golden', matName: 'Golden', base: 4 },
    { mat: 'diamond', matName: 'Diamond', base: 7 },
    { mat: 'netherite', matName: 'Netherite', base: 8 },
];

class Fusion {
    create() {
        this.createSetup();
        return {
            tick: this.createTick(),
            at_star: this.createAtStar(),
            scan: this.createScan(),
            do: this.createDo(),
            roman: this.createRoman(),
            spawn: this.createSpawn(),
            consume_star: this.createConsumeStar(),
        };
    }

    // Objectives + constants + roman lookup table, run once on load.
    createSetup() {
        Load.getInstance().addObjective('fuse_tier', 'dummy');
        Load.getInstance().addObjective('fuse_calc', 'dummy');
        Load.getInstance().append(`scoreboard players set #STEP fuse_calc ${STEP}`);
        Load.getInstance().append(`data modify storage ${storage} roman set value ${JSON.stringify(roman)}`);
        Tick.getInstance().append(`function ${pkg}:fuse/tick`);
    }

    createTick() {
        const c = new Command();
        c.comment('Fusion Altar: clear stale tags, then check every smithing table with a nether star on top');
        c.append('tag @e[type=item,tag=fuse_m] remove fuse_m');
        c.append('tag @e[type=item,tag=fuse_pair] remove fuse_pair');
        c.append(`execute as @e[type=item,nbt={Item:{id:"minecraft:nether_star"}}] at @s if block ~ ~-1 ~ minecraft:smithing_table run function ${pkg}:fuse/at_star`);
        return c.export();
    }

    // Run as the nether star, positioned at it. Try each material; stop at the
    // first successful fuse so one star drives at most one fuse per tick.
    createAtStar() {
        const c = new Command();
        c.comment('One fuse per star per tick');
        c.append('scoreboard players set #done fuse_calc 0');
        materials.forEach(({ mat, matName, base }) => {
            c.append(`execute unless score #done fuse_calc matches 1 run function ${pkg}:fuse/scan {mat:"${mat}",matName:"${matName}",base:${base}}`);
        });
        return c.export();
    }

    // Macro {mat, matName, base}. Detect >=2 swords of this material sharing a tier
    // on the table, then hand off to do.
    createScan() {
        const c = new Command();
        c.comment('Reset local tags so materials do not bleed into each other');
        c.append(`tag @e[type=item,distance=..${RADIUS},tag=fuse_m] remove fuse_m`);
        c.append(`tag @e[type=item,distance=..${RADIUS},tag=fuse_pair] remove fuse_pair`);
        c.comment('Tag this material\'s sword items on the table; read tier (vanilla = 1)');
        c.append(`$tag @e[type=item,nbt={Item:{id:"minecraft:$(mat)_sword"}},distance=..${RADIUS}] add fuse_m`);
        c.append(`scoreboard players set @e[tag=fuse_m,distance=..${RADIUS}] fuse_tier 1`);
        c.append(`execute as @e[tag=fuse_m,distance=..${RADIUS}] store result score @s fuse_tier run data get entity @s Item.components."minecraft:custom_data".fusion_tier`);
        c.comment('Anchor = nearest sword; keep only swords of that same tier');
        c.append('scoreboard players set #k fuse_tier 0');
        c.append(`execute as @e[tag=fuse_m,distance=..${RADIUS},sort=nearest,limit=1] run scoreboard players operation #k fuse_tier = @s fuse_tier`);
        c.append(`tag @e[tag=fuse_m,distance=..${RADIUS}] add fuse_pair`);
        c.append(`execute as @e[tag=fuse_pair,distance=..${RADIUS}] unless score @s fuse_tier = #k fuse_tier run tag @s remove fuse_pair`);
        c.comment('Need at least two of the same material + tier');
        c.append(`execute store result score #n fuse_calc if entity @e[tag=fuse_pair,distance=..${RADIUS}]`);
        c.append(`$execute if score #n fuse_calc matches 2.. run function ${pkg}:fuse/do {mat:"$(mat)",matName:"$(matName)",base:$(base)}`);
        return c.export();
    }

    // Macro {mat, matName, base}. Run as the star at the table. Compute the upgrade,
    // consume inputs, spawn the next-tier sword, consume one nether star.
    createDo() {
        const c = new Command();
        c.comment('newTier = anchor tier + 1');
        c.append('scoreboard players operation #t fuse_tier = #k fuse_tier');
        c.append('scoreboard players add #t fuse_tier 1');
        c.comment('attack_damage amount = base - 1 + (newTier - 1) * STEP');
        c.append('scoreboard players operation #dmg fuse_tier = #t fuse_tier');
        c.append('scoreboard players remove #dmg fuse_tier 1');
        c.append('scoreboard players operation #dmg fuse_tier *= #STEP fuse_calc');
        c.append('$scoreboard players add #dmg fuse_tier $(base)');
        c.append('scoreboard players remove #dmg fuse_tier 1');
        c.comment('Assemble macro args for the output item');
        c.append(`data modify storage ${storage} args set value {}`);
        c.append(`$data modify storage ${storage} args.mat set value "$(mat)"`);
        c.append(`$data modify storage ${storage} args.matName set value "$(matName)"`);
        c.append(`execute store result storage ${storage} args.tier int 1 run scoreboard players get #t fuse_tier`);
        c.append(`execute store result storage ${storage} args.dmg int 1 run scoreboard players get #dmg fuse_tier`);
        c.append(`function ${pkg}:fuse/roman with storage ${storage} args`);
        c.comment('Tier colour: II aqua, III blue, IV light_purple, V+ gold');
        c.append(`data modify storage ${storage} args.color set value "gold"`);
        c.append(`execute if score #t fuse_tier matches 2 run data modify storage ${storage} args.color set value "aqua"`);
        c.append(`execute if score #t fuse_tier matches 3 run data modify storage ${storage} args.color set value "blue"`);
        c.append(`execute if score #t fuse_tier matches 4 run data modify storage ${storage} args.color set value "light_purple"`);
        c.comment('Consume two swords, make the upgrade, consume one nether star');
        c.append(`kill @e[tag=fuse_pair,distance=..${RADIUS},sort=nearest,limit=2]`);
        c.append(`function ${pkg}:fuse/spawn with storage ${storage} args`);
        c.append(`execute if score #t fuse_tier matches ${UNBREAK_TIER}.. run data modify entity @e[type=item,tag=fuse_new,distance=..2,limit=1] Item.components."minecraft:unbreakable" set value {}`);
        c.append('tag @e[type=item,tag=fuse_new] remove fuse_new');
        c.append('particle minecraft:enchant ~ ~0.5 ~ 0.4 0.4 0.4 0.2 40');
        c.append('playsound minecraft:block.anvil.use block @a[distance=..16] ~ ~ ~');
        c.append(`function ${pkg}:fuse/consume_star`);
        c.append('scoreboard players set #done fuse_calc 1');
        return c.export();
    }

    // Macro {tier}. Look up the roman numeral; fall back to the digit past the table.
    createRoman() {
        const c = new Command();
        c.append(`$data modify storage ${storage} args.roman set value "$(tier)"`);
        c.append(`$data modify storage ${storage} args.roman set from storage ${storage} roman."$(tier)"`);
        return c.export();
    }

    // Macro {mat, matName, color, roman, tier, dmg}. Build the upgraded sword fresh
    // (enchantments intentionally NOT carried). Tagged fuse_new so do can finish it.
    createSpawn() {
        const c = new Command();
        c.append(`$summon item ~ ~0.4 ~ {Tags:["fuse_new"],PickupDelay:20,Item:{id:"minecraft:$(mat)_sword",count:1,components:{"minecraft:item_name":{text:"$(matName) Sword $(roman)",color:"$(color)",italic:false},"minecraft:enchantment_glint_override":true,"minecraft:custom_data":{fusion_sword:true,material:"$(mat)",fusion_tier:$(tier)},"minecraft:attribute_modifiers":{modifiers:[{type:"minecraft:attack_damage",id:"${pkg}:fusion.attack_damage",amount:$(dmg)d,operation:"add_value",slot:"mainhand"},{type:"minecraft:attack_speed",id:"${pkg}:fusion.attack_speed",amount:-2.4d,operation:"add_value",slot:"mainhand"}]}}}}`);
        return c.export();
    }

    // Run as the nether star. Decrement its stack by one; remove it if that empties it.
    createConsumeStar() {
        const c = new Command();
        c.append('execute store result score #c fuse_tier run data get entity @s Item.count');
        c.append('scoreboard players remove #c fuse_tier 1');
        c.append('execute if score #c fuse_tier matches ..0 run kill @s');
        c.append('execute if score #c fuse_tier matches 1.. run execute store result entity @s Item.count int 1 run scoreboard players get #c fuse_tier');
        return c.export();
    }
}

module.exports = new Fusion();
