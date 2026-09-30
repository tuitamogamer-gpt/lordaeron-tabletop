# Premium character dossier artwork · v5

Generated with the built-in ImageGen tool on 30 September 2026 for this project's premium character sheets. No external image API key is required at runtime.

## Asset purpose and provenance

`public/assets/warcraft/character-dossier-v5.webp` is a decorative dark leather and engraved bronze backdrop. It includes a complete outer frame around one uninterrupted, dark leather interior. The initial portrait recess and internal divider were removed so character names, capacities, resource values, card content and controls can remain live interface elements with consistent spacing.

The initial generated source is `C:/Users/Korisnik/.codex/generated_images/01a0f360-e9ba-7ce0-bca7-513316059dc8/exec-21866dd5-da06-4896-95f2-c90dbb5fc4b6.png`. ImageGen refined that image into the final source, `C:/Users/Korisnik/.codex/generated_images/01a0f360-e9ba-7ce0-bca7-513316059dc8/exec-debc3f01-d2ca-45f5-a53d-a5bd56fa800e.png`. Both sources are preserved in the local generated image directory. The runtime WebP retains the full 1774 × 887 dimensions without resizing or cropping and uses quality 88 with encoding effort 6. Its encoded size is 315,242 bytes (approximately 308 KiB).

Rebuild it from a generated source image with:

```powershell
node scripts/prepare-character-dossier.mjs 'C:/path/to/generated-source.png'
```

The script always writes the runtime asset into this repository, checks that its dimensions match the source and prints the resulting dimensions and byte count. The generated artwork contains no baked character data or interface text.

## Implementation and verification

The shared sheet supports all 16 heroes. A large portrait anchors live class, location, level, health, energy and action controls. Equipment and racial thumbnails show the illustration while preserving the complete `GameCard` hover preview and click-to-inspect behavior.

- `npm run build` passed; `check:render` produced 621 valid components.
- Targeted `command-table` and `card-thumbnail` tests passed: 40/40.
- Browser checks covered 1280 × 720 and 1200 × 768 desktop equipment, class deck, bag and talents, plus the Heroes page at 390 × 844, with no horizontal overflow. Short desktop viewports may use modal scrolling.

## Exact initial generation prompt

```text
Use case: stylized-concept. Asset type: production decorative material backdrop for a premium World of Warcraft board game character sheet, landscape aspect ratio 2:1, straight-on flat orthographic game UI texture. Primary request: create an exquisitely crafted collector's edition character dossier panel, with ancient blackened bronze, antique champagne gold engraving, near-black midnight slate and tactile charcoal leather. A finely sculpted complete rectangular outer metal frame with tasteful angular medieval fantasy corner fittings and tiny engraved scrollwork, all corners fully visible. Very thin inner gold fillet. The leftmost 25 percent has a deeper inset charcoal leather portrait recess with an elegant pointed gothic arch at the top and delicate ornamental gold filigree around its edge. The remaining right 75 percent is uninterrupted dark charcoal subtly textured leather with a VERY FAINT embossed compass rose at the far lower-right and no panel divisions. Top corners have small deep crimson gemstone inlays. Lighting: restrained directional warm gold rim light on sculpted metal edges, tactile patinated brass, cinematic premium RPG art direction. The center interior must stay VERY DARK and quiet for live readable interface text; emphasis is on workmanship around outermost perimeter, no busy center. This is only a texture asset, NOT a screenshot or UI mockup. Constraints: NO text, NO lettering, NO numbers, NO characters, NO portraits, NO skulls, NO cards, NO widgets, NO actual logo. Symmetric horizontal frame, strong craft detail, sophistication, no cheap glows, no bright parchment.
```

## Exact refinement prompt

```text
Use case: precise-object-edit. Edit target: the provided premium character dossier frame. Change ONLY the inner left portrait arch, internal left inset ornament and internal vertical dividing line: remove them completely and replace their area with the same uninterrupted dark textured charcoal leather as the center. Preserve the entire beautifully detailed antique brass and champagne gold outer rectangular perimeter frame, all sculpted outer corners, red gemstone inlays, faint bottom-right compass rose, lighting and material style. The final image must have a SINGLE large continuous very dark quiet leather interior with NO internal dividers and NO portrait recess. Keep the ornate outer frame within the outermost 4 percent on every edge so live interface content has space. Still no text, numbers, portraits, symbols in center or UI widgets. Preserve landscape 2:1 composition.
```
