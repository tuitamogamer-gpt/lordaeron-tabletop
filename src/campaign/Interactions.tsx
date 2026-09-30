import { useState } from 'react';
import { BASE_PACK as p } from '../data/base';
import { capacity, card, character, faction } from '../rules/common';
import { bagSize, townOperations } from '../rules/inventory';
import type { Command, Hero, TownOperation } from '../rules/model';
import { CardThumbnail, pretty } from './parts';

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
 return <div className="dialog-content compact-town"><p>Sell, buy and learn powers with one Town action. Hover a card for its rules.</p>
  <label className="town-recovery-order">Recovery order<select aria-label="Recovery order" value={recoverAfter} onChange={e=>setRecoverAfter(Number(e.target.value))}><option value={-1}>Skip recovery</option><option value={0}>Before transactions</option>{operations.map((_,i)=><option key={i} value={i+1}>After transaction {i+1}</option>)}</select></label>
  {recoverAfter>=0&&<label className="rest-slider">Health recovery: {recoveryHealth} / {hero.level} · Remaining points restore energy<input type="range" min={0} max={maxRecovery} value={recoveryHealth} onChange={e=>setHealth(Number(e.target.value))}/></label>}
  <div className="transaction-summary"><strong>{preview.gold} gold after the transaction</strong><span>Bag {bagSize(p,preview.bag)} / 3</span></div>
  <nav className="town-shelves" aria-label="Town services">{(['buy','sell','train'] as const).map(id=><button key={id} className="quiet-button" aria-pressed={shelf===id} onClick={()=>{setShelf(id);setPage(0);}}>{id==='buy'?'Buy items':id==='sell'?'Sell items':'Learn powers'}</button>)}</nav>
  <div className="town-card-grid">
   {shelf==='buy'&&market.merchant.slice(visiblePage*6,(visiblePage+1)*6).map(id=>{const c=card(p,id),overflow=bagSize(p,[...preview.bag,id])>3,options=overflow?[...preview.bag,id].filter(v=>!card(p,v).bagExempt):[],discard=options.includes(discards[id])?discards[id]:options[0];return <div className="town-card-entry" key={id}><CardThumbnail card={c} footer={`${c.price} gold`}/>{overflow&&<select aria-label={`Discard to buy ${c.name}`} value={discard} onChange={e=>setDiscards(v=>({...v,[id]:e.target.value}))}>{options.map(d=><option key={d} value={d}>Discard {pretty(card(p,d).name)}</option>)}</select>}<button className="quiet-button" disabled={busy||preview.gold<c.price} onClick={()=>add({op:'buy',card:id,discard})}>Add purchase</button></div>;})}
   {shelf==='sell'&&(selling.length?selling.slice(visiblePage*6,(visiblePage+1)*6).map(id=><CardThumbnail key={id} card={card(p,id)} disabled={busy} actionLabel={`Sell ${pretty(card(p,id).name)}`} onClick={()=>add({op:'sell',card:id})} footer={`Sell · +${Math.ceil(card(p,id).price/2)} gold`}/>):<p>No items to sell.</p>)}
   {shelf==='train'&&training.slice(visiblePage*6,(visiblePage+1)*6).map(c=><CardThumbnail key={c.id} card={c} disabled={busy||preview.gold<c.price} actionLabel={`Learn ${pretty(c.name)}`} onClick={()=>add({op:'train',card:c.id})} footer={`Add training · ${c.price} gold`}/>)}
  </div>
  {pages>1&&<nav className="loadout-pagination" aria-label="Town card pages"><button className="quiet-button" disabled={!visiblePage} onClick={()=>setPage(visiblePage-1)}>Previous</button><span>{visiblePage+1} / {pages}</span><button className="quiet-button" disabled={visiblePage+1===pages} onClick={()=>setPage(visiblePage+1)}>Next</button></nav>}
  <div className="transaction-receipt" aria-live="polite">{operations.length?<details className="transaction-review"><summary>Review {operations.length} staged transactions · last: {pretty(card(p,operations.at(-1)!.card).name)}</summary><ol>{operations.map((op,i)=><li key={i}>{op.op==='buy'?'Buy':op.op==='sell'?'Sell':'Learn'}: {pretty(card(p,op.card).name)}</li>)}</ol></details>:'No transactions staged'}</div>
  {(error||invalid)&&<p role="status" className="combat-warning">{error||invalid}</p>}
  <div className="settings-buttons"><button className="quiet-button" disabled={!operations.length||busy} onClick={()=>{setRecoverAfter(v=>Math.min(v,operations.length-1));setOperations(v=>v.slice(0,-1));setError('');}}>Remove last entry</button><button className="gold-button" disabled={!!invalid||busy} onClick={()=>send({type:'town',hero:hero.id,health:recoveryHealth,operations,...recoverAfter!==0?{recoverAfter}:{}})}>Confirm · {operations.length} transactions · 1 action</button></div>
 </div>;
}

