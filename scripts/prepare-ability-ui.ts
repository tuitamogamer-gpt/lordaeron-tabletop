import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { BASE_PACK as p } from '../src/data/base';
import oldFaces from '../src/data/full-cards.json';

// The frame and illustrations are generated artwork. Slice the reviewed frame so
// authoritative rules can grow naturally rather than spill across painted panels.
const root = '.local-data/ability-ui-sources';
const out = 'public/assets/ability-ui';
await mkdir(out, { recursive: true });
await mkdir('public/assets/full-cards/v8', { recursive: true });
const frame = await sharp(`${root}/frame.png`).resize(384, 640).png().toBuffer();
for (const [name, top, height] of [
 ['header', 0, 52], ['title', 217, 52], ['rules', 270, 300], ['footer', 577, 63],
] as const) {
 await sharp(frame).extract({ left: 0, top, width: 384, height }).webp({ quality: 94 }).toFile(`${out}/${name}.webp`);
}
await sharp(frame).webp({ quality: 92 }).toFile(`${out}/frame.webp`);
const manifest: Record<string, string> = {};
for (const c of p.cards) {
 const original = oldFaces[c.id as keyof typeof oldFaces];
 const art = await sharp(`public${original}`).extract({ left: 22, top: 60, width: 340, height: 270 })
  .resize(340, 160, { fit: 'cover' }).png().toBuffer();
 const path = `/assets/full-cards/v8/${c.id}.webp`;
 await sharp(frame).composite([{ input: art, left: 22, top: 53 }]).webp({ quality: 90 }).toFile(`public${path}`);
 manifest[c.id] = path;
}
await writeFile('src/data/ability-card-faces.json', JSON.stringify(manifest, null, 2) + '\n');
const dice = `${root}/dice.png`, diceMeta = await sharp(dice).metadata();
for (const [i, color] of ['red', 'blue', 'green'].entries()) {
 const left = Math.round(i * diceMeta.width! / 3), right = Math.round((i + 1) * diceMeta.width! / 3);
 const cell = await sharp(dice).extract({ left, top: 0, width: right - left, height: diceMeta.height! }).png().toBuffer();
 await sharp(cell).trim().resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .webp({ quality: 96 }).toFile(`${out}/d8-${color}.webp`);
}
console.log(`Prepared ${p.cards.length} ability/item faces and flexible imagegen panels.`);
