import { describe, expect, it } from 'vitest';
import { DEVELOPMENT_PACK as pack, DEFAULT_SETUP, FIXTURE } from '../src/data/development-pack';
import { apply, createGame, validatePack } from '../src/rules/game';
import { beginBattle, chooseAttacker, monsterEffect, placeTokens, stats } from '../src/rules/combat';
import { capacity, hero } from '../src/rules/common';
import { activate, effects } from '../src/rules/effects';
import { drawQuest, rewards, spawnQuest } from '../src/rules/rewards';
import { equipped, manage, receiveItem } from '../src/rules/inventory';
import { reachable, respawnRegions } from '../src/rules/movement';
import { importSession, newSession } from '../src/rules/session';
import { view } from '../src/rules/view';
import { legalActions } from '../src/rules/legal';
import { decide } from '../src/ai/planner';
import type { Card, Color, ContentPack, State } from '../src/rules/model';
const fresh=()=>createGame(pack,DEFAULT_SETUP);
const warrior=DEFAULT_SETUP.roster[0],mage=DEFAULT_SETUP.roster[1];
function battle(type='murloc',colors:Color[]=['green'],ids=[warrior]){
 const s=fresh();s.enemies=colors.map((color,i)=>({id:`test-${i}`,creature:type,color,region:'brill'}));
 beginBattle(s,'pve',ids,s.enemies.map(e=>e.id),'horde','brill');chooseAttacker(pack,s,ids[0]);return s;
}
function dice(s:State,results:[Color,number][]){s.battle!.active!.dice=results.map(([color,value],id)=>({id,color,value,spotted:false,removed:false,rerolled:false}));}
function extra(c:Partial<Card>):ContentPack{return{...pack,cards:[...pack.cards,{id:'test-card',name:'Test fixture',kind:'power',type:'instant',level:1,energy:0,price:0,classId:'warrior',abilities:[],description:'',source:FIXTURE,...c}]};}

