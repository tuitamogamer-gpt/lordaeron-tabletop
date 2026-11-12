import { BASE_PACK as p } from '../data/base';
import { card } from '../rules/common';
import { availableCards } from '../rules/effects';
import type { GameView } from '../rules/view';
import { effectText } from './rules-text';
import RulesText from './RulesText';

/** Where the attacker's dice and automatic effects come from, card by card. What each card can still do is on the character sheet. */
export default function CombatLoadout({state}:{state:GameView}){
 const b=state.battle,a=b?.active,h=state.heroes.find(h=>h.id===a?.heroId);
 if(!b||!a||!h)return null;
 const available=availableCards(p,h).map(id=>card(p,id)),used=b.current[h.id]?.cards??[];
 const passive=available.flatMap(c=>c.abilities.filter(v=>v.automatic&&used.includes(`${c.id}:${v.id}`)).map(v=>({card:c,ability:v})));
 return <details className="combat-power-status combat-pool-sources"><summary>Pool sources & automatic effects</summary>{available.filter(c=>a.dice.some(d=>d.source===c.id&&!d.removed)||passive.some(v=>v.card.id===c.id)||used.some(key=>key.startsWith('aura:')&&key.includes(`:${c.id}:`))).map(c=><div key={c.id}><strong>{c.name}</strong><span>{['red','blue','green'].map(color=>{const n=a.dice.filter(d=>d.source===c.id&&d.color===color&&!d.removed).length;return n?`${n} ${color} dice`:'';}).filter(Boolean).join(' · ')||'Applied'}</span>{passive.filter(v=>v.card.id===c.id).map(({ability:v})=><small key={v.id}><RulesText>{v.effects.map(effectText).join(' · ')}</RulesText></small>)}</div>)}<p>Equipment and passive effects are applied by the rules. A power spends energy only when you press its Use button.</p></details>;
}
