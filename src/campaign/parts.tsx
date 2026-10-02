import { AbilityCard } from './design-system';
import RasterCard, { rasterFace } from './RasterCard';
import { effectText, staticCardText } from './rules-text';
import { BASE_PACK as p } from '../data/base';
import { character } from '../rules/common';
import type { Card } from '../rules/model';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CardPortrait from './CardPortrait';
export const pretty=(s:string)=>s.replace(/ · probn[oi]( quest)?/g,'');
export const factionLabel=(f:string)=>f==='horde'?"Horde":f==='alliance'?"Alliance":"Draw";
export const phaseLabel:Record<string,string>={actions:"Party actions",management:"Equipment management",'final-management':"Final PvP preparation",combat:"Combat",reward:"Rewards and new quest",event:"Event",finished:"Campaign end",attacker:"Attack order",pool:"Prepare dice",penalty:'Stun / Curse','after-pool':"After rolling",reroll:"Rerolls",'after-reroll':"Creature effect",'after-tokens':"After hits",tokens:"Place hits",defense:"Defense",wounds:"Assign wounds",resolution:"Resolution",'round-end':"Round end",over:"Combat outcome"};
export function HeroPortrait({id,small=false}:{id:string;small?:boolean}){const c=character(p,id);return <span className={`portrait campaign-portrait ${small?'small':''}`} role="img" aria-label={c.name} style={{backgroundImage:`url(/assets/portraits/${id}.webp)`,backgroundSize:'cover',backgroundPosition:'center 35%'}}/>;}
export function CharacterCard({id}:{id:string}) {return <RasterCard id={`character-${id}`} title={character(p,id).name}/>;}
export {effectText} from './rules-text';
export const cardText=(c:Card)=>[...c.abilities.map(a=>a.effects.map(effectText).join(' · ')),...staticCardText(c)].join(' / ');
export function GameCard({card,disabled=false,onClick,selected=false,footer}:{card:Card;disabled?:boolean;onClick?:()=>void;selected?:boolean;footer?:string}){
 return <AbilityCard card={card} disabled={disabled} onClick={onClick} selected={selected} footer={footer}/>;
}

