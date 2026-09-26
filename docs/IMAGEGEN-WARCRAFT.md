# Warforged Chronicles — imagegen assets

Generated with the built-in imagegen tool on 27 September 2026. These are project art assets, not scans or verified reproductions of printed card content. Runtime assets live in `public/assets/warcraft/`. The original map was supplied only to preserve the existing geography during style transfer. All labels, numbers, rules, controls and game state remain real HTML/SVG.

The generated PNGs were encoded as WebP (quality 90, map 92; alpha quality 100) without cropping, recoloring or compositing. Originals are retained in `.local-data/imagegen-sources/` and in the generator output directory. Only the WebP files ship. UI frames use CSS nine-slice scaling; sprite atlases use clipped SVG view boxes.

## Visual references

Classic Warcraft interfaces informed the treatment of materials and information hierarchy: [character and spellbook panels](https://www.numerama.com/tech/436574-world-of-warcraft-classic-une-heure-de-demo-pour-se-replonger-en-2004.html), [parchment quest journal](https://www.ordinaryreviews.com/elixir-of-suffering-wow-classic). These reference screenshots were not copied into the game.

## Exact prompts

### frame.webp

Saved path: `public/assets/warcraft/frame.webp`

Use case: stylized-concept. Asset type: production nine-slice UI frame texture for a desktop Warcraft-inspired strategy board game. Create one square 1024x1024 ornamental window frame, viewed absolutely straight on, orthographic, no perspective. Thick dark carved basalt outer rim, bevelled antique bronze inner rim, hand-painted chunky Warcraft III / vanilla World of Warcraft craftsmanship. Four distinct hammered bronze corner caps with angular dwarven knot engraving and tiny rivets; small deep ruby gem centered in each corner cap. Strong sculpted top-left highlights and dark crevices; tactile metal and stone, warm gold edge accents, weathered but not broken. Entire ornament confined to the outer 100 pixels, with the four square corner details confined to 150x150px corners so the straight middle edges can stretch cleanly. The inside 800x800 area must be completely transparent alpha, no fill, no illustration. Outside the outer rim transparent too. No text, no letters, no logo, no extra objects, no fake checkerboard. High quality actual game interface asset, strong silhouette, not a modern flat app border.

### abilities.webp

Saved path: `public/assets/warcraft/abilities.webp`

Use case: stylized-concept. Asset type: one production sprite atlas of 16 painted RPG ability icons for a Warcraft-inspired desktop board game. Exact 4 by 4 grid of equally sized square cells, no gaps, no margins, no borders, each cell fills its quadrant exactly. 2048x2048 square image. Style: iconic vanilla World of Warcraft and Warcraft III hand-painted inventory art, chunky heroic forms, bold silhouettes, dramatic rim lighting, rich jewel colors, luminous magical strokes on very dark backgrounds, detailed brushwork, legible at 48px. Each icon shows one large subject centered, reaching 80% of its cell. Row 1 left to right: crossed steel battle axes against dark red; bright blue arcane projectile; heavy steel and gold kite shield against dark navy; enormous axe slashing with orange fire. Row 2: icy blue frost spiral; radiant golden paladin warhammer; emerald leaves around a glowing healing seed; electric teal lightning bolt. Row 3: curved wooden hunting bow and arrow; pair of emerald poisoned daggers; horned purple demonic skull; golden holy sunburst. Row 4: rolled parchment travel map and brass compass; warm orange campfire beside a tiny tent; open purple leather spellbook with glowing pages; warmly lit medieval tavern with red roof. All sixteen icons separate, crisp perfectly aligned square grid, no text, no letters, no watermark, no user interface mockup, no objects spanning cells. Deliver only the reusable sprite atlas.

### parchment.webp

Saved path: `public/assets/warcraft/parchment.webp`

Use case: stylized-concept. Asset type: production game UI background texture. A single square sheet of old warm ivory parchment fills the entire image, orthographic straight-on flat scan. Hand-painted fantasy Warcraft quest journal material, fine visible paper fibres, restrained mottled warm ochre stains around the outer 15%, tiny worn creases, lightly scorched soft edges, center 70% clean pale golden ivory for readable dark text. Detailed tactile material, soft uniform illumination, high-end painterly game art. Absolutely NO text, writing, runes, diagrams, borders, frames, objects or symbols. No curls, no torn holes, no shadow outside paper. Full bleed paper only.

### factions.webp

Saved path: `public/assets/warcraft/factions.webp`

Use case: stylized-concept. Asset type: two-faction emblem sprite atlas for a Warcraft-inspired board game. Landscape image exactly 2:1 ratio, two equal square cells side by side with each subject centered in its cell. Left: imposing Horde-inspired orcish crimson iron shield medallion, dark red enamel, heavy black forged iron, angular fang-shaped golden tribal insignia, two small ivory tusks curving outward from bottom, worn hammered details. Right: Alliance-inspired royal azure blue shield medallion, a proud sculpted golden lion head at center, golden steel rim, deep blue enamel, angular royal heraldry. Same size, each takes 85% of its square cell, exactly aligned centers, dramatic hand-painted Warcraft III game UI icon art, bright top-left metal highlights, deep bevel shadows, bold chunky silhouette. Isolated on actual transparent alpha background, no text, no names, no captions, no user interface, no fake checkerboard. Separate self-contained shields never touching across center.

### bestiary.webp

Saved path: `public/assets/warcraft/bestiary.webp`

Use case: stylized-concept. Asset type: production monster portrait sprite atlas for a Warcraft board game. Square image, exact 4 by 4 grid, sixteen equally sized square cells edge to edge, no gaps, no borders, no text. Richly painted Warcraft III / classic World of Warcraft bestiary portraits, heroic chunky forms, expressive faces, vivid colored rim light against dark atmospheric backgrounds. Every portrait centered within its own square, head and shoulders occupy most of cell, all perfectly aligned. Row 1 left to right: green murloc fishman with orange dorsal fin and enormous eyes; snarling brown gnoll hyena warrior; gaunt pale undead ghoul with glowing green eyes; Scarlet Crusade knight wearing red hood and steel mask. Row 2: blue-green naga serpent sorceress with fins; hairy giant dark spider with red eyes; gray snarling worgen werewolf; large brown-feathered wildkin owl-bear with antlers. Row 3: brutish blue two-headed ogre; spectral blue hooded wraith; towering red horned doomguard demon; fierce emerald dragon head. Row 4: jagged infernal rock golem burning with green fel fire; dark armored undead overlord with icy blue eyes and crown; glowing purple enchanted hourglass; wooden treasure chest overflowing with gold and a red gem. Every cell distinct, no character crossing cell boundary. Highly finished hand-painted game art, not photorealistic, not a UI mockup, no text.

### warhall.webp

Saved path: `public/assets/warcraft/warhall.webp`

Use case: stylized-concept. Asset type: wide atmospheric background for a Warcraft-inspired desktop strategy game, 16:9 landscape. Interior of an ancient Lordaeron war council chamber: massive weathered gray basalt masonry, sculpted angular stone arches, warm braziers at far left and far right, crimson Horde pennant near left edge and blue-gold Alliance pennant near right edge. Carved dark oak strategy table barely visible along bottom edge, mysterious cold teal mist in deep background, warm gold sparks low in the scene. Hand-painted Warcraft III loading-screen art with exaggerated architectural forms, rich brush texture, cinematic warm-cool contrast, sophisticated fantasy atmosphere. Composition mostly dark textured stone and shadow through the middle 75% because an interactive board sits on top; details concentrated along upper and outer edges. No people, no text, no logo, no letters, no foreground props obscuring the center. Not a UI mockup, no interface, no panels, no buttons.

### lordaeron.webp

Saved path: `public/assets/warcraft/lordaeron.webp`

Use case: style-transfer. Edit target: the provided fantasy Lordaeron map, which is the actual background underneath a fixed interactive game board. Preserve EXACTLY the placement and outlines of every coastline, river, lake, mountain range, castle, forest region, road and major landmark. Do not move, add or remove landforms. Change only the painting style and lighting. Make it feel like a beautiful 2005 Warcraft III / classic World of Warcraft illustrated campaign map: slightly chunkier stylized hand-painted mountains and buildings, more distinct pine-tree shapes, richer emerald forests, blue-teal water, warm ochre hills, golden autumn in the north center, purple corrupted northeast, icy pale blue central snowy mountains. Raise midtone brightness so details are easy to see on a game table; preserve dramatic dark depth in forests. Fine brush texture, crafted high fantasy art, warm parchment undertones, painterly not photorealistic, carefully balanced vividness rather than neon. Remove the heavy dark vignette so the whole land remains readable. Full bleed map in the same composition and proportions as reference. No labels, no letters, no icons, no grid, no markers, no border, no user interface, no new landmarks. Geometry and visual positions are invariants because interactive markers already exist.
