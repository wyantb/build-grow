# Rebirth

A rebirth throws the village away and starts a new one. The people carry
over with better genes.

## The rules

- **A rebirth costs 1000 gold.** The gold is spent by doing the rebirth,
  because the world that held it is gone. A world that has been reborn
  starts with no gold.
- **The Rebirth tab appears once the player can afford it.** It is hidden
  until the player has 1000 gold, so the mechanic stays out of the way
  until it matters.
- **The button takes two clicks.** The first click on "Gold Rebirth"
  reveals a second button, "Really Rebirth?". The second click starts the
  rebirth. A rebirth is never a single stray click.
- **The rebirth view is not the village.** It has no buildings, no jobs and
  no resources. The player is out of the world until they confirm or go
  back.
- **Confirming starts a new world.** The new world is a fresh game: the same
  starting population of 5 and the same single hut. The species carry the
  stats the rebirth gave them. The world may end up exactly as it started:
  a rebirth with no luck improves nothing.
- **Only the species a new game starts with survive.** The new world is
  built the same way a new game is, so it holds the starting species. A
  species that has to be unlocked during play is not in that set.

## The rebirth view

Three tabs:

- **Avatar.** Largely blank for now. It holds the text "This is You!".
- **Species.** One sub-tab per species in the world. The most populous
  species opens first, because that is the species the player spent the
  most time with. Each species shows its stats before and after the
  rebirth, as a table of `Stat | Stat Before -- Stat | Stat After`.
- **Confirm.** Where the player carries the rebirth out.

The stats shown are all seven: strength, dexterity, constitution,
intelligence, wisdom, charisma and mana efficiency.

## Choosing better genes

- **Each core stat is rolled on its own.** The six core stats are rolled
  separately, so a population can pass on a better strength and a better
  wisdom without either of them costing the other anything.
- **The roll is a normal distribution.** One person passes on a three point
  improvement 0.5% of the time, a two point improvement 7% of the time, and
  a one point improvement 17.5% of the time. The rest of the time they
  pass on nothing.
- **Only better genes are chosen.** A stat never goes down. The player
  picks the best of their population, not an average of it.
- **The population gets one roll each.** A population of twenty has twenty
  chances at each stat, and the best of those twenty is what the species
  ends up with. A larger population is more likely to improve.
- **Mana efficiency does not improve.** It is shown in the table, but a
  gold rebirth never raises it.

The rolls are made when the rebirth begins, not when it is confirmed, and
they are saved with the world. A player who reloads the page in the middle
of a rebirth is shown the same numbers they were shown before, and gets
the same result when they confirm.

## What this is not yet

The mechanic is a first version. It is not balanced, it does not keep
anything from the old world except the genes, and the rolls use
`Math.random`, so they cannot be reproduced. See `tech_debt.md` for the
planned work.
