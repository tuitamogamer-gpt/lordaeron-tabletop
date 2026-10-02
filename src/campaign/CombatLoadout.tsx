import { BASE_PACK as p } from '../data/base';
import { capacity, card, character } from '../rules/common';
import { abilityEnergyCost, availableCards } from '../rules/effects';
import type { GameView } from '../rules/view';
import type { AbilityCommand } from './CombatAbilities';
import { triggerLabels } from './design-system';
import { effectText } from './rules-text';
import RulesText from './RulesText';

export default function CombatLoadout({state,skills,details=false,showBudget=true}:{state:GameView;skills:AbilityCommand[];details?:boolean;showBudget?:boolean}){
 const b=state.battle,a=b?.active,h=state.heroes.find(h=>h.id===a?.heroId);
 if(!b||!a||!h)return null;
 const available=availableCards(p,h).map(id=>card(p,id)),used=b.current[h.id]?.cards??[];
 const passive=available.flatMap(c=>c.abilities.filter(v=>v.automatic&&used.includes(`${c.id}:${v.id}`)).map(v=>({card:c,ability:v})));
 const energy=passive.filter(({ability})=>ability.effects.some(e=>e.op==='resource'&&e.resource==='energy'));
 const waiting=available.filter(c=>c.abilities.some(v=>!v.automatic&&!v.judgement)&&!skills.some(cmd=>cmd.hero===h.id&&cmd.card===c.id));
 const cost=(c:typeof available[number])=>Math.min(...c.abilities.filter(v=>!v.automatic&&!v.judgement).map(v=>abilityEnergyCost(p,state,h,c.id,v.id)));
 if(!details)return <>
  {showBudget&&<div className="combat-energy-budget" aria-label={`${character(p,h.id).name} energy budget`}><span><strong>{character(p,h.id).name.split(' ')[0]}</strong><small>Available energy</small></span><b>{h.energy}<small> / {capacity(p,h).energy}</small></b></div>}
  {!!energy.length&&<div className="combat-applied-energy">{energy.map(({card:c,ability:v})=><p key={`${c.id}:${v.id}`}><strong>{c.name}</strong> · <RulesText>{v.effects.map(effectText).join(' · ')}</RulesText><span>Automatic · already applied</span></p>)}</div>}
 </>;
 return <>
  {!!waiting.length&&<details className="combat-power-status"><summary>Other equipped abilities · {waiting.length}</summary>{waiting.map(c=><div key={c.id}><strong>{c.name}</strong><span>{c.abilities.some(v=>used.includes(`${c.id}:${v.id}`)&&!v.automatic)?'Used this round':cost(c)>h.energy?`Needs ${cost(c)} energy · ${h.energy} available`:`${[...new Set(c.abilities.filter(v=>!v.automatic&&!v.judgement).map(v=>triggerLabels[v.timing]??v.timing))].join(' / ')} · requires its timing and conditions`}</span></div>)}</details>}
  <details className="combat-power-status combat-pool-sources"><summary>Pool sources & automatic effects</summary>{available.filter(c=>a.dice.some(d=>d.source===c.id&&!d.removed)||passive.some(v=>v.card.id===c.id)||used.some(key=>key.startsWith('aura:')&&key.includes(`:${c.id}:`))).map(c=><div key={c.id}><strong>{c.name}</strong><span>{['red','blue','green'].map(color=>{const n=a.dice.filter(d=>d.source===c.id&&d.color===color&&!d.removed).length;return n?`${n} ${color} dice`:'';}).filter(Boolean).join(' · ')||'Applied'}</span>{passive.filter(v=>v.card.id===c.id).map(({ability:v})=><small key={v.id}><RulesText>{v.effects.map(effectText).join(' · ')}</RulesText></small>)}</div>)}<p>Equipment and passive effects are applied by the rules. Instant powers spend energy only when you confirm them.</p></details>
 </>;
}
