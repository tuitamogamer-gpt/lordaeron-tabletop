import { assert, faction, hero } from './common.js';
import { living } from './combat.js';
import { spendEnergy } from './effects.js';
import { removeWorld } from './events.js';
import { awardXP, rewards, shares, stronger } from './rewards.js';
import { activeEvent, plagued, worldEvent } from './world.js';
import type { ContentPack, State } from './model.js';
/** Kills still count when the surviving creatures ultimately win the combat. */
export function battleEvents(p:ContentPack,s:State){
 const b=s.battle!;if(b.report.includes('events-resolved'))return;b.report.push('events-resolved');
 const own=b.participants.filter(id=>faction(p,id)===b.first),alive=living(s,b,b.first,p);
 if(b.kind==='pve'){
  const blue=(b.killed??[]).filter(v=>v.color==='blue');
  const ears=activeEvent(p,s,'ears'),winds=activeEvent(p,s,'winds'),cleanse=activeEvent(p,s,'cleanse');
  if(blue.length&&(ears||winds)){
   const selected=winds?blue.filter(v=>plagued(p,v.region)):blue;
   const xp=shares(s,selected.length*(winds?2:1),own.map(id=>hero(s,id))),gold=shares(s,ears?selected.reduce((n,v)=>n+Math.floor(p.creatures.find(c=>c.id===v.creature)!.stats.blue.attack/2),0):0,alive.map(id=>hero(s,id)));
   for(const id of own){awardXP(p,hero(s,id),xp[id]??0);hero(s,id).gold+=gold[id]??0;}
  }
  if(cleanse&&blue.length){cleanse.trophies[b.first].push(...blue);if(cleanse.trophies[b.first].reduce((n,v)=>n+p.creatures.find(c=>c.id===v.creature)!.stats.blue.attack,0)>=10){for(const h of s.heroes.filter(h=>faction(p,h.id)===b.first)){awardXP(p,h,2);h.gold+=4;}removeWorld(s,cleanse.id);}}
  if(winds&&!s.enemies.some(v=>v.color==='blue'&&plagued(p,v.region)))removeWorld(s,winds.id);
  const event=p.events.find(e=>e.id===b.boss),world=event&&worldEvent(s,event.id);
  if(event?.boss&&world&&b.winner===b.first){
   const reward=structuredClone(stronger(p,s).includes(b.first)?event.boss.strong:event.boss.weak);reward.gold+=world.gold;
   rewards(p,s,own,alive,reward);s.reward!.extraItems=[...world.items];s.reward!.relic=event.boss.relic;
   if(event.boss.perFaction)world.tokens.push(...b.participants);else if(event.boss.relic)world.cleared=true;else removeWorld(s,event.id);
   s.phase='reward';
  }
 }else if(b.kind==='pvp'){
  for(const event of [...s.world??[]])if(p.events.find(e=>e.id===event.id)?.script==='bounty'){
   const defeated=b.defeated.find(id=>event.tokens.includes(id));if(defeated){for(const h of s.heroes.filter(h=>faction(p,h.id)!==faction(p,defeated)))awardXP(p,h,3);removeWorld(s,event.id);}
  }
  const hatreds=activeEvent(p,s,'hatreds');if(hatreds&&b.winner&&b.winner!=='draw'){
   const strong=stronger(p,s).includes(b.winner);for(const id of b.participants.filter(id=>faction(p,id)===b.winner)){hero(s,id).gold+=strong?8:4;awardXP(p,hero(s,id),strong?1:2);}removeWorld(s,hatreds.id);
  }
 }
}
export function purify(p:ContentPack,s:State,id:string){
 const h=hero(s,id),plague=activeEvent(p,s,'plague');assert(s.phase==='actions'&&(s.lastActions??(s.lastAction?[s.lastAction]:[])).includes(id)&&plague&&plague.tokens.includes(h.location),"Cleansing is available after your own action in an infected region.");
 spendEnergy(s,h,3);plague.tokens=plague.tokens.filter(r=>r!==h.location);awardXP(p,h,1);if(!plague.tokens.length)removeWorld(s,plague.id);delete s.lastAction;s.lastActions=s.lastActions?.filter(v=>v!==id);
}
