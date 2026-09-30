import { faction } from '../rules/common.js';
import type { Command, ContentPack, State } from '../rules/model.js';
type DecisionState=Pick<State,'heroes'|'faction'|'phase'|'battle'|'reward'>;
export function decisionOwners(p:ContentPack,s:DecisionState,c:Command):string[]{
 const team=(f=s.faction)=>s.heroes.filter(h=>faction(p,h.id)===f).map(h=>h.id);
 if(c.type==='attacker'){
  const b=s.battle;if(s.phase!=='combat'||b?.stage!=='attacker')return [];
  const remaining=b.participants.filter(id=>!b.defeated.includes(id)&&!b.acted.includes(id));
  const next=remaining.filter(id=>faction(p,id)===b.nextFaction),eligible=next.length?next:remaining;
  if(!eligible.includes(c.hero))return [];
  // Choosing attack order is shared by the eligible allies. Once selected,
  // the attacker's own seat controls powers, payment and dice.
  return eligible.filter(id=>faction(p,id)===faction(p,c.hero));
 }
 if(c.type==='wound'){
  const b=s.battle;if(s.phase!=='combat'||b?.stage!=='wounds'||!b.participants.includes(c.hero)||b.defeated.includes(c.hero))return [];
  return b.participants.filter(id=>!b.defeated.includes(id)&&faction(p,id)===faction(p,c.hero));
 }
 if('hero'in c)return[c.hero];
 if(c.type==='armor')return team(c.faction);
 if(c.type==='quest')return s.reward?.replacementFaction?team(s.reward.replacementFaction):s.reward?.eligible??[];
 if(['roll','reroll','penalty','monster','tokens'].includes(c.type)||(c.type==='advance'&&['after-pool','reroll','after-tokens'].includes(s.battle?.stage??'')))return s.battle?.active?[s.battle.active.heroId]:[];
 if(c.type==='closeBattle'||c.type==='advance'){const alive=s.battle?.participants.filter(id=>!s.battle!.defeated.includes(id))??[];return alive.length?alive:s.battle?.participants??[];}
 if(c.type==='endManagement'&&s.phase==='final-management')return s.heroes.map(h=>h.id);
 return team();
}
export function botOwns(p:ContentPack,s:DecisionState,c:Command,bots:string[]){
 const ids=decisionOwners(p,s,c);return ids.length>0&&ids.every(id=>bots.includes(id))&&(c.type!=='challenge'||c.allies.every(id=>bots.includes(id)))&&(c.type!=='trade'||bots.includes(c.to))&&(c.type!=='portal'||c.allies.every(id=>bots.includes(id)))&&(c.type!=='summon'||bots.includes(c.target));
}
