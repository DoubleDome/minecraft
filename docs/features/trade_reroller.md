# Trade Reroller

A crafted **stick** that rerolls a villager's trades on right-click — no breaking the workstation,
and it works even **after** the villager has been traded with (which the vanilla lectern trick
can't). Vanilla 26.1.2, no mods. Reloadable (`/reload`, no restart).

---

## Goal

| Property | Value |
| --- | --- |
| Item | `minecraft:stick` + `custom_data:{trade_reroller:true}`, named "Trade Reroller" (green, glint) |
| Recipe | shapeless: 1 `minecraft:stick` + 1 `minecraft:emerald` → 1 Trade Reroller (reusable, not consumed) |
| Use | right-click any villager → its trades reroll to a fresh **level-1** random set |
| Beats the vanilla lock | yes — rerolls even villagers that have already traded (lectern-breaking can't) |

## Why breaking a lectern stops working (and this doesn't)

A villager only re-randomizes its whole trade list when it **gains a profession** from a job-site
block. Break + replace the lectern → it loses + regains the profession → reroll. But vanilla refuses
to let a villager drop its profession **once it has earned trade XP** (your first trade with it), so
after one trade the lectern trick is dead. This tool force-unemploys via NBT, bypassing that gate.

## How it works (mark → trigger → reroll)

1. **Mark.** The recipe stamps the stick with `custom_data:{trade_reroller:true}` and a green name.
2. **Trigger.** [`advancement/reroll/use.json`](../pack/data/madagascar/advancement/reroll/use.json)
   uses `minecraft:player_interacted_with_entity` (item = the marked stick, entity = a villager). It
   fires from the entity-interact packet handler, so it triggers on the right-click regardless of the
   trade GUI opening. Its reward runs `madagascar:reroll/run`.
3. **Reroll.** [`reroll/run`](../pack/data/madagascar/function/reroll/run.mcfunction) revokes the
   advancement (re-arming the one-shot trigger) and calls [`reroll/wipe`](../pack/data/madagascar/function/reroll/wipe.mcfunction)
   on the nearest villager in reach, which:
   - zeroes `Xp` (drops the "traded = locked" state),
   - `data remove`s `Offers` (clears the trade list),
   - sets `VillagerData.profession` to `minecraft:none` (force-unemploy).

   Standing at its job site, the villager re-employs next and vanilla rolls a fresh **level-1** trade
   list — identical to a never-traded villager.

## 26.1.2 NBT (verified from the server jar)

| Where | Key | Note |
| --- | --- | --- |
| villager entity | `Offers.Recipes` | the trade list (MerchantOffers → `Recipes`) |
| villager entity | `Xp` | earned trade XP; zeroing it unlocks the reroll |
| villager entity | `VillagerData` | `{type, profession, level}` — string ids in 26.x |
| item predicate | `predicates:{ "minecraft:custom_data": "{...}" }` | partial-NBT match (1.20.5+ form) |

## Files (all static under `pack/`)

| File | Role |
| --- | --- |
| `pack/data/madagascar/recipe/trade_reroller.json` | the stick recipe (stick + emerald) |
| `pack/data/madagascar/advancement/reroll/use.json` | interact-with-villager trigger → reward fn |
| `pack/data/madagascar/function/reroll/run.mcfunction` | re-arm trigger + target the clicked villager |
| `pack/data/madagascar/function/reroll/wipe.mcfunction` | clear Xp/Offers + unemploy = reroll |

## Caveats & tuning

- **Targets the nearest villager within 4.5 blocks of the player.** The interact packet guarantees
  the clicked villager is close and in front, so nearest is reliable; a tight cluster of villagers is
  the only case where it could hit the wrong one. (A look-vector raycast would be exact but is
  overkill here.)
- **It re-employs to the adjacent job site.** If a *different* job-site block is closer when it
  re-hires, it could change profession. In a normal trading hall (one villager per workstation),
  it re-becomes the same profession. Resets to **level 1** — intended for book/trade hunting.
- **No cooldown.** Each click rerolls again; spam-clicking just rerolls repeatedly. Add a scoreboard
  cooldown in `reroll/run` if you want to throttle it.
- **Unemployed / nitwit / baby villagers are skipped** (`reroll/wipe` returns early) — nothing to
  reroll.
- **Reusable, not consumed.** Advancement-triggered use doesn't eat the item. Make it consumable by
  `clear`ing one from `@s` in `reroll/run` if you'd rather it be single-use.

## Deploy & test

```
node index.js live
/reload
```
```mcfunction
# give yourself the stick directly
give @s minecraft:stick[custom_data={trade_reroller:true},custom_name={text:"Trade Reroller",color:"green",italic:false},enchantment_glint_override:true] 1
```
Trade with a librarian once (to lock it the vanilla way), then right-click it with the stick — it
should briefly unemploy, re-hire at its lectern, and offer a brand-new random trade set. Confirm with
`data get entity @e[type=villager,limit=1,sort=nearest] Offers.Recipes`.
