import { useEffect, useState } from 'react';
import { BASE_PACK as p } from '../data/base';
import { card, character } from '../rules/common';
import { commandLabel } from '../rules/legal';
import type { Command, Hero } from '../rules/model';
import type { GameView } from '../rules/view';
import { Icon } from '../components';
import { AuctionChoices } from './Interactions';
import { CardThumbnail } from './parts';
import { eventText, regionName } from './event-text';
import { QuestDecks } from './QuestLedger';
import RewardResolution from './RewardResolution';
const choicesTypes=['talent','reward','quest','event-choice','respawn','claim-relic'];
function Retrain({hero,send}:{hero:Hero;send:(c:Command)=>void}){
 const [talents,setTalents]=useState([...hero.talents]);
 return <div className="retrain-editor"><h3>Replace talents</h3>{hero.talents.map((id,i)=><label key={id}>{card(p,id).name}<select aria-label={`Replacement for ${card(p,id).name}`} value={talents[i]} onChange={e=>setTalents(v=>v.map((t,j)=>j===i?e.target.value:t))}>{p.cards.filter(c=>c.kind==='talent'&&c.classId===character(p,hero.id).classId&&c.level<=card(p,id).level).map(c=><option key={c.id} value={c.id}>{c.name} · level {c.level}</option>)}</select></label>)}<button className="gold-button" disabled={new Set(talents).size!==talents.length} onClick={()=>send({type:'event-choice',hero:hero.id,choice:{mode:'talents',talents}})}>Confirm talents</button></div>;
}
export default function WorldDecision({state,legal,send,inspect,botStep,botReady,auto,toggleBots}:{state:GameView;legal:Command[];send:(c:Command)=>void;inspect:(id:string)=>void;botStep:()=>void;botReady:boolean;auto:boolean;toggleBots:()=>void}){
 const [query,setQuery]=useState(''),[page,setPage]=useState(0);
 useEffect(()=>{setQuery('');setPage(0);},[state.revision]);
 const step=state.eventFlow?.steps[0],event=state.eventFlow?p.events.find(e=>e.id===state.eventFlow!.event):undefined;
 const title=state.heroes.some(h=>h.talentChoices.length)?"New talent":state.respawns.length?"Hero revival":state.auction?"Auction house":event?.name??"Party rewards";
 const choices=legal.filter(c=>choicesTypes.includes(c.type)&&c.type!=='quest'&&c.type!=='reward'&&!(step?.kind==='retrain'&&c.type==='event-choice'&&c.choice.mode==='talents'));
 const detail=(c:Command)=>{let label=commandLabel(p,c);if(c.type==='event-choice'&&c.choice.enemy){const e=state.enemies.find(e=>e.id===c.choice.enemy)!;label=`${p.creatures.find(v=>v.id===e.creature)?.name} · ${regionName(e.region)} → ${regionName(c.choice.region!)}`;}if('discard'in c&&c.discard&&typeof c.discard==='string')label+=` · discard ${card(p,c.discard).name}`;if(c.type==='event-choice'&&c.choice.discard)label+=` · discard ${card(p,c.choice.discard).name}`;return label;};
 const filtered=choices.filter(c=>detail(c).toLowerCase().includes(query.toLowerCase()));
 const talents=filtered.filter((c):c is Extract<Command,{type:'talent'}>=>c.type==='talent');
 const pendingTalent=state.heroes.some(h=>h.talentChoices.length>0);
 const options=talents.length?talents:filtered;
 const pageSize=pendingTalent?6:12,currentPage=Math.min(page,Math.max(0,Math.ceil(options.length/pageSize)-1));
 return <div className="decision-overlay"><section className={`world-decision compact-decision ${pendingTalent?'talent-decision':''}`} role="dialog" aria-modal="true" aria-label={title}><span className="eyebrow">{step?character(p,step.hero).name:"PARTY DECISION"}</span><h2>{title}</h2><p>{pendingTalent?'Choose one permanent talent. Hover or focus a card to read its full rules.':event?eventText(event):state.auction?"Bids remain hidden until the auction ends.":state.respawns.length?"Choose your starting region or an available graveyard.":"Choose a reward, recipient or the next quest’s difficulty."}</p>{state.auction&&<div className="reward-previews"><CardThumbnail card={card(p,state.auction.item)} onClick={()=>inspect(state.auction!.item)}/></div>}
 {state.reward&&!pendingTalent&&<RewardResolution state={state} legal={legal} send={send} inspect={inspect}/>}
 {state.auction&&<AuctionChoices heroes={state.heroes.filter(h=>legal.some(c=>c.type==='bid'&&c.hero===h.id))} busy={false} send={send}/>}
 {step?.kind==='retrain'&&legal.some(c=>c.type==='event-choice'&&c.hero===step.hero)&&<Retrain key={`${step.hero}-${state.revision}`} hero={state.heroes.find(h=>h.id===step.hero)!} send={send}/>}
 {choices.length>12&&<input className="choice-search" aria-label="Filter decisions" placeholder="Search for a target, region or card…" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/>}
 {legal.some(c=>c.type==='quest')&&<section className="replacement-decks"><h3>Choose the next quest deck</h3><p>The new card immediately places its objectives and quest token on the map.</p><QuestDecks state={state} side={state.reward?.replacementFaction??state.reward!.faction} legal={legal} send={send}/></section>}
 <div className={talents.length?'talent-choice-grid':'decision-options'}>{options.slice(currentPage*pageSize,(currentPage+1)*pageSize).map((c,i)=>c.type==='talent'?<div className="talent-choice" key={`${c.hero}:${c.card}`}><CardThumbnail card={card(p,c.card)} onClick={()=>inspect(c.card)} footer={`${character(p,c.hero).name.split(' ')[0]} · permanent talent`}/><button className="gold-button" onClick={()=>send(c)} aria-label={detail(c)}>Choose {card(p,c.card).name}</button></div>:<button key={i} className="quiet-button" onClick={()=>send(c)}>{detail(c)}</button>)}</div>{options.length>pageSize&&<div className="catalog-pagination"><button className="quiet-button" aria-label="Previous choices" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>←</button><span>{currentPage+1} / {Math.ceil(options.length/pageSize)}</span><button className="quiet-button" aria-label="Next choices" disabled={(currentPage+1)*pageSize>=options.length} onClick={()=>setPage(currentPage+1)}>→</button></div>}
 {!choices.length&&!state.auction&&!legal.some(c=>c.type==='quest'||c.type==='reward')&&<p>Another character makes this decision. Run their AI move.</p>}<div className="decision-bots"><button className="gold-button" disabled={!botReady} onClick={botStep}>Bot move <Icon name="spark"/></button><button className="quiet-button" onClick={toggleBots}>{auto?"Pause automatic moves":"Automatic bots"}</button></div></section></div>;
}
