import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { apply, createGame } from '../src/rules/game';
import { beginBattle, chooseAttacker, resolution } from '../src/rules/combat';
import { capacity, card, character, hero } from '../src/rules/common';
import { classDeck, equipped, manage } from '../src/rules/inventory';
import { legalActions } from '../src/rules/legal';
import { settleAutomatic } from '../src/rules/effects';
import { decide } from '../src/ai/planner';
import { view } from '../src/rules/view';
import { newSession, importSession } from '../src/rules/session';
import { commandSchema } from '../src/multiplayer/protocol';
import type { ClassId } from '../src/rules/model';

function player(cls:ClassId){
 const def=p.characters.find(c=>c.classId===cls)!,roster=[def];
 for(const c of p.characters)if(!roster.some(a=>a.classId===c.classId)&&roster.filter(a=>a.faction===c.faction).length<2)roster.push(c);
 const s=createGame(p,{seed:2005,roster:roster.map(c=>c.id),overlord:'kelthuzad'});s.faction=def.faction;s.enemies=[];
 return {s,h:hero(s,def.id),id:def.id};
}
describe('class decks and equipment lifecycle',()=>{
 it.each(['warrior','mage','hunter','priest','rogue','warlock','paladin','druid','shaman'] as const)('%s starts with a separate 12-power / 12-talent deck and empty storage',cls=>{
  const {s,h}=player(cls);expect(classDeck(p,h).powers).toHaveLength(12);expect(classDeck(p,h).talents).toHaveLength(12);
  expect(h.learned).toEqual([]);expect(h.bag).toEqual([]);expect(h.slots).toHaveLength(7);expect(h.gold).toBe(5);expect(h.level).toBe(1);
  expect(equipped(p,h)).toEqual(character(p,h.id).slots.flatMap(a=>a.printed?[a.printed]:[]));
  expect(s.merchant.map(id=>card(p,id).deck).sort()).toEqual(['circle','square','square','triangle','triangle','triangle']);
 });
 it('purchases several powers for one action, removes them from the deck and leaves them unequipped',()=>{
  const {s,h,id}=player('mage');const n=apply(p,s,{type:'train',hero:id,cards:['mage-fireball','mage-frostbolt']});
  expect(hero(n,id)).toMatchObject({gold:1,actions:1,learned:['mage-fireball','mage-frostbolt']});
  expect(classDeck(p,hero(n,id)).powers).toHaveLength(10);expect(equipped(p,hero(n,id))).not.toContain('mage-fireball');
  expect(()=>apply(p,n,{type:'train',hero:id,cards:['mage-fireball']})).toThrow();expect(h.gold).toBe(5);
 });
 it('instant powers equip for free, pay on use, cannot repeat, and pay again next round',()=>{
  const {s,h,id}=player('mage');h.learned=['mage-fireball'];h.energy=3;const slots=structuredClone(h.slots);slots[0].card='mage-fireball';manage(p,s,h,slots,[]);expect(h.energy).toBe(3);
  s.enemies=[{id:'test',creature:'murloc',color:'green',region:h.location}];beginBattle(s,'pve',[id],['test'],s.faction,h.location);chooseAttacker(p,s,id);settleAutomatic(p,s);
  const cmd={type:'ability' as const,hero:id,card:'mage-fireball',ability:'pool'},n=apply(p,s,cmd);expect(hero(n,id).energy).toBe(2);expect(()=>apply(p,n,cmd)).toThrow(/already/);
  n.battle!.stage='round-end';const r=apply(p,n,{type:'advance'}),a=apply(p,r,{type:'attacker',hero:id});expect(hero(apply(p,a,cmd),id).energy).toBe(1);
 });
 it('kept active powers do not recharge; moving them to another slot does',()=>{
  const {s,h}=player('mage');h.learned=['mage-arcane-intellect'];h.energy=3;const slots=structuredClone(h.slots);slots[0].card='mage-arcane-intellect';manage(p,s,h,slots,[]);expect(h.energy).toBe(2);manage(p,s,h,slots,[]);expect(h.energy).toBe(2);
  delete slots[0].card;slots[1].card='mage-arcane-intellect';manage(p,s,h,slots,[]);expect(h.energy).toBe(1);
 });
 it('can re-equip an injured pet in place for energy and cannot heal it for free',()=>{
  const {s,h,id}=player('hunter');h.level=2;h.energy=7;h.learned=['hunter-bear'];const slots=structuredClone(h.slots);slots[0].card='hunter-bear';manage(p,s,h,slots,[]);h.pets['hunter-bear']=1;s.phase='management';
  const c={type:'manage' as const,hero:id,slots,discard:[],reEquip:['hunter-bear']};expect(commandSchema.parse(c)).toEqual(c);
  const same=apply(p,s,{...c,reEquip:[]});expect(hero(same,id).pets['hunter-bear']).toBe(1);
  const n=apply(p,s,c);expect(hero(n,id).pets['hunter-bear']).toBe(3);expect(hero(n,id).energy).toBe(1);
  h.energy=2;expect(()=>apply(p,s,c)).toThrow(/energy/);expect(h.pets['hunter-bear']).toBe(1);
 });
 it('enforces unique categories, stance-only slots, type, trait and level',()=>{
  const {s,h}=player('warrior');h.level=5;h.energy=20;h.learned=['warrior-defensive-stance'];const slots=structuredClone(h.slots);slots[1].card='warrior-defensive-stance';expect(()=>manage(p,s,h,slots,[])).toThrow(/Stance/);
  const {s:a,h:b}=player('paladin');b.level=5;b.learned=['paladin-seal-of-justice','paladin-seal-of-righteousness'];b.energy=20;const both=structuredClone(b.slots);both[0].card=b.learned[0];both[1].card=b.learned[1];expect(()=>manage(p,a,b,both,[])).toThrow(/unique/);
  const {s:w,h:m}=player('mage');const mail=p.cards.find(c=>c.kind==='item'&&c.type==='armor'&&c.trait==='Mail'&&!c.printed&&!c.addon)!;m.bag=[mail.id];m.level=5;const cloth=structuredClone(m.slots);cloth[6].card=mail.id;expect(()=>manage(p,w,m,cloth,[])).toThrow(/trait/);
 });
 it('permits Druid forms in the melee slot and restores the printed weapon when removed',()=>{
  const {s,h}=player('druid');h.learned=['druid-bear-form'];const slots=structuredClone(h.slots);slots[4].card='druid-bear-form';manage(p,s,h,slots,[]);expect(equipped(p,h)).toContain('druid-bear-form');expect(equipped(p,h)).not.toContain(`${h.id}-melee`);
  delete slots[4].card;manage(p,s,h,slots,[]);expect(equipped(p,h)).toContain(`${h.id}-melee`);expect(h.learned).toContain('druid-bear-form');
 });
 it('accepts distinct add-on functions and rejects two shields or a forbidden item trait',()=>{
  const {s,h}=player('warrior');h.level=5;const shield=p.cards.find(c=>c.name==='Cobalt Buckler')!,other=p.cards.find(c=>c.name==='Skullance Shield')!,helm=p.cards.find(c=>c.name==='Glyphed Helm')!;h.bag=[shield.id,other.id,helm.id];
  const slots=structuredClone(h.slots);slots[6].addons=[shield.id,helm.id];manage(p,s,h,slots,[]);expect(equipped(p,h)).toEqual(expect.arrayContaining([shield.id,helm.id]));expect(h.bag).toEqual([other.id]);
  slots[6].addons.push(other.id);expect(()=>manage(p,s,h,slots,[])).toThrow(/function/);
  const {s:a,h:b}=player('hunter');b.level=5;b.bag=[shield.id];const hunterSlots=structuredClone(b.slots);hunterSlots[6].addons=[shield.id];expect(()=>manage(p,a,b,hunterSlots,[])).toThrow(/trait/);
 });
 it('allows one lower-level talent per gained level, for free and outside equipment slots',()=>{
  const {s,h,id}=player('mage');h.level=3;h.talentChoices=[2,3];const slots=structuredClone(h.slots);const n=apply(p,s,{type:'talent',hero:id,card:'mage-arcane-focus'}),r=apply(p,n,{type:'talent',hero:id,card:'mage-arcane-meditation'});
  expect(hero(r,id).talents).toHaveLength(2);expect(hero(r,id).gold).toBe(5);expect(hero(r,id).slots).toEqual(slots);expect(classDeck(p,hero(r,id)).talents).toHaveLength(10);
  expect(()=>apply(p,r,{type:'talent',hero:id,card:'mage-impact'})).toThrow();expect(()=>apply(p,s,{type:'talent',hero:id,card:'mage-ice-barrier'})).toThrow();
 });
 it('permits allied bag and gold trading after an action without losing the action context',()=>{
  let s=createGame(p,DEFAULT_SETUP);s=apply(p,s,{type:'rest',hero:s.heroes[0].id,health:0});const [actor,a,b]=s.heroes;
  const n=apply(p,s,{type:'trade',hero:a.id,to:b.id,items:[],receiveItems:[],gold:1,receiveGold:0});expect(hero(n,b.id).gold).toBe(6);expect(n.lastActions).toEqual([actor.id]);
  b.location='brightwater';expect(()=>apply(p,s,{type:'trade',hero:a.id,to:b.id,items:[],receiveItems:[],gold:1,receiveGold:0})).toThrow(/same region/);
 });
 it('allows town recovery before, between or after transactions, or to be skipped',()=>{
  const {s,h,id}=player('mage');h.energy=0;h.health=1;const operations=[{op:'train' as const,card:'mage-fireball'},{op:'train' as const,card:'mage-frostbolt'}];
  for(const recoverAfter of [0,1,2]){
   const cmd={type:'town' as const,hero:id,health:1,operations,recoverAfter};expect(commandSchema.parse(cmd)).toEqual(cmd);
   expect(hero(apply(p,s,cmd),id)).toMatchObject({health:2,energy:0,gold:1,actions:1});
  }
  expect(hero(apply(p,s,{type:'town',hero:id,health:0,operations,recoverAfter:-1}),id)).toMatchObject({health:1,energy:0});
  expect(()=>apply(p,s,{type:'town',hero:id,health:1,operations,recoverAfter:3})).toThrow(/position/);
  expect(()=>apply(p,s,{type:'town',hero:id,health:1,operations,recoverAfter:-1})).toThrow(/Skipped/);
 });
 it('validates recovery against the capacity at that point in the town transaction',()=>{
  const {s,h,id}=player('mage');h.level=5;const item=p.cards.find(c=>c.name==='Ankh of Life')!;h.slots[3].card=item.id;h.health=capacity(p,h).health-2;
  const command={type:'town' as const,hero:id,health:2,operations:[{op:'sell' as const,card:item.id}]};
  expect(hero(apply(p,s,command),id).health).toBe(character(p,id).capacities[4].health);
  expect(()=>apply(p,s,{...command,recoverAfter:1})).toThrow(/recovery/);
 });
});
describe('FAQ and rulebook variants',()=>{
 it('Stoneform can change color, but respects physical dice supply and its timing',()=>{
  const {s,h,id}=player('hunter');s.enemies=[{id:'test',creature:'gnoll',color:'green',region:h.location}];beginBattle(s,'pve',[id],['test'],s.faction,h.location);chooseAttacker(p,s,id);s.battle!.stage='reroll';s.battle!.active!.dice=[{id:0,color:'red',value:2,rerolled:false,removed:false,spotted:false}];
  const cmd={type:'ability' as const,hero:id,card:character(p,id).racial!,ability:'reroll',args:{dice:[0],color:'green' as const}};const n=apply(p,s,cmd);expect(n.battle!.active!.dice[0]).toMatchObject({color:'green',value:3});
  expect(legalActions(p,s)).toContainEqual(cmd);s.battle!.lostDice.green=7;expect(()=>apply(p,s,cmd)).toThrow(/available/);s.battle!.lostDice.green=0;s.battle!.active!.rerollStarted=true;expect(()=>apply(p,s,cmd)).toThrow(/start/);
 });
 it('Deadly PvP keeps both sides’ damage and uses remaining wounds for simultaneous defeat',()=>{
  const s=createGame(p,{...DEFAULT_SETUP,variants:{deadlyPvp:true}}),ids=[s.heroes[0].id,s.heroes[3].id];ids.forEach(id=>hero(s,id).health=1);beginBattle(s,'final',ids,[],'horde','final');s.battle!.stage='resolution';s.battle!.boxes.horde.defense=3;s.battle!.boxes.alliance.defense=5;resolution(p,s);
  expect(s.battle!.wounds).toEqual({horde:5,alliance:3});let n=apply(p,s,{type:'wound',hero:ids[0]});n=apply(p,n,{type:'respawn',hero:ids[0],region:'brill'});n=apply(p,n,{type:'wound',hero:ids[1]});n=apply(p,n,{type:'respawn',hero:ids[1],region:'southshore'});expect(n.winner).toBe('alliance');
 });
 it('Defeat the Overlord loops the track and supplies purple items on later laps',()=>{
  const s=createGame(p,{...DEFAULT_SETUP,variants:{overlordOnly:true}});s.turn=30;s.faction='alliance';s.phase='management';s.managed=s.heroes.filter(h=>character(p,h.id).faction==='alliance').map(h=>h.id);s.wars=[];
  const n=apply(p,s,{type:'endManagement'});expect(n).toMatchObject({phase:'actions',turn:1,lap:2,faction:'horde'});
  n.turn=1;n.phase='management';n.managed=n.heroes.filter(h=>character(p,h.id).faction==='horde').map(h=>h.id);const purple=n.itemDecks.circle[0],r=apply(p,n,{type:'endManagement'});expect(p.track[2]).toBe('triangle');expect(r.merchant.at(-1)).toBe(purple);
 });
 it('standard play still enters final preparation after turn 30',()=>{
  const s=createGame(p,DEFAULT_SETUP);s.turn=30;s.phase='management';s.wars=[];s.managed=s.heroes.filter(h=>character(p,h.id).faction===s.faction).map(h=>h.id);expect(apply(p,s,{type:'endManagement'}).phase).toBe('final-management');
 });
});
describe('bots plan class progression',()=>{
 it('does not walk away from a quest just to join allies in an empty home region',()=>{
  const s=createGame(p,DEFAULT_SETUP),h=s.heroes[0];h.location='brightwater';s.enemies=[{id:'target',creature:'crusader',color:'green',faction:'horde',region:'brightwater'}];
  const choices=legalActions(p,s).filter(c=>('hero' in c&&c.hero===h.id)&&(c.type==='travel'||c.type==='challenge'));
  expect(decide(p,view(s),choices)?.command.type).toBe('challenge');
 });
 it('offers multi-power training and equips a full loadout in one management decision',()=>{
  const {s,h,id}=player('mage');expect(legalActions(p,s)).toContainEqual({type:'train',hero:id,cards:['mage-fireball','mage-frostbolt']});h.learned=['mage-fireball','mage-frostbolt','mage-arcane-intellect'];h.energy=3;s.phase='management';
  const legal=legalActions(p,s).filter(c=>c.type==='manage'&&c.hero===id),decision=decide(p,view(s),legal)!;const n=apply(p,s,decision.command);
  expect(equipped(p,hero(n,id))).toEqual(expect.arrayContaining(h.learned));expect(hero(n,id).energy).toBe(2);
 });
 it('replays a generated bot opening with the exact same state',()=>{
  const session=newSession(p,{...DEFAULT_SETUP,variants:{deadlyPvp:true,overlordOnly:true}});let s=createGame(p,session.setup);
  for(let i=0;i<12;i++){const choice=decide(p,view(s),legalActions(p,s))!;expect(choice).toBeTruthy();session.commands.push(choice.command);s=apply(p,s,choice.command);}
  expect(importSession(p,JSON.stringify(session)).state).toEqual(s);
 });
});
