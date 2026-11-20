import { useState } from 'react';
import { Icon } from '../components';
import { BASE_PACK as p } from '../data/base';
import { capacity, card, character, faction } from '../rules/common';
import { bagSize, townOperations } from '../rules/inventory';
import type { Command, Hero, TownOperation } from '../rules/model';
import { CardThumbnail, HeroPortrait, pretty } from './parts';
import { byTouch } from './pointer';
import { DiscardPicker } from './EventChoices';
import { GameIcon } from './GameIcon';
import { itemFit } from './trade';

type Submit = (c: Command) => void;

export function TownEditor({hero,merchant,send,busy}:{hero:Hero;merchant:string[];send:Submit;busy:boolean}) {
 const [operations,setOperations]=useState<TownOperation[]>([]),[health,setHealth]=useState(Math.max(0,Math.min(hero.level,capacity(p,hero).health-hero.health))),[recoverAfter,setRecoverAfter]=useState(0),[error,setError]=useState('');
 const [shelf,setShelf]=useState<'buy'|'sell'|'train'>(merchant.length?'buy':'train'),[discards,setDiscards]=useState<Record<string,string>>({}),[page,setPage]=useState(0);
 const preview=structuredClone(hero), market={merchant:[...merchant]};
 const beforeRecovery=structuredClone(hero);try{townOperations(p,{merchant:[...merchant]},beforeRecovery,0,operations.slice(0,Math.max(0,recoverAfter)),-1);}catch{/* The complete preview below reports transaction errors. */}
 const maxRecovery=Math.max(0,Math.min(hero.level,capacity(p,beforeRecovery).health-beforeRecovery.health)),recoveryHealth=recoverAfter<0?0:Math.min(health,maxRecovery);
 let invalid='';try{townOperations(p,market,preview,recoveryHealth,operations,recoverAfter);}catch(e){invalid=(e as Error).message;}
 const add=(op:TownOperation)=>{try{townOperations(p,{merchant:[...merchant]},structuredClone(hero),recoveryHealth,[...operations,op],recoverAfter);setOperations(v=>[...v,op]);setError('');}catch(e){setError((e as Error).message);}};
 const selling=[...preview.bag,...preview.slots.flatMap(s=>[s.card,...s.addons].filter((id):id is string=>!!id))].filter(id=>card(p,id).kind==='item'&&!card(p,id).soulbound);
 const training=p.cards.filter(c=>c.kind==='power'&&!c.printed&&c.classId===character(p,hero.id).classId&&!preview.learned.includes(c.id)&&c.level<=hero.level);
 const count=shelf==='buy'?market.merchant.length:shelf==='sell'?selling.length:training.length,pages=Math.max(1,Math.ceil(count/6)),visiblePage=Math.min(page,pages-1);
 return <div className="dialog-content compact-town town-flow"><p>Sell, buy and learn powers with one Town action. {byTouch()?'Tap':'Hover or focus'} a card for its rules.</p>
  <div className="town-preparation">
   <label className="town-recovery-order">Recovery order<select aria-label="Recovery order" disabled={busy} value={recoverAfter} onChange={e=>{setRecoverAfter(Number(e.target.value));setError('');}}><option value={-1}>Skip recovery</option><option value={0}>Before transactions</option>{operations.map((_,i)=><option key={i} value={i+1}>After transaction {i+1}</option>)}</select></label>
   {recoverAfter>=0&&<label className="rest-slider"><span>Health recovery: {recoveryHealth} / {hero.level}<small>Remaining points restore energy</small></span><input aria-label="Health recovery" disabled={busy} type="range" min={0} max={maxRecovery} value={recoveryHealth} onChange={e=>{setHealth(Number(e.target.value));setError('');}}/></label>}
   <div className="transaction-summary" aria-live="polite"><strong><Icon name="coins" size={15}/>{preview.gold} gold after the transaction</strong><span>Bag {bagSize(p,preview.bag)} / 3 · Health {preview.health} · Energy {preview.energy}</span></div>
  </div>
  <div className="town-shelf-heading"><nav className="town-shelves" aria-label="Town services">{(['buy','sell','train'] as const).map(id=><button key={id} className="quiet-button" aria-pressed={shelf===id} onClick={()=>{setShelf(id);setPage(0);setError('');}}>{id==='buy'?'Buy items':id==='sell'?'Sell items':'Learn powers'}</button>)}</nav><span className="town-results" aria-live="polite">{count} {shelf==='train'?'powers':'items'} available</span></div>
  <div className="town-card-grid">
   {shelf==='buy'&&market.merchant.slice(visiblePage*6,(visiblePage+1)*6).map(id=>{const c=card(p,id),overflow=bagSize(p,[...preview.bag,id])>3,options=overflow?[...preview.bag,id].filter(v=>!card(p,v).bagExempt):[],discard=options.includes(discards[id])?discards[id]:options[0];return <div className="town-card-entry" key={id}><CardThumbnail card={c} footer={`${c.price} gold`}/>{overflow&&<DiscardPicker label={`Discard to buy ${c.name}`} caption="Bag full · discard" options={options} value={discard} incoming={id} disabled={busy} onChange={d=>d&&setDiscards(v=>({...v,[id]:d}))}/>}<button className="quiet-button" disabled={busy||preview.gold<c.price} onClick={()=>add({op:'buy',card:id,discard})}>Add purchase · {c.price} gold</button></div>;})}
   {shelf==='sell'&&(selling.length?selling.slice(visiblePage*6,(visiblePage+1)*6).map(id=><CardThumbnail key={id} card={card(p,id)} disabled={busy} actionLabel={`Sell ${pretty(card(p,id).name)}`} onClick={()=>add({op:'sell',card:id})} footer={`Sell · +${Math.ceil(card(p,id).price/2)} gold`}/>):<p className="town-empty-shelf"><Icon name="layers" size={25}/><strong>No items to sell.</strong><span>Soulbound equipment stays with your hero.</span></p>)}
   {shelf==='train'&&training.slice(visiblePage*6,(visiblePage+1)*6).map(c=><CardThumbnail key={c.id} card={c} disabled={busy||preview.gold<c.price} actionLabel={`Learn ${pretty(c.name)}`} onClick={()=>add({op:'train',card:c.id})} footer={`Add training · ${c.price} gold`}/>)}
   {shelf==='buy'&&!count&&<p className="town-empty-shelf"><Icon name="layers" size={25}/><strong>The merchant’s shelf is empty</strong><span>Sell an item or learn a new power.</span></p>}
   {shelf==='train'&&!count&&<p className="town-empty-shelf"><Icon name="check" size={25}/><strong>You’ve learned every available power</strong><span>More powers unlock as you gain levels.</span></p>}
  </div>
  {pages>1&&<nav className="loadout-pagination" aria-label="Town card pages"><button className="quiet-button" disabled={!visiblePage} onClick={()=>setPage(visiblePage-1)}>Previous</button><span>{visiblePage+1} / {pages}</span><button className="quiet-button" disabled={visiblePage+1===pages} onClick={()=>setPage(visiblePage+1)}>Next</button></nav>}
  <footer className="town-transaction-footer"><div className="transaction-receipt" aria-live="polite">{operations.length?<details className="transaction-review"><summary>Review {operations.length} staged {operations.length===1?'transaction':'transactions'} · last: {pretty(card(p,operations.at(-1)!.card).name)}</summary><ol>{operations.map((op,i)=><li key={i}>{op.op==='buy'?'Buy':op.op==='sell'?'Sell':'Learn'}: {pretty(card(p,op.card).name)}{op.op==='buy'&&op.discard&&<small> · discard {pretty(card(p,op.discard).name)}</small>}</li>)}</ol></details>:'No transactions staged'}</div>
  {(error||invalid)&&<p role="status" className="combat-warning">{error||invalid}</p>}
  <div className="settings-buttons"><button className="quiet-button" disabled={!operations.length||busy} onClick={()=>{setRecoverAfter(v=>Math.min(v,operations.length-1));setOperations(v=>v.slice(0,-1));setError('');}}>Remove last entry</button><button className="gold-button" disabled={!!invalid||busy} onClick={()=>send({type:'town',hero:hero.id,health:recoveryHealth,operations,...recoverAfter!==0?{recoverAfter}:{}})}>Confirm · {operations.length} {operations.length===1?'transaction':'transactions'} · 1 action</button></div></footer>
 </div>;
}

