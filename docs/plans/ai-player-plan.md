# Plan: An autonomous LLM player for Madagascar

A build plan for adding an AI-controlled player that explores, chats, builds, and
plays alongside us in the world. Researched and written 2026-06-13.

---

## TL;DR

- **Feasible and well-trodden:** Mineflayer (the bot "body") + Mindcraft (the LLM
  agent framework) + a language model "brain". No server-side mods required — the
  bot logs in as a normal networked player.
- **Blocked on the live server today:** the whole Mineflayer ecosystem supports only
  up to **1.21.11**; our live world is **26.1.2 (protocol 775)**, which is *not yet
  supported*. So we **prototype on a local 1.21.6 dev server now** and **migrate to
  live Madagascar once Mineflayer catches up**. The brain/skills carry over unchanged.
- **Account:** free on the local dev server (`online-mode=false`); the live world
  (`online-mode=true`) needs the bot to own its **own ~$30 Minecraft account**.
- **Model:** can be **Claude** (best play quality) or an **open-source model** (free,
  local via Ollama) — or a hybrid. Quality scales hard with model size.

---

## 1. The constraint that drives everything: 26.1.2 isn't supported yet

Our live server runs **26.1.2 (protocol 775)**. Every LLM-agent framework is built on
Mineflayer, and Mineflayer **cannot connect to 26.1.2 today:**

