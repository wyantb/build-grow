# Game Plan: Tech, Buildings & Expansion

This document records the plan for expanding the game beyond its current
primitive tier (Hut, Market, Caravanserai, Lumberjack Post, Quarry, Farm).
It is a living plan — iterate here before touching code.

## Source Material

The inspiration is *Evolve*'s `civilized-tech` and `planetary-structures` wiki
pages. Many of Evolve's systems do **not** belong in this game; see
"Excluded" below for what we cut.

## Excluded (Not Coming In)

### Slavery / Thralls
Captive Housing, Torment, Slave Pen, Thrall Quarters, Psychic Mind Break,
Psychic Stun. Hard no.

### Trait-Locked / Species-Specific
- **Soul Eater**: Soul Well, Hunting Lodge (Wendigo variant).
- **Detritivore**: Composting, Hot Composting, Mulching, Hunting Lodge.
- **Carnivore**: Smokehouse.
- **Cannibalize**: Ceremonial Dagger, Last Rites.
- **Kindling/Smoldering**: Excludes the Axe/Pickaxe/Hoe tech line — we
  *do* want these tools, so they come in without the species exclusion.

### Magic Universe
Mana, Ley Lines, Conjuring, Resource Conjuring, Secret Society, Rituals,
Clerics, Cultists, Pylon, Limited Wish, Greater Wish. No magic universe.

### Military / Combat
Garrison, Bows, Leather/Plate Armor, Flintlock Rifle, Mercenaries, Hospital,
Boot Camp, Might Makes Right. No combat system.

### Civics / Government
Government, Governor, Theocracy, Spies, Tax Rates. No civics tab.

### Religion (tied to Evolve's prestige/plasmid system)
Theology, Temple, Fanaticism, Anthropology, Mythology, Indoctrination,
Shrine. These serve the plasmid/rebirth trait system, which we handle
differently (see `game_design/rebirth.md`).

### Morale / Entertainment
Theatre, Amphitheatre, Banquet Hall, Meditation Chamber, Tourist Center,
Casino. No morale mechanic in scope. If we add one later, these are the
first buildings to reconsider.

### Power Grid / Electricity
Coal Powerplant, Oil Powerplant, Fission Reactor. No MW system.

### Challenge-Locked
Wagon (Gravity Well challenge only).

### Evil Universe
Reclaimers, Graveyard, Slaughter the Weak.

### Forager Spear Techs
Flint/Bronze/Iron/Steel/Titanium Spear. These bump the manual "Gather Food"
button, which we may not even keep as a permanent mechanic.

---

## Design Principles

1. **Tools are multipliers, not arbitrary bumps.** A tech like "Bronze
   Pickaxe" unlocks a multiplier that applies to the relevant jobs (Miners).
   It is a building + job *concept* — the Blacksmith produces pickaxes that
   boost miners, lumberjacks, farmers, quarriers. Later techs (Iron, Steel)
   provide better tools, stacking multiplicatively.

2. **The engine is the single source of truth.** Multipliers come from the
   tech catalog at tick time, not from a separate "tool" state.

3. **Tech dependency tree.** A tech must be researched before its dependents
   unlock. The tree below shows the structure.

4. **Resources unlock with techs.** New resources appear when the tech that
   introduces them is researched, not before.

5. **Buildings grant job slots.** Each building of a given type adds one
   capacity slot for its associated job (existing rule, extended).

---

## Resources

### Existing
| Resource | Source |
|----------|--------|
| Wood | Lumberjacks |
| Stone | Quarriers |
| Food | Farmers |
| Gold | Market trades |

### New Resources (in tech order)
| Resource | Unlocked By | Primary Source |
|----------|-------------|----------------|
| Knowledge | (already exists) | University |
| Copper | Metal Working | Miners |
| Iron | Iron Mining | Miners + Smelter |
| Bronze | Foundry | Crafted (Copper + Tin/other) |
| Cement | Cement tech | Cement Workers |
| Steel | Crucible Steel | Smelters (with coal) |
| Coal | Coal Mining | Coal Miners |
| Aluminium | Bayer Process | Refinery Workers |

### TBD Resources
| Resource | Notes |
|----------|-------|
| Tin | Needed for bronze alloying, or simplify bronze to copper-only |
| Wrought Iron | Intermediate between iron and steel, or skip it |
| Plywood / Sheet Metal | Crafting outputs from the Foundry |

---

## Tech Tree

### Tier 1: Primitive (most already exist)