export { default as EquipmentEditor } from './EquipmentEditor';

/**
 * Trading between allies standing in the same region: free, after an action (rulebook p. 36). Each bag lies open as cards; a
 * card is pressed to hand it over, and under it stands what it is worth to the one who would receive it. Nothing changes hands
 * before the button at the bottom.
 */
export function TradeEditor({hero,heroes,send,busy,bots=[]}:{hero:Hero;heroes:Hero[];send:Submit;busy:boolean;/** Characters played by the AI: named as such among the partners. */bots?:string[]}) {
 const others=heroes.filter(h=>h.id!==hero.id&&h.location===hero.location&&faction(p,h.id)===faction(p,hero.id));
 const [to,setTo]=useState(others[0]?.id??''),[items,setItems]=useState<string[]>([]),[receiveItems,setReceiveItems]=useState<string[]>([]),[gold,setGold]=useState(0),[receiveGold,setReceiveGold]=useState(0);
 const partner=others.find(h=>h.id===to);
 if(!partner)return <p className="dialog-content">No allies in this region.</p>;
 const first=(h:Hero)=>character(p,h.id).name.split(' ')[0];
 const fromBag=bagSize(p,[...hero.bag.filter(id=>!items.includes(id)),...receiveItems]),toBag=bagSize(p,[...partner.bag.filter(id=>!receiveItems.includes(id)),...items]);
 const sides=[{h:hero,receiver:partner,ids:items,set:setItems,g:gold,setG:setGold,label:'You give',verb:'Give',done:'Giving',bag:fromBag},{h:partner,receiver:hero,ids:receiveItems,set:setReceiveItems,g:receiveGold,setG:setReceiveGold,label:'Ally gives',verb:'Take',done:'Taking',bag:toBag}];
 const moving=items.length+receiveItems.length+gold+receiveGold,full=fromBag>3||toBag>3;
 const summary=(ids:string[],g:number)=>[ids.length?`${ids.length} ${ids.length===1?'item':'items'}`:'',g?`${g} gold`:''].filter(Boolean).join(' and ');
 return <div className="dialog-content trade-flow trade-table"><div className="trade-intro"><p>Trading is free after an action, between allies in the same region. Press a card to hand it over; items you wear change hands once they are back in the bag.</p>
   <div className="trade-partners" role="radiogroup" aria-label="Trade ally">{others.map(h=><button key={h.id} type="button" role="radio" aria-checked={h.id===to} className={h.id===to?'selected':''} disabled={busy} onClick={()=>{if(h.id===to)return;setTo(h.id);setReceiveItems([]);setReceiveGold(0);}}><HeroPortrait id={h.id} small/><span><strong>{character(p,h.id).name}</strong><small>{bots.includes(h.id)?'AI ally':'Ally'} · bag {bagSize(p,h.bag)} / 3 · {h.gold} gold</small></span></button>)}</div></div>
  <div className="transaction-columns">{sides.map(side=>{
   const available=side.h.bag.filter(id=>!card(p,id).soulbound),kept=side.h.bag.length-available.length;
   return <section className="trade-side" key={side.label} aria-label={`${side.label}: ${character(p,side.h.id).name}`}><header><HeroPortrait id={side.h.id} small/><div><span className="sheet-eyebrow">{side.label}</span><h3>{character(p,side.h.id).name}</h3></div><span className={`trade-bag ${side.bag>3?'over':''}`}>Bag after <b>{side.bag}</b> / 3</span></header>
    <div className="trade-cards" role="group" aria-label={`${side.label}: items`}>{available.map(id=>{const c=card(p,id),on=side.ids.includes(id),fit=itemFit(p,side.receiver,id);return <div className={`trade-card ${on?'offered':''}`} key={id}>
      <CardThumbnail card={c} selected={on} pressed={on} disabled={busy} actionLabel={`${side.label}: ${pretty(c.name)}`} onClick={()=>side.set(v=>on?v.filter(a=>a!==id):[...v,id])} footer={on?side.done:`${side.verb} this item`}/>
      <strong>{pretty(c.name)}</strong><small className={`item-fit ${fit.fit}`}>{first(side.receiver)}: {fit.text}</small>{c.bagExempt&&<small>Takes no bag space</small>}
     </div>;})}{!available.length&&<p className="trade-empty"><Icon name="layers" size={24}/><span>No item in this bag can change hands.</span></p>}</div>
    {kept>0&&<p className="trade-kept">{kept} soulbound {kept===1?'item stays':'items stay'} with {first(side.h)}.</p>}
    <div className="trade-gold"><GameIcon name="gold" size={22}/><span>Gold<small>{side.h.gold} available</small></span><span className="auction-stepper"><button type="button" aria-label={`${side.label}: less gold`} disabled={busy||side.g<=0} onClick={()=>side.setG(side.g-1)}>−</button><input aria-label={`${side.label}: gold`} disabled={busy} type="number" min={0} max={side.h.gold} value={side.g} onChange={e=>side.setG(Math.max(0,Math.min(side.h.gold,Math.round(Number(e.target.value))||0)))}/><button type="button" aria-label={`${side.label}: more gold`} disabled={busy||side.g>=side.h.gold} onClick={()=>side.setG(side.g+1)}>+</button></span></div>
   </section>;
  })}</div>
  <footer className="trade-footer"><div className="trade-outcome" aria-live="polite"><span><strong>{first(hero)} gives {summary(items,gold)||'nothing'}</strong><small>Bag {fromBag} / 3 · {hero.gold} → {hero.gold-gold+receiveGold} gold</small></span><Icon name="arrow" size={18}/><span><strong>{first(partner)} gives {summary(receiveItems,receiveGold)||'nothing'}</strong><small>Bag {toBag} / 3 · {partner.gold} → {partner.gold-receiveGold+gold} gold</small></span></div>{full&&<p className="trade-warning" role="status">A bag holds three items: {fromBag>3?first(hero):first(partner)} must hand one over or take one less.</p>}<button className="gold-button" disabled={busy||full||!moving} onClick={()=>send({type:'trade',hero:hero.id,to,items,receiveItems,gold,receiveGold})}>{moving?`Trade with ${first(partner)}`:'Choose what changes hands'}</button></footer>
 </div>;
}

