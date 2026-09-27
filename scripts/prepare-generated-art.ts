import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
import {BASE_PACK as p} from '../src/data/base';
const classes=['warrior','mage','hunter','rogue','priest','warlock','paladin','druid','shaman'];
const manifest:Record<string,string>={};
const root='.local-data/imagegen-sources';
async function cell(file:string,index:number,columns:number,rows:number,dest:string){
 const m=await sharp(file).metadata(),w=Math.floor(m.width!/columns),h=Math.floor(m.height!/rows);
 // Remove a two-pixel divider only. Contain the complete illustration, never crop a subject to fill a banner.
 await sharp(file).extract({left:index%columns*w+2,top:Math.floor(index/columns)*h+2,width:w-4,height:h-4}).resize(256,256,{fit:'contain',background:'#14191a'}).webp({quality:91}).toFile(`public${dest}`);
}
await mkdir('public/assets/talent-art',{recursive:true});await mkdir('public/assets/event-art',{recursive:true});
for(let batch=0;batch<3;batch++){
 const cards=classes.slice(batch*3,batch*3+3).flatMap(cls=>p.cards.filter(c=>c.classId===cls&&c.kind==='talent'));
 for(const [i,c] of cards.entries()){const dest=`/assets/talent-art/${c.id}.webp`;await cell(`${root}/talents-v3-${batch}.png`,i,6,6,dest);manifest[c.id]=dest;}
}
const events=['hatreds','professions','auction','boss','horizons','zeppelin','merchants','soul-taint','plague','subterfuge','beasts','retrain','ears','war','cleanse','arcane-corruption','bounty','winds','sell'];
for(const [i,script] of events.entries())await cell(`${root}/events-v3.png`,i,6,4,`/assets/event-art/${script}.webp`);
for(const [i,c] of p.cards.filter(c=>c.source.reference.startsWith('Event Cards/')).entries()){const dest=`/assets/event-art/${c.id}.webp`;await cell(`${root}/events-v3.png`,19+i,6,4,dest);manifest[c.id]=dest;}
await cell(`${root}/events-v3.png`,23,6,4,'/assets/event-art/spellbook.webp');
await writeFile('src/data/generated-card-art.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Prepared ${Object.keys(manifest).length} distinct talent/auction illustrations and ${events.length} world-event themes.`);
