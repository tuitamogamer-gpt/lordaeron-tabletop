import {describe,it,expect} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {BASE_PACK as p} from '../src/data/base';
import extracted from '../src/data/card-art.json';
import generated from '../src/data/generated-card-art.json';
import fullFaces from '../src/data/full-cards.json';
import abilityFaces from '../src/data/ability-card-faces.json';
const art:Record<string,string>={...extracted,...generated};
describe('complete illustration coverage',()=>{
 it('ships the redesigned generated faces and all colored D8 symbols',()=>{
  for(const c of p.cards){const path=abilityFaces[c.id as keyof typeof abilityFaces];expect(path,c.id).toMatch(/^\/assets\/full-cards\/v8\/.+\.webp$/);expect(existsSync(`public${path}`),c.id).toBe(true);}
  for(const color of ['red','blue','green'])expect(existsSync(`public/assets/ability-ui/d8-${color}.webp`)).toBe(true);
 });
 it('ships full raster faces for all abilities, items, quests, encounters, creatures and overlords',()=>{
  const faces:Record<string,string>=fullFaces;
  for(const id of [...p.cards.map(c=>c.id),...p.quests.map(q=>q.id),...p.events.map(e=>e.id),...p.creatures.map(c=>`creature-${c.id}`),...p.overlords.map(o=>`overlord-${o.id}`)]){expect(faces[id],id).toMatch(/^\/assets\/full-cards\/.+\.webp$/);expect(existsSync(`public${faces[id]}`),id).toBe(true);}
 });
 it('ships an illustration for every playable card, with no generic fallback',()=>{
  for(const c of p.cards){expect(art[c.id],c.id).toBeTruthy();expect(existsSync(`public${art[c.id]}`),c.id).toBe(true);}
 });
 it('gives all 108 talents different artwork, not the same class emblem',()=>{
  const talents=p.cards.filter(c=>c.kind==='talent');
  const hashes=talents.map(c=>createHash('sha256').update(readFileSync(`public${art[c.id]}`)).digest('hex'));
  expect(talents).toHaveLength(108);expect(new Set(hashes).size).toBe(108);
 });
 it('has isolated portraits and art for every event theme',()=>{
  for(const c of [...p.characters,...p.overlords])expect(existsSync(`public/assets/portraits/${c.id}.webp`),c.id).toBe(true);
  for(const e of p.events)expect(existsSync(`public/assets/event-art/${e.script}.webp`),e.name).toBe(true);
 });
});