| Tech | Cost | Requires | Unlocks | Effect |
|------|------|----------|---------|--------|
| **Basic Storage** | 20 knowledge | Sundial, Currency | **Shed** | +storage for all resources |
| **Currency** | 22 knowledge, 10 wood | Housing (exists) | Gold resource (exists) | — |

### Tier 2: Bronze Age

| Tech | Cost | Requires | Unlocks | Effect |
|------|------|----------|---------|--------|
| **Metal Working** | 350 knowledge | Mining | **Mine** (+1 Miner) | Copper from miners |
| **Foundry** | 675 knowledge | Foundry concept | **Foundry** (+1 Crafter) | Craft bronze, tools |
| **Scientific Method** | 65 knowledge | Currency | **University** (+1 Professor) | +Knowledge production, +500 max knowledge |
| **Banking** | 90 knowledge | Currency | **Bank** (+1 Banker slot) | +Gold generation, $1800 max money |
| **Irrigation** | 55 knowledge | Agriculture | — | Farm food +66% |
| **Bronze Tools** | 720 knowledge, 50 copper | Metal Working, Foundry | — | +20% to Miner/Lumberjack/Farmer/Quarrier |

### Tier 3: Iron Age

| Tech | Cost | Requires | Unlocks | Effect |
|------|------|----------|---------|--------|
| **Iron Mining** | 2,500 knowledge | Metal Working | Iron resource | Miners produce iron |
| **Iron Tools** | 2,700 knowledge, 250 iron | Bronze Tools, Iron Mining | — | +35% to Miner/Lumberjack/Farmer/Quarrier |
| **Cement** | 500 knowledge | Mining, Basic Storage, Scientific Method | **Cement Plant** (+1 Worker) | Cement from stone |
| **Smelting** | 4,050 knowledge | Iron Mining | **Smelter** | Iron yield +10% per smelter, requires fuel |
| **Library** | 720 knowledge | Scientific Method, Cement | **Library** | +125 max knowledge, +5% knowledge production |

### Tier 4: Steel Age

| Tech | Cost | Requires | Unlocks | Effect |
|------|------|----------|---------|--------|
| **Crucible Steel** | 4,950 knowledge, 25 steel | Smelting, Coal Mining | Steel resource | Smelters can produce steel |
| **Coal Mining** | 4,320 knowledge | Iron Mining | **Coal Mine** (+1 Coal Miner), Coal resource | Fuel for smelters |
| **Sawmill** | 3,375 knowledge, 400 iron | Mining, Iron Mining | **Sawmill** | +200 max lumber, +5% lumber production |
| **Grain Silo** | 80 knowledge | Irrigation, Basic Storage | **Grain Silo** | +500 max food |
| **Grain Mill** | 5,400 knowledge | Grain Silo, Iron Mining | **Mill** | +Farm efficiency |
| **Urban Planning** | 2,500 knowledge | Investing, Marketplace | Building Queue UI | Queue building orders |

### Tier 5: Industrial

| Tech | Cost | Requires | Unlocks | Effect |
|------|------|----------|---------|--------|
| **Black Powder** | 4,500 knowledge, 500 coal | Coal Mining | — | Mining production +25% |
| **Bayer Process** | 4,500 knowledge | Crucible Steel | **Metal Refinery** (+1 Worker) | Aluminium production |
| **Trade Routes** | 4,500 knowledge | Marketplace, Garrison concept | **Trade Post** | +2 trade routes |
| **Advanced Research** | 5,000 knowledge | Scientific Method, Cement | **Research Lab** (+1 Scientist) | Big knowledge boost |

### TBD: Later Tiers
Beyond industrial, we will have space/planetary mechanics. Details TBD.

---

## Tool Multiplier System

The core mechanic: tool techs provide an associated job, e.g. Brazier.
Brazier is unlocked when an associated tech (bronze pickaxe, axe, hoe, sledge)
is researched. Based on the associated techs, the braziers boost the associated
jobs. Based boost can be something small, like 10% per Brazier.

A blacksmith works with Iron and has a similar concept. More will come later.

### Multiplier Table

| Tool Tech | Jobs Affected | Bonus | Cumulative |
|-----------|---------------|-------|------------|
| Bronze Pickaxe (if split) | Miner only | +15% | — |
| Iron Pickaxe (if split) | Miner only | +30% | — |
| Bronze Axe (if split) | Lumberjack only | +15% | — |
| Iron Axe (if split) | Lumberjack only | +35% | — |
| Bronze Hoes (if split) | Farmer only | +33% | — |
| Iron Hoes (if split) | Farmer only | +66% | — |
| Bronze Sledgehammer (if split) | Quarrier only | +20% | — |
| Iron Sledgehammer (if split) | Quarrier only | +40% | — |

