import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/prepare-character-dossier.mjs <generated-source.png>');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'public/assets/warcraft/character-dossier-v5.webp');
const input = resolve(source);
if (input === output) throw new Error('The source must be separate from the generated WebP output.');

const original = await sharp(input).metadata();
if (!original.width || !original.height) throw new Error('The source must have valid image dimensions.');

await mkdir(dirname(output), { recursive: true });
await sharp(input).webp({ quality: 88, effort: 6 }).toFile(output);

const result = await sharp(output).metadata();
if (result.width !== original.width || result.height !== original.height) {
  throw new Error('The output dimensions differ from the source.');
}
const { size } = await stat(output);
console.log(`Prepared ${result.width} × ${result.height} dossier artwork (${size} bytes) at ${output}`);