describe('2005 setup and action economy',()=>{
 it('sets up 6 characters, 5 quests per faction, 6 merchant items and Horde first',()=>{const s=fresh();expect(s.heroes).toHaveLength(6);expect(s.quests).toHaveLength(10);expect(s.merchant).toHaveLength(6);expect(s.faction).toBe('horde');expect(s.heroes.every(h=>h.gold===5&&h.actions===2)).toBe(true);expect(s.questDecks.horde.grey).toEqual([]);});
 it('uses 4 characters / 4 quests per faction for 2–4 players',()=>{const roster=[...DEFAULT_SETUP.roster.slice(0,2),...DEFAULT_SETUP.roster.slice(3,5)];expect(createGame(pack,{...DEFAULT_SETUP,roster}).quests).toHaveLength(8);});
 it('rejects duplicate classes across factions',()=>{expect(()=>createGame(pack,{...DEFAULT_SETUP,roster:[warrior,mage,'shailara-whitherblade','burbon-fang']})).toThrow(/klasa/);});
 it('rejects an incomplete pack advertised as the original game',()=>{expect(validatePack({...pack,officialComplete:true})).toContain('Osnovni set nema sve komponente');});
 it('does not mutate state when a move is illegal',()=>{const s=fresh(),copy=structuredClone(s);expect(()=>apply(pack,s,{type:'travel',hero:warrior,path:['stratholme']})).toThrow();expect(s).toEqual(copy);});
 it('lets a faction interleave actions among its heroes',()=>{let s=fresh();for(const id of[warrior,mage,warrior])s=apply(pack,s,{type:'rest',hero:id,health:0});expect(hero(s,warrior).actions).toBe(0);expect(hero(s,mage).actions).toBe(1);});
 it('requires all actions and all management confirmations before ending the turn',()=>{const s=fresh();expect(()=>apply(pack,s,{type:'endActions'})).toThrow();s.heroes.filter(h=>DEFAULT_SETUP.roster.slice(0,3).includes(h.id)).forEach(h=>h.actions=0);const m=apply(pack,s,{type:'endActions'});expect(()=>apply(pack,m,{type:'endManagement'})).toThrow(/potvrditi/);});
});
describe('travel, rest and defeats',()=>{
 it('flights consume one of two movement steps and cannot use hostile homes',()=>{const s=fresh(),h=hero(s,warrior),paths=reachable(pack,s,h);expect(paths['caer']).toEqual(['caer']);expect(paths['pestilent']).toEqual(['pestilent']);expect(paths.southshore).toBeUndefined();});
 it('blue creatures stop movement and force the NEXT action, including next turn',()=>{const s=fresh();s.enemies.push({id:'blue',creature:'gnoll',color:'blue',region:'stillwater'});expect(()=>apply(pack,s,{type:'travel',hero:warrior,path:['stillwater','deathknell']})).toThrow();const moved=apply(pack,s,{type:'travel',hero:warrior,path:['stillwater']});expect(()=>apply(pack,moved,{type:'rest',hero:warrior,health:0})).toThrow(/izazov/);expect(reachable(pack,moved,hero(moved,warrior))).toEqual({});});
 it('rest cures one curse in wilderness, all in friendly town',()=>{const s=fresh(),h=hero(s,warrior);h.curse=3;h.location='deathknell';h.health=1;let next=apply(pack,s,{type:'rest',hero:warrior,health:2});expect(hero(next,warrior).curse).toBe(2);h.location='brill';next=apply(pack,s,{type:'rest',hero:warrior,health:2});expect(hero(next,warrior).curse).toBe(0);});
 it('defeat returns exactly 1 health and 1 energy, no gold penalty, clears curse and stun',()=>{const s=battle();hero(s,warrior).health=0;hero(s,warrior).curse=3;s.respawns=[warrior];const n=apply(pack,s,{type:'respawn',hero:warrior,region:'brill'});expect(hero(n,warrior)).toMatchObject({health:1,energy:1,gold:5,actions:0,curse:0,stun:0});});
 it('does not treat the graveyard in the defeat region as the nearest graveyard',()=>{const s=fresh();hero(s,warrior).location='andorhal';expect(respawnRegions(pack,s,warrior)).not.toContain('andorhal');expect(respawnRegions(pack,s,warrior)).toContain('brill');});
});
describe('inventory, training and management',()=>{
 it('training goes into spellbook and cannot be used until management equips it',()=>{let s=fresh();s=apply(pack,s,{type:'train',hero:warrior,cards:['warrior-precision']});expect(hero(s,warrior).learned).toContain('warrior-precision');expect(equipped(pack,hero(s,warrior))).not.toContain('warrior-precision');expect(hero(s,warrior).gold).toBe(3);});
 it('buying higher-level items is allowed, equipping them is not',()=>{const s=fresh(),h=hero(s,warrior);h.gold=100;const id=s.merchant.find(id=>id.startsWith('circle'))!;const n=apply(pack,s,{type:'town',hero:warrior,health:0,operations:[{op:'buy',card:id}]});expect(hero(n,warrior).bag).toContain(id);expect(equipped(pack,hero(n,warrior))).not.toContain(id);});
 it('resolves multiple merchant operations for ONE action and rounds sale price up',()=>{const s=fresh(),h=hero(s,warrior);h.bag=['triangle-1'];const price=pack.cards.find(c=>c.id==='triangle-1')!.price;const n=apply(pack,s,{type:'town',hero:warrior,health:0,operations:[{op:'sell',card:'triangle-1'}]});expect(hero(n,warrior).gold).toBe(5+Math.ceil(price/2));expect(hero(n,warrior).actions).toBe(1);});
 it('allows a full-bag equipment swap (FAQ)',()=>{const s=fresh(),h=hero(s,warrior);h.slots[0].card='triangle-0';h.bag=['triangle-4','triangle-1','triangle-2'];const slots=structuredClone(h.slots);slots[0].card='triangle-4';manage(pack,s,h,slots,[]);expect(h.bag).toContain('triangle-0');expect(h.bag).not.toContain('triangle-4');expect(h.bag).toHaveLength(3);});
 it('requires explicit discard on overflow and sends it to merchant without gold',()=>{const s=fresh(),h=hero(s,warrior);h.bag=['triangle-0','triangle-1','triangle-2'];receiveItem(pack,s,h,'triangle-3','triangle-1');expect(h.bag).toEqual(['triangle-0','triangle-2','triangle-3']);expect(s.merchant).toContain('triangle-1');expect(h.gold).toBe(5);});
 it('charges active powers at equip time, and not every round',()=>{const s=fresh(),h=hero(s,warrior);h.learned=['warrior-guard'];const slots=structuredClone(h.slots);slots[4].card='warrior-guard';manage(pack,s,h,slots,[]);expect(h.energy).toBe(0);manage(pack,s,h,slots,[]);expect(h.energy).toBe(0);});
 it('rejects arbitrary bag dropping and soulbound sale',()=>{const p=extra({id:'bound',kind:'item',soulbound:true});const s=fresh(),h=hero(s,warrior);h.bag=['bound'];expect(()=>apply(p,s,{type:'town',hero:warrior,health:0,operations:[{op:'sell',card:'bound'}]})).toThrow();expect(()=>manage(p,s,h,h.slots,['bound'])).toThrow();});
});
describe('combat timing, dice and FAQ interactions',()=>{
 it('plays one character attack at a time',()=>{const s=battle('murloc',['green'],[warrior,mage]);expect(()=>apply(pack,s,{type:'attacker',hero:mage})).toThrow();expect(()=>activate(pack,s,mage,'mage-printed','pool')).toThrow();});
 it('caps each color at seven physical dice before applying removals',()=>{const p=extra({abilities:[{id:'pool',timing:'pool',effects:[{op:'dice',color:'red',amount:20}]}]});const s=battle(),h=hero(s,warrior);h.learned=['test-card'];h.slots[4].card='test-card';activate(p,s,warrior,'test-card','pool');expect(s.battle!.active!.dice).toHaveLength(7);});
 it('rejects duplicate abilities in the same round',()=>{const s=battle();activate(pack,s,warrior,'printed-melee','pool');expect(()=>activate(pack,s,warrior,'printed-melee','pool')).toThrow(/već/);});
 it('spot uses a current rerolled result and cannot reuse the same die',()=>{const p=extra({abilities:[{id:'a',timing:'after-reroll',effects:[{op:'spot',filter:{values:[8]},count:1,effects:[{op:'stat',stat:'attrition',amount:1}]}]},{id:'b',timing:'after-reroll',effects:[{op:'spot',filter:{values:[8]},count:1,effects:[{op:'stat',stat:'attrition',amount:1}]}]}]});const s=battle();hero(s,warrior).slots[4].card='test-card';s.battle!.stage='after-reroll';dice(s,[['red',8]]);s.battle!.active!.dice[0].rerolled=true;activate(p,s,warrior,'test-card','a',{dice:[0]});expect(()=>activate(p,s,warrior,'test-card','b',{dice:[0]})).toThrow(/Spot/);});
 it('Stun defeats a player unable to remove 2 dice; Curse does not',()=>{const s=battle();hero(s,warrior).stun=1;let n=apply(pack,s,{type:'roll'});expect(n.respawns).toEqual([warrior]);const t=battle();hero(t,warrior).curse=2;n=apply(pack,t,{type:'roll'});n=apply(pack,n,{type:'penalty',dice:[]});expect(n.respawns).toEqual([]);expect(n.battle!.stage).toBe('after-pool');});
 it('a murloc special ability is not multiplied by monster count',()=>{const s=battle('murloc',['green','green']);s.battle!.stage='after-reroll';dice(s,[['red',1]]);const before=hero(s,warrior).health;monsterEffect(pack,s);expect(hero(s,warrior).health).toBe(before-1);});
 it('Doom Guard removed dice reduce the cap for the NEXT hero too',()=>{const s=battle('doomguard',['green'],[warrior,mage]);s.battle!.stage='after-reroll';dice(s,[['blue',1],['red',2],['blue',8]]);monsterEffect(pack,s);expect(s.battle!.lostDice).toEqual({red:1,blue:1,green:0});placeTokens(pack,s);chooseAttacker(pack,s,mage);expect(s.battle!.lostDice.blue).toBe(1);});
 it('Ghoul forbids the normal reroll value',()=>{const s=battle('ghoul');s.battle!.stage='reroll';s.battle!.active!.reroll=3;dice(s,[['red',1]]);expect(()=>apply(pack,s,{type:'reroll',dice:[0]})).toThrow();});
 it('Spider and Wraith do not accept attrition tokens',()=>{for(const c of['spider','wraith']){const s=battle(c);s.battle!.stage='tokens';s.battle!.active!.attrition=9;placeTokens(pack,s);expect(s.battle!.boxes.horde.attrition).toBe(0);}});
 it('Drake only allows armor generated by green 8s',()=>{const s=battle('drake');s.battle!.stage='tokens';s.battle!.active!.armor=5;dice(s,[['green',7],['green',8]]);placeTokens(pack,s);expect(s.battle!.boxes.horde.armor).toBe(1);});
 it('ranged damage kills enemies before their attack',()=>{const s=battle();s.battle!.stage='defense';s.battle!.boxes.horde.damage=2;const next=apply(pack,s,{type:'advance'});expect(next.battle!.stage).toBe('over');expect(hero(next,warrior).health).toBe(hero(s,warrior).health);});
 it('party wounds are assigned one at a time with a last-chance healing window',()=>{const s=battle();s.battle!.stage='wounds';s.battle!.wounds.horde=3;hero(s,warrior).health=1;const next=apply(pack,s,{type:'wound',hero:warrior});expect(next.respawns).toEqual([warrior]);expect(next.battle!.wounds.horde).toBe(2);expect(()=>apply(pack,next,{type:'wound',hero:warrior})).toThrow();});
 it('worgen heal for EACH remaining worgen at round end',()=>{const s=battle('worgen',['green','green']);s.battle!.stage='resolution';s.battle!.boxes.horde.damage=6;const n=apply(pack,s,{type:'advance'});expect(n.battle!.boxes.horde.damage).toBe(2);});
});
describe('quests, rewards, events and the final battle',()=>{
 it('splits XP across defeated and surviving participants, gold only among survivors',()=>{const s=fresh();rewards(pack,s,[warrior,mage],[mage],{xp:4,gold:4,items:[]});expect(hero(s,warrior).xp).toBe(2);expect(hero(s,mage).xp).toBe(2);expect(hero(s,warrior).gold).toBe(5);expect(hero(s,mage).gold).toBe(9);});
 it('awards an underlevel quest bonus to exactly ONE eligible character',()=>{const s=fresh(),q={...pack.quests[0],level:3};rewards(pack,s,[warrior,mage],[warrior,mage],{xp:4,gold:0,items:[]},q);expect(hero(s,warrior).xp+hero(s,mage).xp).toBe(6);});
 it('checks all quest stock BEFORE spawning blue figures',()=>{const s=fresh();s.enemies=Array.from({length:8},(_,i)=>({id:`occupied${i}`,creature:'murloc',color:'green',region:'brill'}));const q={...pack.quests[0],spawns:[{creature:'gnoll',color:'blue' as const,region:'brill',count:1},{creature:'murloc',color:'green' as const,region:'brill',count:1}]};expect(spawnQuest(pack,s,q)).toBe(false);expect(s.enemies).toHaveLength(8);});
 it('handles exhausted quest decks without infinite loops',()=>{const s=fresh();s.questDecks.horde.red=[];expect(drawQuest(pack,s,'horde','red')).toBe(false);});
 it('turn 30 starts final management at full resources, then actual PvP',()=>{const s=fresh();s.turn=30;s.phase='management';s.managed=s.heroes.slice(0,3).map(h=>h.id);s.heroes.forEach(h=>{h.health=1;h.energy=0;});let n=apply(pack,s,{type:'endManagement'});expect(n.phase).toBe('final-management');for(const h of n.heroes)expect(h.health).toBe(capacity(pack,h).health);const order=[...n.heroes.filter(h=>pack.characters.find(c=>c.id===h.id)?.faction===n.faction),...n.heroes.filter(h=>pack.characters.find(c=>c.id===h.id)?.faction!==n.faction)];for(const h of order)n=apply(pack,n,{type:'manage',hero:h.id,slots:h.slots,discard:[]});n=apply(pack,n,{type:'endManagement'});expect(n.battle?.kind).toBe('final');});
 it('PvP armor cancels one damage/defense AND one attrition hit per armor',()=>{const s=fresh();beginBattle(s,'pvp',[warrior,DEFAULT_SETUP.roster[3]],[],'horde','fields');s.battle!.stage='defense';s.battle!.boxes.horde.armor=3;s.battle!.boxes.alliance={damage:4,defense:2,armor:0,attrition:5};const n=apply(pack,s,{type:'armor',faction:'horde',damage:2,defense:1});expect(n.battle!.boxes.alliance).toEqual({damage:2,defense:1,armor:0,attrition:2});});
 it('only previous IMMEDIATE combat round enables a previous-use effect',()=>{const s=battle();s.battle!.previous[warrior]={cards:['test-card'],harmed:false};expect(s.battle!.round).toBe(1);s.battle!.stage='round-end';s.battle!.current={};const n=apply(pack,s,{type:'advance'});expect(n.battle!.previous).toEqual({});});
});
describe('replay and bot information boundary',()=>{
 it('replays saved commands, rejecting different content versions',()=>{const session=newSession(pack,DEFAULT_SETUP);session.commands=[{type:'rest',hero:warrior,health:0}];const loaded=importSession(pack,JSON.stringify(session));expect(loaded.state).toEqual(apply(pack,fresh(),session.commands[0]));expect(()=>importSession(pack,JSON.stringify({...session,contentHash:'wrong'}))).toThrow();});
 it('never exposes RNG, deck order, or other players’ auction bids',()=>{const s=fresh();s.auction={event:'auction',item:'auction-charm',bids:{[warrior]:3,[mage]:1}};const v=view(s,[warrior]);expect('rng'in v).toBe(false);expect('eventDeck'in v).toBe(false);expect(v.auction?.ownBids).toEqual({[warrior]:3});expect(v.deckCounts.events).toBe(s.eventDeck.length);});
 it('a bot sees the same public view for different hidden shuffles and chooses a legal move',()=>{const s=fresh(),legal=legalActions(pack,s),a=decide(pack,view(s),legal);const t=structuredClone(s);t.rng=91824;t.eventDeck.reverse();t.questDecks.horde.red.reverse();expect(view(t)).toEqual(view(s));expect(decide(pack,view(t),legal)).toEqual(a);expect(legal).toContainEqual(a?.command);});
 it('deterministically advances a full first faction turn without illegal actions',()=>{let s=fresh();for(let i=0;i<250&&s.turn===1;i++){const legal=legalActions(pack,s),d=decide(pack,view(s),legal);expect(d).toBeDefined();s=apply(pack,s,d!.command);}expect(s.turn).toBeGreaterThan(1);},15000);
});

