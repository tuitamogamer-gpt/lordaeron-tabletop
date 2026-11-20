import { useEffect, useState, type CSSProperties } from 'react';
import { BASE_PACK as p } from '../data/base';
import { capacity, card, character } from '../rules/common';
import { commandLabel } from '../rules/legal';
import type { Command, Hero } from '../rules/model';
import type { GameView } from '../rules/view';
import { Icon } from '../components';
import { AuctionChoices } from './Interactions';
import { CardThumbnail, HeroPortrait } from './parts';
import { EventItemChoices, RetrainChoices } from './EventChoices';
import { GameIcon } from './GameIcon';
import { eventText, regionName } from './event-text';
import { QuestDecks } from './QuestLedger';
import { questLabel } from './map-state';
import { rasterFace } from './RasterCard';
import { byTouch } from './pointer';
import RewardResolution from './RewardResolution';
const choicesTypes=['talent','reward','quest','skip-quest','event-choice','respawn','claim-relic'];
type EventChoice=Extract<Command,{type:'event-choice'}>;
/** Professions and Crafts: gold, or recovery divided between health and energy. Each choice shows what the character ends with. */
function ProfessionChoices({hero,choices,send}:{hero:Hero;choices:EventChoice[];send:(c:Command)=>void}){
 const cap=capacity(p,hero),gold=choices.find(c=>c.choice.mode==='gold'),skip=choices.find(c=>c.choice.mode==='skip');
 return <section className="profession-choices" aria-label="Gold or recovery">
  <header className="event-purse"><HeroPortrait id={hero.id} small/><span><strong>{character(p,hero.id).name}</strong><small>Level {hero.level}: {hero.level} gold, or {hero.level} {hero.level===1?'point':'points'} of recovery</small></span><span className="event-purse-gold"><GameIcon name="health" size={22}/><b>{hero.health}</b> / {cap.health}<GameIcon name="energy" size={22}/><b>{hero.energy}</b> / {cap.energy}<GameIcon name="gold" size={22}/><b>{hero.gold}</b></span></header>
  <div className="profession-options">
   {gold&&<button type="button" className="profession-option" onClick={()=>send(gold)} aria-label={`Take ${hero.level} gold`}><span className="profession-gain"><GameIcon name="gold" size={30}/><b>+{hero.level}</b></span><strong>Take {hero.level} gold</strong><small>Gold {hero.gold} → {hero.gold+hero.level}</small></button>}
   {choices.filter(c=>c.choice.mode==='recover').map(c=>{const health=c.choice.health??0,energy=Math.max(0,Math.min(cap.energy-hero.energy,hero.level-health));return <button key={health} type="button" className="profession-option" onClick={()=>send(c)} aria-label={`Recover ${health} health and ${energy} energy`}><span className="profession-gain">{health>0&&<><GameIcon name="health" size={30}/><b>+{health}</b></>}{(energy>0||!health)&&<><GameIcon name="energy" size={30}/><b>+{energy}</b></>}</span><strong>{health+energy?'Recover':'Nothing to recover'}</strong><small>Health {hero.health} → {hero.health+health} · Energy {hero.energy} → {hero.energy+energy}</small></button>;})}
  </div>
  {skip&&<button type="button" className="quiet-button event-items-skip" onClick={()=>send(skip)}>Take nothing</button>}
 </section>;
}
type QuestSwap=EventChoice;
/** New Horizons: one row per active quest, with a button for each replacement deck. */
function QuestSwapChoices({state,swaps,skip,send}:{state:GameView;swaps:QuestSwap[];skip?:Command;send:(c:Command)=>void}){
 const quests=[...new Set(swaps.map(c=>c.choice.quest!))];
 return <div className="quest-swap-choices">
  {quests.map(id=>{const q=p.quests.find(q=>q.id===id)!;return <div key={id} className={`quest-swap-row ${q.faction}`}>
   <span className={`quest-reference ${q.faction}`}>{questLabel(p,id)}</span>
   <span className="quest-swap-name"><strong>{q.name}</strong><small>{q.tier[0].toUpperCase()+q.tier.slice(1)} · Level {q.level} · {q.reward.xp} XP · {q.reward.gold} gold</small></span>
   <span className="quest-swap-tiers">{(['green','yellow','red'] as const).map(tier=>{const c=swaps.find(c=>c.choice.quest===id&&c.choice.tier===tier);const left=state.deckCounts.quests[q.faction]?.[tier]??0;return <button key={tier} className={`quest-swap-tier ${tier}`} disabled={!c} onClick={()=>c&&send(c)} aria-label={`Replace ${q.name} with a ${tier} quest`}>{tier}<small>{left} left</small></button>;})}</span>
  </div>;})}
  {skip&&<button className="quiet-button quest-swap-skip" onClick={()=>send(skip)}>Keep every quest</button>}
 </div>;
}
const faceOf=(id:string)=>{try{return rasterFace(id);}catch{return undefined;}};
export default function WorldDecision({state,legal,send,inspect,botStep,botReady,auto,toggleBots,waiting=false,hasBots=true}:{state:GameView;legal:Command[];send:(c:Command)=>void;inspect:(id:string)=>void;botStep:()=>void;botReady:boolean;auto:boolean;toggleBots:()=>void;/** The bots could decide this too, and wait for the player. */waiting?:boolean;/** Whether any character is played by the AI: without one the bots' controls have nothing to do. */hasBots?:boolean}){
 const [query,setQuery]=useState(''),[page,setPage]=useState(0);
 useEffect(()=>{setQuery('');setPage(0);},[state.revision]);
 const step=state.eventFlow?.steps[0],event=state.eventFlow?p.events.find(e=>e.id===state.eventFlow!.event):undefined;
 const title=state.heroes.some(h=>h.talentChoices.length)?"New talent":state.respawns.length?"Hero revival":state.auction?"Auction house":event?.name??"Party rewards";
 // A character who lost his last Health to an event may still drink a healing potion before choosing a graveyard (rules p. 26).
 const choices=legal.filter(c=>(choicesTypes.includes(c.type)||c.type==='ability'&&state.respawns.length>0)&&c.type!=='quest'&&c.type!=='reward'&&!(step?.kind==='retrain'&&c.type==='event-choice'&&c.choice.mode==='talents'));
 const detail=(c:Command)=>{let label=c.type==='ability'&&state.respawns.length?`${character(p,c.hero).name.split(' ')[0]}: use ${card(p,c.card).name} and stay`:commandLabel(p,c);if(c.type==='event-choice'&&c.choice.enemy){const e=state.enemies.find(e=>e.id===c.choice.enemy)!;label=`${p.creatures.find(v=>v.id===e.creature)?.name} · ${regionName(e.region)} → ${regionName(c.choice.region!)}`;}if('discard'in c&&c.discard&&typeof c.discard==='string')label+=` · discard ${card(p,c.discard).name}`;if(c.type==='event-choice'&&c.choice.discard)label+=` · discard ${card(p,c.choice.discard).name}`;return label;};
 const filtered=choices.filter(c=>detail(c).toLowerCase().includes(query.toLowerCase()));
 const talents=filtered.filter((c):c is Extract<Command,{type:'talent'}>=>c.type==='talent');
 const pendingTalent=state.heroes.some(h=>h.talentChoices.length>0);
 // Several characters can gain a level at once (a quest, a War): the dialog names the one whose talent is being chosen.
 const learner=talents[0]?state.heroes.find(h=>h.id===talents[0].hero):undefined;
 const options=talents.length?talents:filtered;
 const swaps=choices.filter((c):c is QuestSwap=>c.type==='event-choice'&&!!c.choice.quest&&!!c.choice.tier),skipSwap=choices.find(c=>c.type==='event-choice'&&c.choice.mode==='skip');
 const groupedSwaps=swaps.length>0&&swaps.length+(skipSwap?1:0)===choices.length;
 // The Event card that asks for this decision lies beside it, as it would on the table.
 const eventFace=event&&!pendingTalent&&!state.respawns.length&&!state.reward?faceOf(event.id):undefined;
 // Choices among cards and resources are laid out as what they are: the items with their prices, the talents as cards, the
 // recovery as health and energy. Only what has no picture of its own remains a button with words.
 const decider=step?state.heroes.find(h=>h.id===step.hero):undefined,own=choices.filter((c):c is EventChoice=>c.type==='event-choice'&&c.hero===step?.hero);
 const itemStep=decider&&own.length&&!state.respawns.length&&(step!.kind==='merchants'||step!.kind==='sell'||step!.kind==='tribute')?step!.kind:undefined;
 const retraining=!!decider&&step!.kind==='retrain'&&!state.respawns.length&&legal.some(c=>c.type==='event-choice'&&c.hero===step!.hero);
 const crafting=!!decider&&step!.kind==='professions'&&!state.respawns.length&&own.length>0;
 const laidOut=!!itemStep||retraining||crafting;
 const pageSize=pendingTalent?6:12,currentPage=Math.min(page,Math.max(0,Math.ceil(options.length/pageSize)-1));
 return <div className="decision-overlay"><section className={`world-decision compact-decision ${pendingTalent?'talent-decision':''} ${laidOut?'laid-out':''}`} style={pendingTalent?{'--talent-count':Math.min(6,Math.max(3,talents.length))} as CSSProperties:undefined} role="dialog" aria-modal="true" aria-label={title}>{eventFace&&<img className="decision-event-card" src={eventFace.src} width={eventFace.width} height={eventFace.height} alt={`${event!.name} event card`} draggable={false}/>}<span className="eyebrow">{step?character(p,step.hero).name:learner?`${character(p,learner.id).name} · level ${learner.level}`:"PARTY DECISION"}</span><h2>{title}</h2><p>{pendingTalent?`${learner?`${character(p,learner.id).name.split(' ')[0]} reached level ${learner.talentChoices[0]}: choose`:'Choose'} one permanent talent. ${byTouch()?'Tap':'Hover or focus'} a card to read its full rules.`:state.respawns.length?`${choices.some(c=>c.type==='ability')?"A healing potion can still save this character. Otherwise choose your starting region or an available graveyard.":"Choose your starting region or an available graveyard."}${event?` ${event.name}: ${eventText(event)}`:''}`:event?eventText(event):state.auction?"Bids remain hidden until the auction ends.":"Choose a reward, recipient or the next quest’s difficulty."}</p>
 {state.reward&&!pendingTalent&&<RewardResolution state={state} legal={legal} send={send} inspect={inspect}/>}
 {state.auction&&<div className="auction-house"><CardThumbnail card={card(p,state.auction.item)} onClick={()=>inspect(state.auction!.item)} footer="Up for auction"/><AuctionChoices heroes={state.heroes.filter(h=>legal.some(c=>c.type==='bid'&&c.hero===h.id))} submitted={state.auction.submitted} busy={false} send={send}/></div>}
 {retraining&&<RetrainChoices key={`${decider!.id}-${state.revision}`} hero={decider!} gold={own.find(c=>c.choice.mode==='gold')} skip={own.find(c=>c.choice.mode==='skip')} send={send} inspect={inspect}/>}
 {itemStep&&<EventItemChoices key={`${decider!.id}-${state.revision}`} kind={itemStep} hero={decider!} merchant={state.merchant} choices={own} send={send} inspect={inspect}/>}
 {crafting&&<ProfessionChoices hero={decider!} choices={own} send={send}/>}
 {groupedSwaps&&<QuestSwapChoices state={state} swaps={swaps} skip={skipSwap} send={send}/>}
 {!groupedSwaps&&!laidOut&&choices.length>12&&<input className="choice-search" aria-label="Filter decisions" placeholder="Search for a target, region or card…" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/>}
 {legal.some(c=>c.type==='quest')&&<section className="replacement-decks"><h3>Choose the next quest deck</h3><p>The new card immediately places its objectives and quest token on the map.</p><QuestDecks state={state} side={state.reward?.replacementFaction??state.reward!.faction} legal={legal} send={send}/></section>}
 {!groupedSwaps&&!laidOut&&<><div className={talents.length?'talent-choice-grid':'decision-options'}>{options.slice(currentPage*pageSize,(currentPage+1)*pageSize).map((c,i)=>c.type==='talent'?<div className="talent-choice" key={`${c.hero}:${c.card}`}><CardThumbnail card={card(p,c.card)} onClick={()=>inspect(c.card)} footer={`${character(p,c.hero).name.split(' ')[0]} · permanent talent`}/><button className="gold-button" onClick={()=>send(c)} aria-label={detail(c)}>Choose {card(p,c.card).name}</button></div>:<button key={i} className="quiet-button" onClick={()=>send(c)}>{detail(c)}</button>)}</div>{options.length>pageSize&&<div className="catalog-pagination"><button className="quiet-button" aria-label="Previous choices" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>←</button><span>{currentPage+1} / {Math.ceil(options.length/pageSize)}</span><button className="quiet-button" aria-label="Next choices" disabled={(currentPage+1)*pageSize>=options.length} onClick={()=>setPage(currentPage+1)}>→</button></div>}</>}
 {!choices.length&&!state.auction&&!legal.some(c=>c.type==='quest'||c.type==='reward')&&<p>{auto?'An AI character is making this decision…':'Another character makes this decision. Run their AI move.'}</p>}{waiting&&<p className="muted decision-waiting">Your AI allies wait for your choice. “Bot move” lets one of them take the reward instead.</p>}{hasBots&&<div className="decision-bots"><button className="gold-button" disabled={!botReady} onClick={botStep}>Bot move <Icon name="spark"/></button><button className="quiet-button" onClick={toggleBots}>{auto?"Pause automatic moves":"Automatic bots"}</button></div>}</section></div>;
}