export { default as EquipmentEditor } from './EquipmentEditor';

export function TradeEditor({hero,heroes,send,busy}:{hero:Hero;heroes:Hero[];send:Submit;busy:boolean}) {
 const others=heroes.filter(h=>h.id!==hero.id&&h.location===hero.location&&faction(p,h.id)===faction(p,hero.id));
 const [to,setTo]=useState(others[0]?.id??''),[items,setItems]=useState<string[]>([]),[receiveItems,setReceiveItems]=useState<string[]>([]),[gold,setGold]=useState(0),[receiveGold,setReceiveGold]=useState(0);
 const partner=others.find(h=>h.id===to);
 if(!partner)return <p className="dialog-content">No allies in this region.</p>;
 const fromBag=bagSize(p,[...hero.bag.filter(id=>!items.includes(id)),...receiveItems]),toBag=bagSize(p,[...partner.bag.filter(id=>!receiveItems.includes(id)),...items]);
 return <div className="dialog-content"><p>Trading is free after an action, between allies in the same region.</p><label>Ally <select value={to} onChange={e=>{setTo(e.target.value);setReceiveItems([]);setReceiveGold(0);}}>{others.map(h=><option key={h.id} value={h.id}>{character(p,h.id).name}</option>)}</select></label><div className="transaction-columns">{[{h:hero,ids:items,set:setItems,g:gold,setG:setGold,label:"You give"},{h:partner,ids:receiveItems,set:setReceiveItems,g:receiveGold,setG:setReceiveGold,label:"Ally gives"}].map(side=><section key={side.label}><h3>{side.label}</h3><label>Gold (max {side.h.gold})<input aria-label={`${side.label}: gold`} type="number" min={0} max={side.h.gold} value={side.g} onChange={e=>side.setG(Math.max(0,Math.min(side.h.gold,Number(e.target.value)||0)))}/></label>{side.h.bag.filter(id=>!card(p,id).soulbound).map(id=><label className="addon-choice" key={id}><input type="checkbox" checked={side.ids.includes(id)} onChange={e=>side.set(v=>e.target.checked?[...v,id]:v.filter(a=>a!==id))}/>{pretty(card(p,id).name)}</label>)}</section>)}</div><p>Bags after trade: {fromBag} / 3 and {toBag} / 3.</p><button className="gold-button full-width" disabled={busy||fromBag>3||toBag>3||!(items.length+receiveItems.length+gold+receiveGold)} onClick={()=>send({type:'trade',hero:hero.id,to,items,receiveItems,gold,receiveGold})}>Propose trade</button></div>;
}

export function AuctionChoices({heroes,send,busy}:{heroes:Hero[];send:Submit;busy:boolean}) {
 const [bids,setBids]=useState<Record<string,number>>({});
 return <div className="auction-choices">{heroes.map(h=><form key={h.id} onSubmit={e=>{e.preventDefault();send({type:'bid',hero:h.id,amount:bids[h.id]??0});}}><label>{character(p,h.id).name}<input aria-label={`Bid: ${character(p,h.id).name}`} type="number" min={0} max={h.gold} value={bids[h.id]??0} onChange={e=>setBids(v=>({...v,[h.id]:Number(e.target.value)}))}/></label><button className="gold-button" disabled={busy}>Bid / max {h.gold}</button></form>)}</div>;
}
