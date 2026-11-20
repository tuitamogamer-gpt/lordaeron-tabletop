import { useState } from 'react';
import { BASE_PACK as p } from '../data/base';
import type { GameView } from '../rules/view';
import { Icon, Modal } from '../components';
import { EventCardView, OverlordCard } from './design-system';
import { bossRuleText, deckSymbol } from './event-text';
import { SCANS } from './scan-assets';
import RulesText from './RulesText';

type Section = 'overview' | 'active' | 'discard' | 'deck' | 'track';
export default function EncounterPanel({ state }: { state: GameView }) {
 const [section,setSection] = useState<Section>('overview'), [page,setPage] = useState(0),[detail,setDetail]=useState<string>();
 const boss = p.overlords.find(o=>o.id===state.overlord.id)!;
 const active = (state.world??[]).map(w=>w.id);
 // The discard pile is what was turned up since the deck was last shuffled; everything turned up before went back into the deck.
 const pile = state.eventDiscard.slice(state.eventRecycled??0), shuffles = state.eventShuffles??0;
 const ids = section==='active'?active:[...pile].reverse();
 // What the deck is made of: several cards have copies, so the same name comes up more than once in a campaign.
 const cards = p.events.filter(e=>!e.overlord||e.overlord===state.overlord.id), names = [...new Set(cards.map(e=>e.name))].map(name=>({name,copies:cards.filter(e=>e.name===name).length,drawn:state.eventDiscard.filter(id=>p.events.find(e=>e.id===id)?.name===name).length,sample:cards.find(e=>e.name===name)!.id})).sort((a,b)=>b.copies-a.copies||a.name.localeCompare(b.name));
 const pages = Math.max(1,Math.ceil(ids.length/3)), visiblePage = Math.min(page,pages-1);
 const nextEvent = Object.entries(p.track).find(([turn,kind])=>Number(turn)>state.turn&&kind==='event')?.[0];
 const choose = (value:Section)=>{setSection(value);setPage(0);};
 return <section className="encounter-panel" aria-label="World encounters">
  <nav className="flow-tabs" aria-label="Encounter sections">
   {([['overview','Overview',undefined],['active','Active encounters',active.length],['discard','Discard pile',pile.length],['deck','Deck contents',cards.length],['track','Turn track',undefined]] as const).map(([id,label,count])=><button key={id} aria-pressed={section===id} onClick={()=>choose(id)}>{label}{count!==undefined&&<b>{count}</b>}</button>)}
  </nav>
  {section==='overview'&&<div className="encounter-dashboard">
   <div className="encounter-brief"><span className="sheet-eyebrow">THE WORLD TAKES ITS TURN</span><h3>Every turn tells a story.</h3><p>Events are drawn automatically on marked turns. Active encounters and the discard pile are open to inspection.</p><div className="encounter-stat-grid"><div>{SCANS.backs.event&&<img className="encounter-deck-back" src={SCANS.backs.event.src} alt="" draggable={false}/>}<strong>{state.deckCounts.events}</strong><span>cards remain</span></div><div><strong>{active.length}</strong><span>active encounters</span></div><div><strong>{pile.length}</strong><span>discarded cards</span></div></div><p className="encounter-shuffle-note"><Icon name="layers" size={15}/>The deck of {cards.length} cards was shuffled when this campaign was set up{shuffles?`, and its discard pile has been shuffled into a new deck ${shuffles===1?'once':`${shuffles} times`} since`:'; when it runs out, the discard pile is shuffled into a new deck'}. <button className="quiet-button" onClick={()=>choose('deck')}>What is in the deck</button></p><div className="encounter-boss-rules"><strong>{boss.name} · combat rules</strong><RulesText>{bossRuleText(boss.combat)}</RulesText></div><div className="encounter-next"><Icon name="scroll" size={22}/><span>{nextEvent?`Next event · turn ${nextEvent}`:'No further scheduled events.'}<small>Turn {state.turn} of 30{state.lap?` · lap ${state.lap}`:''}</small></span></div><button className="quiet-button" onClick={()=>choose('track')}>View the campaign track <Icon name="arrow" size={15}/></button></div>
   <div className="encounter-boss"><OverlordCard overlord={boss} count={state.heroes.length as 4|6}/></div>
  </div>}
  {(section==='active'||section==='discard')&&<><div className="encounter-reading-grid" key={`${section}-${visiblePage}`}>{ids.slice(visiblePage*3,(visiblePage+1)*3).map((id,i)=><div className="encounter-event-entry" key={`${id}-${i}`}><div aria-hidden="true"><EventCardView event={p.events.find(e=>e.id===id)!}/></div><button className="encounter-read-card" aria-label={`Inspect ${p.events.find(e=>e.id===id)!.name}`} onClick={()=>setDetail(id)}><span>Read full rules <Icon name="arrow" size={14}/></span></button></div>)}</div>{!ids.length&&<p className="flow-empty">{section==='active'?`No world events are active. ${state.turn<4?'The first scheduled event is on turn 4.':'Completed events are in the discard pile.'}`:'No events have been discarded yet.'}</p>}<nav className="flow-pagination" aria-label="Encounter pages"><button className="quiet-button" disabled={!visiblePage} onClick={()=>setPage(visiblePage-1)}>Previous</button><span role="status">{ids.length?`${visiblePage*3+1}–${Math.min(ids.length,(visiblePage+1)*3)} of ${ids.length} cards`:'0 cards'} · {visiblePage+1} / {pages}</span><button className="quiet-button" disabled={visiblePage+1===pages} onClick={()=>setPage(visiblePage+1)}>Next</button></nav></>}
  {section==='deck'&&<div className="encounter-deck-contents"><div><span className="sheet-eyebrow">{cards.length} CARDS · SHUFFLED FOR THIS CAMPAIGN</span><h3>What the Event deck is made of</h3><p>The order is random and different in every campaign, but the deck has copies: {names.filter(v=>v.copies>1).slice(0,4).map(v=>`${v.copies} × ${v.name}`).join(', ')} and more. In 30 turns about a third of the deck is turned up, so those names come up in most campaigns.</p></div>
   <ul aria-label="Event cards by name">{names.map(v=><li key={v.name} className={v.drawn?'drawn':''}><button className="quiet-button" onClick={()=>setDetail(v.sample)} aria-label={`Inspect ${v.name}`}><b>{v.copies} ×</b><span>{v.name}</span><small>{v.drawn?`turned up ${v.drawn===1?'once':`${v.drawn} times`}`:'not yet'}</small></button></li>)}</ul></div>}
  {section==='track'&&<div className="encounter-track"><div><span className="sheet-eyebrow">THE 30-TURN CAMPAIGN</span><h3>Turn {state.turn}{state.lap?` · lap ${state.lap}`:''}</h3><p>The track repeats until your faction defeats the Overlord.</p></div><div className="campaign-track-grid">{Array.from({length:30},(_,i)=><div key={i} aria-current={i+1===state.turn?'step':undefined} className={i+1===state.turn?'current':i+1<state.turn?'past':''}><b>{i+1}</b><span>{p.track[i+1]==='event'?'Event':p.track[i+1]?`${deckSymbol[p.track[i+1]]} Merchant`:'Actions'}</span></div>)}</div></div>}
  {detail&&<Modal title={p.events.find(e=>e.id===detail)!.name} className="catalog-reference-modal" onClose={()=>setDetail(undefined)}><div className="catalog-reference-detail"><div className="catalog-detail-art" aria-hidden="true"><EventCardView event={p.events.find(e=>e.id===detail)!}/></div><div className="catalog-detail-rules"><EventCardView event={p.events.find(e=>e.id===detail)!}/></div></div></Modal>}
 </section>;
}
