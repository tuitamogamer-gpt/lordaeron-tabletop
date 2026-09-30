import { GameIcon } from './GameIcon';
import { useState } from 'react';
import { BASE_PACK as p } from '../data/base';
import { character } from '../rules/common';
import { classDeck, equipped } from '../rules/inventory';
import type { Card, Command, Hero } from '../rules/model';
import { GameCard } from './parts';
import { cardEnergyText } from './card-energy';

export function energyLabel(c:Card):string {
 if(c.kind==='talent')return 'Permanent talent';
 if(c.type==='active')return `${c.energy} energy to equip · constant benefit`;
 if(c.type==='instant')return `${cardEnergyText(c)} per use`;
 return c.energy?`${c.energy} energy to use`:'No energy cost';
}
export default function ClassDeck({hero:h,inspect,legal=[],onLearn,send,selected=[],toggle}:{hero:Hero;inspect:(id:string)=>void;legal?:Command[];onLearn?:()=>void;send?:(c:Command)=>void;selected?:string[];toggle?:(id:string)=>void}){
 const [tab,setTab]=useState<'powers'|'talents'>('powers'),[level,setLevel]=useState(0);
 const cls=character(p,h.id).classId,deck=classDeck(p,h),active=equipped(p,h);
 const cards=p.cards.filter(c=>c.classId===cls&&!c.printed&&c.kind===(tab==='powers'?'power':'talent')).sort((a,b)=>a.level-b.level||a.name.localeCompare(b.name));
 const total=selected.reduce((n,id)=>n+p.cards.find(c=>c.id===id)!.price,0),canTrain=legal.some(c=>c.type==='train'&&c.hero===h.id);
 return <section className="class-deck" aria-label={`${cls} class deck`}>
  <div className="class-deck-heading"><div><span className="sheet-eyebrow">CLASS DECK · 24 CARDS</span><h3>{cls} arts & talents</h3></div><span className="deck-purse"><GameIcon name="gold"/>{h.gold}<small>gold available</small></span></div>
  <div className="class-deck-piles" aria-label="Class deck piles">{(['powers','talents'] as const).map(kind=><button key={kind} aria-pressed={tab===kind} onClick={()=>{setTab(kind);setLevel(0);}}><span className={`class-deck-back ${kind}`} aria-hidden="true"><GameIcon name={kind==='powers'?'train':'experience'} size={36}/></span><span><strong>{kind==='powers'?'Power deck':'Talent deck'}</strong><small>{deck[kind].length} in deck · {kind==='powers'?h.learned.length:h.talents.length} {kind==='powers'?'learned':'chosen'}</small><em>{kind==='powers'?'Purchase with a Train or Town action':'Choose for free when you gain a level'}</em></span><b>{deck[kind].length}</b></button>)}</div>
  <p className="sheet-help">{tab==='powers'?'Browse your class deck freely. Buy one or more eligible powers in a single action. Purchased powers go into your spellbook; equip them during Character Management.':'Gain one permanent talent at levels 2, 3, 4 and 5. Choose a card at or below the level you just gained. Talents cost no gold and do not occupy equipment slots.'}</p>
  <div className="class-deck-toolbar"><nav aria-label="Filter cards by level">{[0,1,2,3,4,5].map(n=><button key={n} aria-pressed={level===n} onClick={()=>setLevel(n)}>{n?`Level ${n}`:'All levels'}</button>)}</nav>{!toggle&&tab==='powers'&&onLearn&&<button className="gold-button" disabled={!canTrain} onClick={onLearn}>Train powers · 1 action</button>}</div>
  <div className="class-deck-cards">{cards.filter(c=>!level||c.level===level).map(c=>{
   const owned=(c.kind==='power'?h.learned:h.talents).includes(c.id),chosen=selected.includes(c.id),cost=total+(chosen?0:c.price),talent=legal.find(a=>a.type==='talent'&&a.hero===h.id&&a.card===c.id);
   const locked=c.level>(c.kind==='talent'?(h.talentChoices[0]??h.level):h.level),state=active.includes(c.id)?'Equipped':owned?(c.kind==='power'?'In spellbook':'Chosen talent'):locked?`Requires level ${c.level}`:'In class deck';
   return <div className={`deck-card-entry ${owned?'owned':''} ${chosen?'selected':''}`} key={c.id}><span className="deck-card-state">{state}<span>{c.type==='active'?'Active · constant':c.kind==='talent'?'Talent':c.type}</span></span><GameCard card={c} onClick={()=>inspect(c.id)} selected={chosen} footer={c.kind==='talent'?'Free on level up':`${c.price} gold`}/><div className="deck-card-action"><span>{energyLabel(c)}</span>{toggle&&tab==='powers'&&<button className={chosen?'gold-button':'quiet-button'} aria-pressed={chosen} disabled={owned||locked||(!chosen&&cost>h.gold)} onClick={()=>toggle(c.id)}>{owned?'Already learned':chosen?'Remove from training':locked?'Level too low':cost>h.gold?'Not enough gold':'Add to training'}</button>}{c.kind==='talent'&&send&&h.talentChoices.length>0&&<button className="gold-button" disabled={!talent} onClick={()=>talent&&send(talent)}>Choose talent</button>}</div></div>;
  })}</div>
 </section>;
}
