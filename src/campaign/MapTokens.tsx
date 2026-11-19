import { useId } from 'react';
import type { Color, Enemy } from '../rules/model';

export interface TokenHelp {
 title: string;
 category: string;
 summary: string;
 details?: string[];
 hint?: string;
 /**
  * The region the thing stands in. While its help is shown the whole region is lit on the map, and `where` says it in words
  * right under the title: a counter near a border must not be taken for one of the region next door.
  */
 region?: string;
 where?: string;
 /** Said in passing (a region pointed at): shown smaller, and nothing is added to it. */
 brief?: boolean;
}
export type ShowTokenHelp = (help: TokenHelp | null, target?: SVGElement) => void;

export function creatureStacks(enemies: Enemy[]) {
 const groups = new Map<string, { creature: string; color: Color; count: number }>();
 for (const e of enemies) { const key = `${e.creature}:${e.color}`, stack = groups.get(key); if (stack) stack.count++; else groups.set(key, { creature: e.creature, color: e.color, count: 1 }); }
 return [...groups.values()].sort((a,b) => a.creature.localeCompare(b.creature) || a.color.localeCompare(b.color));
}

/** Isolated portraits, distinct faction rings, accessible hit areas and live counters. */
export function MapPortraitToken({ x, y, scale, src, name, label, kind, color, count, level, active, bare, onClick, help, onHelp }: {
 x:number; y:number; scale?:number; src:string; name:string; label?:string; kind:'hero'|'overlord'|'creature'; color?:string; count?:number; level?:number; active?:boolean; bare?:boolean; onClick:()=>void; help?:TokenHelp; onHelp?:ShowTokenHelp;
}) {
 const clip=`token-${useId().replace(/:/g,'')}`,r=kind==='overlord'?26:kind==='hero'?21:17;
 // On the lying board a counter is drawn at the size things have where it stands (lying-board.ts); on the flat one at its own size.
 const size=scale?` scale(${scale})`:'';
 // The CSS transform repeats the attribute so that a character's counter can glide to its new region (map.css); creatures simply appear.
 return <g className={`portrait-map-token ${kind} ${color??''} ${active?'active':''}`} transform={`translate(${x},${y})${size}`} style={kind==='creature'?undefined:{transform:`translate(${x}px,${y}px)${size}`}} role="button" tabIndex={0} aria-label={label??name} aria-describedby={help?`${clip}-help`:undefined} onClick={onClick} onPointerEnter={e=>help&&onHelp?.(help,e.currentTarget)} onPointerLeave={()=>onHelp?.(null)} onFocus={e=>help&&onHelp?.(help,e.currentTarget)} onBlur={()=>onHelp?.(null)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onClick();}}}>
  <title>{label??name}</title>{help&&<desc id={`${clip}-help`}>{[help.category,help.summary,...help.details??[],help.hint].filter(Boolean).join('. ')}</desc>}<defs><clipPath id={clip}><circle r={r-2}/></clipPath></defs>
  {/* Where the piece stands: seen only on the lying board (board-3d.css). */}
  <ellipse className="portrait-token-ground" cy={r*.62} rx={r*.92} ry={r*.5}/>
  {bare?<circle className="portrait-token-shadow" r={r+1}/>:<circle className="portrait-token-shadow" r={r+2}/>}{active&&<circle className="portrait-token-active" r={r+5}/>}
  {bare
   ?<image className="portrait-token-counter" href={src} x={-r-3} y={-r-3} width={(r+3)*2} height={(r+3)*2} preserveAspectRatio="xMidYMid meet"/>
   :<><image href={src} x={-r+2} y={-r+2} width={(r-2)*2} height={(r-2)*2} clipPath={`url(#${clip})`} preserveAspectRatio="xMidYMid slice"/><circle className="portrait-token-ring" r={r}/></>}
  {kind==='overlord'&&!bare&&<path className="boss-token-crown" d="M-13-23 -16-35 -7-29 0-39 7-29 16-35 13-23Z"/>}
  {kind==='hero'&&<text className="portrait-token-name" textAnchor="middle" y={-r-7}>{name.split(' ')[0]}</text>}
  {/* One creature needs no number; its badge only hid the border it stands beside. */}
  {(count!==undefined&&count>1||level!==undefined)&&<g className="portrait-token-count" transform={`translate(${r-2},${r-2})`}><circle r={count!==undefined?10:8}/><text textAnchor="middle" y="4">{count??level}</text></g>}
 </g>;
}
