import { GameIcon } from './GameIcon';
import { useState } from 'react';
import { BASE_PACK as p } from '../data/base';
import { capacity, card, character } from '../rules/common';
import { bagSize, equipped, heroSlots, petCapacity } from '../rules/inventory';
import type { Card, Command, Hero, Slot } from '../rules/model';
import { Icon, ResourceBar } from '../components';
import { AbilityArt, FactionCrest } from './Art';
import { HeroPortrait, CardThumbnail } from './parts';
import { triggerLabels } from './design-system';
import { conditionText, effectText, staticCardText } from './rules-text';
import { regionName } from './event-text';
import ClassDeck from './ClassDeck';
import RulesText from './RulesText';

/** Keep every timing, conditional and strength visible, including printed powers. */
export function CardRules({value:c}:{value:Card}){
 const groups=c.abilities.filter((a,i,all)=>!a.usageGroup||all.findIndex(v=>v.usageGroup===a.usageGroup)===i);
 const rule=(a:Card['abilities'][number])=><p key={a.id}><strong>{triggerLabels[a.timing]??a.timing}{a.automatic?' · passive':''}{a.cost!==undefined?` · ${a.cost} energy`:''}</strong>{a.startOnly&&<em>At the start of this step. </em>}{a.condition&&<em>If <RulesText>{conditionText(a.condition)}</RulesText>: </em>}{a.requires&&<em>After using {triggerLabels[c.abilities.find(v=>v.id===a.requires)?.timing??'']??a.requires}. </em>}{a.freeIf&&<em>Free if <RulesText>{conditionText(a.freeIf)}</RulesText>. </em>}<RulesText>{a.effects.map(effectText).join(' · ')}</RulesText></p>;
 return <div className="inscribed-rules">{groups.map(a=>{const choices=a.usageGroup?c.abilities.filter(v=>v.usageGroup===a.usageGroup):[a];return <div className="inscribed-ability" key={a.id}>{rule(a)}{choices.length>1&&<details className="ability-strengths"><summary>{choices.length} strength options · choose one</summary>{choices.slice(1).map(rule)}</details>}</div>;})}{staticCardText(c).map(t=><p key={t}><RulesText>{t}</RulesText></p>)}</div>;
}
export const slotLabel=(s:Slot)=>s.stanceOnly?'Stance':s.types.map(t=>({instant:'Instant',active:'Active / constant',ranged:'Ranged',melee:'Melee',general:'General',armor:'Armor',bag:'Bag'}[t])).join(' / ');
export function startingHero(id:string):Hero {const d=character(p,id);return {id,location:d.faction==='horde'?'brill':'southshore',...d.capacities[0],gold:5,level:1,xp:0,actions:2,curse:0,stun:0,learned:[],talents:[],bag:[],slots:d.slots.map(()=>({addons:[]})),pets:{},auctionItems:[],talentChoices:[]};}
export default function CharacterSheet({hero:h,legal=[],inspect,open,preview=false}:{hero:Hero;legal?:Command[];inspect:(id:string)=>void;open?:(panel:'manage'|'train'|'trade')=>void;preview?:boolean}) {
 const [tab,setTab]=useState<'sheet'|'spellbook'|'bag'|'talents'|'class'>('sheet');
 const [talentLibrary,setTalentLibrary]=useState(false),[bagPage,setBagPage]=useState(0),[cardPage,setCardPage]=useState(0);
 const d=character(p,h.id),cap=capacity(p,h),slots=heroSlots(p,h),equippedIds=equipped(p,h);
 const can=(type:Command['type'])=>legal.some(c=>c.type===type&&(!('hero'in c)||c.hero===h.id));
 const powers=p.cards.filter(c=>c.kind==='power'&&!c.printed&&c.classId===d.classId);
 const learnedPowers=powers.filter(c=>h.learned.includes(c.id)),classTalents=p.cards.filter(c=>c.kind==='talent'&&c.classId===d.classId);
 const cardPages=Math.max(1,Math.ceil((tab==='spellbook'?learnedPowers:classTalents).length/6)),visibleCardPage=Math.min(cardPage,cardPages-1);
 const bagItems=h.bag.filter(id=>!card(p,id).bagExempt);
 const inventory=[...Array.from({length:Math.max(3,bagItems.length)},(_,i)=>({id:bagItems[i],special:false,slot:i+1})),...[...h.bag.filter(id=>card(p,id).bagExempt),...h.auctionItems].map(id=>({id,special:true,slot:0}))];
 const bagPages=Math.max(1,Math.ceil(inventory.length/6)),visibleBagPage=Math.min(bagPage,bagPages-1);
 const slotView=(s:Slot,i:number)=>{
  const id=h.slots[i]?.card??s.printed,c=id?card(p,id):undefined;
  return <section key={i} className={`character-slot ${c?'occupied':'vacant'} ${i<3?'power-slot':'equipment-slot'}`} aria-label={`Slot ${i+1}: ${slotLabel(s)}`}>
   <header><b>{String(i+1).padStart(2,'0')}</b><span>{slotLabel(s)}<small>{s.traits.includes('all')?'All traits':s.traits.join(' · ')}</small></span></header>
   {c?<div className="sheet-slot-card"><CardThumbnail card={c} art="illustration" onClick={()=>inspect(c.id)} footer={c.printed?'Starting':c.type==='active'?'Equipped · constant':'Equipped'}/></div>:<div className="slot-placeholder"><AbilityArt icon={s.types.includes('active')?d.classId:s.types.includes('melee')?'melee':s.types.includes('armor')?'armor':'arcane'}/><strong>Open {s.stanceOnly?'stance':'slot'}</strong><span>Equip during management</span></div>}
   {(!!c?.petHealth||!!h.slots[i]?.addons.length)&&<div className="sheet-slot-extras">
    {c?.petHealth&&<span className="pet-health"><GameIcon name="health" size={14}/>{h.pets[c.id]??c.petHealth} / {petCapacity(p,h,c.id)} pet HP</span>}
    {h.slots[i]?.addons.map(addon=><button key={addon} className="sheet-addon" onClick={()=>inspect(addon)} title={`Inspect ${card(p,addon).name}`}>+ {card(p,addon).name}</button>)}
   </div>}
  </section>;
 };
 return <article className={`full-character-sheet compact-character-sheet premium-character-sheet ${d.faction} ${preview?'sheet-preview':'sheet-playing'}`} aria-label={`${d.name} character sheet`}>
  <aside className="sheet-identity">
   <div className="sheet-profile"><div className="sheet-portrait"><HeroPortrait id={h.id}/><span className="sheet-faction"><FactionCrest faction={d.faction}/><span>{d.faction}</span></span><span className="sheet-level">{h.level}<small>LEVEL</small></span></div><div className="sheet-nameplate"><span className="sheet-class"><GameIcon name={d.classId} size={20}/>{d.race} · {d.classId}</span><h2>{d.name}</h2><p><Icon name="pin" size={12}/>{regionName(h.location)}{preview?' · character profile':''}</p></div></div>
   <div className="sheet-vitals"><ResourceBar type="health" value={h.health} max={cap.health}/><ResourceBar type="energy" value={h.energy} max={cap.energy}/></div>
   <div className="sheet-currency"><span><GameIcon name="gold" size={20}/>{h.gold}<small>GOLD</small></span><span><GameIcon name="experience" size={20}/>{h.xp}<small>XP</small></span><span><GameIcon name="actions" size={20}/>{h.actions}<small>ACTIONS</small></span></div>
   {d.racial&&<section className="racial-inscription"><span className="sheet-eyebrow">RACIAL ABILITY</span><CardThumbnail card={card(p,d.racial)} art="illustration" onClick={()=>inspect(d.racial!)} className="sheet-racial-thumbnail" footer="Inspect ability"/></section>}
   <div className="sheet-conditions"><span className={h.curse?'afflicted':''}>Curse <b>{h.curse}</b></span><span className={h.stun?'afflicted':''}>Stun <b>{h.stun}</b></span></div>
   {!preview&&<div className="sheet-controls"><button className="gold-button" aria-label="Manage equipment" disabled={!can('manage')} onClick={()=>open?.('manage')} title={can('manage')?'Your management phase is ready.':'Use both actions for every ally to enter equipment management.'}><GameIcon name="armor" size={20}/>Manage</button><button className="quiet-button" aria-label="Train powers · 1 action" disabled={!can('train')} onClick={()=>open?.('train')}><GameIcon name="train" size={20}/>Train · 1 action</button></div>}
  </aside>
  <div className="sheet-content">
   <header className="sheet-dossier-heading"><div><span className="sheet-eyebrow">CHRONICLES OF LORDAERON</span><h3>Character dossier</h3></div><span className="sheet-dossier-class"><GameIcon name={d.classId} size={24}/>{d.classId}</span></header>
   <div className="sheet-levels" aria-label="Level capacities">{d.capacities.map((v,i)=><div className={h.level===i+1?'current':''} key={i} role="group" aria-label={`Level ${i+1}: ${v.health} health, ${v.energy} energy, ${p.xp[i]} XP`}><b>{['I','II','III','IV','V'][i]}</b><span><i className="health"><GameIcon name="health" size={16}/>{v.health}</i><i className="energy"><GameIcon name="energy" size={16}/>{v.energy}</i></span><small>{p.xp[i]} XP</small></div>)}</div>
   <nav className="sheet-tabs" aria-label="Character sections">{([['sheet','Equipment',slots.length,'armor'],['class','Class deck',24-h.learned.length-h.talents.length,'train'],['spellbook','Spellbook',h.learned.length,'arcane'],['bag','Bag',`${bagSize(p,h.bag)} / 3`,'bag'],['talents','Talents',`${h.talents.length} / 4`,'experience']] as const).map(([id,label,n,icon])=><button key={id} aria-pressed={tab===id} onClick={()=>{setTab(id);setCardPage(0);}}><GameIcon name={icon} size={19}/>{label}<b>{n}</b></button>)}</nav>
   <div className={`sheet-pane sheet-pane-${tab}`}>
    {tab==='sheet'&&<><div className="sheet-section-title"><h3>Powers & equipment</h3><span>{slots.filter((s,i)=>h.slots[i]?.card??s.printed).length} / {slots.length} slots filled <i/> Hover to preview</span></div><div className="sheet-equipment-grid">{slots.map(slotView)}</div></>}
    {tab==='class'&&<ClassDeck hero={h} inspect={inspect} legal={legal} onLearn={preview?undefined:()=>open?.('train')}/>}
    {tab==='spellbook'&&<><div className="sheet-section-title"><h3>{d.classId} spellbook</h3><span>{h.learned.length} learned · equip during management</span><button className="quiet-button" onClick={()=>setTab('class')}>Browse class deck</button></div>{!h.learned.length&&<p className="panel-empty">Your spellbook is empty. Buy powers from your class deck with a Train or Town action.</p>}<div className="sheet-card-grid">{learnedPowers.slice(visibleCardPage*6,(visibleCardPage+1)*6).map(c=><div key={c.id} className="spell-entry learned"><CardThumbnail card={c} onClick={()=>inspect(c.id)} footer={equippedIds.includes(c.id)?'Equipped':'Learned · ready to equip'}/></div>)}</div></>}
    {tab==='bag'&&<><div className="sheet-section-title"><h3>Traveller’s satchel</h3><span>3 item slots · special items do not count</span>{bagPages>1&&<div className="sheet-page-controls"><button className="quiet-button" aria-label="Previous inventory page" disabled={!visibleBagPage} onClick={()=>setBagPage(visibleBagPage-1)}>‹</button><span>{visibleBagPage+1} / {bagPages}</span><button className="quiet-button" aria-label="Next inventory page" disabled={visibleBagPage===bagPages-1} onClick={()=>setBagPage(visibleBagPage+1)}>›</button></div>}</div><div className="sheet-card-grid">{inventory.slice(visibleBagPage*6,(visibleBagPage+1)*6).map(({id,special,slot},i)=>id?<CardThumbnail key={`${id}-${i}`} card={card(p,id)} onClick={()=>inspect(id)} footer={special?'Special item · outside bag capacity':`Bag slot ${slot}`}/>:<div className="bag-empty" key={`empty-${slot}`}><AbilityArt icon="town"/><strong>Bag slot {slot}</strong><span>Ready for your next reward</span></div>)}</div></>}
    {tab==='talents'&&<><div className="sheet-section-title"><h3>{talentLibrary?`${d.classId} talents`:'Path of mastery'}</h3><span>{talentLibrary?'Hover to enlarge · click to inspect':'One permanent talent at each new level'}</span><button className="quiet-button" onClick={()=>{setTalentLibrary(!talentLibrary);setCardPage(0);}}>{talentLibrary?'Chosen talents':'Browse all talents'}</button></div>{talentLibrary?<div className="sheet-card-grid">{classTalents.slice(visibleCardPage*6,(visibleCardPage+1)*6).map(c=><CardThumbnail key={c.id} card={c} onClick={()=>inspect(c.id)} footer={h.talents.includes(c.id)?'Chosen talent':`Level ${c.level} · permanent`}/>)}</div>:<div className="talent-slots">{[2,3,4,5].map((level,i)=>{const id=h.talents[i];return <section key={level}><header>LEVEL {['','I','II','III','IV','V'][level]}<span>{level<=h.level?'Unlocked':`${p.xp[level-1]} XP`}</span></header>{id?<CardThumbnail card={card(p,id)} onClick={()=>inspect(id)} footer="Chosen · permanent"/>:<div className="slot-placeholder"><AbilityArt icon="train"/><strong>{level<=h.level?'Talent choice pending':'A new talent awaits'}</strong><span>Choose a talent at level {level}</span></div>}</section>;})}</div>}</>}
   </div>
   {((tab==='talents'&&talentLibrary)||tab==='spellbook')&&cardPages>1&&<nav className="sheet-gallery-pages" aria-label="Character card pages"><button className="quiet-button" disabled={!visibleCardPage} onClick={()=>setCardPage(visibleCardPage-1)}>Previous</button><span>{visibleCardPage+1} / {cardPages}</span><button className="quiet-button" disabled={visibleCardPage+1===cardPages} onClick={()=>setCardPage(visibleCardPage+1)}>Next</button></nav>}
  </div>
 </article>;
}
