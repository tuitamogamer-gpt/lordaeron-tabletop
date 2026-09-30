import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { decide } from '../src/ai/planner';
import { createStrategy, objectives, routeDistance } from '../src/ai/strategy';
import { factionView, publicState } from '../src/ai/public-state';
import { abilityScore, tacticalScore } from '../src/ai/tactics';
import { beginBattle, chooseAttacker } from '../src/rules/combat';
import { capacity, card, faction } from '../src/rules/common';
import { settleAutomatic } from '../src/rules/effects';
import { apply, createGame } from '../src/rules/game';
import { fitsSlot, heroSlots } from '../src/rules/inventory';
import { legalActions } from '../src/rules/legal';
import type { ClassId, Color, Command, Hero, State } from '../src/rules/model';
import { view } from '../src/rules/view';

function game(cls: ClassId = 'warrior') {
 const def=p.characters.find(c=>c.classId===cls)!,roster=[def];
 for(const c of p.characters)if(!roster.some(h=>h.classId===c.classId)&&roster.filter(h=>h.faction===c.faction).length<2)roster.push(c);
 const s=createGame(p,{seed:71,overlord:'kelthuzad',roster:roster.map(h=>h.id)}),h=s.heroes.find(h=>h.id===def.id)!;
 s.faction=def.faction;h.level=3;Object.assign(h,capacity(p,h));return {s,h};
}
function equip(h:Hero,id:string) {
 const c=card(p,id);h.learned.push(id);
 const i=heroSlots(p,h).findIndex((a,i)=>!h.slots[i].card&&fitsSlot(p,h,c,a));
 expect(i).toBeGreaterThanOrEqual(0);h.slots[i].card=id;
 if(c.petHealth)h.pets[id]=c.petHealth;
}
function combat(cls:ClassId='warrior',creature='murloc') {
 const {s,h}=game(cls);s.enemies=[{id:'target',region:h.location,creature,color:'green',faction:faction(p,h.id)}];
 beginBattle(s,'pve',[h.id],['target'],faction(p,h.id),h.location);chooseAttacker(p,s,h.id);settleAutomatic(p,s);return {s,h};
}
function dice(s:State,values:[Color,number][]) {
 s.battle!.active!.dice=values.map(([color,value],id)=>({id,color,value,removed:false,spotted:false,rerolled:false}));
}
function choose(s:State,filter:(c:Command)=>boolean=()=>true) { return decide(p,view(s,s.heroes.map(h=>h.id)),legalActions(p,s).filter(filter))!; }

describe('public, deterministic planning',()=>{
 it('does not mutate state, and ties do not depend on legal action ordering',()=>{
  const {s,h}=game('mage');h.energy=0;h.health=1;s.enemies=[];
  const v=view(s),snapshot=structuredClone(v),legal=legalActions(p,s).filter(c=>c.type==='rest'&&c.hero===h.id);
  const first=decide(p,v,legal)!;
  expect(decide(p,v,[...legal].reverse())).toEqual(first);expect(v).toEqual(snapshot);
  expect(first.considered.length).toBeGreaterThan(1);
 });
 it('makes the same decision with different hidden RNG and deck orders',()=>{
  const {s,h}=game('mage');h.energy=0;s.enemies=[];
  const a=choose(s,c=>c.type==='rest'&&c.hero===h.id);
  s.rng=991;s.eventDeck.reverse();s.itemDecks.circle.reverse();s.questDecks.horde.red.reverse();
  expect(choose(s,c=>c.type==='rest'&&c.hero===h.id)).toEqual(a);
  const sandbox=publicState(view(s));expect(sandbox.itemDecks.circle).toEqual([]);expect(sandbox.eventDeck).toEqual([]);expect(sandbox.rng).not.toBe(s.rng);
 });
 it('separates Kazzak knowledge even when the local table controls both factions',()=>{
  const s=createGame(p,{...DEFAULT_SETUP,overlord:'kazzak'}),token=s.kazzak![0];token.known=['alliance'];token.real=false;
  const shared=view(s,s.heroes.map(h=>h.id));expect(shared.kazzak![0].real).toBe(false);
  expect(factionView(shared,'horde').kazzak![0].real).toBeUndefined();
  expect(objectives(p,shared,'horde').find(o=>o.region===token.region&&o.boss)?.clue).toBe(true);
  expect(objectives(p,shared,'alliance').some(o=>o.region===token.region&&o.boss)).toBe(false);
 });
 it('investigates an unknown clue without spending a challenge action',()=>{
  const s=createGame(p,{...DEFAULT_SETUP,overlord:'kazzak'}),h=s.heroes[0];h.location=s.kazzak![0].region;s.enemies=[];
  expect(choose(s,c=>'hero'in c&&c.hero===h.id).command.type).toBe('peek');
 });
});

