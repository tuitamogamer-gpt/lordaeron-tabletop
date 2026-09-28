import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

// Measured cell boundaries of the approved ImageGen source. Padding preserves
// each painted silhouette instead of stretching the differently sized cells.
const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/prepare-ui-icons.mjs <approved-atlas.png>');
const metadata = await sharp(source).metadata();
if (metadata.width !== 1254 || metadata.height !== 1254) throw new Error('Expected the approved 1254 × 1254 atlas.');
const output = resolve('public/assets/ui-icons');
await mkdir(output, { recursive: true });
const names = ['health', 'energy', 'gold', 'experience', 'actions', 'characters', 'quests', 'bag', 'encounters'];
const columns = [0, 418, 836, 1254], rows = [0, 380, 774, 1254];
for (const [i, name] of names.entries()) {
  const col = i % 3, row = Math.floor(i / 3);
  await sharp(source)
    .extract({ left: columns[col] + 3, top: rows[row] + 3, width: columns[col + 1] - columns[col] - 6, height: rows[row + 1] - rows[row] - 6 })
    .resize(128, 128, { fit: 'contain', background: '#090a08' })
    .webp({ quality: 90 })
    .toFile(resolve(output, `${name}.webp`));
}
console.log(`Prepared ${names.length} painted UI icons in ${output}`);
