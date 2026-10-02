import { useId, useState } from 'react';
import { CardThumbnail } from './parts';
import { BASE_PACK as p } from '../data/base';
import { card, character } from '../rules/common';
import { abilityEnergyCost, availableCards, condition, previewAbilityDice } from '../rules/effects';
import type { AbilityArgs, Command, Effect } from '../rules/model';
import type { GameView } from '../rules/view';
import { effectText } from './rules-text';
import RulesText from './RulesText';
export type AbilityCommand=Extract<Command,{type:'ability'}>;

const keyFor=(command:AbilityCommand)=>JSON.stringify([command.hero,command.card,command.ability,Object.entries(command.args??{}).sort(([a],[b])=>a.localeCompare(b))]);
const containsPreset=(effects:Effect[]):boolean=>effects.some(effect=>effect.op==='preset'||effect.op==='if'&&(containsPreset(effect.then)||containsPreset(effect.otherwise??[]))||'effects'in effect&&containsPreset(effect.effects));
function sameArgs(a:AbilityArgs,b:AbilityArgs,preserveOrder:boolean) {
 const normalize=(args:AbilityArgs)=>Object.entries(args).filter(([,value])=>value!==undefined).sort(([x],[y])=>x.localeCompare(y)).map(([key,value])=>[key,!preserveOrder&&(key==='dice'||key==='removeDice')&&Array.isArray(value)?[...value].sort((x,y)=>Number(x)-Number(y)):value]);
 return JSON.stringify(normalize(a))===JSON.stringify(normalize(b));
}

