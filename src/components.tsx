import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { ArrowRight, Axe, BookOpen, Bug, Check, ChevronDown, ChevronRight, CircleHelp, Coins, Compass, Crown, Download, Eye, Fish, Flag, Flame, FlaskConical, Footprints, Heart, Home, Layers, Leaf, Map, MapPin, Maximize2, Minus, Moon, Mountain, Music2, Plus, RotateCcw, ScrollText, Search, Settings2, Shield, Skull, Snowflake, Sparkles, Sun, Sword, Swords, Target, Tent, Trophy, Upload, Users, Volume2, VolumeX, Wind, X, Zap, Lock, type LucideIcon } from 'lucide-react';
import { heroDefinition } from './data/content';
import { GameIcon } from './campaign/GameIcon';
export const ICONS: Record<string,LucideIcon>={arrow:ArrowRight,axe:Axe,book:BookOpen,bug:Bug,check:Check,down:ChevronDown,right:ChevronRight,help:CircleHelp,coins:Coins,compass:Compass,crown:Crown,download:Download,eye:Eye,fish:Fish,flag:Flag,flame:Flame,flask:FlaskConical,walk:Footprints,heart:Heart,home:Home,layers:Layers,leaf:Leaf,map:Map,pin:MapPin,expand:Maximize2,minus:Minus,moon:Moon,mountain:Mountain,music:Music2,plus:Plus,reset:RotateCcw,scroll:ScrollText,search:Search,settings:Settings2,shield:Shield,skull:Skull,snow:Snowflake,spark:Sparkles,sun:Sun,sword:Sword,swords:Swords,target:Target,tent:Tent,trophy:Trophy,upload:Upload,users:Users,sound:Volume2,mute:VolumeX,wind:Wind,x:X,bolt:Zap,lock:Lock};
export function Icon({name,size=18,...props}:{name:string;size?:number;className?:string}) {const Component=ICONS[name]??Sparkles;return <Component size={size} strokeWidth={1.6} aria-hidden="true" {...props}/>;}
export function Portrait({id,className='',style={}}:{id:string;className?:string;style?:CSSProperties}){const d=heroDefinition(id);return <span role="img" aria-label={d.name} className={`portrait ${className}`} style={{backgroundPosition:`${d.portrait%3*50}% ${Math.floor(d.portrait/3)*50}%`,...style}}/>;}
type OpenModal = {dialog:HTMLDialogElement;previousFocus:Element|null};
const openModals:OpenModal[]=[];
let overflowBeforeModals = '';
export function useModalDialog(ref:RefObject<HTMLDialogElement|null>,active=true){
  useEffect(()=>{
    if(!active||!ref.current)return;
    const dialog=ref.current,entry:OpenModal={dialog,previousFocus:document.activeElement};
    dialog.showModal();
    if(openModals.length===0)overflowBeforeModals=document.body.style.overflow;
    openModals.push(entry);
    document.body.style.overflow='hidden';
    return()=>{
      const index=openModals.indexOf(entry),wasTop=index===openModals.length-1;
      // A child can outlive its parent. Preserve the original opener in that case.
      for(const other of openModals){
        if(other!==entry&&other.previousFocus&&dialog.contains(other.previousFocus))other.previousFocus=entry.previousFocus;
      }
      openModals.splice(index,1);
      if(dialog.open)dialog.close?.();
      if(openModals.length===0)document.body.style.overflow=overflowBeforeModals;
      const remaining=openModals.at(-1)?.dialog,previous=entry.previousFocus;
      if(wasTop&&previous instanceof HTMLElement&&previous.isConnected&&(!remaining||remaining.contains(previous)))previous.focus({preventScroll:true});
    };
  },[ref,active]);
}
export function Modal({title,children,onClose,wide=false,className=''}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean;className?:string}){
  const ref=useRef<HTMLDialogElement>(null),backdropPress=useRef(false);
  useModalDialog(ref);
  const outside=(event:{target:EventTarget;currentTarget:HTMLDialogElement;clientX:number;clientY:number})=>{
    if(event.target!==event.currentTarget)return false;
    const bounds=event.currentTarget.getBoundingClientRect();
    return event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom;
  };
  return <dialog ref={ref} className={`modal ${wide?'wide':''} ${className}`} aria-label={title} onCancel={e=>{e.preventDefault();onClose();}} onPointerDown={e=>{backdropPress.current=e.button===0&&outside(e);}} onPointerCancel={()=>{backdropPress.current=false;}} onClick={e=>{const dismiss=backdropPress.current&&outside(e);backdropPress.current=false;if(dismiss)onClose();}}><div className="modal-head"><div><span className="eyebrow">LORDAERON · CHRONICLES</span><h2>{title}</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={onClose}><Icon name="x"/></button></div>{children}</dialog>;
}
export function ResourceBar({type,value,max}:{type:'health'|'energy';value:number;max:number}){return <div className={`resource ${type}`}><div className="resource-heading"><span><GameIcon name={type} size={24}/>{type==='health'?"Health":"Energy"}</span><b>{value}<small> / {max}</small></b></div><div className="resource-track"><div style={{width:`${Math.max(0,Math.min(100,value/max*100))}%`}}/></div></div>;}
