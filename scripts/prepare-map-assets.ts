import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { creatureIcons } from '../src/campaign/Art';
await mkdir('public/assets/tokens',{recursive:true});
const src='public/assets/warcraft/bestiary.webp',m=await sharp(src).metadata(),w=Math.floor(m.width!/4),h=Math.floor(m.height!/4);
for(const [id,i] of Object.entries(creatureIcons)) await sharp(src).extract({left:i%4*w,top:Math.floor(i/4)*h,width:w,height:h}).resize(128,128).webp({quality:90}).toFile(`public/assets/tokens/${id}.webp`);
// Keep the Wildkin token consistent with the feathered owlbear on its new full card.
await sharp('public/assets/full-cards/creature-wildkin.webp').extract({left:20,top:48,width:344,height:260}).resize(128,128,{fit:'cover'}).webp({quality:90}).toFile('public/assets/tokens/wildkin.webp');
await sharp('.local-data/full-card-sources/lordaeron-relief-v3.png').resize(2400,1600).webp({quality:91}).toFile('public/assets/warcraft/lordaeron-relief-v3.webp');
console.log('Isolated creature tokens and Lordaeron relief ready.');
