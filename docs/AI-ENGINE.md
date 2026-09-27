# AI planning engine

The local game, battle autoplay and server bots use the same `decide(pack, publicView, legalCommands, style)` policy. The result contains the chosen command, its explanation, a score, the number of candidates and the three highest ranked alternatives. Scores compare decisions in the current state; they are not calibrated win percentages.

## Cards are a catalogue, not a playable deck

Class cards are public purchase and training options. Buying a power adds it to the spellbook. Management must equip it before the combat rules expose its ability. Talents are level-up choices. Merchant items are purchased into inventory and evaluated against the hero's slots and traits. The AI does not draw a hand of class cards or cycle a class deck. Printed abilities and permitted bag consumables follow the existing rules.

Training compares complete equipment configurations before and after learning a bundle, including unique categories and equip energy. The planner only activates powers returned by the legal-action generator. Tests separately cover an unlearned catalogue power, a learned but unequipped power, and an equipped power.

## Campaign decisions

- Weighted routes account for friendly flights, enemy home regions and blue roadblocks. Five nearby objectives are considered per hero, with possible allied groups and their travel/action costs. Objectives that cannot be reached and challenged before the standard turn-30 finish are excluded. The Overlord-only variant retains an open horizon.
- Quest value includes XP adjusted for level, progress toward levelling, gold, equipment rewards and remaining quest figures. Independent creatures primarily have obstacle-clearing value. Boss forecasts include public Overlord and world-event modifiers.
- An encounter forecast uses the real rules to prepare dice, automatic effects, auras, affordable powers, equipment limits, stun and curse. Two bounded passes through up to four choices per power build an expected profile. Up to seven approximate rounds distinguish ranged kills, defense, armor, attrition, energy depletion, creature penalties and regeneration. The risk estimate is heuristic.
- Rest and Town compare the actual recovery result, including Food and talents. Recovery before a local challenge is checked against the planned party. Training and rewards use whole-loadout gains, rather than adding the face values of mutually incompatible powers.
- Bots can pass a bag item to a colocated ally when the combined equipment improves. A non-improving transfer receives a large penalty, preventing repeated swaps. Sealed auction bids remain unknown; the bid budget is based on item utility and a training reserve.

## Combat decisions

`tactics.ts` previews powers through the rules reducer on a public sandbox. It values useful damage and prevented wounds, current health and energy, equipment, pets, statuses and relevant creature penalties. An ability with no useful effect is skipped. A normal single-die reroll evaluates all eight faces; stochastic card effects use six fixed planner-owned samples, independent of the game's RNG.

Pool preparation also searches one follow-up ability for four promising first moves, with at most 24 follow-up candidates each. This supports short preparation combinations without expanding the entire game tree. Wound allocation considers both a participant's survival and the cost of losing a pet's last health. Armor, forced unequipping, penalty dice, Nefarian hit assignment and creature target order have separate evaluations.

The three existing styles change risk tolerance: Cautious, Balanced and Aggressive. They are play styles, not claims of increasing difficulty.

## Information, execution and replay

`public-state.ts` deliberately supplies empty hidden decks and a planner-owned seed for local previews. Search stops before hidden draws and turn transitions. `factionView` removes the other side's private Kazzak knowledge even when a local table controls bots on both sides. Neither the game RNG nor sealed opponent bids are used.

Every returned command belongs to the supplied legal list; ownership filtering remains with the caller. Browser planning runs in a persistent Web Worker. Revision/state checks and cancellation on pause, ownership changes and unmount prevent stale responses from applying a move. The board remains interactive during longer planning. Bounded caches reuse public equipment and combat profiles; no game state is changed by planning.

Existing saves remain compatible: only command selection and candidate generation changed, not the content pack or reducer's game rules. `npm run simulate -- <seed> <overlord> [casters] [--trace]` checks resources, detects repeated positions and verifies the complete replay. `--trace` reports slow decisions.

## Research and interpretation

Reviewed on 27 September 2026, specifically for the 2005 base game:

- [FFG rulebook](https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/wowrules.pdf): action economy, group challenges, progression and combat sequencing. The repository's previously verified rule implementation and local rulebook remain the source of mechanics; the live PDF fetch timed out during this pass.
- [FFG FAQ 1.4](https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/WoW_FAQ__v1_4.pdf), retrieved in full: independent creatures, physical dice limits, Nefarian's hit allocation, equipment and the timing of class powers. These constrain the estimator and legal actions.
- [RPGnet: WoW Board Game tactics discussion](https://forum.rpg.net/index.php?threads/wow-board-game-tactics-discussion.241397/), indexed text retrieved: solo versus grouped quest progression, travel setbacks, attrition and low-roll danger. Direct page retrieval was blocked. These are player observations, not authoritative rules.
- [Tobold's original play review](https://tobolds.blogspot.com/2006/01/world-of-warcraft-board-game-review.html), indexed text: team progression, class combinations, item sharing and the tradeoff between solo rewards and safety.

The objective scores and search budgets are our engineering interpretation of those priorities. The BGG file listing identifies a *WoW Player's Guide*, but access was blocked; its contents were not used. No MMO, TCG, Adventure Game or expansion rules were imported.

## Limits

This is bounded, state-dependent planning, not a solved optimal policy. Encounter forecasts approximate later rounds and do not exhaust every post-roll combo, future event, alternative purchase transaction or opponent response. Legal candidates themselves are bounded (for example, training bundles contain up to three powers). The planner never treats a forecast as a guaranteed outcome. Automated scenarios and completed campaigns verify legality, practical decisions, termination and deterministic replay; they do not establish a universal win rate.

## Verification

- 294 tests pass, including 23 focused planner scenarios and three worker lifecycle tests. Existing ownership, combat automation, equipment, rules and server tests remain green.
- Production build and server type checking pass. The render smoke check covers 621 views without invalid text.
- Browser verification covers worker-driven travel, an automatic group challenge and combat, returning to the map, and pausing campaign automation. No browser errors or warnings were recorded.
- Full six-hero campaigns below finish without an illegal move, invalid resource count or repeated position, and reproduce the exact final state from their command logs. Timings are local observations, not a browser latency guarantee.

| Seed | Overlord | Roster | Commands | Quests | Finish | Mean / max planning time |
| --- | --- | --- | --- | --- | --- | --- |
| 2005 | Kel’Thuzad | Default | 1,385 | 24 | Turn 30, Horde | 52 / 2,942 ms |
| 99 | Kazzak | Casters | 1,484 | 24 | Turn 30, Horde | 58 / 4,933 ms |
| 71 | Nefarian | Casters | 1,064 | 18 | Turn 25, draw | 30 / 1,855 ms |

The previous policy on the same default seed 2005 finished 12 quests. The new policy finishes 24 in that scenario; this single comparison is a regression reference, not a general strength benchmark.
