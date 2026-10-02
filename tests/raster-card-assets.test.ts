import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { BASE_PACK as p } from '../src/data/base';
import { abilityRasterText, allRasterCardText, compactChoices, rasterCardDescription, type RasterCardText } from '../src/campaign/raster-card-text';
import manifestData from '../src/data/raster-card-faces.json';

const faces:Record<string,{src:string;width:number;height:number;description:string;fingerprint:string}>=manifestData;
const sha=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
const normalize=(s:string)=>s.replace(/\s+/g,' ').trim();
type Metadata={cards:Record<string,{fingerprint:string;artFingerprint:string;text:RasterCardText;layout:{height:number;bodyFontSize:number;lastBodyBaseline:number;bodyBottom:number;lines:{text:string;x:number;y:number;size:number;width:number;anchor:string}[]}}>};
const metadata=()=>JSON.parse(readFileSync('src/data/raster-card-metadata.json','utf8')) as Metadata;

describe('production raster card faces',()=>{
 it('covers every card category, both Overlord sizes and all 16 reference characters',()=>{
  const all=allRasterCardText();
  expect(all).toHaveLength(573);
  expect(all.filter(c=>c.category==='ability')).toHaveLength(406);
  expect(all.filter(c=>c.category==='quest')).toHaveLength(80);
  expect(all.filter(c=>c.category==='event')).toHaveLength(52);
  expect(all.filter(c=>c.category==='creature')).toHaveLength(13);
  expect(all.filter(c=>c.category==='overlord')).toHaveLength(6);
  expect(all.filter(c=>c.category==='character')).toHaveLength(16);
  expect(Object.keys(faces).sort()).toEqual(all.map(c=>c.id).sort());
 });
 it('rejects stale rules, costs, conditions, choices or artwork',()=>{
  const meta=metadata();
  const originals=JSON.parse(readFileSync('src/data/full-cards.json','utf8')) as Record<string,string>;
  for(const c of allRasterCardText()){
   expect(faces[c.id].fingerprint,c.id).toBe(sha(JSON.stringify(c)));
   expect(faces[c.id].description,c.id).toBe(rasterCardDescription(c));
   expect(meta.cards[c.id].text,c.id).toEqual(c);
   const source=c.art.startsWith('portrait:')?`/assets/portraits/${c.art.slice(9)}.webp`:originals[c.art];
   expect(meta.cards[c.id].artFingerprint,c.id).toBe(sha(readFileSync(`public${source}`)));
  }
 });
 it('ships decodable WebP images with the declared full readable dimensions',async()=>{
  const entries=Object.entries(faces);let next=0;
  await Promise.all(Array.from({length:4},async()=>{while(next<entries.length){
   const [id,face]=entries[next++];
   expect(face.src,id).toMatch(/^\/assets\/card-faces\/v9\/.+\.webp$/);
   expect(existsSync(`public${face.src}`),id).toBe(true);
   const m=await sharp(`public${face.src}`).metadata();
   expect(m.format,id).toBe('webp');expect(m.width,id).toBe(768);expect(m.height,id).toBe(face.height);
   expect(face.height,id).toBeGreaterThanOrEqual(1152);
  }}));
 },30000);
 it('bakes every transcript section and leaves every line inside the safe print area',()=>{
  const meta=metadata();
  for(const c of allRasterCardText()){
   const layout=meta.cards[c.id].layout;
   expect(layout.bodyFontSize,c.id).toBeGreaterThanOrEqual(28);
   expect(layout.lastBodyBaseline+9,c.id).toBeLessThan(layout.bodyBottom);
   const ink=normalize(layout.lines.map(l=>l.text).join(' '));
   for(const section of c.sections){
    if(section.label)expect(ink,c.id).toContain(normalize(section.label.toUpperCase()));
    expect(ink,c.id).toContain(normalize(section.text));
   }
   for(const line of layout.lines){
    const left=line.anchor==='middle'?line.x-line.width/2:line.x;
    expect(left,`${c.id}: ${line.text}`).toBeGreaterThanOrEqual(50);
    expect(left+line.width,`${c.id}: ${line.text}`).toBeLessThanOrEqual(718);
    expect(line.y,`${c.id}: ${line.text}`).toBeLessThan(layout.height);
   }
  }
 });
 it('retains every strength option, with exact expansion of long linear ranges',()=>{
  const all=allRasterCardText();let formulas=0;
  for(const c of p.cards){
   const transcript=all.find(v=>v.id===c.id)!;
   const groups=new Map<string,typeof c.abilities>();
   for(const a of c.abilities){const key=a.usageGroup??a.id;groups.set(key,[...(groups.get(key)??[]),a]);}
   for(const choices of groups.values()){
    const compact=compactChoices(c,choices);
    if(!compact){for(const a of choices)expect(transcript.sections.some(s=>s.text===abilityRasterText(c,a)),`${c.id}/${a.id}`).toBe(true);continue;}
    if(compact.startsWith('Choose X')){
     formulas++;
     const range=compact.match(/^Choose X from 1–(\d+)\. /)!;
     expect(Number(range[1]),c.id).toBe(choices.length);
     const template=compact.slice(range[0].length);
     choices.forEach((a,i)=>expect(template.replace(/(\d+)×X/g,(_,n:string)=>String(Number(n)*(i+1))).replace(/X/g,String(i+1)),`${c.id}/${a.id}`).toBe(abilityRasterText(c,a)));
    }else{
     expect(c.id).toBe('druid-strength-of-the-wild');
     expect(compact).toContain('If equipped: Beast Form: Spot 1–7 (red dice · 8)');
     for(let count=1;count<=7;count++)for(let ranged=0;ranged<=count;ranged++)expect(choices.some(a=>a.effects[0].op==='spot'&&a.effects[0].count===count&&a.effects[0].effects[0].op==='token'&&a.effects[0].effects[0].amount===ranged&&a.effects[0].effects[1].op==='token'&&a.effects[0].effects[1].amount===count-ranged)).toBe(true);
    }
   }
  }
  expect(formulas).toBeGreaterThan(0);
 });
});
