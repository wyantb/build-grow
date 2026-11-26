# Evolve Wiki — Resets & Prestige

> Source: [Evolve Wiki](https://pmotschmann.github.io/Evolve/wiki.html#resets-prestige)

## Prestiging

The main method of gaining prestige is through executing a reset option. There are currently 13 reset methods: Mutual Assured Destruction, Bioseed, Black Hole, Vacuum Collapse, Ascension, Cataclysm, Terraforming, Demonic Infusion, Apotheosis, AI Apocalypse, Matrix, Retirement, & Garden of Eden.

Each option restarts the game and awards prestige resources, which accelerates your progress. After resetting your first time you will also unlock religion; your new race will always consider whatever race came before them to be their gods.

---

## Mutual Assured Destruction

Mutual Assured Destruction is the first reset option encountered. It is generally recommended that you use this option on your first playthrough as soon as you are able to. This unlocks just before the space era and will award Plasmids.

To unlock this, research Rocketry and then Mutual Destruction. There is no need to build the Launch Facility. The option to reset will appear on the Civics → Military tab.

The number of Plasmids earned will be based on a combination of your total population and knowledge spent. Build anything you can, within reason, that will boost your population before resetting to maximize your Plasmids gained. Soldiers count as population for this purpose.

Mutual Assured Destruction counts as an **Extinction** event.

### MAD Plasmid Gains

**Plasmid Reward Soft Cap**
```
150 * (1 + ((Challenge Genes + 1) / 8))
```

**Raw Plasmid Gains**
```
(((Citizens + Soldiers) / 1 / 3) + (ln(1 + ((1.1 - 1) * Knowledge Spent / 100000)) / ln(1.1))) * Challenge Multiplier * Universe Multiplier * 1.1
```

**Overflow**
```
Raw Plasmid Gains - Plasmid Reward Soft Cap
```

**Total Plasmid Gains If Over Soft Cap**
```
Plasmid Reward Soft Cap + (Overflow / (Overflow + Plasmid Reward Soft Cap) * Plasmid Reward Soft Cap)
```

---

## Bioseed

Bioseed is the second reset option normally encountered in game progression. To Bioseed reset you must construct and launch the Genesis Ship. A Bioseed reset will award both Plasmids and Phage. The amount of Phage earned is derived from the amount of Plasmids earned, so raising your Plasmids reward will also raise your Phage reward. Plasmids earned are calculated similarly to in MAD, except there is a higher emphasis placed on knowledge spent.

To construct the Genesis Ship you must first construct the Space Dock. Once complete, open the Space Dock menu by pressing the gear icon and start building your Genesis Ship. You can also construct Interstellar Probes in the Space Dock. Once your Genesis Ship is complete, you will be able to launch it, which triggers the reset mechanic.

Bioseeding will also let you change your planet. The number of planet options depends on the number of Interstellar Probes you construct. You get one planet plus one more for each Interstellar Probe built. Planets can have a variety of new traits; see the Planets section for more information. Your new planet is permanent until changed again using a reset mechanic.

Bioseed counts as a **Greatness** event.

### Bioseed Plasmid Gains

**Plasmid Reward Soft Cap**
```
400 * (1 + ((Challenge Genes + 1) / 8))
```

**Raw Plasmid Gains**
```
(((Citizens + Soldiers) / 1 / 3) + (ln(1 + ((1.015 - 1) * Knowledge Spent / 50000)) / ln(1.015))) * Challenge Multiplier * Universe Multiplier * 1.1
```

**Overflow**
```
Raw Plasmid Gains - Plasmid Reward Soft Cap
```

**Total Plasmid Gains If Over Soft Cap**
```
Plasmid Reward Soft Cap + (Overflow / (Overflow + Plasmid Reward Soft Cap) * Plasmid Reward Soft Cap)
```

### Bioseed Phage Gains

```
log2(Plasmids Gained) * 1 * e * Challenge Multiplier * Universe Multiplier * 1.1
```

---

## Black Hole

Black Hole is the third reset option normally encountered in game progression. It is found at the end of the Interstellar phase of the game. A Black Hole reset will award Plasmids, Phage, and Dark Energy. Plasmids and Phage follow an improved version of the MAD/Bioseed formula, while Dark Energy is awarded based on the mass of the black hole.

To Black Hole reset, first you must construct the Stellar Engine, then you have to beef the black hole up until it is ready to explode. Increase the mass by building a Mass Ejector and using it to eject Exotic Matter into the black hole until it reaches 0.025 solar masses of Exotic Matter. Only Elerium and Infernite count as Exotic Matter. Increasing regular mass is not required to trigger the Black Hole reset, but it will boost the amount of Dark Energy earned.

Once you have enough Exotic Matter in the black hole, you can reset using a special research option called Exotic Infusion. This requires you to possess 10 Soul Gems. If you instead research Stabilize Black Hole, you will flush all the Exotic Matter out of the black hole and have to build it back up again.

Exploding the black hole results in the destruction of your current universe and lets you pick a new one. This is the method for switching universes, allowing you to reset into one of the following 6 new universes: Standard, Heavy Gravity, Antimatter, Evil, Micro, or Magic. In addition to changing universes, you will be able to pick from a limited selection of four planets.

Black Hole counts as an **Extinction** event.

### Black Hole Plasmid Gains

**Plasmid Reward Soft Cap**
```
800 * (1 + ((Challenge Genes + 1) / 8))
```

**Raw Plasmid Gains**
```
(((Citizens + Soldiers) / 1 / 2.2) + (ln(1 + ((1.012 - 1) * Knowledge Spent / 40000)) / ln(1.012))) * Challenge Multiplier * Universe Multiplier * 1.1
```

**Overflow**
```
Raw Plasmid Gains - Plasmid Reward Soft Cap
```

**Total Plasmid Gains If Over Soft Cap**
```
Plasmid Reward Soft Cap + (Overflow / (Overflow + Plasmid Reward Soft Cap) * Plasmid Reward Soft Cap)
```

### Black Hole Phage Gains

```
log2(Plasmids Gained) * 2.5 * e * Challenge Multiplier * Universe Multiplier * 1.1
```

### Black Hole Dark Energy Gains

```
(ln(1 + (Exotic Masses * 40)) + (log2(Non-ARPA Masses - 7) / 2.5)) * Challenge Multiplier * Universe Multiplier
```

---

## Vacuum Collapse

Causing the destruction of the universe by collapsing the false vacuum is a special reset method that only exists in the Magic universe. This reset serves the same general purpose as black holes, allowing you to change universes. It replaces the Black Hole reset used in other universes, as exotic matter is not available in a Magic Universe.

In order to trigger a Vacuum Collapse, you must construct 80 Mana Syphons. Mana Syphons are an A.R.P.A. project and appear on the A.R.P.A. Projects tab. Each completed Syphon causes damage to the universe and adds a stacking irreversible debuff called Vacuum Collapse. When the 80th Syphon is completed, the reset will trigger automatically.

Vacuum Collapse will award Plasmids, Phage, and Dark Energy, similarly to a Black Hole reset. The Dark Energy earned, however, is not based on the black hole size; it is instead based on your total amount of mana generation.

Vacuum Collapse counts as an **Extinction** event.

### Vacuum Collapse Plasmid Gains

**Plasmid Reward Soft Cap**
```
800 * (1 + ((Challenge Genes + 1) / 8))
```

**Raw Plasmid Gains**
```
(((Citizens + Soldiers) / 1 / 2.2) + (ln(1 + ((1.012 - 1) * Knowledge Spent / 40000)) / ln(1.012))) * Challenge Multiplier * 1 * 1.1
```

**Overflow**
```
Raw Plasmid Gains - Plasmid Reward Soft Cap
```

**Total Plasmid Gains If Over Soft Cap**
```
Plasmid Reward Soft Cap + (Overflow / (Overflow + Plasmid Reward Soft Cap) * Plasmid Reward Soft Cap)
```

### Vacuum Collapse Phage Gains

```
log2(Plasmids Gained) * 2.5 * e * Challenge Multiplier * 1 * 1.1
```

### Vacuum Collapse Dark Energy Gains

```
(log2(Mana Generation) / 5) * Challenge Multiplier
```

---

## Ascension

Ascension is the fourth reset option normally encountered in game progression. It is found at the end of the Intergalactic phase of the game. An Ascension reset will award Plasmids, Phage, and Harmony Crystals. Plasmids and Phage follow an improved version of the MAD/Bioseed formula, while Harmony Crystals are awarded based on the number of challenge genes activated.

Ascending requires building the Ascension Machine (constructed at Sirius on the Interstellar tab) and powering it with 10,000 MW. This power requirement can be reduced by building Thermal Collector. Note before starting your journey into Intergalactic that building the ascension machine requires you to spend 100 Plasmids and 25 Phage.

Completing ascension will also allow you to build a custom race. You get one custom race slot; doing a second ascension will allow you to alter or replace your previous custom race. Earning ascension in multiple universes and with more challenges active will grant you more design points to build a better custom race with.

Ascending on a planet increases all existing geologies by +2% and turns it into an Ascended planet. Ascended planets have +2 base Knowledge/s to the Sundial, +5% global production, and +10% global storage, which will stay until you leave the planet. While repeated ascensions on a planet will continue to increase the values of the geology deposits, they will not make a planet more Ascended, meaning that those bonuses will not stack from multiple ascensions.

Ascension counts as a **Greatness** event.

### Ascension Plasmid Gains

**Plasmid Reward Soft Cap**
```
2000 * (1 + ((Challenge Genes + 1) / 8))
```

**Raw Plasmid Gains**
```
(((Citizens + Soldiers) / 1 / 1.15) + (ln(1 + ((1.008 - 1) * Knowledge Spent / 30000)) / ln(1.008))) * Challenge Multiplier * Universe Multiplier * 1.1
```

**Overflow**
```
Raw Plasmid Gains - Plasmid Reward Soft Cap
```

**Total Plasmid Gains If Over Soft Cap**
```
Plasmid Reward Soft Cap + (Overflow / (Overflow + Plasmid Reward Soft Cap) * Plasmid Reward Soft Cap)
```

### Ascension Phage Gains

```
log2(Plasmids Gained) * 4 * e * Challenge Multiplier * Universe Multiplier * 1.1
```

### Ascension Harmony Crystal Gains

```
(1 + Challenge Genes) * Universe Multiplier
```

---

## Cataclysm

Cataclysm is a special reset option that can only be encountered while playing on an Unstable planet. To trigger the Cataclysm you must construct and power the World Collider, then wait for a random earthquake event to occur. After the earthquake event, you can start the Cataclysm by using the special research Dial it up to 11; picking Limit Collider instead will permanently lock out the Cataclysm for that run.

Once triggered, it will place you into a special scenario where you have no home planet. You will continue playing the same race and will not go through evolution again. Your starting state is predetermined, so do not attempt to game the system by building up excess buildings and materials first as these will not carry over. You will gain Plasmids and Phage on par with a Bioseed reset.

Cataclysm is a brutally slow game mode; you should not try it unless you have a lot of prestige. You can soft reset to get out of Cataclysm if you decide you aren't ready for it. Once unlocked, the Cataclysm scenario can be picked as a starting game state from the evolution challenge menu.

Cataclysm counts as an **Extinction** event.

### Cataclysm Plasmid Gains

**Plasmid Reward Soft Cap**
```
400 * (1 + ((Challenge Genes + 1) / 8))
```

**Raw Plasmid Gains**
```
(((Citizens + Soldiers) / 1 / 3) + (ln(1 + ((1.015 - 1) * Knowledge Spent / 50000)) / ln(1.015))) * Challenge Multiplier * Universe Multiplier * 1.1
```

**Overflow**
```
Raw Plasmid Gains - Plasmid Reward Soft Cap
```

**Total Plasmid Gains If Over Soft Cap**
```
Plasmid Reward Soft Cap + (Overflow / (Overflow + Plasmid Reward Soft Cap) * Plasmid Reward Soft Cap)
```

### Cataclysm Phage Gains

```
log2(Plasmids Gained) * 1 * e * Challenge Multiplier * Universe Multiplier * 1.1
```

---

## Terraforming

Terraforming is a special reset option that can only be encountered while playing the Orbital Decay challenge. This takes the place of Ascension and is considered the same tier of reset.

A Terraforming reset will award Plasmids, Phage, and Harmony Crystals. You will also be awarded the opportunity to design a custom planet. Your planet is not persistent and will be lost if you complete any reset that changes planets.

Reaching Terraforming can be brutally hard; you should not try it unless you have a lot of prestige.

Achieving silver star Lamentis will let the last planet you designed in each universe be found randomly in the future. You can add 1 unique planet to the pool per universe. Truepath Orbit Decay gives you more planetary points to spend but is very hard; you should not try it.

Your planet will have a one-time bonus called Rejuvenated. The rejuvenated effect is only valid for the next run while the planet is still fresh.

The rejuvenated effect has the following properties:
- Boosts some labor jobs by 10% (Cement Workers, Miners, Lumberjacks).
- Boosts Army rating by 5%.
- Boosts soldier healing (strength depends on highest level of Orbit Decay challenge completed).
- Boosts global production by 2%-50% (decays over time).
- Reduces unsuited penalties by 50%.
- Increases extremity of various planetary effects.

Terraforming counts as a **Greatness** event.

### Terraforming Plasmid Gains

**Plasmid Reward Soft Cap**
```
2000 * (1 + ((Challenge Genes + 1) / 8))
```

**Raw Plasmid Gains**
```
(((Citizens + Soldiers) / 1 / 1.15) + (ln(1 + ((1.008 - 1) * Knowledge Spent / 30000)) / ln(1.008))) * Challenge Multiplier * Universe Multiplier * 1.1
```

**Overflow**
```
Raw Plasmid Gains - Plasmid Reward Soft Cap
```

**Total Plasmid Gains If Over Soft Cap**
```
Plasmid Reward Soft Cap + (Overflow / (Overflow + Plasmid Reward Soft Cap) * Plasmid Reward Soft Cap)
```

### Terraforming Phage Gains

```
log2(Plasmids Gained) * 4 * e * Challenge Multiplier * Universe Multiplier * 1.1
```

### Terraforming Harmony Crystal Gains

```
(1 + Challenge Genes) * Universe Multiplier
```

---

## Demonic Infusion

Sacrifice your entire civilization to absorb the essence of a greater demon lord and take your place as a ruler of the hell dimension. This is a special late-game reset used to obtain Artifact. It does not offer any of the other basic prestige currencies.

To reach this reset, you must conquer the Hell Spire. Once you construct the Waygate you can use it to reach a demon lord. Defeating the demon lord will award a Demonic Essence. Consume the Demonic Essence on the research tab to trigger the reset. Your next race will gain a buff called Corrupted; this buff will decay by 2% in value after every reset until it fully dissipates.

Demonic Infusion counts as an **Extinction** event.

### Demonic Infusion Artifact Gains

```
1 + Challenge Genes + Floor Bonus
```

---

## Apotheosis

Ascend to the heavens and become a new god. This is a very late-game reset used to obtain Supercoiled Plasmid. It also awards exactly 1 Plasmid. This is not a mistake, this is in fact intended.

To reach this reset you must pass floor 50 in the spire and use the Demonic Essence to open a special waygate to the Edenic Realm. You also need to have completed at least 10 pillars. Doing this will prevent you from being able to complete Demonic Infusion.

Completing this reset the first time will also unlock 9 advanced hybrid races.

Apotheosis counts as a **Greatness** event.

### Apotheosis Supercoiled Plasmid Gains

```
(Challenge Genes + 1) ** 32
```

---

## AI Apocalypse

Get your civilization wiped out by your own self-aware creation. This reset is available only in The True Path Scenario game mode.

To trigger this reset, you must construct the AI Super Core and raise AI Drift to 100%. Then you can execute Protocol 66, which triggers the reset. You increase AI Drift by constructing more: Artificial Colonist, Decoder, Android Trooper, or Tank.

AI Apocalypse will award Plasmids, Phage, and AI Core.

Completing this reset will unlock the Synthetic genus.

AI Apocalypse counts as an **Extinction** event.

### AI Apocalypse Plasmid Gains

**Plasmid Reward Soft Cap**
```
600 * (1 + ((Challenge Genes + 1) / 8))
```

**Raw Plasmid Gains**
```
(((Citizens + Soldiers) / 1 / 2.5) + (ln(1 + ((1.014 - 1) * Knowledge Spent / 45000)) / ln(1.014))) * Challenge Multiplier * Universe Multiplier * 1.1
```

**Overflow**
```
Raw Plasmid Gains - Plasmid Reward Soft Cap
```

**Total Plasmid Gains If Over Soft Cap**
```
Plasmid Reward Soft Cap + (Overflow / (Overflow + Plasmid Reward Soft Cap) * Plasmid Reward Soft Cap)
```

### AI Apocalypse Phage Gains

```
log2(Plasmids Gained) * 2 * e * Challenge Multiplier * Universe Multiplier * 1.1
```

### AI Apocalypse AI Core Gains

```
52 = 5
```

---

## Matrix

Build a computer simulation and trap your entire civilization in it. This reset is available only in The True Path Scenario game mode.

To trigger this reset you must construct the Ringworld. Then you can take the blue pill, which triggers the reset.

Matrix will award Plasmids, Phage, and Servants.

Matrix counts as a **Greatness** event.

### Matrix Plasmid Gains

**Plasmid Reward Soft Cap**
```
1800 * (1 + ((Challenge Genes + 1) / 8))
```

**Raw Plasmid Gains**
```
(((Citizens + Soldiers) / 1 / 1.5) + (ln(1 + ((1.01 - 1) * Knowledge Spent / 32000)) / ln(1.01))) * Challenge Multiplier * Universe Multiplier * 1.1
```

**Overflow**
```
Raw Plasmid Gains - Plasmid Reward Soft Cap
```

**Total Plasmid Gains If Over Soft Cap**
```
Plasmid Reward Soft Cap + (Overflow / (Overflow + Plasmid Reward Soft Cap) * Plasmid Reward Soft Cap)
```

### Matrix Phage Gains

```
log2(Plasmids Gained) * 3.2 * e * Challenge Multiplier * Universe Multiplier * 1.1
```

---

## Retirement

Retire and enjoy the easy life. This reset is available only in The True Path Scenario game mode.

To trigger this reset, you must construct the Matrioshka Brain and Ignition Device. Then you can retire, which triggers the reset.

Retirement will award Plasmids, Phage, and Servants.

Retirement counts as a **Greatness** event.

### Retirement Plasmid Gains

**Plasmid Reward Soft Cap**
```
1800 * (1 + ((Challenge Genes + 1) / 8))
```

**Raw Plasmid Gains**
```
(((Citizens + Soldiers) / 1 / 1.15) + (ln(1 + ((1.006 - 1) * Knowledge Spent / 32000)) / ln(1.006))) * Challenge Multiplier * Universe Multiplier * 1.1
```

**Overflow**
```
Raw Plasmid Gains - Plasmid Reward Soft Cap
```

**Total Plasmid Gains If Over Soft Cap**
```
Plasmid Reward Soft Cap + (Overflow / (Overflow + Plasmid Reward Soft Cap) * Plasmid Reward Soft Cap)
```

### Retirement Phage Gains

```
log2(Plasmids Gained) * 3.2 * e * Challenge Multiplier * Universe Multiplier * 1.1
```

---

## Garden of Eden

Create a new Garden of Eden. This reset is available only in Lone Survivor Scenario game mode.

To trigger this reset, you must construct the Ringworld. Then you can build the Garden of Eden Facility, which triggers the reset.

Garden of Eden will award Plasmids, Phage, and Servants.

Garden of Eden counts as a **Greatness** event.

### Garden of Eden Plasmid Gains

**Plasmid Reward Soft Cap**
```
1800 * (1 + ((Challenge Genes + 1) / 8))
```

**Raw Plasmid Gains**
```
(((Citizens + Soldiers) / 1 / 1) + (ln(1 + ((1.004 - 1) * Knowledge Spent / 18000)) / ln(1.004))) * Challenge Multiplier * Universe Multiplier * 1.1
```

**Overflow**
```
Raw Plasmid Gains - Plasmid Reward Soft Cap
```

**Total Plasmid Gains If Over Soft Cap**
```
Plasmid Reward Soft Cap + (Overflow / (Overflow + Plasmid Reward Soft Cap) * Plasmid Reward Soft Cap)
```

### Garden of Eden Phage Gains

```
log2(Plasmids Gained) * 2.5 * e * Challenge Multiplier * Universe Multiplier * 1.1
```