describe('completed interactions and edge cases',()=>{
 it('lets the party prioritize red figures over green figures when spending damage',()=>{
  const s=battle('murloc',['green','red']);s.battle!.stage='defense';delete s.battle!.active;
  s.battle!.boxes.horde.damage=stats(pack,s,'test-1').health;
  const n=apply(pack,s,{type:'advance',targets:['test-1','test-0']});
  expect(n.enemies.some(e=>e.id==='test-1')).toBe(false);expect(n.enemies.some(e=>e.id==='test-0')).toBe(true);
  expect(()=>apply(pack,s,{type:'advance',targets:['test-1','test-1']})).toThrow();
 });
 it('awards every quest completed by one battle, replacing each separately',()=>{
  let s=battle();const completed=s.quests.filter(id=>pack.quests.find(q=>q.id===id)?.faction==='horde').slice(0,2);
  // Keep live figures for all other quests so only these two become completed.
  const initial=fresh();s.enemies=initial.enemies.filter(e=>!completed.includes(e.quest??''));s.battle!.enemies=[];s.battle!.winner='horde';s.battle!.stage='over';delete s.battle!.active;
  s=apply(pack,s,{type:'closeBattle'});
  for(let i=0;i<60&&s.phase==='reward';i++){const choices=legalActions(pack,s),c=choices.find(c=>c.type==='talent')??choices.find(c=>c.type==='reward')??choices.find(c=>c.type==='quest');expect(c).toBeDefined();s=apply(pack,s,c!);}
  expect(s.completed).toEqual(expect.arrayContaining(completed));expect(s.phase).toBe('actions');expect(s.battle).toBeUndefined();
 });
 it('adds rolled dice after the initial pool and preserves the physical cap',()=>{
  const s=battle();s.battle!.stage='after-pool';effects(pack,s,hero(s,warrior),'test',[{op:'dice',color:'blue',amount:9}],{});
  expect(s.battle!.active!.dice).toHaveLength(7);expect(s.battle!.active!.dice.every(d=>d.value>=1&&d.value<=8)).toBe(true);
 });
 it('blocks direct attrition tokens as well as attrition stats against spiders',()=>{
  const s=battle('spider');effects(pack,s,hero(s,warrior),'test',[{op:'token',box:'attrition',amount:4}],{});expect(s.battle!.boxes.horde.attrition).toBe(0);
 });
 it('executes sell, buy and train in one city action and rolls back the whole batch on failure',()=>{
  const s=fresh(),h=hero(s,warrior);h.gold=20;const item=s.merchant[0];h.bag=[item];s.merchant.shift();const buy=s.merchant[0];
  const n=apply(pack,s,{type:'town',hero:warrior,health:0,operations:[{op:'sell',card:item},{op:'buy',card:buy},{op:'train',card:'warrior-precision'}]});
  expect(hero(n,warrior).actions).toBe(1);expect(hero(n,warrior).learned).toContain('warrior-precision');expect(hero(n,warrior).bag).toEqual([buy]);
  const before=structuredClone(s);expect(()=>apply(pack,s,{type:'town',hero:warrior,health:0,operations:[{op:'sell',card:item},{op:'buy',card:'missing'}]})).toThrow();expect(s).toEqual(before);
 });
 it('offers one loot item per defeated enemy, with overflow choices',()=>{
  const s=fresh(),enemy=DEFAULT_SETUP.roster[3],loot=s.merchant[0];hero(s,enemy).bag=[loot];hero(s,warrior).bag=s.merchant.slice(1,4);
  beginBattle(s,'pvp',[warrior,enemy],[],'horde','brill');s.battle!.stage='over';s.battle!.winner='horde';s.battle!.defeated=[enemy];
  const choices=legalActions(pack,s).filter(c=>c.type==='loot');expect(choices).toHaveLength(4);
  const n=apply(pack,s,choices[0]);expect(n.battle!.report).toContain(`looted:${enemy}`);expect(legalActions(pack,n).some(c=>c.type==='loot')).toBe(false);
 });
});
