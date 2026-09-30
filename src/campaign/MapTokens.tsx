import { useId } from 'react';
import type { Color, Enemy } from '../rules/model';

export interface TokenHelp {
 title: string;
 category: string;
 summary: string;
 details?: string[];
 hint?: string;
}
export type ShowTokenHelp = (help: TokenHelp | null, target?: SVGElement) => void;

export function creatureStacks(enemies: Enemy[]) {
 const groups = new Map<string, { creature: string; color: Color; count: number }>();
 for (const e of enemies) { const key = `${e.creature}:${e.color}`, stack = groups.get(key); if (stack) stack.count++; else groups.set(key, { creature: e.creature, color: e.color, count: 1 }); }
 return [...groups.values()].sort((a,b) => a.creature.localeCompare(b.creature) || a.color.localeCompare(b.color));
}

/** Isolated portraits, distinct faction rings, accessible hit areas and live counters. */
export function MapPortraitToken({ x, y, src, name, label, kind, color, count, level, active, onClick, help, onHelp }: {
 x:number; y:number; src:string; name:string; label?:string; kind:'hero'|'overlord'|'creature'; color?:string; count?:number; level?:number; active?:boolean; onClick:()=>void; help?:TokenHelp; onHelp?:ShowTokenHelp;
}) {
 const clip=`token-${useId().replace(/:/g,'')}`,r=kind==='overlord'?26:kind==='hero'?21:17;
 return <g className={`portrait-map-token ${kind} ${color??''} ${active?'active':''}`} transform={`translate(${x},${y})`} role="button" tabIndex={0} aria-label={label??name} aria-describedby={help?`${clip}-help`:undefined} onClick={onClick} onPointerEnter={e=>help&&onHelp?.(help,e.currentTarget)} onPointerLeave={()=>onHelp?.(null)} onFocus={e=>help&&onHelp?.(help,e.currentTarget)} onBlur={()=>onHelp?.(null)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onClick();}}}>
  <title>{label??name}</title>{help&&<desc id={`${clip}-help`}>{[help.category,help.summary,...help.details??[],help.hint].filter(Boolean).join('. ')}</desc>}<defs><clipPath id={clip}><circle r={r-2}/></clipPath></defs>
  <circle className="portrait-token-shadow" r={r+2}/>{active&&<circle className="portrait-token-active" r={r+5}/>}
  <image href={src} x={-r+2} y={-r+2} width={(r-2)*2} height={(r-2)*2} clipPath={`url(#${clip})`} preserveAspectRatio="xMidYMid slice"/>
  <circle className="portrait-token-ring" r={r}/>
  {kind==='overlord'&&<path className="boss-token-crown" d="M-13-23 -16-35 -7-29 0-39 7-29 16-35 13-23Z"/>}
  {kind==='hero'&&<text className="portrait-token-name" textAnchor="middle" y={-r-7}>{name.split(' ')[0]}</text>}
  {(count!==undefined||level!==undefined)&&<g className="portrait-token-count" transform={`translate(${r-2},${r-2})`}><circle r={count!==undefined?10:8}/><text textAnchor="middle" y="4">{count??level}</text></g>}
 </g>;
}
