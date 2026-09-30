import { GameIcon } from './GameIcon';
import { AbilityCard, CardFrame, triggerLabels } from './design-system';
import { effectText, conditionText, staticCardText } from './rules-text';
import { BASE_PACK as p } from '../data/base';
import { card, character } from '../rules/common';
import type { Card } from '../rules/model';
import RulesText from './RulesText';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CardPortrait from './CardPortrait';
import { cardEnergyText } from './card-energy';
export const pretty=(s:string)=>s.replace(/ · probn[oi]( quest)?/g,'');
export const factionLabel=(f:string)=>f==='horde'?"Horde":f==='alliance'?"Alliance":"Draw";
export const phaseLabel:Record<string,string>={actions:"Party actions",management:"Equipment management",'final-management':"Final PvP preparation",combat:"Combat",reward:"Rewards and new quest",event:"Event",finished:"Campaign end",attacker:"Attack order",pool:"Prepare dice",penalty:'Stun / Curse','after-pool':"After rolling",reroll:"Rerolls",'after-reroll':"Creature effect",'after-tokens':"After hits",tokens:"Place hits",defense:"Defense",wounds:"Assign wounds",resolution:"Resolution",'round-end':"Round end",over:"Combat outcome"};
export function HeroPortrait({id,small=false}:{id:string;small?:boolean}){const c=character(p,id);return <span className={`portrait campaign-portrait ${small?'small':''}`} role="img" aria-label={c.name} style={{backgroundImage:`url(/assets/portraits/${id}.webp)`,backgroundSize:'cover',backgroundPosition:'center 35%'}}/>;}
export function CharacterCard({id}:{id:string}) {const c=character(p,id);return <CardFrame kind="HERO" title={c.name} subtitle={`${c.race} · ${c.classId} · ${factionLabel(c.faction)}`} accent={c.faction} art={<HeroPortrait id={id}/>} footer={<span>Character capacities · levels 1–5</span>}><span className="character-cap-grid">{c.capacities.map((v,i)=><span key={i}><b>{i+1}</b><span><GameIcon name="health" size={18}/>{v.health}</span><span><GameIcon name="energy" size={18}/>{v.energy}</span></span>)}</span>{c.racial&&<span className="folio-effect"><b>{card(p,c.racial).name}</b><RulesText>{cardText(card(p,c.racial))}</RulesText></span>}<span className="folio-effect"><b>STARTING EQUIPMENT</b>{c.slots.flatMap(s=>s.printed?[card(p,s.printed).name]:[]).join(' · ')}</span></CardFrame>;}
export {effectText} from './rules-text';
export const cardText=(c:Card)=>[...c.abilities.map(a=>a.effects.map(effectText).join(' · ')),...staticCardText(c)].join(' / ');
export function GameCard({card,disabled=false,onClick,selected=false,footer}:{card:Card;disabled?:boolean;onClick?:()=>void;selected?:boolean;footer?:string}){
 const groups=card.abilities.filter((a,i,all)=>!a.usageGroup||all.findIndex(v=>v.usageGroup===a.usageGroup)===i);
 const rule=(a:Card['abilities'][number])=><span key={a.id} className="power-strength-option">{a.cost!==undefined&&<span className="ability-cost">{a.cost} energy</span>}{a.startOnly&&<em>At the start of this step. </em>}{a.condition&&<em>If <RulesText>{conditionText(a.condition)}</RulesText>: </em>}{a.requires&&<em>After using {triggerLabels[card.abilities.find(v=>v.id===a.requires)?.timing??'']??a.requires}. </em>}{a.freeIf&&<em>Free if <RulesText>{conditionText(a.freeIf)}</RulesText>. </em>}<RulesText>{a.effects.map(effectText).join(' · ')}</RulesText></span>;
 return <AbilityCard card={card} disabled={disabled} onClick={onClick} selected={selected} footer={footer}>{groups.map(a=>{const choices=a.usageGroup?card.abilities.filter(v=>v.usageGroup===a.usageGroup):[a];return <span className="folio-effect" key={a.id}><b>{triggerLabels[a.timing]??a.timing}{a.automatic?' · passive':''}</b>{choices.length>1&&<span className="power-choice-label">Choose one strength · {choices.length} options</span>}<span className={choices.length>1?'power-strength-list':''}>{choices.map(rule)}</span></span>;})}{staticCardText(card).map(text=><span className="folio-effect" key={text}><RulesText>{text}</RulesText></span>)}</AbilityCard>;
}

