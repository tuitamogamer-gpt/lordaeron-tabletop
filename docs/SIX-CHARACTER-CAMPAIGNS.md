# Six-character campaigns · 30 September 2026

New campaigns start with six heroes, three per faction, and use Defeat the Overlord as the fixed objective. Deadly PvP is an independent combat checkbox. The Ready step displays the actual seeded starting quest cards and their creature/marker placements.

The two third faction seats in the default roster are Zowka Shattertusk (Shaman) and Artumnis Moondream (Druid). Both can be selected as the human-controlled hero, or played under shared-device control. Their sheets, racial/printed powers, twelve class powers, twelve talents, equipment, combat, progression and AI use the same complete nine-class rules implementation as the other seats. Existing four-hero saves retain their original roster; a new six-hero campaign preserves the previous save as a backup.

## Rule basis

The [official rulebook](https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/wowrules.pdf) uses six characters by default (setup, pages 6–8); pages 35–36 explain the four-character tables and sharing heroes between players. Page 37 treats Deadly PvP and Defeat the Overlord as separate variants. Deadly PvP changes PvP damage resolution. Defeat the Overlord repeats the turn track after turn 30 and supplies purple circle items at later item spaces. This campaign fixes that continuation as its objective. The engine preserves the original turn-30 final PvP described on pages 2 and 35 when an older imported setup omits or explicitly disables `overlordOnly`.

Local source: `docs/rules-extracted.local.txt`, lines 369–377, 3135–3145, 3196–3276 and 3373–3405.

## Validation

- `tests/six-character-campaign.test.ts`: 10 passed. Complete six-seat setup; all six AI actors and management confirmations; exact command replay; whole-trio challenges, XP/gold/talent progression; actual Shaman/Druid training and equipment; continuation with Deadly PvP enabled and disabled; legacy setup replay.
- Setup/class-deck, equipment/variant and event-turn tests: 115 passed. The UI regression selects the sixth hero as the human and confirms all six options and the fixed objective.
- Independent review found and fixed an AI candidate-selection gap: five nearby irrelevant blue-only groups could hide a reachable Overlord. Existing eligibility filters now run before selecting the nearest five candidates. The targeted planner regression passed (1 passed, 23 skipped); branch limits, scoring and both horizons are preserved.
- `npx tsx scripts/check-six-continuation.ts`: 32 real faction turns, 364 legal commands and 12 resolved events, ending in lap 2 / turn 3 / Horde actions with six heroes and both configured rules. Resource, class, inventory, creature-supply and combat invariants passed after every command. Replaying the saved command log produced exactly the same state.

The reproducible continuation snapshot is [six-hero-continuation-2026-09-30.session.json](playtests/six-hero-continuation-2026-09-30.session.json). A longer AI run using the previous candidate policy reached 2,000 legal commands and lap 2 / turn 22 without an invariant failure. It was capped after the bounded replay completed and the candidate-selection fix was identified. It is not claimed as a completed Overlord victory.