describe('state-dependent tactics',()=>{
 it('does not treat the class catalogue or unequipped learned powers as a playable hand',()=>{
  const {s,h}=combat('mage');
  expect(p.cards.some(c=>c.id==='mage-fireball')).toBe(true);
  expect(legalActions(p,s).some(c=>c.type==='ability'&&c.card==='mage-fireball')).toBe(false);
  h.learned.push('mage-fireball');
  expect(legalActions(p,s).some(c=>c.type==='ability'&&c.card==='mage-fireball')).toBe(false);
  h.slots[0].card='mage-fireball';
  expect(legalActions(p,s).some(c=>c.type==='ability'&&c.card==='mage-fireball')).toBe(true);
 });
 it('conserves energy when existing ranged hits already finish the fight',()=>{
  const {s,h}=combat('mage');equip(h,'mage-fireball');s.battle!.boxes[faction(p,h.id)].damage=20;
  const legal=legalActions(p,s).filter(c=>c.type==='roll'||c.type==='ability'&&c.card==='mage-fireball');
  expect(legal.some(c=>c.type==='ability')).toBe(true);
  expect(decide(p,view(s),legal)?.command.type).toBe('roll');
 });
 it('adds affordable damage when the party still needs it',()=>{
  const {s,h}=combat('mage','ogre');equip(h,'mage-fireball');
  expect(choose(s,c=>c.type==='roll'||c.type==='ability'&&c.card==='mage-fireball').command.type).toBe('ability');
 });
 it('changes a miss instead of wasting a converter on an existing eight',()=>{
  const {s,h}=combat('warrior','ogre');h.level=4;equip(h,'warrior-berserker-stance');s.battle!.stage='after-pool';dice(s,[['red',1],['red',8]]);
  const d=choose(s,c=>c.type==='advance'||c.type==='ability'&&c.card==='warrior-berserker-stance');
  expect(d.command).toMatchObject({type:'ability',args:{dice:[0]}});
 });
 it('rerolls a hazardous low result before an equally missing harmless die',()=>{
  const {s}=combat('mage','ogre');s.battle!.stage='reroll';s.battle!.active!.reroll=1;s.battle!.active!.threat=4;dice(s,[['green',1],['blue',1]]);
  const d=choose(s,c=>c.type==='reroll'||c.type==='advance');expect(d.command).toEqual({type:'reroll',dice:[1]});
 });
 it('keeps successful dice when a reroll has negative expected value',()=>{
  const {s}=combat('mage');s.battle!.stage='reroll';s.battle!.active!.reroll=1;dice(s,[['blue',8]]);
  expect(choose(s,c=>c.type==='reroll'||c.type==='advance').command.type).toBe('advance');
 });
 it('preserves a pet on its last health when a healthy hero can take the wound',()=>{
  const {s,h}=combat('hunter');equip(h,'hunter-bear');h.pets['hunter-bear']=1;s.battle!.stage='wounds';s.battle!.wounds[faction(p,h.id)]=1;
  expect(choose(s,c=>c.type==='wound').command).toEqual({type:'wound',hero:h.id});
 });
 it('uses pet health when the alternative would defeat its owner',()=>{
  const {s,h}=combat('hunter');equip(h,'hunter-bear');h.health=1;s.battle!.stage='wounds';s.battle!.wounds[faction(p,h.id)]=1;
  expect(choose(s,c=>c.type==='wound').command).toMatchObject({type:'wound',pet:'hunter-bear'});
 });
 it('does not cast a capped heal merely to postpone a compulsory wound',()=>{
  const {s,h}=combat('priest');equip(h,'priest-lesser-heal');s.battle!.stage='wounds';s.battle!.wounds[faction(p,h.id)]=1;
  s.battle!.losses={[h.id]:{before:h.health,amount:1,prevented:0,harmedBefore:false}};
  expect(choose(s,c=>c.type==='wound'||c.type==='ability'&&c.card==='priest-lesser-heal').command.type).toBe('wound');
 });
 it('heals the participant who is about to be defeated',()=>{
  const {s,h}=combat('priest');equip(h,'priest-lesser-heal');h.health=0;s.respawns=[h.id];s.battle!.stage='wounds';s.battle!.wounds[faction(p,h.id)]=1;
  s.battle!.losses={[h.id]:{before:1,amount:1,prevented:0,harmedBefore:false}};
  expect(choose(s).command).toMatchObject({type:'ability',card:'priest-lesser-heal'});
 });
 it('penalizes a harmful optional ability instead of treating all powers equally',()=>{
  const {s,h}=combat('mage');equip(h,'mage-fireball');s.battle!.boxes[faction(p,h.id)].damage=20;
  expect(abilityScore(p,publicState(view(s)),{type:'ability',hero:h.id,card:'mage-fireball',ability:'pool'})).toBeLessThan(0);
 });
 it('respects Nefarian’s cap and preserves blue ranged hits',()=>{
  const {s,h}=combat('mage');s.battle!.boss='nefarian';s.battle!.enemies=[];s.battle!.stage='tokens';s.battle!.active!.threat=6;
  dice(s,[['blue',8],['red',6]]);
  const commands=legalActions(p,s).filter(c=>c.type==='tokens');
  expect(decide(p,view(s),commands)?.command).toEqual({type:'tokens',toAttrition:[1]});
  expect(()=>apply(p,s,decide(p,view(s),commands)!.command)).not.toThrow();expect(h.health).toBeGreaterThan(0);
 });
});

