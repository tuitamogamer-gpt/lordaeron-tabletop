// Recolours each creature portrait as a single-colour plastic miniature, like the box's green, red and blue figures.
// Run with: npx tsx scripts/prepare-plastic-tokens.ts
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { BASE_PACK as p } from '../src/data/base';

const PLASTIC = {
 green: { shadow: [12, 68, 20], light: [196, 255, 150] },
 red: { shadow: [92, 12, 8], light: [255, 176, 146] },
 blue: { shadow: [12, 40, 104], light: [178, 218, 255] },
} as const;
const out = 'public/assets/tokens/plastic';
mkdirSync(out, { recursive: true });

for (const creature of p.creatures) {
 const { data, info } = await sharp(`public/assets/tokens/${creature.id}.webp`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
 for (const [color, { shadow, light }] of Object.entries(PLASTIC)) {
  const pixels = Buffer.from(data);
  for (let i = 0; i < pixels.length; i += 4) {
   // Luminance with a little extra contrast reads as moulded plastic catching the light.
   const l = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
   const t = Math.min(1, Math.max(0, (l - 0.5) * 1.3 + 0.5)) ** 0.7;
   for (let c = 0; c < 3; c++) pixels[i + c] = Math.round(shadow[c] + (light[c] - shadow[c]) * t);
  }
  await sharp(pixels, { raw: info }).webp({ quality: 82 }).toFile(`${out}/${creature.id}-${color}.webp`);
 }
}
console.log(`${p.creatures.length * 3} plastic tokens written to ${out}`);