---

## New Buildings

### Building Catalog Additions

| Building | Cost | Grants | Notes |
|----------|------|--------|-------|
| **Shed** | 30 wood | +200 storage for wood, stone, food | |
| **Mine** | 50 wood, 30 stone | 1 Miner slot | Produces copper (later iron) |
| **Foundry** | 80 wood, 40 stone, 20 copper | 1 Crafter slot | Crafts bronze, tools |
| **University** | 100 wood, 60 stone | 1 Professor slot, +500 max knowledge | Knowledge production |
| **Bank** | 80 wood, 40 stone | 1 Banker slot, $1800 max money | Gold generation |
| **Cement Plant** | 60 wood, 40 stone | 1 Cement Worker | Produces cement from stone |
| **Smelter** | 100 wood, 60 stone, 40 iron | Smelter slot | +10% iron yield per smelter, needs fuel |
| **Library** | 50 wood, 30 stone, 20 cement | — | +125 max knowledge, +5% knowledge prod |
| **Coal Mine** | 80 wood, 60 stone, 40 iron | 1 Coal Miner slot | Produces coal |
| **Sawmill** | 100 wood, 60 stone | — | +200 max lumber, +5% lumber prod |
| **Grain Silo** | 40 wood, 20 stone | — | +500 max food |
| **Mill** | 60 wood, 30 stone, 20 iron | — | +Farm efficiency |
| **Trade Post** | 200 wood, 200 stone | +2 trade routes | Market expansion |
| **Metal Refinery** | 150 wood, 100 stone, 80 steel | 1 Refinery Worker | Aluminium production |
| **Research Lab** | 200 wood, 150 stone, 100 steel | 1 Scientist slot | Big knowledge boost |

### Buildings That Grant No Job Slot
- Shed (storage only)
- Library (capacity + percentage bonus)
- Sawmill (capacity + percentage bonus)
- Grain Silo (storage only)
- Mill (percentage bonus)

### Categories

| Category | Buildings |
|----------|----------|
| Residential Block | Hut |
| Commercial District | Market, Caravanserai, Bank, Trade Post |
| Rural District | Lumberjack Post, Quarry, Farm, Mine, Coal Mine |
| Industrial District | Foundry, Smelter, Cement Plant, Sawmill, Mill, Metal Refinery |
| Knowledge District | University, Library, Research Lab |
| Storage | Shed, Grain Silo |

---

## Job Catalog Additions

| Job | Building | Produces | Base Rate |
|-----|----------|----------|-----------|
| **Miner** | Mine | Copper (later Iron) | TBD |
| **Crafter** | Foundry | Bronze (crafted) | TBD |
| **Professor** | University | Knowledge | TBD |
| **Banker** | Bank | Gold | TBD |
| **Cement Worker** | Cement Plant | Cement | TBD |
| **Coal Miner** | Coal Mine | Coal | TBD |
| **Refinery Worker** | Metal Refinery | Aluminium | TBD |
| **Scientist** | Research Lab | Knowledge | TBD |

---

## Automation

### Auto-Research
When knowledge is at capacity (knowledge == max knowledge), automatically
queue the next available tech. Simple rule:
- Check if knowledge >= max knowledge
- Check if a tech is available (requirements met, not yet unlocked)
- Priority unlock goes to cheapest tech available with no resource requirements

### Auto-Build
When a resource is at capacity:
- If storage-capable resource (wood, stone, food, etc.) is full and we can
  afford a Shed, queue a Shed
- Simple rule-based, not AI

---

## Open Questions

2. **Bronze recipe:** Does bronze need tin, or is it just copper? If tin,
   do we need a Tin resource and Tin Mine?
3. **Smelter fuel:** Smelters "require fuel" in Evolve. Do we consume coal
   per tick, or is it just an unlock requirement?
4. **Population scaling:** Evolve's Cabin = 1 citizen, Cottage = 2. Our
   Hut = 5. At higher tiers, do we add Apartment-equivalent (+10?) or
   keep it simple?
6. **Resource crafting:** Bronze is "crafted" in Evolve's Foundry. Do we
   model this as a recipe (2 copper + 1 tin → 1 bronze), or as a flat
   conversion rate?
