import { useState } from 'react';
import { BASE_PACK as p } from '../data/base';
import { character, card } from '../rules/common';
import type { Command } from '../rules/model';
import type { GameView } from '../rules/view';
import { CardThumbnail, HeroPortrait } from './parts';

export default function RewardResolution({state,legal,send,inspect}:{state:GameView;legal:Command[];send:(c:Command)=>void;inspect:(id:string)=>void}) {
 const r=state.reward!,flow=r.resolution,q=p.quests.find(q=>q.id===r.quest);
 const commands=legal.filter((c):c is Extract<Command,{type:'reward'}>=>c.type==='reward');
 const [choice,setChoice]=useState(r.offered[0]??''),[recipient,setRecipient]=useState(commands[0]?.hero??''),[discard,setDiscard]=useState('');
 const selected=r.offered.includes(choice)?choice:r.offered[0];
 const recipients=[...new Set(commands.filter(c=>c.card===selected).map(c=>c.hero))];
 const to=recipients.includes(recipient)?recipient:recipients[0];
 const options=commands.filter(c=>c.card===selected&&c.hero===to);
 const command=options.find(c=>(c.discard??'')===discard)??options[0];
 const doneLoot=!r.offered.length&&!r.items.length&&!r.special.length&&!r.extraItems?.length;
 const pendingTalent=state.heroes.some(h=>h.talentChoices.length>0);
 return <section className="reward-resolution" aria-label="Reward resolution">
  {q&&<div className={`reward-quest-banner ${q.faction}`}><span>QUEST COMPLETE</span><h3>{q.name}</h3><small>Level {q.level} · {q.faction}</small></div>}
  <ol className="reward-steps"><li className="done"><b>1</b><span>XP & gold<small>Applied to your party</small></span></li><li className={doneLoot?'done':'current'}><b>2</b><span>Claim rewards<small>{doneLoot?'Resolved':`${r.offered.length} cards to choose from`}</small></span></li>{r.replacement&&<li className={doneLoot?'current':''}><b>3</b><span>Next quest<small>Choose a difficulty</small></span></li>}</ol>
  {flow&&<div className="reward-party-receipt">{flow.grants.map(g=><div key={g.hero}><HeroPortrait id={g.hero} small/><span><strong>{character(p,g.hero).name}</strong><small>{flow.receipts.find(v=>v.kind==='xp'&&v.hero===g.hero)?.amount??0} XP · {g.gold} gold{!r.eligible.includes(g.hero)?' · defeated, XP only':''}</small></span></div>)}</div>}
  {r.offered.length>0&&<><div className="reward-choice-heading"><h3>Choose one reward</h3><p>{r.offeredDeck==='special'?'One of the available named rewards.':`One item is kept from this draw${r.offered.length>1?'; the other cards return to their deck':''}.`}</p></div><div className="reward-previews">{r.offered.map(id=><CardThumbnail key={id} card={card(p,id)} selected={id===selected} actionLabel={`Select reward ${card(p,id).name}`} onClick={()=>{setChoice(id);setDiscard('');}} footer={id===selected?'SELECTED':'Choose this item'}/>)}</div>
   {commands.length>0?<div className="reward-claim-form"><label>Give to<select aria-label="Reward recipient" value={to} onChange={e=>{setRecipient(e.target.value);setDiscard('');}}>{recipients.map(id=><option key={id} value={id}>{character(p,id).name}</option>)}</select></label>{options.some(c=>c.discard)&&<label>Make room in the bag<select aria-label="Discard for reward" value={command?.discard??''} onChange={e=>setDiscard(e.target.value)}>{options.map((c,i)=><option key={i} value={c.discard??''}>{c.discard?`Discard ${card(p,c.discard).name}`:'Keep all items'}</option>)}</select></label>}<button className="quiet-button" onClick={()=>inspect(selected)}>Read full rules</button><button className="gold-button" disabled={!command} onClick={()=>command&&send(command)}>Claim {selected?card(p,selected).name:''}</button></div>:<p>{pendingTalent?'Choose the pending level-up talents before claiming items.':'The eligible recipient is controlled by another player or AI.'}</p>}
  </>}
  {flow&&flow.receipts.some(v=>['item','skip'].includes(v.kind))&&<details className="reward-history"><summary>Resolution history</summary><ol>{flow.receipts.filter(v=>['item','skip'].includes(v.kind)).map((v,i)=><li key={i}>{v.text}</li>)}</ol></details>}
 </section>;
}
