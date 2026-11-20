// Prepares the painted Combat Area trays and the War and Boss map tokens from their generated sources.
// The sources (docs/IMAGEGEN-COMBAT-AREA-2026-11-20.md) are square PNGs on a transparent background; each is trimmed to its
// object, so that the round tray or token fills its square, and written as WebP with its transparency.
// Run with: npx tsx scripts/prepare-combat-art.ts [source directory]
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const from = process.argv[2] ?? '.local-data/imagegen-sources/openart-2026-11-20';
const ASSETS = [
 { source: 'combat-damage.png', out: 'public/assets/combat/damage.webp', size: 512 },
 { source: 'combat-defense.png', out: 'public/assets/combat/defense.webp', size: 512 },
 { source: 'combat-attrition.png', out: 'public/assets/combat/attrition.webp', size: 448 },
 { source: 'token-war.png', out: 'public/assets/tokens/war.webp', size: 160 },
 { source: 'token-boss.png', out: 'public/assets/tokens/boss-encounter.webp', size: 176 },
] as const;
mkdirSync('public/assets/combat', { recursive: true });
for (const asset of ASSETS) {
 // Trim to the object, then set it in a square of its own larger side so that a round object stays round.
 const trimmed = await sharp(`${from}/${asset.source}`).ensureAlpha().trim({ threshold: 12 }).png().toBuffer({ resolveWithObject: true });
 const side = Math.max(trimmed.info.width, trimmed.info.height);
 const info = await sharp(trimmed.data)
  .extend({ top: Math.floor((side - trimmed.info.height) / 2), bottom: Math.ceil((side - trimmed.info.height) / 2), left: Math.floor((side - trimmed.info.width) / 2), right: Math.ceil((side - trimmed.info.width) / 2), background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .resize(asset.size, asset.size, { fit: 'fill' }).webp({ quality: 88, alphaQuality: 100 }).toFile(asset.out);
 console.log(`${asset.out}: ${trimmed.info.width}×${trimmed.info.height} trimmed → ${info.width}×${info.height}, ${Math.round(info.size / 1024)} kB`);
}
// The mat the three trays lie on fills its image: it is only scaled.
const mat = await sharp(`${from}/combat-mat.png`).resize(768, 512, { fit: 'cover' }).webp({ quality: 84 }).toFile('public/assets/combat/mat.webp');
console.log(`public/assets/combat/mat.webp: ${mat.width}×${mat.height}, ${Math.round(mat.size / 1024)} kB`);
