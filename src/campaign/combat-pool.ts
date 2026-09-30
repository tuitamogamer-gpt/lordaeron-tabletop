import { poolPenaltyDice } from '../rules/combat';
import { colors, emptyPool } from '../rules/common';
import type { Attack, ContentPack, Hero, Pool } from '../rules/model';

/** Public, deterministic preview. It never rolls dice or changes the game state. */
export function combatPool(p:ContentPack,hero:Hero,attack:Attack,requested:Pool=emptyPool()){
 const penalties=new Set(poolPenaltyDice(p,hero,attack));
 const dice=attack.dice.filter(d=>!d.removed&&!penalties.has(d.id));
 const available=emptyPool(),kept=emptyPool(),omit=emptyPool(),maximum=emptyPool();
 for(const color of colors){
  available[color]=dice.filter(d=>d.color===color).length;
  maximum[color]=attack.forbidden?.pool?.includes(color)?0:Math.min(available[color],attack.poolLimits?.[color]??7);
  omit[color]=Math.max(available[color]-maximum[color],Math.min(available[color],Math.max(0,Math.floor(requested[color])||0)));
  kept[color]=available[color]-omit[color];
 }
 return {available,kept,omit,maximum,penalties:[...penalties],dice,total:colors.reduce((n,c)=>n+kept[c],0)};
}
