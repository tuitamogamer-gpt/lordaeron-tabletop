# Desktop UI · painted icons and character typography

The September 2026 polish keeps the desktop war table and its existing game rules. The supplied phone photo was a visual reference, not a mobile development request.

## Changes

- Character nameplates show a framed portrait and class badge, with separate Health, Energy and Gold labels and tabular values.
- Nine new painted symbols cover health, energy, gold, XP, actions, characters, quests, bags and encounters. Class, combat and action symbols reuse the existing painted ability artwork.
- The same symbols appear in panel navigation, character capacities, resource bars, currency counters, sheet tabs and class decks. Utility arrows, close buttons and other navigation controls retain Lucide symbols.
- Cinzel identifies characters and sections; Inter makes labels and numbers easier to read. Bronze borders, contrast and spacing follow the existing Warcraft materials.
- Icon images are decorative. Visible labels remain text, and each level capacity has a descriptive accessible group name.

## Asset provenance

Generated with the built-in ImageGen tool for this project. Final runtime files: `public/assets/ui-icons/{health,energy,gold,experience,actions,characters,quests,bag,encounters}.webp` (128 × 128, approximately 69 KB total). No external image service is needed at runtime.

`scripts/prepare-ui-icons.mjs <approved-atlas.png>` extracts the measured cells of the approved 1254 × 1254 source and pads them to square thumbnails without stretching. The source has uneven row boundaries, so the script uses measured coordinates rather than assuming an exact grid.

Generation prompt:

> Use case: stylized-concept. Asset type: ONE game UI icon atlas texture for a premium World of Warcraft-inspired desktop board game, to match rich existing hand-painted ability icons on dark charcoal and bronze UI. Create a single square image containing EXACTLY a 3 by 3 edge-to-edge grid of nine equal square icon tiles; no gaps or margins between tiles, all tile boundaries at exactly one third and two thirds of the full image dimensions. Each tile contains one centered, large, instantly recognizable object filling 80 percent of the tile, with a simple near-black background and a restrained colored halo. No external picture frames, no text, no labels, no letters, no numbers, no UI mockup, no watermark. Top row left to right: 1 a bright crimson faceted HEART-SHAPED ruby representing health, 2 a bright sapphire blue magical energy orb with one bold white lightning rune representing energy, 3 three chunky ancient GOLD COINS in a small stack with embossed abstract sun marks representing gold. Middle row left to right: 4 a glowing violet four-point faceted STAR gem representing experience, 5 a bronze HOURGLASS with luminous golden sand representing available actions, 6 an ornate steel warrior HELMET with a warm red plume representing characters. Bottom row left to right: 7 rolled ivory parchment QUEST SCROLL with a wax seal, 8 a brown leather SATCHEL with gold clasp representing inventory and merchant, 9 a weathered ivory SKULL resting on a dark burgundy card deck representing world encounters. Style: bold iconic silhouettes, Warcraft fantasy game inventory art, painterly richly textured metal and gemstones, dramatic directional highlights, warm antique bronze accents, realistic painted material volume, not flat vector art and not cartoon emoji. Strong readability at 24 to 36 pixels. Consistent scale, lighting and composition across all nine tiles. Output the atlas alone.

## Verification

- `npm run build`: TypeScript, server types and production bundle pass.
- `npm test`: 323 tests pass across 20 files.
- `npm run check:render`: 621 components render without invalid text.
- Chrome: fresh four-character setup on a separate local origin, main table, Warrior/Mage character switching, equipment text, class deck, merchant, return to the map and Rest updating the remaining action count.
- Desktop widths: 1536 px and 1200 px. No page or dialog horizontal overflow; all inspected images loaded; no browser console errors.
- Local visual evidence is in `.local-data/premium-ui/`; it is deliberately excluded from version control. These checks cover the updated desktop presentation and controls, not a full accessibility audit.