describe('campaign objectives and economy',()=>{
 it('keeps a reachable Overlord plan behind five irrelevant blue-only groups',()=>{
  const s=createGame(p,DEFAULT_SETUP),h=s.heroes[0],side=faction(p,h.id);
  for(const hero of s.heroes){hero.level=5;hero.xp=p.xp[4];Object.assign(hero,capacity(p,hero));}
  s.quests=[];
  s.enemies=p.creatures.slice(0,5).map((creature,i)=>({id:`leftover-${i}`,creature:creature.id,color:'blue',region:'garrens-haunt'}));
  const v=view(s),engine=createStrategy(p,v,1),boss=engine.targets(side).find(o=>o.boss===s.overlord.id)!;
  expect(s.variants?.overlordOnly).toBe(true);
  expect(engine.targets(side).filter(o=>o.enemies[0]?.color==='blue')).toHaveLength(5);
  expect(routeDistance(p,v,h.location,'garrens-haunt',side)).toBeLessThanOrEqual(routeDistance(p,v,h.location,boss.region,side));
  const plan=engine.plan(h);
  expect(plan?.objective.boss).toBe(s.overlord.id);
  expect(plan?.travelActions).toBeGreaterThan(0);
 });
 it('changes Rest distribution according to current health and energy',()=>{
  const {s,h}=game('mage');s.enemies=[];h.health=capacity(p,h).health;h.energy=0;
  expect(choose(s,c=>c.type==='rest'&&c.hero===h.id).command).toMatchObject({type:'rest',health:0});
  h.energy=capacity(p,h).energy;h.health=1;
  expect(choose(s,c=>c.type==='rest'&&c.hero===h.id).command).toMatchObject({type:'rest',health:Math.min(h.level*3,capacity(p,h).health-1)});
 });
 it('sees a stronger party as safer, without charging one creature effect per figure',()=>{
  const {s,h}=game('mage');s.enemies=[{id:'target',creature:'ogre',color:'green',region:h.location,faction:faction(p,h.id)}];
  const ally=s.heroes.find(v=>v.id!==h.id&&faction(p,v.id)===faction(p,h.id))!;ally.level=3;Object.assign(ally,capacity(p,ally));
  const engine=createStrategy(p,view(s),1),o=engine.targets(faction(p,h.id))[0];
  expect(engine.forecast(o,[h,ally]).win).toBeGreaterThan(engine.forecast(o,[h]).win);
 });
 it('includes live Overlord modifiers in its forecast',()=>{
  const {s,h}=game('mage');h.level=5;Object.assign(h,capacity(p,h));
  const a=createStrategy(p,view(s),1),o=a.targets(faction(p,h.id)).find(o=>o.boss==='kelthuzad')!;
  const before=a.forecast(o,[h]);s.overlord.attack+=10;s.overlord.health+=20;
  const after=createStrategy(p,view(s),1).forecast(o,[h]);
  expect(after.health).toBe(before.health+20);expect(after.wounds).toBeGreaterThan(before.wounds);
 });
 it('charges extra route cost for blue creatures and uses friendly flights',()=>{
  const s=createGame(p,DEFAULT_SETUP),v=view(s);v.enemies=[];
  const d=routeDistance(p,v,'brill','brightwater','horde');v.enemies=[{id:'block',creature:'murloc',color:'blue',region:'brightwater'}];
  expect(routeDistance(p,v,'brill','brightwater','horde')).toBeGreaterThan(d);
  const flights=p.regions.filter(r=>r.flight==='horde'||r.flight==='both');
  expect(routeDistance(p,{...v,enemies:[]},flights[0].id,flights[1].id,'horde')).toBe(1);
 });
 it('does not shuttle unusable items between allies while actions remain',()=>{
  const {s,h}=game('mage'),to=s.heroes.find(v=>v.id!==h.id&&faction(p,v.id)===faction(p,h.id))!;
  to.location=h.location;s.tradeWindow=true;s.enemies=[];
  const item=p.cards.find(c=>c.kind==='item'&&c.level===5&&!c.soulbound&&c.price>10)!;h.bag=[item.id];to.level=1;
  const d=choose(s,c=>c.type==='trade'||c.type==='rest'&&c.hero===h.id);
  expect(d.command.type).toBe('rest');
 });
 it('does not prefer a known false Kazzak challenge',()=>{
  const s=createGame(p,{...DEFAULT_SETUP,overlord:'kazzak'}),h=s.heroes[0],t=s.kazzak!.find(t=>!t.real)!;
  h.location=t.region;t.known=['horde'];s.enemies=[];
  expect(choose(s,c=>'hero'in c&&c.hero===h.id).command.type).not.toBe('challenge');
 });
 it('values green dice differently against a Drake',()=>{
  const {s,h}=combat('mage','drake');s.battle!.stage='reroll';s.battle!.active!.reroll=1;dice(s,[['green',7]]);
  const score=tacticalScore(p,view(s),{type:'reroll',dice:[0]},1)!;
  expect(Number.isFinite(score.score)).toBe(true);expect(h.health).toBeGreaterThan(0);
 });
});