/** Compact cards occupy their slot; the complete rules live above the surrounding layout. */
export function CardThumbnail({card:c,disabled=false,onClick,selected=false,footer,className='',actionLabel}:{card:Card;disabled?:boolean;onClick?:()=>void;selected?:boolean;footer?:string;className?:string;actionLabel?:string}){
 const id=useId(),anchor=useRef<HTMLButtonElement>(null),preview=useRef<HTMLDivElement>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),[open,setOpen]=useState(false),[position,setPosition]=useState({left:12,top:12});
 const cancel=()=>{clearTimeout(timer.current);};
 const show=()=>{cancel();window.dispatchEvent(new CustomEvent('card-preview-open',{detail:id}));setOpen(true);};
 const hide=()=>{cancel();setOpen(false);};
 const leave=()=>{cancel();timer.current=setTimeout(()=>{if(document.activeElement!==anchor.current)setOpen(false);},120);};
 useEffect(()=>{
  const another=(event:Event)=>{if((event as CustomEvent<string>).detail!==id){clearTimeout(timer.current);setOpen(false);}};
  window.addEventListener('card-preview-open',another);
  return()=>{clearTimeout(timer.current);window.removeEventListener('card-preview-open',another);};
 },[id]);
 useLayoutEffect(()=>{
  if(!open)return;
  const place=()=>{
   if(!anchor.current||!preview.current)return;
   const a=anchor.current.getBoundingClientRect(),b=preview.current.getBoundingClientRect(),gap=12;
   const maxLeft=Math.max(gap,window.innerWidth-b.width-gap),maxTop=Math.max(gap,window.innerHeight-b.height-gap);
   let left=a.right+gap,top=a.top+(a.height-b.height)/2;
   if(left+b.width>window.innerWidth-gap){left=a.left-b.width-gap;if(left<gap){left=a.left+(a.width-b.width)/2;top=a.bottom+gap;if(top+b.height>window.innerHeight-gap)top=a.top-b.height-gap;}}
   setPosition({left:Math.max(gap,Math.min(left,maxLeft)),top:Math.max(gap,Math.min(top,maxTop))});
  };
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);}};
  place();
  const observer=typeof ResizeObserver==='undefined'?undefined:new ResizeObserver(place);
  if(preview.current)observer?.observe(preview.current);
  window.addEventListener('resize',place);window.addEventListener('scroll',place,true);document.addEventListener('keydown',escape,true);
  return()=>{observer?.disconnect();window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);document.removeEventListener('keydown',escape,true);};
 },[open]);
 const kind=c.kind==='racial'?'Racial':c.kind==='talent'?'Talent':c.kind==='power'?'Power':c.type==='bag'?'Consumable':'Equipment';
 return <><button ref={anchor} type="button" className={`card-thumbnail ${selected?'selected':''} ${disabled?'unavailable':''} ${className}`} aria-label={actionLabel??`${onClick?'Inspect':'Preview'} ${pretty(c.name)}`} aria-describedby={open?id:undefined} aria-disabled={disabled||undefined} onPointerEnter={event=>{if(event.pointerType!=='touch'){cancel();timer.current=setTimeout(show,180);}}} onPointerLeave={leave} onFocus={show} onBlur={event=>{if(!preview.current?.contains(event.relatedTarget as Node|null))hide();}} onClick={()=>{if(disabled)return;if(onClick){hide();onClick();}else show();}}>
  <span className="card-thumbnail-top"><span>{kind}</span><b>LVL {c.level}</b></span>
  <span className="card-thumbnail-art"><CardPortrait card={c}/></span>
  <strong className="card-thumbnail-name">{pretty(c.name)}</strong>
  <span className="card-thumbnail-footer"><span><GameIcon name="energy" size={12}/>{cardEnergyText(c)}</span><span>{footer??(c.printed?'Starting':c.kind==='talent'?'Permanent':`${c.price} gold`)}</span></span>
 </button>{open&&createPortal(<div ref={preview} id={id} role="tooltip" aria-label={`${pretty(c.name)} full card`} className="card-hover-preview" style={position} onPointerEnter={cancel} onPointerLeave={leave}><GameCard card={c} footer={footer}/><span className="card-preview-hint">{actionLabel?`${actionLabel} · `:onClick?'Click the thumbnail to inspect · ':''}Esc to close</span></div>,anchor.current?.closest('dialog')??document.body)}</>;
}
