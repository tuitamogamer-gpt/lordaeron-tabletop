// Sets the class cards, items and starting cards that `npm run scans:prepare` wrote before the printed border existed (card-border.ts)
// in that border, in place and without the original scans: `npm run scans:border`. A face that already has it (it carries the mark of
// card-border.ts) is left alone, so this can run any number of times; `scans:prepare` adds the border itself.
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { BASE_PACK as p } from '../src/data/base';
import { borderedCards, exif, hasBorder, withPrintedBorder } from './card-border';

const MANIFEST = 'src/data/scan-assets.json';
if (!existsSync(MANIFEST)) { console.log(`No prepared scans (${MANIFEST}), nothing to do.`); process.exit(0); }
type Face = { src: string; width: number; height: number };
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as { cards: Record<string, Face> };
let framed = 0, kept = 0;
for (const id of borderedCards(p)) {
 const face = manifest.cards[id];
 if (!face) continue;
 const file = `public${face.src}`;
 if (hasBorder(await sharp(file).metadata())) { kept++; continue; }
 const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true }), card = await withPrintedBorder(data, info);
 const out = await sharp(card.data, { raw: card.info }).webp({ quality: 88, alphaQuality: 100, smartSubsample: true, effort: 5 }).withExif(exif).toFile(`${file}.tmp`);
 renameSync(`${file}.tmp`, file);
 manifest.cards[id] = { ...face, width: out.width, height: out.height };
 framed++;
}
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
console.log(`${framed} faces set in the printed border, ${kept} already had it.`);
