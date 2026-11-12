import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The recordings the game plays, against their content.
 *
 * From 10 to 12 Nov 2026 every voice line was silent after its first hundredth of a second: the preparation script ran the
 * lines through a fade that ended there. The files had the right names, sizes and lengths, the game requested and played
 * them, and no test listened. The test of every recording's content below does: it reads each MP3's frames and counts those
 * that carry sound.
 */
const ROOT = 'public/assets/audio';
const files = (dir: string) => readdirSync(`${ROOT}/${dir}`).filter(name => name.endsWith('.mp3')).map(name => name.slice(0, -4)).sort();

/**
 * How much of an MP3 carries sound. The files are MPEG-1 Layer III at a constant bit rate (scripts/prepare-audio.py): each
 * frame holds two granules, and the frame's side information says how many bits of sound each granule has. A granule of
 * digital silence has none, whatever the frame's size. Returns the share of granules with sound, and where the last one lies.
 */
function sounding(file: Buffer) {
 const BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], RATES = [44100, 48000, 32000];
 let at = file.toString('latin1', 0, 3) === 'ID3' ? 10 + ((file[6] & 0x7f) << 21 | (file[7] & 0x7f) << 14 | (file[8] & 0x7f) << 7 | (file[9] & 0x7f)) : 0;
 let granules = 0, heard = 0, last = 0;
 while (at + 4 <= file.length) {
  const b1 = file[at + 1], b2 = file[at + 2], b3 = file[at + 3], bitrate = BITRATES[b2 >> 4], rate = RATES[(b2 >> 2) & 3];
  // A frame begins with eleven set bits; version 3 is MPEG-1 and layer 1 is Layer III.
  if (file[at] !== 0xff || (b1 & 0xe0) !== 0xe0 || ((b1 >> 3) & 3) !== 3 || ((b1 >> 1) & 3) !== 1 || !bitrate || !rate) { at++; continue; }
  const length = Math.floor(144000 * bitrate / rate) + ((b2 >> 1) & 1), mono = (b3 >> 6) === 3, side = at + 4 + ((b1 & 1) ? 0 : 2), sideLength = mono ? 17 : 32;
  // The encoder's first frame carries its own tag and no sound.
  if (!['Info', 'Xing'].includes(file.toString('latin1', side + sideLength, side + sideLength + 4))) {
   const bits = (offset: number, count: number) => { let v = 0; for (let i = offset; i < offset + count; i++) v = (v << 1) | ((file[side + (i >> 3)] >> (7 - (i & 7))) & 1); return v; };
   const channels = mono ? 1 : 2, first = 9 + (mono ? 5 : 3) + 4 * channels;
   for (let g = 0; g < 2; g++) {
    let size = 0;
    for (let c = 0; c < channels; c++) size = Math.max(size, bits(first + (g * channels + c) * 59, 12));
    granules++;
    if (size > 64) { heard++; last = granules; }
   }
  }
  at += length;
 }
 return { granules, share: granules ? heard / granules : 0, until: granules ? last / granules : 0 };
}

describe('every recording', () => {
 it('sounds through its length', () => {
  const quiet: string[] = [];
  for (const dir of ['voice', 'sfx', 'themes']) for (const name of files(dir)) {
   const { granules, share, until } = sounding(readFileSync(`${ROOT}/${dir}/${name}.mp3`));
   expect(granules, `${dir}/${name}`).toBeGreaterThan(20);
   if (share < 0.8 || until < 0.9) quiet.push(`${dir}/${name}: sound in ${Math.round(share * 100)}% of it, the last at ${Math.round(until * 100)}%`);
  }
  // The silenced voice lines of 10 Nov 2026 measured 2% to 9% here; the lines as they are now measure 98% and more.
  expect(quiet).toEqual([]);
 });
 it('is told apart from silence by the reader used above', () => {
  // A frame of 64 kbit/s at 32 kHz, mono, whose two granules hold no sound, and the same frame with 900 bits in each.
  const frame = (bitsOfSound: number) => {
   const data = Buffer.alloc(288); data[0] = 0xff; data[1] = 0xfb; data[2] = 0x58; data[3] = 0xc4;
   const put = (offset: number, count: number, value: number) => { for (let i = 0; i < count; i++) if ((value >> (count - 1 - i)) & 1) data[4 + ((offset + i) >> 3)] |= 0x80 >> ((offset + i) & 7); };
   put(18, 12, bitsOfSound); put(18 + 59, 12, bitsOfSound);
   return data;
  };
  const many = (bitsOfSound: number[]) => Buffer.concat(bitsOfSound.map(frame));
  expect(sounding(many(Array(30).fill(900)))).toEqual({ granules: 60, share: 1, until: 1 });
  expect(sounding(many(Array(30).fill(0)))).toEqual({ granules: 60, share: 0, until: 0 });
  // Two frames of sound and then silence, as the silenced lines were.
  const cut = sounding(many([900, 900, ...Array(28).fill(0)]));
  expect(cut.share).toBeCloseTo(4 / 60, 5); expect(cut.until).toBeCloseTo(4 / 60, 5);
 });
});
