import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { apply, createGame } from '../src/rules/game';
import { hero } from '../src/rules/common';
import { startRewards, claimReward, advanceRewards, rewardScript } from '../src/rules/reward-engine';
import { legalActions } from '../src/rules/legal';
import { beginBattle } from '../src/rules/combat';
import type { Reward, State } from '../src/rules/model';

const fresh=()=>createGame(p,DEFAULT_SETUP);
const zero:Reward={xp:0,gold:0,items:[]};
function start(s:State,reward:Reward,quest=false){s.phase='reward';const ids=s.heroes.filter(h=>p.characters.find(c=>c.id===h.id)!.faction==='horde').map(h=>h.id);startRewards(p,s,ids,ids,reward,quest?{...p.quests.find(q=>q.faction==='horde')!,reward,level:1}:undefined);return ids;}
describe('scripted quest reward resolution',()=>{
 it('compiles every printed quest symbol into one keep-one choice, in printed order',()=>{
  for(const q of p.quests){const script=rewardScript(q.reward,true);expect(script[0]).toEqual({op:'experience',amount:q.reward.xp,levelAdjusted:true});expect(script.filter(s=>s.op==='draw')).toEqual(q.reward.items.map(i=>({op:'draw',deck:i.deck,count:i.draw,keep:1})));expect(script.at(-1)?.op).toBe('replace-quest');}
 });
 it('shares XP among participants and gold only among survivors, before any loot choice',()=>{
  const s=fresh(),[a,b]=s.heroes.filter(h=>p.characters.find(c=>c.id===h.id)!.faction==='horde');
  startRewards(p,s,[a.id,b.id],[a.id],{xp:5,gold:7,items:[{deck:'triangle',draw:2}]});
  expect(a.xp+b.xp).toBe(5);expect(a.gold).toBe(12);expect(b.gold).toBe(5);expect(s.reward!.eligible).toEqual([a.id]);expect(s.reward!.resolution!.status).toBe('choice');
  expect(s.reward!.resolution!.receipts.filter(r=>r.kind==='gold').map(r=>r.hero)).toEqual([a.id]);
 });
 it('returns unchosen cards, then pauses at each subsequent draw before replacing the quest',()=>{
  const s=fresh(),ids=start(s,{...zero,items:[{deck:'triangle',draw:2},{deck:'square',draw:1}]},true),first=[...s.reward!.offered];
  expect(legalActions(p,s).some(c=>c.type==='quest')).toBe(false);
  const n=apply(p,s,{type:'reward',hero:ids[0],card:first[0]});
  expect(n.itemDecks.triangle.at(-1)).toBe(first[1]);expect(n.reward!.offered).toHaveLength(1);expect(n.reward!.offeredDeck).toBe('square');expect(n.reward!.resolution!.receipts.filter(r=>r.kind==='item')).toHaveLength(1);
  const end=apply(p,n,{type:'reward',hero:ids[0],card:n.reward!.offered[0]});
  expect(end.reward!.resolution!.status).toBe('replacement');expect(legalActions(p,end).some(c=>c.type==='quest')).toBe(true);
  expect(()=>apply(p,end,{type:'reward',hero:ids[0],card:first[0]})).toThrow();
 });
 it('skips empty decks and unavailable named items without trapping the party',()=>{
  const s=fresh();s.itemDecks.triangle=[];s.itemDecks.special=[];start(s,{...zero,items:[{deck:'triangle',draw:2}],special:['special-feathered-breastplate']},true);
  expect(s.reward!.offered).toEqual([]);expect(s.reward!.resolution!.status).toBe('replacement');expect(s.reward!.resolution!.receipts.filter(r=>r.kind==='skip')).toHaveLength(2);
 });
 it('leaves the unselected special reward available and enforces bag capacity atomically',()=>{
  const s=fresh(),named=s.itemDecks.special.filter(id=>!p.cards.find(c=>c.id===id)!.bagExempt).slice(0,2),ids=start(s,{...zero,special:named},true);
  const h=hero(s,ids[0]);h.bag=s.itemDecks.triangle.filter(id=>!p.cards.find(c=>c.id===id)!.bagExempt).slice(0,3);s.itemDecks.triangle=s.itemDecks.triangle.filter(id=>!h.bag.includes(id));
  const before=structuredClone(s);
  expect(()=>apply(p,s,{type:'reward',hero:h.id,card:named[0]})).toThrow();expect(s).toEqual(before);
  const n=apply(p,s,{type:'reward',hero:h.id,card:named[0],discard:h.bag[0]});
  expect(n.itemDecks.special).toContain(named[1]);expect(n.itemDecks.special).not.toContain(named[0]);expect(hero(n,h.id).bag).toHaveLength(3);
 });
 it('resumes a serialized choice deterministically without re-awarding XP or gold',()=>{
  const a=fresh(),ids=start(a,{xp:4,gold:6,items:[{deck:'triangle',draw:2}]},true),b=JSON.parse(JSON.stringify(a)) as State,item=a.reward!.offered[0];
  const xp=a.heroes.map(h=>h.xp),gold=a.heroes.map(h=>h.gold);
  claimReward(p,a,ids[0],item);claimReward(p,b,ids[0],item);expect(a).toEqual(b);expect(a.heroes.map(h=>h.xp)).toEqual(xp);expect(a.heroes.map(h=>h.gold)).toEqual(gold);
  advanceRewards(a);expect(a.heroes.map(h=>h.xp)).toEqual(xp);
 });
 it('marks a completed quest once and rejects a second battle-close while resolving it',()=>{
  let s=fresh();const q=p.quests.find(q=>q.faction==='horde')!,h=s.heroes[0];s.quests=[q.id];s.enemies=[];
  beginBattle(s,'pve',[h.id],[],'horde',h.location);s.battle!.stage='over';s.battle!.winner='horde';
  s=apply(p,s,{type:'closeBattle'});expect(s.completed).toEqual([q.id]);expect(s.reward!.resolution).toBeTruthy();
  expect(()=>apply(p,s,{type:'closeBattle'})).toThrow();
 });
});
