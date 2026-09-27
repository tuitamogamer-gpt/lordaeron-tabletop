# Digital table and setup · 27 September 2026

The map is now the main workspace. Characters, Quests, Merchant, Encounter deck and Party controls open on demand. Clicking the selected toggle again closes its panel. Native dialogs provide keyboard focus containment and Escape. Mandatory combat, events, rewards or talent choices dismiss the browsing panel so a decision cannot be hidden behind it.

## Setup

1. Choose four or six characters and local AI or shared-device control.
2. Choose equal faction sizes with globally unique classes. Shaman is Horde; Paladin is Alliance. Choose the human-controlled character when using AI.
3. Choose an Overlord; show the profile for the selected character count.
4. Review starting resources, regions, quests, merchant composition and the event deck, then explicitly begin.

A fresh browser opens the guide and does not autosave an unconfirmed default setup. A valid existing save resumes directly. Before replacing a campaign, its serialized session is preserved under the `lordaeron-base-save-v4-before-new` key and is downloadable from Settings. If browser storage is unavailable, the backup remains in memory for that session.

The guide derives its event count from an actual engine-created preview. Four characters receive three grey and one green quest per faction; six receive four grey and one green. Starting health/energy, five gold, level one, starting towns, six merchant cards and the Horde first turn remain engine-owned. The existing engine, RNG sequence, content fingerprint and save format are unchanged.

Sources: [official rulebook, setup pp. 6–8 and player counts pp. 35–36](https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/wowrules.pdf), [FAQ 1.4](https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/WoW_FAQ__v1_4.pdf).

## Character sheets and artwork

All 16 characters have a full sheet with level capacities, live resources, XP, gold, actions, conditions, racial rules, seven typed equipment/power areas, attachments, pet health, learned powers, all 12 class powers, three bag slots, special items and four talent areas. Hood of Shadow adds the eighth slot. Equipment shows the complete ability timing, cost, condition and effects directly. Management and training remain gated by legal actions.

Each of the 406 playable cards has an illustration. The 108 talents use distinct generated art. World events use 19 scenario illustrations and auction items use four individual artworks. Portraits are isolated files; card illustrations are contained inside their frames. The ornamental sheet material is newly generated. Source and prompt details: [IMAGEGEN-SHEETS-V3.md](IMAGEGEN-SHEETS-V3.md).

The map draws a dark underlay behind light passable borders and a light underlay behind black impassable borders. Non-scaling strokes preserve contrast when zooming. Borders are emphasized by default; the toolbar can reduce their emphasis.

## Validation

- TypeScript client/server checks and production build.
- 190 tests, including 30 new setup/panel/sheet/art regressions.
- Static render check for 589 components, including all 16 full sheets.
- Standalone SVG map render and visual review of source crops and generated atlases.
- Local HTTP checks for the page, character sheet module, material, portraits and individual art.

The browser tool reported no available browser, and opening the in-app browser failed. Full-window visual layout and native focus behavior therefore still need a browser review; jsdom interaction tests and SVG review do not substitute for that. These changes do not activate multiplayer rooms or change server rules.
