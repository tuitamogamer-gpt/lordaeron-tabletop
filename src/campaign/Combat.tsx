import { CreatureGlyph, creatureRules } from './design-system';
import { useEffect, useState } from 'react';
import { Icon, Modal } from '../components';
import { DEVELOPMENT_PACK as p } from '../data/development-pack';
import { card, character } from '../rules/common';
import { commandLabel } from '../rules/legal';
import type { Command } from '../rules/model';
import type { GameView } from '../rules/view';
import { cardText, factionLabel, HeroPortrait, phaseLabel, pretty } from './parts';
export default function CampaignCombat({state,legal,send,busy}:{state:GameView;legal:Command[];send:(c:Command)=>void;busy:boolean}){
 const b=state.battle!,a=b.active;const[dice,setDice]=useState<number[]>([]),[minimized,setMinimized]=useState(false);
 useEffect(()=>setDice([]),[b.stage,a?.heroId,b.round]);
 const moves=legal.filter(c=>!['travel','rest','train','town','manage','endActions','endManagement'].includes(c.type));
 const skills=moves.filter((c):c is Extract<Command,{type:'ability'}>=>c.type==='ability');
 const choices=moves.filter(c=>c.type!=='ability'&&c.type!=='reroll'&&c.type!=='penalty');
 const enemy=state.enemies.find(e=>b.enemies.includes(e.id));const creature=p.creatures.find(c=>c.id===enemy?.creature);
 const title=b.kind==='final'?'Završni obračun':b.kind==='pvp'?'Horda protiv Alijanse':creature?.name??p.overlords.find(o=>o.id===b.boss)?.name??'Borba';
 if(minimized)return <button className="combat-reopen gold-button" onClick={()=>setMinimized(false)}><Icon name="swords"/>Vrati se u borbu · runda {b.round}</button>;
 const usable=(type:Command['type'])=>moves.some(c=>c.type===type);
 return <Modal title={title} wide onClose={()=>setMinimized(true)}><div className="v2-combat">
  <div className="combat-stage"><span className="eyebrow">RUNDA {b.round}</span><h3>{phaseLabel[b.stage]}</h3><span>{a?character(p,a.heroId).name:b.winner?factionLabel(b.winner):`${b.participants.length} učesnika`}</span></div>
  <div className="combat-progress">{['attacker','pool','reroll','tokens','defense','resolution'].map((stage,i)=><span className={b.stage===stage?'active':''} key={stage}>{i+1}<small>{phaseLabel[stage]}</small></span>)}</div>
  <div className="combat-members">{b.participants.map(id=>{const h=state.heroes.find(h=>h.id===id)!;return <div key={id} className={`${a?.heroId===id?'active':''} ${b.defeated.includes(id)?'defeated':''}`}><HeroPortrait id={id} small/><div><strong>{character(p,id).name.split(' ')[0]}</strong><span><Icon name="heart" size={12}/>{h.health} <Icon name="bolt" size={12}/>{h.energy}{h.curse>0?` · Curse ${h.curse}`:''}{h.stun>0?` · Stun ${h.stun}`:''}</span></div></div>;})}</div>
  {creature&&<div className="creature-rule"><CreatureGlyph type={creature.rule} name={creature.name}/><div><strong>{creature.name} · {b.enemies.length} u grupi</strong><p>{creatureRules[creature.rule]}</p></div>{enemy&&<div className="creature-stats"><span>Prijetnja <b>{creature.stats[enemy.color].threat}+</b></span><span>Napad <b>{creature.stats[enemy.color].attack}</b></span><span>Zdravlje <b>{creature.stats[enemy.color].health}</b></span></div>}</div>}
  {a&&<><div className="dice-caption"><span>{a.dice.some(d=>d.value)?'Rezultati kockica':'Priprema kockica'} · {a.dice.filter(d=>!d.removed).length} / 21</span><span>Reroll {Math.max(0,a.reroll)} · Attrition {Math.max(0,a.attrition)}</span></div><div className="v2-dice">{a.dice.map(d=><button key={d.id} aria-label={`${d.color} ${d.value||'pripremljena'}${d.removed?' uklonjena':''}`} className={`v2-die ${d.color} ${dice.includes(d.id)?'selected':''} ${d.removed?'removed':''} ${d.rerolled?'rerolled':''}`} disabled={d.removed||busy} onClick={()=>setDice(v=>v.includes(d.id)?v.filter(id=>id!==d.id):[...v,d.id])}>{d.value||<Icon name="plus"/>}{d.spotted&&<i>✦</i>}</button>)}{!a.dice.length&&<p>Aktiviraj opremu i moći ispod da pripremiš kockice.</p>}</div></>}
  <div className="combat-boxes">{(['horde','alliance'] as const).filter(f=>b.kind!=='pve'||f===b.first).map(f=><div key={f} className={f}><span>{factionLabel(f)}</span><div><b>{b.boxes[f].damage}<small>DALJINSKI</small></b><b>{b.boxes[f].defense}<small>BLISKI</small></b><b>{b.boxes[f].armor}<small>OKLOP</small></b><b>{b.boxes[f].attrition}<small>ATTRITION</small></b>{b.wounds[f]>0&&<b className="pending-wounds">{b.wounds[f]}<small>RANE</small></b>}</div></div>)}</div>
  {state.respawns.length>0&&<p className="combat-warning">Junak je na nula zdravlja. Iskoristi dostupno liječenje ili odaberi povratak u početnu regiju / groblje.</p>}
  {skills.length>0&&<div className="combat-skill-list">{skills.map((c,i)=><button key={`${c.card}-${c.ability}-${i}`} disabled={busy} onClick={()=>send(c)}><Icon name={card(p,c.card).type==='armor'?'shield':card(p,c.card).type==='melee'?'sword':'spark'}/><span><strong>{pretty(card(p,c.card).name)}</strong><small>{cardText(card(p,c.card))}{c.args?.target?` → ${(p.characters.find(h=>h.id===c.args?.target)?.name??p.cards.find(v=>v.id===c.args?.target)?.name??c.args.target).split(' ')[0]}`:''}</small></span><b>{card(p,c.card).type==='active'?0:card(p,c.card).energy}<Icon name="bolt" size={12}/></b></button>)}</div>}
  <div className="combat-choices">
   {usable('reroll')&&<button className="gold-button" disabled={!dice.length||busy} onClick={()=>send({type:'reroll',dice})}>Ponovi {dice.length} kockice <Icon name="reset"/></button>}
   {usable('penalty')&&<button className="gold-button" disabled={!dice.length&&a!.dice.filter(d=>!d.removed).length>0||busy} onClick={()=>send({type:'penalty',dice})}>Ukloni odabrane kockice</button>}
   {choices.map((c,i)=><button key={i} className={['roll','advance','tokens','monster','closeBattle'].includes(c.type)?'gold-button':'quiet-button'} disabled={busy} onClick={()=>send(c)}>{commandLabel(p,c)}{c.type==='advance'&&c.targets&&<small>Prvo {state.enemies.find(e=>e.id===c.targets?.[0])?.color==='red'?'crveni':'zeleni'} protivnici</small>}{c.type==='loot'&&c.discard&&<small>Odbaci {pretty(card(p,c.discard).name)}</small>}{c.type==='monster'&&c.unequip?.length?<small>{c.unequip.map(id=>pretty(card(p,id).name)).join(', ')}</small>:null}</button>)}
   {!moves.length&&<p className="muted">Čekamo igrača ili AI bota koji sada odlučuje.</p>}
  </div>
  <p className="combat-footnote">Plavi pogoci djeluju prije rana. Crveni prvo brane, zatim napadaju. Svaka rana i posljednja prilika za liječenje obrađuju se zasebno.</p>
 </div></Modal>;
}
