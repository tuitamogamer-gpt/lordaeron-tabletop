import { describe, expect, it } from 'vitest';
import { DEVELOPMENT_PACK, DEFAULT_SETUP } from '../src/data/development-pack';
import { BASE_CHARACTERS, STARTING_CARDS } from '../src/data/base/characters';
import { BASE_CREATURES } from '../src/data/base/creatures';
import { BASE_QUESTS } from '../src/data/base/quests';
import { SPECIAL_ITEMS } from '../src/data/base/special-items';
import { TRIANGLE_ITEMS } from '../src/data/base/triangle-items';
import { SQUARE_ITEMS } from '../src/data/base/square-items';
import { CIRCLE_ITEMS } from '../src/data/base/circle-items';
import { WARRIOR_CARDS } from '../src/data/base/warrior';
import { WARLOCK_CARDS } from '../src/data/base/warlock';
import { PRIEST_CARDS } from '../src/data/base/priest';
import { ROGUE_CARDS } from '../src/data/base/rogue';
import { HUNTER_CARDS } from '../src/data/base/hunter';
import { MAGE_CARDS } from '../src/data/base/mage';
import { apply, createGame, validatePack } from '../src/rules/game';
import { effects, settleAutomatic } from '../src/rules/effects';
import { beginBattle, chooseAttacker, monsterEffect } from '../src/rules/combat';
import { capacity, hero } from '../src/rules/common';
import { legalActions } from '../src/rules/legal';
import { manage } from '../src/rules/inventory';
import type { Color, ContentPack, State } from '../src/rules/model';
const items=[...TRIANGLE_ITEMS,...SQUARE_ITEMS,...CIRCLE_ITEMS,...SPECIAL_ITEMS];
const p:ContentPack={...DEVELOPMENT_PACK,id:'scan-regression-fixture',characters:BASE_CHARACTERS,creatures:BASE_CREATURES,quests:BASE_QUESTS,cards:[...STARTING_CARDS,...items,...WARRIOR_CARDS,...MAGE_CARDS,...HUNTER_CARDS,...ROGUE_CARDS,...PRIEST_CARDS,...WARLOCK_CARDS]};
const warrior=DEFAULT_SETUP.roster[0],mage=DEFAULT_SETUP.roster[1];
const fresh=()=>createGame(p,DEFAULT_SETUP);
const find=(name:string)=>p.cards.find(c=>c.name===name)!;
function combat(creature='murloc',id=warrior){const s=fresh();s.enemies=[{id:'opponent',creature,color:'green',region:'brill'}];beginBattle(s,'pve',[id],['opponent'],'horde','brill');chooseAttacker(p,s,id);settleAutomatic(p,s);return s;}
function dice(s:State,rows:[Color,number][]){s.battle!.active!.dice=rows.map(([color,value],id)=>({id,color,value,removed:false,rerolled:false,spotted:false}));}
function give(s:State,id:string,name:string,slot?:number){const h=hero(s,id),c=find(name);h.level=5;if(c.kind==='talent')h.talents.push(c.id);else if(c.kind==='power'){h.learned.push(c.id);h.slots[slot??1].card=c.id;}else if(slot===undefined)h.bag.push(c.id);else h.slots[slot].card=c.id;return c;}
describe('verified scan content',()=>{
 it('has the exact physical item decks and both 40-card quest decks',()=>{
  expect([TRIANGLE_ITEMS.length,SQUARE_ITEMS.length,CIRCLE_ITEMS.length,SPECIAL_ITEMS.length]).toEqual([46,30,16,28]);
  expect(validatePack(p)).toEqual([]);
  for(const faction of ['horde','alliance'])expect(['grey','green','yellow','red'].map(t=>BASE_QUESTS.filter(q=>q.faction===faction&&q.tier===t).length)).toEqual([8,12,10,10]);
  for(const q of BASE_QUESTS)for(const id of q.reward.special??[])expect(items.some(c=>c.id===id),`${q.name}: ${id}`).toBe(true);
  expect([...items,...WARRIOR_CARDS,...MAGE_CARDS].every(c=>c.source.status==='verified')).toBe(true);
 });
 it('applies FAQ location and item corrections',()=>{
  expect(BASE_QUESTS.find(q=>q.name==='Brutes in the Barrows')?.spawns.some(s=>s.region==='infectis')).toBe(true);
  expect(find('Pyric Caduceus').type).toBe('ranged');
  expect(find('Crackling Staff').abilities.filter(a=>!a.automatic).every(a=>a.timing==='after-pool')).toBe(true);
 });
 it('has 16 character boards with seven legal starting slots',()=>{
  expect(BASE_CHARACTERS).toHaveLength(16);
  for(const c of BASE_CHARACTERS){const s=fresh(),h={...hero(s,warrior),id:c.id,slots:c.slots.map(()=>({addons:[]}))};expect(()=>manage(p,s,h,h.slots,[]),c.name).not.toThrow();}
 });
});
describe('scanned card interactions',()=>{
 it('Gnoll only drains red/blue ones; Ogre ignores green low results',()=>{
  for(const creature of ['gnoll','ogre']){const s=combat(creature),h=hero(s,warrior);h.health=10;h.energy=8;s.battle!.stage='after-reroll';dice(s,[['red',1],['blue',2],['green',1],['green',2]]);monsterEffect(p,s);expect(h.energy).toBe(creature==='gnoll'?7:8);expect(h.health).toBe(creature==='ogre'?6:10);}
 });
 it('enforces one potion per round across different potion names',()=>{
  let s=combat();const a=give(s,warrior,'Minor Agility Potion'),b=give(s,warrior,'Lesser Agility Potion');s.battle!.stage='after-pool';s=apply(p,s,{type:'ability',hero:warrior,card:a.id,ability:a.abilities[0].id});expect(()=>apply(p,s,{type:'ability',hero:warrior,card:b.id,ability:b.abilities[0].id})).toThrow(/Potion/);
 });
 it('food restores both resources as part of a single Rest action',()=>{
  const s=fresh(),h=hero(s,warrior),food=give(s,warrior,'Crocolisk Steak');h.health=1;h.energy=0;const n=apply(p,s,{type:'rest',hero:warrior,health:0,food:food.id});expect(hero(n,warrior)).toMatchObject({...capacity(p,hero(n,warrior)),actions:1});expect(hero(n,warrior).bag).not.toContain(food.id);
 });
 it('cannot spend more Health than the hero has',()=>{
  const s=combat(),h=hero(s,warrior);h.health=2;expect(()=>effects(p,s,h,'cost',[{op:'resource',resource:'health',amount:-3}],{})).toThrow(/health/);
 });
 it('Tortoise Armor limits Travel to once per faction turn',()=>{
  let s=fresh();give(s,warrior,'Tortoise Armor',6);s=apply(p,s,{type:'travel',hero:warrior,path:[]});expect(()=>apply(p,s,{type:'travel',hero:warrior,path:[]})).toThrow(/Travel/);expect(()=>apply(p,s,{type:'rest',hero:warrior,health:0})).not.toThrow();
 });
 it('Battle Shout buffs each friendly attacker and its talent requires the power',()=>{
  const s=combat();give(s,warrior,'Battle Shout');give(s,warrior,'Improved Battleshout');s.battle!.active!.reroll=0;settleAutomatic(p,s);expect(s.battle!.active!.reroll).toBe(2);settleAutomatic(p,s);expect(s.battle!.active!.reroll).toBe(2);
 });
 it('Arcane Missiles only gets its FAQ discount when used in the preceding unharmed round',()=>{
  let s=combat('ghoul',mage);const c=give(s,mage,'Arcane Missiles');hero(s,mage).energy=0;s.battle!.previous[mage]={cards:[c.id],harmed:false};s=apply(p,s,{type:'ability',hero:mage,card:c.id,ability:'pool'});expect(hero(s,mage).energy).toBe(0);
  const t=combat('ghoul',mage);give(t,mage,'Arcane Missiles');hero(t,mage).energy=0;t.battle!.previous[mage]={cards:[c.id],harmed:true};expect(()=>apply(p,t,{type:'ability',hero:mage,card:c.id,ability:'pool'})).toThrow(/energy/);
 });
 it('Arcane Focus rerolls independently even against a Ghoul',()=>{
  const s=combat('ghoul',mage);give(s,mage,'Arcane Focus');s.battle!.stage='reroll';s.battle!.active!.reroll=0;dice(s,[['blue',1],['red',1]]);expect(legalActions(p,s).some(c=>c.type==='ability'&&c.card==='mage-arcane-focus'&&c.args?.dice?.includes(0))).toBe(true);expect(legalActions(p,s).some(c=>c.type==='reroll')).toBe(false);
 });
 it('new printed health/energy capacity items are reflected immediately',()=>{
  const s=fresh(),h=hero(s,warrior);h.level=5;const before=capacity(p,h);give(s,warrior,'Ankh of Life',5);expect(capacity(p,h).health).toBe(before.health+3);
 });
 it('Enrage counts actual lost Health and spends each saved token only once',()=>{
  const s=combat(),h=hero(s,warrior);give(s,warrior,'Enrage');h.health=8;effects(p,s,h,'damage',[{op:'resource',resource:'health',amount:-2}],{});s.battle!.stage='tokens';const n=apply(p,s,{type:'ability',hero:warrior,card:'warrior-enrage',ability:'tokens-2'});expect(n.battle!.damageSpent?.[warrior]).toBe(2);expect(()=>apply(p,n,{type:'ability',hero:warrior,card:'warrior-enrage',ability:'tokens-1'})).toThrow();
 });
});
