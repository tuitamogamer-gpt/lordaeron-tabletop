import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, CLASS_CARDS, DEFAULT_SETUP } from '../src/data/base';
import { apply, createGame, validatePack } from '../src/rules/game';
import { beginBattle, chooseAttacker, defeat, monsterEffect, placeTokens, resolution, stats } from '../src/rules/combat';
import { capacity, card, faction, hero } from '../src/rules/common';
import { effects, healthLoss, settleAutomatic } from '../src/rules/effects';
import { addWorld, battleEvents, drawEvents } from '../src/rules/events';
import { legalActions } from '../src/rules/legal';
import { manage, unequip } from '../src/rules/inventory';
import { decide } from '../src/ai/planner';
import { nefarianDestinations } from '../src/rules/world';
import { view } from '../src/rules/view';
import type { ClassId, Color, State } from '../src/rules/model';
const fresh=()=>createGame(p,DEFAULT_SETUP);
function fighter(cls:ClassId){
 const def=p.characters.find(c=>c.classId===cls)!,roster=[def];
 for(const c of p.characters)if(!roster.some(a=>a.classId===c.classId)&&roster.filter(a=>a.faction===c.faction).length<2)roster.push(c);
 const s=createGame(p,{seed:2005,roster:roster.map(c=>c.id),overlord:'kelthuzad'}),id=def.id;
 hero(s,id).level=5;Object.assign(hero(s,id),capacity(p,hero(s,id)));s.enemies=[{id:'enemy',creature:'murloc',color:'green',region:'brill'}];beginBattle(s,'pve',[id],['enemy'],def.faction,'brill');chooseAttacker(p,s,id);settleAutomatic(p,s);return {s,id};
}
function give(s:State,id:string,c:string,slot=1){const h=hero(s,id);if(card(p,c).kind==='talent')h.talents.push(c);else{h.learned.push(c);h.slots[slot].card=c;}}
function dice(s:State,values:[Color,number][]){s.battle!.active!.dice=values.map(([color,value],id)=>({color,value,id,removed:false,spotted:false,rerolled:false}));}
function event(n:number){const s=fresh();s.eventDeck=[`event-${n}`];drawEvents(p,s);return s;}
describe('complete base-game data',()=>{
 it('resolves every explicit class-card dependency and enhancement',()=>{
  const ids=new Set([...p.cards.map(c=>c.id),'combo-added']);const check=(value:unknown,path:string)=>{if(!value||typeof value!=='object')return;for(const [key,v] of Object.entries(value)){if(['cardId','card'].includes(key)&&typeof v==='string')expect(ids.has(v),`${path}.${key}: ${v}`).toBe(true);if(['cards','retainAfterUse','retainOnce'].includes(key)&&Array.isArray(v))for(const id of v)expect(ids.has(id),`${path}.${key}: ${id}`).toBe(true);if(typeof v==='object')check(v,`${path}.${key}`);}};for(const c of p.cards)check(c,c.id);
 });
 it('validates all 216 class cards, 52 events and three Overlords',()=>{expect(validatePack(p)).toEqual([]);expect(CLASS_CARDS).toHaveLength(216);for(const cls of new Set(CLASS_CARDS.map(c=>c.classId)))for(const kind of ['power','talent'])expect(CLASS_CARDS.filter(c=>c.classId===cls&&c.kind===kind)).toHaveLength(12);expect(p.events).toHaveLength(52);expect(p.overlords).toHaveLength(3);});
 it('adds the five Kel’Thuzad events only for that Overlord',()=>{for(const boss of p.overlords){const s=createGame(p,{...DEFAULT_SETUP,overlord:boss.id});expect(s.eventDeck).toHaveLength(boss.id==='kelthuzad'?52:47);}});
});
describe('class interactions read from the scans',()=>{
 it('Arcane Missiles follows the FAQ requirement to use it in the preceding unharmed round',()=>{
  const {s,id}=fighter('mage');give(s,id,'mage-arcane-missiles');hero(s,id).energy=0;s.battle!.round=2;s.battle!.previous[id]={cards:[],harmed:false};dice(s,[]);
  const c={type:'ability' as const,hero:id,card:'mage-arcane-missiles',ability:'pool'};expect(()=>apply(p,s,c)).toThrow();s.battle!.previous[id].cards.push(c.card);expect(apply(p,s,c).battle!.active!.dice).toHaveLength(2);s.battle!.previous[id].harmed=true;expect(()=>apply(p,s,c)).toThrow();
 });
 it('Portal can carry an ally home while the Mage stays and must take the next action',()=>{
  const {s,id}=fighter('mage');delete s.battle;s.phase='actions';s.faction=faction(p,id);give(s,id,'mage-portal');const ally=s.heroes.find(h=>h.id!==id&&faction(p,h.id)===s.faction)!;hero(s,id).location=ally.location='andorhal';const n=apply(p,s,{type:'portal',hero:id,allies:[ally.id],self:false});expect(hero(n,id).location).toBe('andorhal');expect(hero(n,ally.id).location).toBe('southshore');expect(n.pendingPortal).toBe(id);expect(()=>apply(p,n,{type:'rest',hero:ally.id,health:0})).toThrow();
 });
 it('new Concentration Aura discounts later equips but not itself',()=>{
  const {s,id}=fighter('paladin'),h=hero(s,id);h.learned=['paladin-concentration-aura','paladin-seal-of-command','paladin-blessing-of-might'];h.energy=6;const slots=h.slots.map(()=>({addons:[]} as typeof h.slots[number]));h.learned.forEach((id,i)=>slots[i].card=id);manage(p,s,h,slots,[]);expect(h.energy).toBe(0);
 });
 it('unequipping a capacity item clamps only the capacity that decreased',()=>{
  const {s,id}=fighter('warrior'),h=hero(s,id),c=p.cards.find(c=>c.kind==='item'&&c.capacity?.health)!;h.slots[5].card=c.id;h.health=capacity(p,h).health;h.energy=capacity(p,h).energy+2;unequip(p,h,c.id);expect(h.health).toBe(capacity(p,h).health);expect(h.energy).toBe(capacity(p,h).energy+2);
 });
 it('Judgement is free and preserves the Seal; its talent adds the extra red die',()=>{
  let {s,id}=fighter('paladin');give(s,id,'paladin-seal-of-righteousness');give(s,id,'paladin-improved-righteousness');hero(s,id).energy=0;dice(s,[]);
  const printed=p.characters.find(c=>c.id===id)!.slots[3].printed!;s=apply(p,s,{type:'ability',hero:id,card:printed,ability:'pool'});expect(s.battle!.active!.dice.filter(d=>d.color==='red')).toHaveLength(2);expect(hero(s,id).slots[1].card).toBe('paladin-seal-of-righteousness');expect(hero(s,id).energy).toBe(0);
 });
 it('Benediction removes equip costs and Blessing of Kings is not a Blessing power',()=>{
  const {s,id}=fighter('paladin'),h=hero(s,id);give(s,id,'paladin-benediction');give(s,id,'paladin-blessing-of-kings');h.learned=['paladin-seal-of-command','paladin-blessing-of-might','paladin-devotion-aura'];h.energy=0;const slots=h.slots.map(()=>({addons:[]} as typeof h.slots[number]));h.learned.forEach((id,i)=>slots[i].card=id);expect(()=>manage(p,s,h,slots,[])).not.toThrow();expect(h.energy).toBe(0);
 });
 it('Blessing of Freedom permits leaving blue creatures but does not permit Rest there',()=>{
  const {s,id}=fighter('paladin');delete s.battle;s.phase='actions';s.faction=faction(p,id);hero(s,id).location='brill';s.enemies=[{id:'blue',creature:'murloc',color:'blue',region:'brill'}];give(s,id,'paladin-blessing-of-freedom');expect(()=>apply(p,s,{type:'travel',hero:id,path:['brightwater']})).not.toThrow();expect(()=>apply(p,s,{type:'rest',hero:id,health:0})).toThrow(/Challenge/);
 });
 it('Lay on Hands heals before an action without consuming that action',()=>{
  const {s,id}=fighter('paladin');delete s.battle;s.phase='actions';s.faction=faction(p,id);give(s,id,'paladin-lay-on-hands');hero(s,id).health=1;const n=apply(p,s,{type:'power-action',hero:id,card:'paladin-lay-on-hands'});expect(hero(n,id).health).toBe(capacity(p,hero(n,id)).health);expect(hero(n,id).actions).toBe(2);expect(n.pendingPortal).toBe(id);expect(()=>apply(p,n,{type:'power-action',hero:id,card:'paladin-lay-on-hands'})).toThrow();
 });
 it('Druid forms occupy the melee slot and Ferocity applies once',()=>{
  const {s,id}=fighter('druid'),h=hero(s,id);give(s,id,'druid-cat-form',4);give(s,id,'druid-ferocity');dice(s,[]);s.battle!.current[id]={cards:[],harmed:false};settleAutomatic(p,s);const a=s.battle!.active!;expect(a.dice.filter(d=>d.color==='red')).toHaveLength(3);const reroll=a.reroll;settleAutomatic(p,s);expect(a.reroll).toBe(reroll);expect(()=>manage(p,s,h,h.slots,[])).not.toThrow();
 });
 it('Ferocious Bite pays for every converted blue die and does not pay its equip cost again',()=>{
  const {s,id}=fighter('druid');give(s,id,'druid-cat-form',4);give(s,id,'druid-ferocious-bite');hero(s,id).energy=2;s.battle!.stage='after-reroll';dice(s,[['blue',2],['blue',4]]);const n=apply(p,s,{type:'ability',hero:id,card:'druid-ferocious-bite',ability:'after-reroll-2',args:{dice:[0,1]}});expect(hero(n,id).energy).toBe(0);expect(n.battle!.active!.dice.map(d=>[d.color,d.value])).toEqual([['red',8],['red',8]]);
 });
 it('Earth Shock uses different dice for Spot and removal',()=>{
  const {s,id}=fighter('shaman');give(s,id,'shaman-earth-shock');s.battle!.stage='after-reroll';s.battle!.current[id].cards.push('shaman-earth-shock','shaman-earth-shock:pool');dice(s,[['red',5],['blue',1]]);const legal=legalActions(p,s).find(c=>c.type==='ability'&&c.card==='shaman-earth-shock'&&c.args?.removeDice?.includes(1));expect(legal).toBeDefined();const n=apply(p,s,legal!);expect(n.battle!.active!.dice[0].spotted).toBe(true);expect(n.battle!.active!.dice[1].removed).toBe(true);
 });
 it('Improved Windfury permits independently chosen colors',()=>{
  const {s,id}=fighter('shaman');give(s,id,'shaman-windfury-weapon');give(s,id,'shaman-improved-windfury');s.battle!.stage='after-reroll';dice(s,[['green',8],['blue',8]]);const n=apply(p,s,{type:'ability',hero:id,card:'shaman-windfury-weapon',ability:'after-reroll-2',args:{dice:[0,1],colors:['red','green']}});expect(n.battle!.active!.dice.slice(2).map(d=>d.color)).toEqual(['red','green']);
 });
 it('prevented Defense damage does not become a Shadowguard reserve',()=>{
  const {s,id}=fighter('priest');s.battle!.stage='wounds';healthLoss(s,hero(s,id),1);effects(p,s,hero(s,id),'test',[{op:'prevent',amount:1}],{});expect(s.battle!.defenseLosses?.[id]).toBe(0);
 });
});
describe('world events and bosses',()=>{
 it('any acting ally may purify at the end of a group challenge, before the next action',()=>{
  let s=fresh();s.enemies=[];s.quests=[];const ids=s.heroes.filter(h=>faction(p,h.id)==='horde').map(h=>h.id);for(const id of ids){hero(s,id).location='andorhal';hero(s,id).level=3;hero(s,id).energy=4;}addWorld(s,'event-11').tokens=['andorhal'];beginBattle(s,'pve',ids,[],'horde','andorhal');s.battle!.stage='over';s.battle!.winner='horde';s=apply(p,s,{type:'closeBattle'});expect(legalActions(p,s).some(c=>c.type==='purify'&&c.hero===ids[1])).toBe(true);const next=apply(p,s,{type:'purify',hero:ids[1]});expect(hero(next,ids[1]).xp).toBe(1);
 });
 it('bots take useful professions rewards instead of always skipping',()=>{
  const s=event(2),id=s.eventFlow!.steps[0].hero;expect(decide(p,view(s,[id]),legalActions(p,s))?.command).toMatchObject({type:'event-choice',choice:{mode:'gold'}});
 });
 it('New Horizons removes quest figures while leaving blue figures',()=>{
  let s=event(5);const step=s.eventFlow!.steps[0],q=p.quests.find(q=>q.id===s.quests.find(id=>p.quests.find(q=>q.id===id)?.faction===step.faction))!,blue=s.enemies.filter(e=>e.color==='blue').map(e=>e.id);s=apply(p,s,{type:'event-choice',hero:step.hero,choice:{quest:q.id,tier:'green'}});expect(s.quests).not.toContain(q.id);expect(s.enemies.some(e=>e.quest===q.id)).toBe(false);expect(blue.every(id=>s.enemies.some(e=>e.id===id))).toBe(true);
 });
 it('a duplicate bonus title ends the event chain without applying its effect',()=>{
  let s=fresh();s.eventDeck=['event-2','event-37','event-1'];drawEvents(p,s);while(s.eventFlow?.steps.length)s=apply(p,s,{type:'event-choice',hero:s.eventFlow.steps[0].hero,choice:{mode:'gold'}});expect(s.phase).toBe('actions');expect(s.heroes.every(h=>h.gold===6)).toBe(true);expect(s.eventDeck).toEqual(['event-1']);
 });
 it('Zaeldarr takes exactly one bag item per character and preserves it on the boss',()=>{
  const s=fresh(),h=s.heroes[0];h.bag=[p.cards.find(c=>c.deck==='triangle')!.id];s.eventDeck=['event-17'];drawEvents(p,s);expect(s.eventFlow!.steps).toHaveLength(1);expect(()=>apply(p,s,{type:'event-choice',hero:h.id,choice:{mode:'skip'}})).toThrow();const n=apply(p,s,{type:'event-choice',hero:h.id,choice:{card:h.bag[0]}});expect(n.world![0].items).toHaveLength(1);expect(hero(n,h.id).bag).toHaveLength(0);
 });
 it('Spectral Revenge stores the rounded-down half of all gold',()=>{const s=event(40);expect(s.heroes.every(h=>h.gold===3)).toBe(true);expect(s.world![0].gold).toBe(12);});
 it('the Hood adds a legal eighth instant slot and is lost on defeat',()=>{
  let s=event(33);for(const h of s.heroes)s=apply(p,s,{type:'bid',hero:h.id,amount:h.id===s.heroes[0].id?1:0});const h=s.heroes[0];expect(h.slots).toHaveLength(8);expect(()=>manage(p,s,h,h.slots,[])).not.toThrow();defeat(p,s,h.id,'brill');expect(h.slots).toHaveLength(7);expect(h.auctionItems).toHaveLength(0);
 });
 it('Kazzak has five deterministic hidden locations and only a faction peek reveals identity',()=>{
  let s=createGame(p,{...DEFAULT_SETUP,overlord:'kazzak'});const id=s.heroes[0].id;hero(s,id).location=s.kazzak![0].region;expect(s.kazzak!.filter(t=>t.real)).toHaveLength(1);expect(view(s,[id]).kazzak!.every(t=>t.real===undefined)).toBe(true);s=apply(p,s,{type:'peek',hero:id,region:hero(s,id).location});expect(view(s,[id]).kazzak![0].real).toBeDefined();expect(view(s,[s.heroes[3].id]).kazzak![0].real).toBeUndefined();
 });
 it('challenging a false Kazzak position spends the action and discards only that token',()=>{
  const s=createGame(p,{...DEFAULT_SETUP,overlord:'kazzak'}),h=s.heroes[0];h.location=s.kazzak!.find(t=>!t.real)!.region;s.enemies=[];const n=apply(p,s,{type:'challenge',hero:h.id,target:'kazzak',allies:[]});expect(hero(n,h.id).actions).toBe(1);expect(n.kazzak).toHaveLength(4);expect(n.battle).toBeUndefined();
 });
 it('Nefarian reaches Bulwark before an event effect and forces the stronger faction into combat',()=>{
  const s=createGame(p,{...DEFAULT_SETUP,overlord:'nefarian'});s.overlord.region='andorhal';s.heroes[0].xp=2;s.eventDeck=['event-40'];expect(nefarianDestinations(p,s,1)).toEqual(['bulwark']);drawEvents(p,s);expect(s.phase).toBe('combat');expect(s.battle!.boss).toBe('nefarian');expect(s.battle!.participants).toEqual(s.heroes.slice(0,3).map(h=>h.id));expect(s.heroes.every(h=>h.gold===5)).toBe(true);
 });
 it('Nefarian halves the Attrition value and caps combined ranged/melee hits',()=>{
  const {s,id}=fighter('warrior');s.overlord.id='nefarian';s.battle!.boss='nefarian';s.battle!.enemies=[];s.battle!.stage='tokens';s.battle!.active!.threat=7;s.battle!.active!.attrition=5;dice(s,[['red',8],['blue',7]]);expect(()=>placeTokens(p,s)).toThrow(/Nefarian/);placeTokens(p,s,[1]);expect(s.battle!.boxes[faction(p,id)].attrition).toBe(4);
 });
 it('Kel’Thuzad and Scourge Cauldrons change boss Attack for each faction',()=>{
  const {s,id}=fighter('warrior');s.battle!.boss='kelthuzad';s.battle!.enemies=[];const base=stats(p,s).attack;const cauldron=addWorld(s,'event-4');expect(stats(p,s).attack).toBe(base+4);cauldron.tokens.push(id);expect(stats(p,s).attack).toBe(base);addWorld(s,'event-11');expect(stats(p,s).attack).toBe(base);s.battle!.region='stratholme';expect(stats(p,s).attack).toBe(base+2);
 });
 it('Kel’Thuzad damages red/blue low results and heals after surviving resolution',()=>{
  const {s,id}=fighter('warrior');s.battle!.boss='kelthuzad';s.battle!.enemies=[];s.battle!.stage='after-reroll';const hp=hero(s,id).health;dice(s,[['red',1],['blue',2],['green',1]]);monsterEffect(p,s);expect(hero(s,id).health).toBe(hp-4);s.battle!.stage='resolution';s.battle!.boxes[faction(p,id)].damage=8;resolution(p,s);expect(s.battle!.boxes[faction(p,id)].damage).toBe(4);
 });
 it('event bosses award rewards without ending the campaign',()=>{
  const {s,id}=fighter('warrior');addWorld(s,'event-7');s.battle!.boss='event-7';s.battle!.enemies=[];s.battle!.stage='resolution';s.battle!.boxes[faction(p,id)].damage=9;resolution(p,s);expect(s.winner).toBeUndefined();battleEvents(p,s);expect(s.reward).toBeDefined();expect(s.world).toHaveLength(0);
 });
});