type Props={commands:AbilityCommand[];state:GameView;dice:number[];send:(c:Command)=>void;busy:boolean;expanded?:boolean;onToggle?:()=>void};
export default function CombatAbilities({commands,state,dice,send,busy,expanded,onToggle}:Props) {
 const [selection,setSelection]=useState(''),[localOpen,setLocalOpen]=useState(false),[override,setOverride]=useState(false),[remove,setRemove]=useState(false);
 const reviewId=useId(),isOpen=expanded??localOpen;
 const seen=new Set<string>(),choices=commands.filter(command=>{const key=keyFor(command);if(seen.has(key))return false;seen.add(key);return true;});
 const chosen=choices.find(command=>keyFor(command)===selection)??choices[0];
 if(!chosen)return null;
 const c=card(p,chosen.card),a=c.abilities.find(ability=>ability.id===chosen.ability)!,h=state.heroes.find(hero=>hero.id===chosen.hero)!;
 const costFor=(command:AbilityCommand)=>abilityEnergyCost(p,state,h,command.card,command.ability,command.args);
 const allCosts=choices.map(costFor),minimum=Math.min(...allCosts),maximum=Math.max(...allCosts);
 const energyRange=minimum===maximum?`${minimum} energy`:`${minimum}–${maximum} energy`;
 const select=(command:AbilityCommand)=>{setSelection(keyFor(command));setOverride(false);setRemove(false);};
 const strengthOptions=c.abilities.filter(ability=>choices.some(command=>command.ability===ability.id));
 const strengthCommands=choices.filter(command=>command.ability===chosen.ability);
 const paymentOptions=[...new Set(strengthCommands.map(command=>!!command.args?.free))];
 const variants=strengthCommands.filter(command=>!!command.args?.free===!!chosen.args?.free);
 const nameFor=(id:string)=>p.characters.find(hero=>hero.id===id)?.name??p.cards.find(value=>value.id===id)?.name??p.creatures.find(value=>value.id===state.enemies.find(enemy=>enemy.id===id)?.creature)?.name??id;
 const diceText=(ids:number[])=>ids.map(id=>{const die=state.battle?.active?.dice.find(value=>value.id===id);return die?`${die.color} ${die.value||'unrolled'} (#${id})`:`#${id}`;}).join(', ');
 const configuration=(command:AbilityCommand)=>{
  const args=command.args??{};
  return [args.target&&`Target: ${nameFor(args.target)}`,args.secondaryTarget&&`Also heal ${nameFor(args.secondaryTarget)}`,args.targets&&`Targets: ${args.targets.map(nameFor).join(', ')}`,args.dice&&`Dice: ${diceText(args.dice)}`,args.removeDice&&`Remove: ${diceText(args.removeDice)}`,args.color&&`${args.color} result`,args.colors&&`Add ${args.colors.join(' / ')} dice`,args.health!==undefined&&`Restore ${args.health} health`,args.slot!==undefined&&`Equip in slot ${args.slot+1}`,args.discard&&`Discard ${nameFor(args.discard)}`].filter(Boolean).join(' · ');
 };
 const draftArgs={...chosen.args,...override&&chosen.args?.dice!==undefined?{dice}:{},...remove&&chosen.args?.removeDice!==undefined?{removeDice:dice}:{}};
 const requested=(override&&chosen.args?.dice!==undefined)||(remove&&chosen.args?.removeDice!==undefined);
 const listedChoice=choices.find(command=>command.hero===chosen.hero&&command.card===chosen.card&&command.ability===chosen.ability&&sameArgs(command.args??{},draftArgs,containsPreset(a.effects)));
 const validation=requested&&!listedChoice?previewAbilityDice(p,state,chosen,{...override&&chosen.args?.dice!==undefined?{dice}:{},...remove&&chosen.args?.removeDice!==undefined?{removeDice:dice}:{}}):undefined;
 const legalChoice=listedChoice??validation?.command;
 const cost=costFor(legalChoice??chosen),remaining=h.energy-cost;
 const invalidDice=requested&&!legalChoice;
 const expectedCounts=[...new Set(variants.flatMap(command=>override?command.args?.dice?[command.args.dice.length]:[]:command.args?.removeDice?[command.args.removeDice.length]:[]))].sort((x,y)=>x-y);
 const conditionalFree=!!a.freeIf&&condition(p,state,h,c.id,a.freeIf);
 const effectDescription=a.effects.map(effectText).join(' · ');
 const targetDescription=configuration(legalChoice??chosen);
 const used=state.battle?.current[h.id]?.cards??[];
 const bonuses=availableCards(p,h).flatMap(id=>{
  const source=card(p,id);
  const enhancements=(source.enhance??[]).filter(bonus=>bonus.card===c.id&&bonus.timing===a.timing).map((bonus,index)=>({key:`${id}:enhance:${index}`,source:source.name,effects:bonus.effects}));
  const triggered=state.battle?.active?.heroId===h.id&&state.battle.stage===a.timing&&['pool','after-pool','reroll','after-reroll','tokens'].includes(a.timing)?source.abilities.filter(trigger=>trigger.automatic&&trigger.timing===a.timing&&trigger.condition?.kind==='used'&&trigger.condition.cardId===c.id&&!used.includes(`${id}:${trigger.id}`)&&(!trigger.requires||used.includes(`${id}:${trigger.requires}`)||id===c.id&&trigger.requires===a.id)).map(trigger=>({key:`${id}:${trigger.id}`,source:source.name,effects:trigger.effects})):[];
  return [...enhancements,...triggered];
 });
 return <section className={`combat-skill-group combat-power-choice ${isOpen?'expanded':''}`} aria-label={`${c.name} power`}>
  <div className="combat-power-summary">
   <CardThumbnail card={c} className="combat-power-thumbnail" actionLabel={`Choose ${c.name}`} footer={isOpen?'Close ability review':'Choose ability'} selected={isOpen} disabled={busy} expanded={isOpen} controls={reviewId} onClick={()=>onToggle?onToggle():setLocalOpen(!localOpen)} />
   <div className="combat-power-caption"><strong>{c.name}</strong><small>{character(p,h.id).name.split(' ')[0]} · {energyRange}{strengthOptions.length>1?` · ${strengthOptions.length} strengths`:''}</small><span className="combat-power-ready">{isOpen?'Reviewing':'Available'}<b>{isOpen?'−':'+'}</b></span></div>
  </div>
  {isOpen&&<div id={reviewId} className="combat-power-review">
   <div className="combat-power-options">
    {strengthOptions.length>1&&<label>Effect strength<select aria-label={`Strength ${c.name}`} disabled={busy} value={chosen.ability} onChange={event=>{const matches=choices.filter(command=>command.ability===event.target.value);select(matches.find(command=>!!command.args?.free===!!chosen.args?.free)??matches[0]);}}>{strengthOptions.map((ability,index)=>{const options=choices.filter(command=>command.ability===ability.id),low=Math.min(...options.map(costFor)),high=Math.max(...options.map(costFor));return <option key={ability.id} value={ability.id}>Strength {index+1} · {low===high?low:`${low}–${high}`} energy · {ability.effects.map(effectText).join('; ')}</option>;})}</select></label>}
    {paymentOptions.length>1&&<label>Payment<select aria-label={`Payment ${c.name}`} disabled={busy} value={chosen.args?.free?'free':'energy'} onChange={event=>{const matches=strengthCommands.filter(command=>!!command.args?.free===(event.target.value==='free'));select(matches.find(command=>sameArgs({...command.args,free:undefined},{...chosen.args,free:undefined},true))??matches[0]);}}>{paymentOptions.map(free=><option key={String(free)} value={free?'free':'energy'}>{free?'Use free cast · once per combat':`Spend ${costFor(strengthCommands.find(command=>!command.args?.free)!)} energy`}</option>)}</select></label>}
    {variants.length>1&&<label>Target & dice<select aria-label={`Ability choice ${c.name}`} disabled={busy} value={keyFor(chosen)} onChange={event=>select(variants.find(command=>keyFor(command)===event.target.value)!)}>{variants.map(command=><option key={keyFor(command)} value={keyFor(command)}>{configuration(command)}</option>)}</select></label>}
   </div>
   <p className="combat-power-effect"><RulesText>{effectDescription}</RulesText></p>
   {bonuses.map(bonus=><p className="combat-power-bonus" key={bonus.key}><strong>{bonus.source}</strong> · <RulesText>{bonus.effects.map(effectText).join(' · ')}</RulesText></p>)}
   {targetDescription&&<p className="combat-power-target">{targetDescription}</p>}
   {(chosen.args?.dice||chosen.args?.removeDice)&&<div className="combat-power-dice">
    {chosen.args?.dice&&<label><input type="checkbox" disabled={busy} checked={override} onChange={event=>setOverride(event.target.checked)}/>Use selected tray dice ({dice.length})</label>}
    {chosen.args?.removeDice&&<label><input type="checkbox" disabled={busy} checked={remove} onChange={event=>setRemove(event.target.checked)}/>Remove selected tray dice ({dice.length})</label>}
    {requested&&<small>{dice.length?`Selected: ${diceText(dice)}`:'Select dice in the tray above.'}</small>}
   </div>}
   {invalidDice&&<p className="combat-power-validation" role="status">{validation?.error??'Selected dice do not match an available choice.'} Choose {expectedCounts.join(' or ')} eligible dice, or use a listed option.</p>}
   <div className="combat-power-confirm"><div className="combat-power-energy"><span>Energy after cost</span><output aria-label={`${c.name} energy after cost`}>{h.energy} → {remaining}</output><small>{chosen.args?.free?`Free cast · ${cost?`${cost} energy repeat cost`:'no energy cost'}`:conditionalFree?`Condition met · ${cost?`${cost} energy repeat cost`:'no energy cost'}`:cost?`Spend ${cost} energy`:'No energy cost'}</small></div><button className="gold-button" disabled={busy||!legalChoice||remaining<0} onClick={()=>{if(legalChoice&&!busy&&remaining>=0)send(legalChoice);}}>Use {c.name} · {cost} energy</button></div>
   <small className="combat-power-review-hint">Energy is spent only on Use.</small>
  </div>}
 </section>;
}
