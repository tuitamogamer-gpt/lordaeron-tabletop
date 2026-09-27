import { CreatureGlyph, creatureRules } from './design-system';
import { CardArt, FactionCrest } from './Art';
import { useEffect, useState } from 'react';
import { Icon, Modal } from '../components';
import { BASE_PACK as p } from '../data/base';
import { card, character } from '../rules/common';
import { commandLabel } from '../rules/legal';
import type { Command, Pool } from '../rules/model';
import type { GameView } from '../rules/view';
import { factionLabel, HeroPortrait, phaseLabel, pretty } from './parts';
import { bossRules } from './event-text';
import { effectText } from './rules-text';
type AbilityCommand=Extract<Command,{type:'ability'}>;
function AbilityChoice({commands,state,dice,send}:{commands:AbilityCommand[];state:GameView;dice:number[];send:(c:Command)=>void}){
 const [index,setIndex]=useState(0),[override,setOverride]=useState(false),[remove,setRemove]=useState(false);
 const chosen=commands[index]??commands[0],c=card(p,chosen.card),a=c.abilities.find(a=>a.id===chosen.ability)!;
 const diceText=(ids:number[])=>ids.map(id=>{const d=state.battle?.active?.dice.find(d=>d.id===id);return d?`${d.color} ${d.value} (#${id})`:`#${id}`;}).join(', ');
 const label=(cmd:AbilityCommand)=>{const ability=c.abilities.find(a=>a.id===cmd.ability)!;return `${ability.cost!==undefined?`${ability.cost} E · `:''}${ability.effects.map(effectText).join('; ')}${cmd.args?.target?` → ${p.characters.find(h=>h.id===cmd.args?.target)?.name??p.cards.find(v=>v.id===cmd.args?.target)?.name??cmd.args.target}`:''}${cmd.args?.dice?` · ${diceText(cmd.args.dice)}`:''}${cmd.args?.removeDice?` · remove ${diceText(cmd.args.removeDice)}`:''}${cmd.args?.color?` · ${cmd.args.color} result`:''}${cmd.args?.colors?` · ${cmd.args.colors.join('/')}`:''}${cmd.args?.free?" · no energy cost":''}${cmd.args?.health!==undefined?` · health ${cmd.args.health}`:''}${cmd.args?.slot!==undefined?` · slot ${cmd.args.slot+1}`:''}`;};
 return <div className="combat-skill-group"><CardArt card={c}/><div><strong>{c.name}</strong>{commands.length===1?<small>{label(chosen)}</small>:<select aria-label={`Ability choice ${c.name}`} value={Math.min(index,commands.length-1)} onChange={e=>setIndex(Number(e.target.value))}>{commands.map((cmd,i)=><option key={i} value={i}>{label(cmd)}</option>)}</select>}{chosen.args?.dice&&<label className="dice-override"><input type="checkbox" checked={override} onChange={e=>setOverride(e.target.checked)}/>Use the dice selected above ({dice.length})</label>}{chosen.args?.removeDice&&<label className="dice-override"><input type="checkbox" checked={remove} onChange={e=>setRemove(e.target.checked)}/>Remove the dice selected above ({dice.length})</label>}</div><button className="gold-button" title={a.effects.map(effectText).join('; ')} onClick={()=>send({...chosen,args:{...chosen.args,...(override?{dice}:{}),...(remove?{removeDice:dice}:{})}})}>Activate</button></div>;
}
export default function CampaignCombat({state,legal,send,busy,botStep,botReady,auto,toggleBots}:{state:GameView;legal:Command[];send:(c:Command)=>void;busy:boolean;botStep:()=>void;botReady:boolean;auto:boolean;toggleBots:()=>void}){
 const b=state.battle!,a=b.active;const[dice,setDice]=useState<number[]>([]),[minimized,setMinimized]=useState(false),[omit,setOmit]=useState<Pool>({red:0,blue:0,green:0});
 useEffect(()=>{setDice([]);setOmit({red:0,blue:0,green:0});},[b.stage,a?.heroId,b.round]);
 const moves=legal.filter(c=>!['travel','rest','train','town','manage','endActions','endManagement'].includes(c.type));
 const skills=moves.filter((c):c is Extract<Command,{type:'ability'}>=>c.type==='ability');
 const choices=moves.filter(c=>c.type!=='ability'&&c.type!=='reroll'&&c.type!=='penalty');
 const enemy=state.enemies.find(e=>b.enemies.includes(e.id));const creature=p.creatures.find(c=>c.id===enemy?.creature);
 const boss=p.overlords.find(o=>o.id===b.boss),event=p.events.find(e=>e.id===b.boss),bossStat=boss?.stats[state.heroes.length as 4|6]??event?.boss?.stats;
 const title=b.kind==='final'?"Final showdown":b.kind==='pvp'?"Horde versus Alliance":creature?.name??boss?.name??event?.name??"Combat";
 if(minimized)return <button className="combat-reopen gold-button" onClick={()=>setMinimized(false)}><Icon name="swords"/>Return to combat · round {b.round}</button>;
 const usable=(type:Command['type'])=>moves.some(c=>c.type===type);
 return <Modal title={title} wide onClose={()=>setMinimized(true)}><div className="v2-combat">
  <div className="combat-stage"><span className="eyebrow">ROUND {b.round}</span><h3>{phaseLabel[b.stage]}</h3><span>{a?character(p,a.heroId).name:b.winner?factionLabel(b.winner):`${b.participants.length} participants`}</span></div>
  <div className="combat-progress">{['attacker','pool','reroll','tokens','defense','resolution'].map((stage,i)=><span className={b.stage===stage?'active':''} key={stage}>{i+1}<small>{phaseLabel[stage]}</small></span>)}</div>
  <div className="combat-members">{b.participants.map(id=>{const h=state.heroes.find(h=>h.id===id)!;return <div key={id} className={`${a?.heroId===id?'active':''} ${b.defeated.includes(id)?'defeated':''}`}><HeroPortrait id={id} small/><div><strong>{character(p,id).name.split(' ')[0]}</strong><span><Icon name="heart" size={12}/>{h.health} <Icon name="bolt" size={12}/>{h.energy}{h.curse>0?` · Curse ${h.curse}`:''}{h.stun>0?` · Stun ${h.stun}`:''}</span></div></div>;})}</div>
  {creature&&<div className="creature-rule"><CreatureGlyph type={creature.rule} name={creature.name}/><div><strong>{creature.name} · {b.enemies.length} in the group</strong><p>{creatureRules[creature.rule]}</p></div>{enemy&&<div className="creature-stats"><span>Threat <b>{creature.stats[enemy.color].threat}+</b></span><span>Attack <b>{creature.stats[enemy.color].attack}</b></span><span>Health <b>{creature.stats[enemy.color].health}</b></span></div>}</div>}
  {bossStat&&<div className="boss-combat-rule"><strong>Threat {bossStat.threat}+ · attack {bossStat.attack} · health {bossStat.health}</strong><br/>{bossRules[boss?.combat??event?.boss?.combat??'']}</div>}
  {a&&<><div className="dice-caption"><span>{a.dice.some(d=>d.value)?"Dice results":"Prepare dice"} · {a.dice.filter(d=>!d.removed).length} / 21</span><span>Reroll {Math.max(0,a.reroll)} · Attrition {Math.max(0,a.attrition)}</span></div><div className="v2-dice">{a.dice.map(d=><button key={d.id} aria-label={`${d.color} ${d.value||"prepared"}${d.removed?" removed":''}`} className={`v2-die ${d.color} ${dice.includes(d.id)?'selected':''} ${d.removed?'removed':''} ${d.rerolled?'rerolled':''}`} disabled={d.removed||busy} onClick={()=>setDice(v=>v.includes(d.id)?v.filter(id=>id!==d.id):[...v,d.id])}>{d.value||<Icon name="plus"/>}{d.spotted&&<i>✦</i>}</button>)}{!a.dice.length&&<p>Activate equipment and powers below to prepare your dice.</p>}</div></>}
  <div className="combat-boxes">{(['horde','alliance'] as const).filter(f=>b.kind!=='pve'||f===b.first).map(f=><div key={f} className={f}><span><FactionCrest faction={f}/>{factionLabel(f)}</span><div><b>{b.boxes[f].damage}<small>RANGED</small></b><b>{b.boxes[f].defense}<small>MELEE</small></b><b>{b.boxes[f].armor}<small>ARMOR</small></b><b>{b.boxes[f].attrition}<small>ATTRITION</small></b>{b.wounds[f]>0&&<b className="pending-wounds">{b.wounds[f]}<small>WOUNDS</small></b>}</div></div>)}</div>
  {state.respawns.length>0&&<p className="combat-warning">This hero has no health. Use any available healing or choose to return to your starting region or a graveyard.</p>}
  {skills.length>0&&<div className="combat-skill-list">{[...new Set(skills.map(c=>`${c.hero}:${c.card}`))].map(key=><AbilityChoice key={key} commands={skills.filter(c=>`${c.hero}:${c.card}`===key)} state={state} dice={dice} send={send}/>)}</div>}
  {a&&b.stage==='pool'&&usable('roll')&&<details className="pool-omit"><summary>Omit dice before rolling</summary><p>Choose how many dice of each color to omit. Equipment restrictions still apply.</p><div>{(['red','blue','green'] as const).map(color=><label key={color}>{color==='red'?"Red":color==='blue'?"Blue":"Green"}<input type="number" min={0} max={a.dice.filter(d=>!d.removed&&d.color===color).length} value={omit[color]} onChange={e=>setOmit(v=>({...v,[color]:Math.max(0,Math.min(a.dice.filter(d=>!d.removed&&d.color===color).length,Math.floor(Number(e.target.value)||0)))}))}/></label>)}<button className="gold-button" disabled={busy} onClick={()=>send({type:'roll',omit})}>Roll remaining dice</button></div></details>}
  <div className="combat-choices">
   {usable('reroll')&&<button className="gold-button" disabled={!dice.length||busy} onClick={()=>send({type:'reroll',dice})}>Reroll {dice.length} dice <Icon name="reset"/></button>}
   {usable('penalty')&&<button className="gold-button" disabled={!dice.length&&a!.dice.filter(d=>!d.removed).length>0||busy} onClick={()=>send({type:'penalty',dice})}>Remove selected dice</button>}
   {choices.map((c,i)=><button key={i} className={['roll','advance','tokens','monster','closeBattle'].includes(c.type)?'gold-button':'quiet-button'} disabled={busy} onClick={()=>send(c)}>{commandLabel(p,c)}{c.type==='tokens'&&c.toAttrition&&<small>To attrition: {c.toAttrition.map(id=>`#${id}`).join(', ')}</small>}{c.type==='advance'&&c.targets&&<small>First: {state.enemies.find(e=>e.id===c.targets?.[0])?.color==='red'?"red":"green"} opponents</small>}{c.type==='loot'&&c.discard&&<small>Discard {pretty(card(p,c.discard).name)}</small>}{c.type==='monster'&&c.unequip?.length?<small>{c.unequip.map(id=>pretty(card(p,id).name)).join(', ')}</small>:null}</button>)}
   {!moves.length&&<p className="muted">Waiting for the player or bot making this decision.</p>}
  </div>
  <div className="combat-bot-controls"><button className="quiet-button" onClick={toggleBots}>{auto?"Pause bots":"Automatic bots"}</button><button className="gold-button" disabled={!botReady} onClick={botStep}>Bot move <Icon name="spark" size={13}/></button></div>
  <p className="combat-footnote">Blue hits resolve before wounds. Red hits defend, then attack. Each wound and final healing opportunity resolves separately.</p>
 </div></Modal>;
}