/** Compact cards occupy their slot; the complete rules live above the surrounding layout. */
export function CardThumbnail({card:c,disabled=false,onClick,selected=false,footer,className='',actionLabel,expanded,controls}:{card:Card;disabled?:boolean;onClick?:()=>void;selected?:boolean;footer?:string;className?:string;actionLabel?:string;art?:'card'|'illustration';expanded?:boolean;controls?:string}){
 const id=useId(),anchor=useRef<HTMLButtonElement>(null),preview=useRef<HTMLDivElement>(null),previewContent=useRef<HTMLDivElement>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),[open,setOpen]=useState(false),[position,setPosition]=useState({left:12,top:12,width:360,height:0,scale:1});
 const cancel=()=>{clearTimeout(timer.current);timer.current=undefined;};
 const show=()=>{cancel();window.dispatchEvent(new CustomEvent('card-preview-open',{detail:id}));setOpen(true);};
 const hide=()=>{cancel();setOpen(false);};
 const leave=()=>{cancel();timer.current=setTimeout(()=>{if(document.activeElement!==anchor.current)setOpen(false);},120);};
 useEffect(()=>{
  const another=(event:Event)=>{if((event as CustomEvent<string>).detail!==id){clearTimeout(timer.current);setOpen(false);}};
  const dismiss=()=>{clearTimeout(timer.current);setOpen(false);};
  const visibility=()=>{if(document.hidden)dismiss();};
  window.addEventListener('card-preview-open',another);
  window.addEventListener('blur',dismiss);
  document.addEventListener('visibilitychange',visibility);
  return()=>{clearTimeout(timer.current);window.removeEventListener('card-preview-open',another);window.removeEventListener('blur',dismiss);document.removeEventListener('visibilitychange',visibility);};
 },[id]);
 useLayoutEffect(()=>{
  if(!open)return;
  const node=preview.current;
  // A modal's animated transform makes ordinary fixed children relative to the
  // modal. The top layer escapes both that transform and its scrolling clips.
  node?.showPopover?.();
  const place=()=>{
   if(!anchor.current||!previewContent.current)return;
   const a=anchor.current.getBoundingClientRect(),content=previewContent.current,b=content.getBoundingClientRect(),gap=12,viewport=window.visualViewport;
   const viewportWidth=viewport?.width??window.innerWidth,viewportHeight=viewport?.height??window.innerHeight;
   const viewportLeft=viewport?.offsetLeft??0,viewportTop=viewport?.offsetTop??0;
   // Measure the unscaled content rather than the constrained shell. Otherwise
   // a long card reports the clipped height and its footer never gets fitted.
   const naturalWidth=content.offsetWidth||b.width||360,naturalHeight=content.offsetHeight||b.height||1;
   const scale=Math.min(1,Math.max(1,viewportWidth-gap*2)/naturalWidth,Math.max(1,viewportHeight-gap*2)/naturalHeight);
   const width=naturalWidth*scale,height=naturalHeight*scale,minLeft=viewportLeft+gap,minTop=viewportTop+gap;
   const right=viewportLeft+viewportWidth-gap,bottom=viewportTop+viewportHeight-gap;
   const maxLeft=Math.max(minLeft,right-width),maxTop=Math.max(minTop,bottom-height);
   let left=a.right+gap,top=a.top+(a.height-height)/2;
   if(left+width>right){left=a.left-width-gap;if(left<minLeft){left=a.left+(a.width-width)/2;top=a.bottom+gap;if(top+height>bottom)top=a.top-height-gap;}}
   setPosition({left:Math.max(minLeft,Math.min(left,maxLeft)),top:Math.max(minTop,Math.min(top,maxTop)),width,height,scale});
  };
  const dismiss=()=>{clearTimeout(timer.current);setOpen(false);};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dismiss();}};
  const outside=(event:Event)=>{if(event.target instanceof Node&&!anchor.current?.contains(event.target)&&!preview.current?.contains(event.target))dismiss();};
  place();
  const observer=typeof ResizeObserver==='undefined'?undefined:new ResizeObserver(place);
  if(previewContent.current)observer?.observe(previewContent.current);
  window.addEventListener('resize',place);window.addEventListener('scroll',place,true);document.addEventListener('keydown',escape,true);
  window.visualViewport?.addEventListener('resize',place);window.visualViewport?.addEventListener('scroll',place);
  document.addEventListener('pointerdown',outside,true);document.addEventListener('focusin',outside);
  return()=>{node?.hidePopover?.();observer?.disconnect();window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);window.visualViewport?.removeEventListener('resize',place);window.visualViewport?.removeEventListener('scroll',place);document.removeEventListener('keydown',escape,true);document.removeEventListener('pointerdown',outside,true);document.removeEventListener('focusin',outside);};
 },[open]);
 return <><button ref={anchor} type="button" className={`card-thumbnail ${selected?'selected':''} ${disabled?'unavailable':''} ${className}`} aria-label={actionLabel??`${onClick?'Inspect':'Preview'} ${pretty(c.name)}`} aria-describedby={open?id:undefined} aria-disabled={disabled||undefined} aria-expanded={expanded} aria-controls={controls} onPointerEnter={event=>{if(event.pointerType!=='touch'){cancel();timer.current=setTimeout(show,180);}}} onPointerLeave={leave} onFocus={show} onBlur={event=>{if(!preview.current?.contains(event.relatedTarget as Node|null))hide();}} onClick={()=>{if(disabled)return;if(onClick){hide();onClick();}else show();}}>
  <span className="card-thumbnail-art"><CardPortrait card={c}/></span>
 </button>{open&&createPortal(<div ref={preview} id={id} popover={typeof HTMLElement.prototype.showPopover==='function'?'manual':undefined} role="tooltip" aria-label={`${pretty(c.name)} full card`} className="card-hover-preview" style={{left:position.left,top:position.top,width:position.width,height:position.height||undefined}} onPointerEnter={cancel} onPointerLeave={leave}><div ref={previewContent} className="card-preview-content" style={{transform:`scale(${position.scale})`}}><GameCard card={c} footer={footer}/><span className="card-preview-hint">{actionLabel?`${actionLabel} · `:onClick?'Click the thumbnail to inspect · ':''}Click outside or press Esc to close <a href={rasterFace(c.id).src} target="_blank" rel="noreferrer" aria-label={`Open full-size ${c.name} card`}>Full size ↗</a></span></div></div>,anchor.current?.closest('dialog')??document.body)}</>;
}