- Mineflayer docs cap support at **1.8 → 1.21.11**. Connecting to 26.1.2 throws
  `unsupported protocol version: 26.1.2`.
  ([issue #3893](https://github.com/PrismarineJS/mineflayer/issues/3893) — still
  "Stage1", no PR, no ETA.)
- Deeper data bug: protocol 775 added ~15 serverbound packets that shift all later
  packet IDs, and `minecraft-data` has the mapping wrong
  ([issue #3888](https://github.com/PrismarineJS/mineflayer/issues/3888)). So even
  forcing the version string won't cleanly work.
- **Mindcraft** inherits this — it supports **up to 1.21.11, recommends 1.21.6**.

This doesn't kill the project; it **sequences** it. The agent's brain and skill code
are version-independent — only the network layer is blocked. So we build against a
version that works today and re-point at the live world later.

```
Phase 1 (now)              Phase 2 (when 26.1.2 lands)
┌──────────────┐            ┌──────────────┐
│ Mindcraft    │            │ Mindcraft    │
│  + model     │   ──────►  │  + model     │
│ → 1.21.6 dev │            │ → live 26.1.2│
│   server     │            │   Madagascar │
└──────────────┘            └──────────────┘
   same brain & skills; only host/version/account change
```

---

## 2. Architecture

An autonomous agent is four parts wrapped in an observe → think → act loop:

```
        ┌─────────────────────────────────────────┐
        │  BODY      Mineflayer bot (logs in as a   │
        │            real player over the network)  │
        └───────────────┬───────────────────────────┘
                        │ senses: pos, health, inventory,
                        │ nearby blocks/entities, chat
                        ▼
        ┌─────────────────────────────────────────┐
        │  PERCEPTION  serialize world state into   │
        │              compact text/JSON context    │
        └───────────────┬───────────────────────────┘
                        ▼
        ┌─────────────────────────────────────────┐
        │  BRAIN     the LLM (tool use) — given      │
        │            state + goal + memory, decides  │
        │            which skill(s) to call          │
        └───────────────┬───────────────────────────┘
                        │ skill calls: goto / mine / craft /
                        │ attack / place / say
                        ▼
        ┌─────────────────────────────────────────┐
        │  ACTUATION  map skill calls back to       │
        │             Mineflayer + pathfinder        │
        └───────────────┬───────────────────────────┘
                        └──── result fed back ──► loop
```

| Layer | Component | Notes |
|---|---|---|
| **Body** | Mineflayer (via Mindcraft) | Logs in as a real player. Zero server-side mods. |
| **Perception** | Mindcraft world-state serializer | Inventory, health, nearby blocks/entities, chat → context |
| **Brain** | LLM (Claude or open model) | Picks skills given state + goal + memory |
| **Actuation** | Mindcraft skill library + `mineflayer-pathfinder` | `collectBlock`, `goToPlayer`, `craft`, `attack`, `placeBlock`, `say`… |
| **Memory** | Mindcraft conversation + journal | Continuity across sessions; in-chat commands |

**Don't hand-roll the loop.** Start from **Mindcraft** (`kolbytn/mindcraft`, or the
more actively extended community fork `mindcraft-ce/mindcraft-ce`), which already
wires all of this together and is model-agnostic.

---

## 3. The brain: Claude vs. open-source model

Mindcraft supports **Anthropic (Claude), OpenAI, Gemini, Groq, Hugging Face,
Replicate, and Ollama (local)**. So the model is a swappable choice.

### Why model quality matters a lot here

An autonomous player does **multi-step tool/function calling under a reasoning loop**
("low on food → find animals → path to one → attack → collect drops → cook"). Weak
models pick wrong/hallucinated skills, get stuck in loops, and lose multi-step plans.
Tool-calling reliability scales with model capability — so model choice maps almost
directly onto "how competent the bot feels."

### Option A — Claude (hosted)

Best play quality, no hardware needed, pay per token.

- `keys.json`: set `ANTHROPIC_API_KEY`.
- Profile model id (Mindcraft's README example `claude-3-5-sonnet-20241022` is
  **stale** — use current ids):
  - Routine play/chat: `anthropic/claude-haiku-4-5-20251001` (cheap, fast)
  - Hard planning/building: `anthropic/claude-sonnet-4-6` (or `claude-opus-4-8`)

### Option B — Open-source / local (Ollama)

Free, private, no token budget. Quality depends heavily on model size:

| Model size | VRAM (4-bit) | Agent quality |
|---|---|---|
| 7–8B | ~6–8 GB | Chats fine; **unreliable** at multi-step play |
| 14–32B (e.g. Qwen2.5-Coder 32B) | ~20–24 GB | Practical floor for *decent* agentic behavior |
| 70B+ | ~40–48 GB+ | Good, but heavy hardware |

For a genuinely capable local agent, target a **24GB+ GPU** running a **30B-class
instruct model with strong tool-calling**. Set `"model": "ollama/<name>"` in the
profile.

### Option C — Hosted open-weight (Groq)

Runs open models (Llama-class) fast and cheap, no local GPU. Middle ground: open
model, someone else's hardware, small bill.

### Recommendation

Start **hybrid**: Claude for the hard planning calls, a local/cheaper model for
routine ticks and chat (Mindcraft assigns models per role). Since Phase 1 is a free
local dev server anyway, **A/B test** a local Ollama model vs. Claude on the same
multi-step goal and decide based on what our actual hardware produces.

---

## 4. Account & authentication

The bot logs in as a *real player*, so it needs an identity. Our config:
`online-mode=true`, `white-list=false`, `enforce-secure-profile=false`.

- **Dev (Phase 1):** local server with `online-mode=false` → bot joins with any
  username, **free**, no Microsoft login.
- **Live (Phase 2):** `online-mode=true` authenticates against Microsoft/Mojang, and
  **one account can't be logged in twice at once** — so the bot needs its **own paid
  Minecraft account (~$30 one-time)**. Mineflayer uses `auth: 'microsoft'`
  (device-code login, cached tokens). `enforce-secure-profile=false` means no
  signed-chat hoops; whitelist off means nothing to add it to.
- **Do NOT** flip the live world to `online-mode=false` to dodge the account cost —
  that removes authentication and lets anyone impersonate any player, including ops.

---

## 5. Cost control (for hosted models)

- **Never call the LLM per tick** (20/s). Drive it on events: chat message, goal
  completion, idle timeout, danger. (Mindcraft already works this way — keep it.)
- **Tier models** (cheap/local for routine, strong for planning).
- Lean on **prompt caching** for the static system prompt + skill docs.
- Add a hard **token/$ budget guard** so a runaway loop can't drain the account.
- (Local/Ollama models sidestep this entirely — free per call.)

---

## 6. Setup steps (Phase 1 — local 1.21.6 dev server)

1. Install **Node v20 LTS**.
2. `git clone https://github.com/kolbytn/mindcraft` (or `mindcraft-ce`); `npm install`.
3. **API key (if using a hosted model):** copy `keys.example.json` → `keys.json`, set
   `ANTHROPIC_API_KEY` (or configure Ollama for local).
4. **Pick the model** in the bot profile (e.g. `andy.json`) — see §3 for current ids.
5. **Dev server:** spin up a local **1.21.6** server with `online-mode=false` (free,
   any username). Or open a single-player world to LAN.
6. `node main.js` → talk to the bot in chat; it responds and acts.

---

## 7. Risks & open questions

- **Version ETA is unknown.** #3893 has no committed timeline. Phase 2 is gated on
  PrismarineJS, not on us. Mitigation: build entirely in Phase 1; subscribe to #3893.
- **26.1 protocol churn.** Even after initial support lands, packet-mapping bugs
  (#3888) may need a few point releases to stabilize. Expect to test, not flip-and-forget.
- **Behavioral safety on the live world.** An autonomous builder/miner can grief
  terrain or burn through our custom dimensions. Sandbox-test griefing limits on the
  dev server; consider restricting the bot to a region/role before it touches Madagascar.
- **Local model capability.** Whether an open model plays well enough is hardware-
  dependent — resolve by A/B testing in Phase 1.

---

## 8. Phased roadmap

1. **Prototype (now):** Mindcraft + chosen model on a local 1.21.6 offline server.
   Get it chatting, pathfinding, gathering. Tune model tiers + budget guard. A/B
   Claude vs. local model.
2. **Customize:** add Madagascar-specific skills/goals (teach it our Magic Book
   waypoints, our dimensions). Define its persona/role.
3. **Watch [#3893](https://github.com/PrismarineJS/mineflayer/issues/3893)** for
   26.1.2 support.
4. **Migrate to live:** when supported, buy the bot a Minecraft account, point
   Mindcraft at `host: localhost`, `port: 25577`, `auth: 'microsoft'`,
   `version: '26.1.2'`. Smoke-test griefing limits, then let it loose.

---

## Sources

- [mineflayer #3893 — 26.1.2 support](https://github.com/PrismarineJS/mineflayer/issues/3893)
- [mineflayer #3888 — protocol 775 packet mapping](https://github.com/PrismarineJS/mineflayer/issues/3888)
- [PrismarineJS/mineflayer](https://github.com/PrismarineJS/mineflayer)
- [kolbytn/mindcraft](https://github.com/kolbytn/mindcraft) · [mindcraft-ce](https://github.com/mindcraft-ce/mindcraft-ce)
- [mineflayer auth docs](https://deepwiki.com/PrismarineJS/mineflayer/2-bot-creation-and-configuration)
