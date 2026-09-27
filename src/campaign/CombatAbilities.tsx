import { useState } from 'react';
import { CardArt } from './Art';
import { BASE_PACK as p } from '../data/base';
import { card } from '../rules/common';
import type { Command } from '../rules/model';
import type { GameView } from '../rules/view';
import { effectText } from './rules-text';
export type AbilityCommand=Extract<Command,{type:'ability'}>;
export default function CombatAbilities({commands,state,dice,send,busy}:{commands:AbilityCommand[];state:GameView;dice:number[];send:(c:Command)=>void;busy:boolean}){
 const [index,setIndex]=useState(0),[override,setOverride]=useState(false),[remove,setRemove]=useState(false);
 const chosen=commands[index]??commands[0],c=card(p,chosen.card),a=c.abilities.find(a=>a.id===chosen.ability)!;
 const diceText=(ids:number[])=>ids.map(id=>{const d=state.battle?.active?.dice.find(d=>d.id===id);return d?`${d.color} ${d.value} (#${id})`:`#${id}`;}).join(', ');
 const label=(cmd:AbilityCommand)=>{const ability=c.abilities.find(a=>a.id===cmd.ability)!;return `${ability.cost!==undefined?`${ability.cost} E · `:''}${ability.effects.map(effectText).join('; ')}${cmd.args?.target?` → ${p.characters.find(h=>h.id===cmd.args?.target)?.name??p.cards.find(v=>v.id===cmd.args?.target)?.name??cmd.args.target}`:''}${cmd.args?.dice?` · ${diceText(cmd.args.dice)}`:''}${cmd.args?.removeDice?` · remove ${diceText(cmd.args.removeDice)}`:''}${cmd.args?.color?` · ${cmd.args.color} result`:''}${cmd.args?.colors?` · ${cmd.args.colors.join('/')}`:''}${cmd.args?.free?" · no energy cost":''}${cmd.args?.health!==undefined?` · health ${cmd.args.health}`:''}${cmd.args?.slot!==undefined?` · slot ${cmd.args.slot+1}`:''}`;};
 return <div className="combat-skill-group"><CardArt card={c}/><div><strong>{c.name}</strong>{commands.length===1?<small>{label(chosen)}</small>:<select aria-label={`Ability choice ${c.name}`} value={Math.min(index,commands.length-1)} onChange={e=>setIndex(Number(e.target.value))}>{commands.map((cmd,i)=><option key={i} value={i}>{label(cmd)}</option>)}</select>}{chosen.args?.dice&&<label className="dice-override"><input type="checkbox" checked={override} onChange={e=>setOverride(e.target.checked)}/>Use the dice selected above ({dice.length})</label>}{chosen.args?.removeDice&&<label className="dice-override"><input type="checkbox" checked={remove} onChange={e=>setRemove(e.target.checked)}/>Remove the dice selected above ({dice.length})</label>}</div><button className="quiet-button" disabled={busy||(override||remove)&&!dice.length} title={a.effects.map(effectText).join('; ')} onClick={()=>send({...chosen,args:{...chosen.args,...(override?{dice}:{}),...(remove?{removeDice:dice}:{})}})}>Activate</button></div>;
}
