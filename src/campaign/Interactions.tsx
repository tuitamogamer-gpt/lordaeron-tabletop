import { useState } from 'react';
import { BASE_PACK as p } from '../data/base';
import { capacity, card, character, faction } from '../rules/common';
import { bagSize, heroSlots, manage, townOperations } from '../rules/inventory';
import type { Command, Hero, TownOperation } from '../rules/model';
import { pretty } from './parts';
import { AbilityArt, cardIllustration } from './Art';
type Submit = (c: Command) => void;

export function TownEditor({hero,merchant,send,busy}:{hero:Hero;merchant:string[];send:Submit;busy:boolean}) {
 const [operations,setOperations]=useState<TownOperation[]>([]),[health,setHealth]=useState(Math.max(0,Math.min(hero.level,capacity(p,hero).health-hero.health))),[error,setError]=useState('');
 const preview=structuredClone(hero), market={merchant:[...merchant]};
 let invalid='';try{townOperations(p,market,preview,health,operations);}catch(e){invalid=(e as Error).message;}
 const add=(op:TownOperation)=>{try{townOperations(p,{merchant:[...merchant]},structuredClone(hero),health,[...operations,op]);setOperations(v=>[...v,op]);setError('');}catch(e){setError((e as Error).message);}};
 const selling=[...preview.bag,...preview.slots.flatMap(s=>[s.card,...s.addons].filter((id):id is string=>!!id))].filter(id=>card(p,id).kind==='item'&&!card(p,id).soulbound);
 return <div className="dialog-content"><p>Build your transaction in order: sell, buy and learn multiple powers with one Town action. New equipment goes into your bag.</p>
  <label className="rest-slider">Health recovery: {health} / {hero.level}<input type="range" min={0} max={Math.max(0,Math.min(hero.level,capacity(p,hero).health-hero.health))} value={health} onChange={e=>setHealth(Number(e.target.value))}/></label>
  <div className="transaction-summary"><strong>{preview.gold} gold after the transaction</strong><span>Bag {bagSize(p,preview.bag)} / 3</span></div>
  <div className="transaction-columns"><section><h3>Buy</h3>{market.merchant.map(id=>{const c=card(p,id),discard=bagSize(p,[...preview.bag,id])>3?[...preview.bag,id].filter(v=>!card(p,v).bagExempt):[undefined];return <div className="transaction-item" key={id}><AbilityArt icon={cardIllustration(c)}/><strong>{pretty(c.name)}</strong><small>Level {c.level} · {c.price} gold</small>{discard.map((d,i)=><button key={i} className="quiet-button" disabled={busy||preview.gold<c.price} onClick={()=>add({op:'buy',card:id,discard:d})}>{d?`Buy, discard ${pretty(card(p,d).name)}`:"Add purchase"}</button>)}</div>;})}</section>
  <section><h3>Sell</h3>{selling.length?selling.map(id=><button key={id} className="quiet-button full-width" disabled={busy} onClick={()=>add({op:'sell',card:id})}>{pretty(card(p,id).name)} · +{Math.ceil(card(p,id).price/2)} gold</button>):<p>No items to sell.</p>}<h3>Learn a power</h3>{p.cards.filter(c=>c.kind==='power'&&!c.printed&&c.classId===character(p,hero.id).classId&&!preview.learned.includes(c.id)&&c.level<=hero.level).map(c=><button key={c.id} className="quiet-button full-width" disabled={busy||preview.gold<c.price} onClick={()=>add({op:'train',card:c.id})}>{pretty(c.name)} · {c.price} gold</button>)}</section></div>
  <ol className="transaction-receipt">{operations.map((op,i)=><li key={i}>{op.op==='buy'?"Buy":op.op==='sell'?"Sell":"Learn"}: {pretty(card(p,op.card).name)}</li>)}</ol>
  {(error||invalid)&&<p role="status" className="combat-warning">{error||invalid}</p>}
  <div className="settings-buttons"><button className="quiet-button" disabled={!operations.length||busy} onClick={()=>{setOperations(v=>v.slice(0,-1));setError('');}}>Remove last entry</button><button className="gold-button" disabled={!!invalid||busy} onClick={()=>send({type:'town',hero:hero.id,health,operations})}>Confirm · {operations.length} transactions · 1 action</button></div>
 </div>;
}

