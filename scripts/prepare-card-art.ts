/** Extract only illustration windows from the user's local source set. Never use a scanned rules panel as UI. */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { BASE_PACK as p } from '../src/data/base';
import type { Card } from '../src/rules/model';
const out='public/assets/card-art';
await mkdir(out,{recursive:true});
const manifest:Record<string,string>={};
type Crop=[number,number,number,number];
function windowFor(c:Card):Crop {
 if(c.source.reference.startsWith('Character Sheets/')) {
  if(c.kind==='racial')return [.345,.188,.108,.134];
  if(c.id.endsWith('-stance'))return [.571,.294,.064,.078];
  if(c.id.endsWith('-ranged'))return [.399,.674,.065,.082];
  if(c.id.endsWith('-melee'))return [.571,.674,.065,.082];
  return [.911,.674,.065,.082];
 }
 if(c.kind==='talent')return [.326,.087,.35,.226];
 // Warrior scans include registration marks; other scans are trimmed to the card.
 if(c.source.reference.startsWith('Classes/Warrior/'))return [.51,.214,.389,.248];
 return [.503,.195,.42,.257];
}
for(const c of p.cards){
 const source=c.source.reference.split(' · FAQ')[0];
 if(source.startsWith('Event Cards/'))continue;
 const file=`.local-data/scans/${source}`,m=await sharp(file).metadata(),[x,y,w,h]=windowFor(c);
 const name=`${c.id}.webp`;
 await sharp(file).extract({left:Math.round(m.width!*x),top:Math.round(m.height!*y),width:Math.round(m.width!*w),height:Math.round(m.height!*h)}).resize(192,192,{fit:'contain',background:'#171918'}).webp({quality:87}).toFile(`${out}/${name}`);
 manifest[c.id]=`/assets/card-art/${name}`;
}
// Physically split portrait cells. Rectangular containers can no longer show neighbouring faces.
await mkdir('public/assets/portraits',{recursive:true});
const atlas='public/assets/warcraft/characters-base.webp',m=await sharp(atlas).metadata();
for(const c of p.characters){const w=Math.floor(m.width!/4),h=Math.floor(m.height!/4);await sharp(atlas).extract({left:c.portrait%4*w,top:Math.floor(c.portrait/4)*h,width:w,height:h}).webp({quality:90}).toFile(`public/assets/portraits/${c.id}.webp`);}
const bossAtlas='public/assets/warcraft/bosses-base.webp',b=await sharp(bossAtlas).metadata(),bw=Math.floor(b.width!/3);
for(const [i,id] of ['kazzak','nefarian','kelthuzad'].entries())await sharp(bossAtlas).extract({left:i*bw,top:0,width:bw,height:b.height!}).webp({quality:90}).toFile(`public/assets/portraits/${id}.webp`);
await writeFile('src/data/card-art.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Prepared ${Object.keys(manifest).length} card illustrations and 19 isolated portraits.`);
