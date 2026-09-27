import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { BASE_PACK as p } from '../src/data/base';

/** Each cell is a complete imagegen card face, including its painted border and vellum. */
const batches: { id: string; columns: number; rows: number; cards: { id: string; subject: string }[] }[] = [];
function batch(prefix: string, cards: { id: string; subject: string }[], size = 36, columns = 6) {
 for (let i = 0; i < cards.length; i += size) batches.push({ id: `${prefix}-${i / size + 1}`, columns, rows: Math.ceil(Math.min(size, cards.length - i) / columns), cards: cards.slice(i, i + size) });
}
batch('powers', p.cards.filter(c => c.kind === 'power' && !c.printed).map(c => ({ id: c.id, subject: `${c.classId} ability: ${c.name}` })));
batch('talents', p.cards.filter(c => c.kind === 'talent').map(c => ({ id: c.id, subject: `${c.classId} talent: ${c.name}` })));
batch('equipment', p.cards.filter(c => c.kind === 'item' && !c.printed).map(c => ({ id: c.id, subject: `${c.type} equipment: ${c.name}` })), 30, 5);
batch('starting', p.cards.filter(c => c.printed || c.kind === 'racial').map(c => ({ id: c.id, subject: `${c.classId ?? ''} ${c.kind}: ${c.name}` })));
batch('quests', p.quests.map(q => ({ id: q.id, subject: `${q.faction} quest '${q.name}': ${q.spawns.filter(s => s.color !== 'blue').map(s => `${s.creature} at ${p.regions.find(r => r.id === s.region)?.name}`).join(', ')}. ${q.tier} difficulty jewel` })), 40, 8);
batch('encounters', [...new Set(p.events.map(e => e.script!))].map(script => ({ id: `encounter-${script}`, subject: `World encounter: ${p.events.find(e => e.script === script)!.name}. Theme ${script}` })), 20, 5);
batch('bestiary', [...p.creatures.map(c => ({ id: `creature-${c.id}`, subject: `Menacing Warcraft ${c.name}, full creature portrait in its native habitat` })), ...p.overlords.map(o => ({ id: `overlord-${o.id}`, subject: `Epic Warcraft raid boss ${o.name}, imposing recognizable full portrait` }))], 16, 4);
// Correct the two atlases with an extra partial column and the Wildkin anatomy.
batches.push({id:'power-repairs',columns:4,rows:3,cards:batches.filter(b=>b.id==='powers-1'||b.id==='powers-3').flatMap(b=>b.cards.filter((_,i)=>i%6===5))});
batches.push({id:'wildkin-repairs',columns:4,rows:2,cards:batches.filter(b=>b.id.startsWith('quests-')||b.id==='bestiary-1').flatMap(b=>b.cards.filter(c=>/wildkin/i.test(c.subject)))});
const root = '.local-data/full-card-sources';
// Reviewed atlas boundaries. Some generated sheets have a taller final row or outer padding.
const cuts:Record<string,{x?:number[];y?:number[]}>={
 'powers-1':{x:[0,160,320,480,640,800,1024].map(v=>v/1024),y:[0,247,493,751,1007,1280,1536].map(v=>v/1536)},
 'powers-2':{y:[0,240,481,726,969,1214,1536].map(v=>v/1536)},
 'powers-3':{x:[0,160,320,480,640,800,1024].map(v=>v/1024)},
 'equipment-1':{y:[0,253,506,760,1015,1270,1522].map(v=>v/1683)},
 'equipment-3':{y:[0,257,516,778,1039,1300,1683].map(v=>v/1683)},
 'equipment-4':{y:[0,263,530,797,1066,1336,1673].map(v=>v/1683)},
 'quests-2':{y:[0,238,478,718,958,1198].map(v=>v/1214)},
 'power-repairs':{y:[0,473,945,1414].map(v=>v/1536)},
};
await mkdir(root, { recursive: true });
if (process.argv.includes('--plan')) {
 await writeFile(`${root}/plan.json`, JSON.stringify(batches, null, 2));
 console.log(JSON.stringify(batches));
} else {
 await mkdir('public/assets/full-cards', { recursive: true });
 const manifest: Record<string, string> = {};
 for (const b of batches) {
  const source = `${root}/${b.id}.png`;
  const meta = await sharp(source).metadata();
  const xs=cuts[b.id]?.x??Array.from({length:b.columns+1},(_,i)=>i/b.columns),ys=cuts[b.id]?.y??Array.from({length:b.rows+1},(_,i)=>i/b.rows);
  for (const [i, c] of b.cards.entries()) {
   const dest = `/assets/full-cards/${c.id}.webp`;
   const col=i%b.columns,row=Math.floor(i/b.columns),left=Math.round(xs[col]*meta.width!),top=Math.round(ys[row]*meta.height!),right=Math.round(xs[col+1]*meta.width!),bottom=Math.round(ys[row+1]*meta.height!);
   await sharp(source).extract({ left, top, width:right-left, height:bottom-top }).resize(384, 576, { fit: 'fill' }).webp({ quality: 88 }).toFile(`public${dest}`);
   manifest[c.id] = dest;
  }
 }
 for (const e of p.events) manifest[e.id] = manifest[`encounter-${e.script}`];
 await writeFile('src/data/full-cards.json', JSON.stringify(manifest, null, 2) + '\n');
 console.log(`Prepared ${Object.keys(manifest).length} complete card faces.`);
}