export function EquipmentEditor({hero,send,busy}:{hero:Hero;send:Submit;busy:boolean}) {
 const [slots,setSlots]=useState(structuredClone(hero.slots)),[discard,setDiscard]=useState<string[]>([]),def={...character(p,hero.id),slots:heroSlots(p,hero)};
 const owned=[...new Set([...hero.bag,...hero.learned,...hero.slots.flatMap(s=>[s.card,...s.addons].filter((id):id is string=>!!id))])];
 const next=slots.flatMap(s=>[s.card,...s.addons].filter((id):id is string=>!!id));
 const bag=owned.filter(id=>card(p,id).kind==='item'&&!next.includes(id)),excess=Math.max(0,bagSize(p,bag)-3);
 let error='';const preview=structuredClone(hero);try{manage(p,{merchant:[]},preview,slots,discard);}catch(e){error=(e as Error).message;}
 return <div className="dialog-content"><p>Manage equipment and attachments. Active powers cost energy when equipped; excess bag items go to the merchant.</p><div className="equipment-editor">{slots.map((slot,i)=>{const area=def.slots[i],compatible=owned.filter(id=>{const c=card(p,id),override=hero.talents.some(t=>{const v=card(p,t).equipOverride;return v&&area.types.includes(v.slot)&&v.traits.includes(c.trait??'')&&c.level<=v.maxLevel&&c.kind==='item'&&!c.addon;});return c.level<=hero.level&&(area.types.includes(c.type)||override)&&(c.kind!=='item'||area.traits.includes('all')||area.traits.includes(c.trait??'')||override)&&(!area.stanceOnly||c.unique==='Stance')&&(c.unique!=='Stance'||area.stanceOnly);});return <section key={i}><label><span>Slot {i+1} · {def.slots[i].types.join(' / ')}</span><select value={slot.card??''} onChange={e=>{setSlots(v=>v.map((s,j)=>i===j?{...s,card:e.target.value||undefined}:s));setDiscard([]);}}><option value="">{def.slots[i].printed?pretty(card(p,def.slots[i].printed!).name):"Empty slot"}</option>{compatible.filter(id=>!card(p,id).addon).map(id=><option key={id} value={id}>{pretty(card(p,id).name)} · level {card(p,id).level}</option>)}</select></label>{compatible.filter(id=>card(p,id).addon).map(id=><label className="addon-choice" key={id}><input type="checkbox" checked={slot.addons.includes(id)} onChange={e=>{setSlots(v=>v.map((s,j)=>i===j?{...s,addons:e.target.checked?[...s.addons,id]:s.addons.filter(a=>a!==id)}:s));setDiscard([]);}}/>{pretty(card(p,id).name)}</label>)}</section>;})}</div>
  <p>Bag after selection: {bagSize(p,bag)} / 3. {excess>0?`Choose ${excess} to discard.`:"No excess items."}</p>{excess>0&&<div className="discard-options">{bag.filter(id=>!card(p,id).bagExempt).map(id=><label key={id}><input type="checkbox" checked={discard.includes(id)} onChange={e=>setDiscard(v=>e.target.checked?[...v,id]:v.filter(a=>a!==id))}/>{pretty(card(p,id).name)}</label>)}</div>}
  {error?<p role="status" className="combat-warning">{error}</p>:<p>Energy after equipping: {preview.energy}.</p>}<button className="gold-button full-width" disabled={!!error||busy} onClick={()=>send({type:'manage',hero:hero.id,slots,discard})}>Confirm equipment</button>
 </div>;
}

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
