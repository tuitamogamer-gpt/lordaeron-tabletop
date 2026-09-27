import { useState } from 'react';
import { BASE_PACK as p } from '../data/base';
import { card, character } from '../rules/common';
import { commandLabel } from '../rules/legal';
import type { Command, Hero } from '../rules/model';
import type { GameView } from '../rules/view';
import { Icon } from '../components';
import { AuctionChoices } from './Interactions';
import { GameCard } from './parts';
import { eventText, regionName } from './event-text';
const choicesTypes=['talent','reward','quest','event-choice','respawn','claim-relic'];
function Retrain({hero,send}:{hero:Hero;send:(c:Command)=>void}){
 const [talents,setTalents]=useState([...hero.talents]);
 return <div className="retrain-editor"><h3>Zamijeni talente</h3>{hero.talents.map((id,i)=><label key={id}>{card(p,id).name}<select aria-label={`Zamjena za ${card(p,id).name}`} value={talents[i]} onChange={e=>setTalents(v=>v.map((t,j)=>j===i?e.target.value:t))}>{p.cards.filter(c=>c.kind==='talent'&&c.classId===character(p,hero.id).classId&&c.level<=card(p,id).level).map(c=><option key={c.id} value={c.id}>{c.name} · nivo {c.level}</option>)}</select></label>)}<button className="gold-button" disabled={new Set(talents).size!==talents.length} onClick={()=>send({type:'event-choice',hero:hero.id,choice:{mode:'talents',talents}})}>Potvrdi talente</button></div>;
}
export default function WorldDecision({state,legal,send,inspect,botStep,botReady,auto,toggleBots}:{state:GameView;legal:Command[];send:(c:Command)=>void;inspect:(id:string)=>void;botStep:()=>void;botReady:boolean;auto:boolean;toggleBots:()=>void}){
 const [query,setQuery]=useState(''),[page,setPage]=useState(0);
 const step=state.eventFlow?.steps[0],event=state.eventFlow?p.events.find(e=>e.id===state.eventFlow!.event):undefined;
 const title=state.heroes.some(h=>h.talentChoices.length)?'Novi talent':state.respawns.length?'Povratak junaka':state.auction?'Aukcijska kuća':event?.name??'Nagrade družine';
 const choices=legal.filter(c=>choicesTypes.includes(c.type)&&!(step?.kind==='retrain'&&c.type==='event-choice'&&c.choice.mode==='talents'));
 const detail=(c:Command)=>{let label=commandLabel(p,c);if(c.type==='event-choice'&&c.choice.enemy){const e=state.enemies.find(e=>e.id===c.choice.enemy)!;label=`${p.creatures.find(v=>v.id===e.creature)?.name} · ${regionName(e.region)} → ${regionName(c.choice.region!)}`;}if('discard'in c&&c.discard&&typeof c.discard==='string')label+=` · odbaci ${card(p,c.discard).name}`;if(c.type==='event-choice'&&c.choice.discard)label+=` · odbaci ${card(p,c.choice.discard).name}`;return label;};
 const filtered=choices.filter(c=>detail(c).toLowerCase().includes(query.toLowerCase()));
 const ids=[...new Set([...(state.reward?.offered??[]),...(state.auction?[state.auction.item]:[]),...legal.filter(c=>c.type==='talent').map(c=>c.card)])];
 return <div className="decision-overlay"><section className="world-decision" role="dialog" aria-modal="true" aria-label={title}><span className="eyebrow">{step?character(p,step.hero).name:'ODLUKA DRUŽINE'}</span><h2>{title}</h2><p>{event?eventText(event):state.auction?'Ponude su skrivene do završetka aukcije.':state.respawns.length?'Odaberi početnu regiju ili dostupno groblje.':'Odaberi nagradu, primaoca ili težinu sljedećeg questa.'}</p>{ids.length>0&&<div className="reward-previews">{ids.map(id=><GameCard key={id} card={card(p,id)} onClick={()=>inspect(id)}/>)}</div>}
 {state.auction&&<AuctionChoices heroes={state.heroes.filter(h=>legal.some(c=>c.type==='bid'&&c.hero===h.id))} busy={false} send={send}/>}
 {step?.kind==='retrain'&&legal.some(c=>c.type==='event-choice'&&c.hero===step.hero)&&<Retrain key={`${step.hero}-${state.revision}`} hero={state.heroes.find(h=>h.id===step.hero)!} send={send}/>}
 {choices.length>12&&<input className="choice-search" aria-label="Filtriraj odluke" placeholder="Pretraži metu, regiju ili kartu…" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/>}
 <div className="decision-options">{filtered.slice(page*18,page*18+18).map((c,i)=><button key={i} className="quiet-button" onClick={()=>send(c)}>{detail(c)}</button>)}</div>{filtered.length>18&&<div className="catalog-pagination"><button className="quiet-button" disabled={page===0} onClick={()=>setPage(n=>n-1)}>←</button><span>{page+1} / {Math.ceil(filtered.length/18)}</span><button className="quiet-button" disabled={(page+1)*18>=filtered.length} onClick={()=>setPage(n=>n+1)}>→</button></div>}
 {!choices.length&&!state.auction&&<p>Ovu odluku donosi drugi lik. Pokreni njegov AI potez.</p>}<div className="decision-bots"><button className="gold-button" disabled={!botReady} onClick={botStep}>Potez botova <Icon name="spark"/></button><button className="quiet-button" onClick={toggleBots}>{auto?'Pauziraj automatske poteze':'Automatski botovi'}</button></div></section></div>;
}
