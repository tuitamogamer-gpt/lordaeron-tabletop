import { useState } from 'react';
import { BASE_PACK as p } from '../data/base';
import { character, card } from '../rules/common';
import type { Command } from '../rules/model';
import { bagSize } from '../rules/inventory';
import type { GameView } from '../rules/view';
import { CardThumbnail, HeroPortrait } from './parts';
import { DiscardPicker } from './EventChoices';
import { fitWorth, itemFit } from './trade';

/**
 * A quest reward is the party's to hand out: each item drawn goes to whichever surviving participant the player names, his own
 * character or the ally beside him (multiplayer/ownership.ts). Beside every name stands what the item is worth to that
 * character, and the one who can wear it now is offered first.
 */
export default function RewardResolution({state,legal,send,inspect,bots=[]}:{state:GameView;legal:Command[];send:(c:Command)=>void;inspect:(id:string)=>void;/** Characters played by the AI: named as such among the recipients. */bots?:string[]}) {
 const r=state.reward!,flow=r.resolution,q=p.quests.find(q=>q.id===r.quest);
 const commands=legal.filter((c):c is Extract<Command,{type:'reward'}>=>c.type==='reward');
 const [choice,setChoice]=useState(r.offered[0]??''),[recipient,setRecipient]=useState(''),[discard,setDiscard]=useState('');
 const selected=r.offered.includes(choice)?choice:r.offered[0];
 const recipients=[...new Set(commands.filter(c=>c.card===selected).map(c=>c.hero))];
 const fits=Object.fromEntries(recipients.map(id=>[id,itemFit(p,state.heroes.find(h=>h.id===id)!,selected)]));
 // Until the player names someone: whoever can make the most of the item, his own character before an AI ally.
 const suggested=[...recipients].sort((a,b)=>fitWorth(fits[b])-fitWorth(fits[a])||Number(bots.includes(a))-Number(bots.includes(b)))[0];
 const to=recipients.includes(recipient)?recipient:suggested;
 const options=commands.filter(c=>c.card===selected&&c.hero===to);
 const command=options.find(c=>(c.discard??'')===discard)??options[0];
 const doneLoot=!r.offered.length&&!r.items.length&&!r.special.length&&!r.extraItems?.length;
 const pendingTalent=state.heroes.some(h=>h.talentChoices.length>0);
 return <section className="reward-resolution" aria-label="Reward resolution">
  {q&&<div className={`reward-quest-banner ${q.faction}`}><span>QUEST COMPLETE</span><h3>{q.name}</h3><small>Level {q.level} · {q.faction}</small></div>}
  <ol className="reward-steps"><li className="done"><b>1</b><span>XP & gold<small>Applied to your party</small></span></li><li className={doneLoot?'done':'current'}><b>2</b><span>Claim rewards<small>{doneLoot?'Resolved':`${r.offered.length} cards to choose from`}</small></span></li>{r.replacement&&<li className={doneLoot?'current':''}><b>3</b><span>Next quest<small>{legal.some(c=>c.type==='skip-quest')?'No quests left to draw':'Choose a difficulty'}</small></span></li>}</ol>
  {legal.some(c=>c.type==='skip-quest')&&<p>The green, yellow and red quest decks for this faction are empty. Your rewards are complete; continue the campaign without drawing another quest.</p>}
  {flow&&<div className="reward-party-receipt">{flow.grants.map(g=><div key={g.hero}><HeroPortrait id={g.hero} small/><span><strong>{character(p,g.hero).name}</strong><small>{flow.receipts.find(v=>v.kind==='xp'&&v.hero===g.hero)?.amount??0} XP · {g.gold} gold{!r.eligible.includes(g.hero)?' · defeated, XP only':''}</small></span></div>)}</div>}
  {r.offered.length>0&&<><div className="reward-choice-heading"><h3>Choose one reward</h3><p>{r.offeredDeck==='special'?'One of the available named rewards.':`One item is kept from this draw${r.offered.length>1?'; the other cards return to their deck':''}.`}{recipients.length>1?' Give it to any character who came through the fight.':''}</p></div><div className="reward-claim-layout"><div className="reward-previews">{r.offered.map(id=><CardThumbnail key={id} card={card(p,id)} selected={id===selected} actionLabel={`Select reward ${card(p,id).name}`} onClick={()=>{setChoice(id);setRecipient('');setDiscard('');}} footer={id===selected?'SELECTED':'Choose this item'}/>)}</div>
   {commands.length>0?<div className="reward-claim-form"><div className="reward-recipients" role="radiogroup" aria-label="Reward recipient"><span>Give to</span>{recipients.map(id=>{const hero=state.heroes.find(h=>h.id===id)!,fit=fits[id];return <button key={id} type="button" role="radio" aria-checked={id===to} className={id===to?'selected':''} onClick={()=>{setRecipient(id);setDiscard('');}}><HeroPortrait id={id} small/><span><strong>{character(p,id).name}{bots.includes(id)&&<i>AI ally</i>}</strong><small className={`item-fit ${fit.fit}`}>{fit.text}</small></span><span className="reward-recipient-state"><b>Level {hero.level}</b>Bag {bagSize(p,hero.bag)} / 3</span></button>;})}</div>{options.some(c=>c.discard)&&<DiscardPicker label="Discard for reward" caption="The bag is full: choose what leaves it" options={options.map(c=>c.discard).filter((id):id is string=>!!id)} value={command?.discard} incoming={selected} none={options.some(c=>!c.discard)?'Keep all items':undefined} onChange={id=>setDiscard(id??'')}/>}<button className="quiet-button" onClick={()=>inspect(selected)}>Read full rules</button><button className="gold-button" disabled={!command} onClick={()=>command&&send(command)}>Give {selected?card(p,selected).name:''} to {to?character(p,to).name.split(' ')[0]:''}</button></div>:<p>{pendingTalent?'Choose the pending level-up talents before claiming items.':'The characters who came through this fight are played by another player or the AI.'}</p>}</div>
  </>}
  {flow&&flow.receipts.some(v=>['item','skip'].includes(v.kind))&&<details className="reward-history"><summary>Resolution history</summary><ol>{flow.receipts.filter(v=>['item','skip'].includes(v.kind)).map((v,i)=><li key={i}>{v.text}</li>)}</ol></details>}
 </section>;
}
