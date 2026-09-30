# Lordaeron board · v0.5

The central map is a 2D polygon board with all 67 named regions in the seven printed areas. The default table view fits the full board and action dock within the current desktop viewport. **Interact with map** (or F) opens a native modal covering the entire viewport, with only the map, map controls and Travel confirmation visible. The table stays behind the dialog, background scrolling is locked and automatic AI actions pause until it closes. The selected region is centered at 200%: a wheel or trackpad moves vertically and horizontally, Shift + wheel moves horizontally, and dragging or arrow keys also pans. Ctrl/Command + wheel and the +/− buttons zoom. Region search and hero centering locate specific pieces; **Entire map** or 0 restores the fitted board. **Done interacting** or Escape exits interaction, resets pan and zoom, restores the table overview, and returns keyboard focus to the interaction button. Mandatory campaign decisions and combat return to the table before opening their own dialogs.

The action dock shows the purpose of Travel, Rest, Train, Town and Challenge directly below each name. Hover titles explain the exact legal action or its unavailable condition. Selected-region figures and quests open in **Region details**, an overlay drawer, so inspecting a crowded region does not increase the page height. Character and quest collections continue to open in their own dialogs.

## Sources and interpretation

- [FFG rules](https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/wowrules.pdf): quest tokens pp. 4, 7, 20; Travel and flight paths pp. 9–10; replacement decks pp. 20–22. The four-player setup has three grey quests plus one green per faction (p. 35); six characters use four grey plus one green.
- [JudgeHype original-board photograph](https://worldofwarcraft.judgehype.com/image/16487/), already stored as `public/assets/original-board.jpg`, provides the 1600 × 1108 tracing coordinate space.
- [Second full-board photograph](https://www.mandisattictoys.com/products/world-of-warcraft-the-boardgame-2005-fantasy-flight-games-unpunched), [image](https://www.mandisattictoys.com/cdn/shop/files/IMG_7419_7a13025a-e184-4c87-bbc8-913b0876e3a1.jpg?v=1689555834), cross-checks region outlines, town/flight/graveyard icons, and mountain pockets. This reference is local only.
- The supplied 560-scan archive contains quest cards and tokens, but no main board. Quest objectives and rewards continue to come from that archive and the FAQ errata, including The Infectis Scar for Brutes in the Barrows.

`src/data/board-geometry.ts` is a hand tracing, simplified to straight segments. It is a reconstruction from photographs, not an official vector or a flat scan. The imagegen terrain is aligned to the traced 3:2 viewport and supplies biome illustrations. Precise SVG borders, labels, routes, references and counters sit above the artwork. Only polygon borders determine play. Quest decks and token faces also use generated art; their counts and text remain live. See [art assets and exact prompts](IMAGEGEN-MAP-V2.md).

Each exact shared polygon segment is traversable and drawn in its area's border color. Exterior segments border impassable terrain and are black. A single shared vertex is not a connection. Both `BOARD_REGIONS.neighbors` and the displayed borders are derived from this mesh; there is no separate proximity-based graph to drift out of sync.

The old graph included shortcuts across black terrain, such as Agamand–Brill, Undercity–Uplands, Pyrewood–Azurelode, Purgation–Southshore, Caer Darrow–Darrowshire, and Altar of Zul–Jintha'Alor. Those connections are removed. Walking connections now include the rulebook's Sorrow Hill–Chillwind Point example, the Fenris/Uplands passage, and the western/eastern Plaguelands passage at Marris Stead.

## Travel

One ordinary Travel action allows up to two steps. Adjacent regions and a flight between friendly flight icons each cost one step. There are four friendly flight regions per faction, counting Pestilent Scar for both. An enemy home region is never a legal destination.

Blue creatures stop movement on entry and force the next action to be a Challenge; the existing explicitly equipped exceptions still apply. Green and red quest creatures do not stop Travel. The selected route comes from engine legal commands and is only submitted by **Travel here**. Step numbers and a textual itinerary show the cost; flight legs are blue curves and walking legs use polygon-interior visibility paths, including concave passes.

## Quest cards, tokens and decks

- Stable H01–H40 / A01–A40 references appear on both the active cards and faction tokens. These are UI references, not additional game rules or printed token numbers.
- A token exists for each region containing a quest's surviving objective figures. Its location follows the actual figures, including event movement. Blue independent figures never receive a faction quest token.
- Selecting a card selects its live region; selecting a token tracks that quest and highlights its objective regions. The quest details view includes rewards, remaining targets and all printed spawns, with buttons to locate each region.
- Green, yellow and red deck stacks show public remaining counts for both factions. They use the same draw controls in the reward decision, enabled only for legal replacement commands. Deck order remains private. Grey cards are setup-only and the unused grey cards are removed from play.
- Creature counters use their actual green/red/blue figure colors independently of faction token colors. Heroes, towns, flight icons, graveyards, Overlords, Kazzak clues and active world markers remain on the board.
- Hovering or keyboard-focusing a creature, faction quest marker, hero, Overlord, world-event marker or Kazzak clue opens a readable tooltip. Quest markers show their faction, stable reference and live remaining objectives. Creature help explains blue movement blockers, current combat stats and associated quests. Hero help shows public resources and actions; Overlord and event markers explain their rules. Unrevealed Kazzak clues disclose only knowledge already visible in `GameView`. Tooltip placement uses its rendered dimensions to remain within the map viewport.

## Save compatibility

The corrected topology changes the content fingerprint and legal replays. The pack is `base-2005-faq-1.4-map-v4`, with autosave key `lordaeron-base-save-v4`. The v0.3 key is not overwritten or deleted; settings offer its original JSON for download. Old commands are not silently replayed against changed paths. Bot ownership preferences remain shared with the previous version.

The English v0.5 release translates six display-only card descriptions. The exact previous v4 fingerprint `3770cbda` is accepted only with current fingerprint `131aa8d4` and the same v4 pack. Imported saves are replayed and re-exported with the current fingerprint. Other hashes and gameplay changes remain rejected, covered by `tests/english-save.test.ts`.

## Verification

`tests/board-map.test.ts` verifies the whole connected board, anchors, every walking preview, the printed flight example, impassable terrain, action costs, blue stops, quest movement/removal, replacement deck counts and bounded two-axis camera scrolling. `tests/map-ui.test.tsx` exercises the React controls in jsdom, including wheel/trackpad pan, Shift-scroll, Ctrl-wheel zoom, drag suppression, overview reset, Escape, confirmation, hover/focus help, optional region details and both directions of quest selection. It also verifies moving the map into a body-level modal, native Escape, focus restoration and shared scroll locking with nested dialogs. `tests/command-table.test.tsx` checks visible action definitions and direct player takeover of an AI character. These are DOM tests, not a full browser layout test.

`npm run render:map` produces `screenshots/02-map-regions.png` directly from the Map component's SVG and map CSS, with embedded artwork. An independent Shapely audit found all 67 polygons valid with zero positive-area overlaps. On 2026-09-30, the actual local app was checked in the in-app browser at a 1191 × 668 viewport: the map dialog covered the viewport from (0, 0), appeared in the native modal layer, displayed 200% zoom, and kept a roughly 499px-high map canvas. Escape removed it, restored the fitted table map and returned focus to **Interact with map**. Real-device touch gestures were not reviewed.