/** Sealed bids: each bidder sees only their own gold and amount; submitted bids stay hidden. */
export function AuctionChoices({heroes,submitted=[],send,busy}:{heroes:Hero[];submitted?:string[];send:Submit;busy:boolean}) {
 const [bids,setBids]=useState<Record<string,number>>({});
 const set=(h:Hero,value:number)=>setBids(v=>({...v,[h.id]:Math.max(0,Math.min(h.gold,Math.round(value)||0))}));
 return <div className="auction-choices">
  {heroes.map(h=>{const name=character(p,h.id).name,bid=bids[h.id]??0;return <form key={h.id} className={`auction-bidder ${faction(p,h.id)}`} onSubmit={e=>{e.preventDefault();send({type:'bid',hero:h.id,amount:bid});}}>
   <HeroPortrait id={h.id} small/>
   <span className="auction-bidder-name"><strong title={name}>{name.split(' ')[0]}</strong><small>{h.gold} gold available</small></span>
   <span className="auction-stepper"><button type="button" aria-label={`Lower bid: ${name}`} disabled={busy||bid<=0} onClick={()=>set(h,bid-1)}>−</button><input aria-label={`Bid: ${name}`} type="number" min={0} max={h.gold} value={bid} onChange={e=>set(h,Number(e.target.value))}/><button type="button" aria-label={`Raise bid: ${name}`} disabled={busy||bid>=h.gold} onClick={()=>set(h,bid+1)}>+</button></span>
   <button className="gold-button" disabled={busy}>Seal bid</button>
  </form>;})}
  {submitted.map(id=><div key={id} className={`auction-bidder sealed ${faction(p,id)}`}><HeroPortrait id={id} small/><span className="auction-bidder-name"><strong>{character(p,id).name}</strong><small>Bid sealed</small></span><Icon name="lock" size={16}/></div>)}
 </div>;
}
