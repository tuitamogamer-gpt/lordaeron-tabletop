import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components';
import { BASE_PACK as p } from '../data/base';
import { BOARD_BORDERS, BOARD_SHAPE_BY_ID, BOARD_SHAPES, BOARD_VIEW as board, ZONE_COLORS, walkingLine } from '../data/board-geometry';
import { card, character } from '../rules/common';
import type { Command, Color } from '../rules/model';
import type { GameView } from '../rules/view';
import { clampCamera, OVERVIEW_CAMERA, questMarkers, zoomCamera } from './map-state';

type Props = { focused: boolean; onToggleFocus: () => void; state: GameView; selected: string; heroId: string; legal: Command[]; onSelect: (id: string) => void; onMove: (c: Command) => void; selectedQuest?: string; onQuest?: (id: string, region: string) => void; onInspectQuest?: (id: string) => void; };
const ratio = board.width / board.height;
const centers = Object.fromEntries(BOARD_SHAPES.map(s => [s.id, s.center]));
const points = (id: string) => BOARD_SHAPE_BY_ID[id].points.map(p => p.join(',')).join(' ');
const regionById = Object.fromEntries(p.regions.map(r => [r.id,r]));
const colorLabel: Record<Color,string> = { green: 'zelenih', red: 'crvenih', blue: 'plavih' };
function labelLines(name: string) {
 const words = name.replace(/^The /,'').split(' '), lines: string[] = [];
 for(const word of words){if(lines.length && `${lines.at(-1)} ${word}`.length<=16)lines[lines.length-1]+=` ${word}`;else lines.push(word);}
 return lines;
}

export default function CampaignMap({ state, selected, heroId, legal, onSelect, onMove, focused, onToggleFocus, selectedQuest, onQuest, onInspectQuest }: Props) {
 const [camera,setCamera]=useState(OVERVIEW_CAMERA),[dragging,setDragging]=useState(false),[routeIndex,setRouteIndex]=useState(0),[showLabels,setShowLabels]=useState(true),[showRules,setShowRules]=useState(false);
 const canvas=useRef<HTMLDivElement>(null),entryButton=useRef<HTMLButtonElement>(null);
 const drag=useRef<{x:number;y:number;panX:number;panY:number}|null>(null),didDrag=useRef(false),previousSelection=useRef(selected),wasFocused=useRef(false);
 const markers=useMemo(()=>questMarkers(p,state),[state.quests,state.enemies]);
 const me=state.heroes.find(h=>h.id===heroId)!;
 const moves=legal.filter((c):c is Extract<Command,{type:'travel'}>=>c.type==='travel'&&c.hero===heroId);
 const reachable=new Map(moves.map(c=>[c.path.at(-1)!,c.path.length]));
 const destinations=moves.filter(c=>c.path.at(-1)===selected),move=destinations[routeIndex]??destinations[0];
 const destination=regionById[selected],here=state.enemies.filter(e=>e.region===selected),localMarkers=markers.filter(m=>m.region===selected);
 const clamp=(next:typeof camera)=>{const el=canvas.current;return el?clampCamera(next,el.clientWidth,el.clientHeight,ratio):next;};
 const changeZoom=(delta:number)=>{const el=canvas.current;if(el)setCamera(c=>zoomCamera(c,c.zoom+delta,{x:0,y:0},el.clientWidth,el.clientHeight,ratio));};
 const reset=()=>setCamera(OVERVIEW_CAMERA);
 const focusRegion=(id:string)=>{
  const el=canvas.current;if(!el||!centers[id])return;
  const [x,y]=centers[id],scale=Math.min(el.clientWidth/board.width,el.clientHeight/board.height),zoom=Math.max(2,camera.zoom);
  setCamera(clamp({zoom,x:(board.x+board.width/2-x)*scale*zoom,y:(board.y+board.height/2-y)*scale*zoom}));
 };
 useEffect(()=>{
  const el=canvas.current;if(!el)return;
  const resize=new ResizeObserver(()=>setCamera(c=>clampCamera(c,el.clientWidth,el.clientHeight,ratio)));
  resize.observe(el);return()=>resize.disconnect();
 },[]);
 useEffect(()=>{
  if(!focused){reset();drag.current=null;setDragging(false);if(wasFocused.current)entryButton.current?.focus();}
  else canvas.current?.focus();
  wasFocused.current=focused;
  const el=canvas.current;if(!el||!focused)return;
  const wheel=(e:WheelEvent)=>{
   e.preventDefault();const rect=el.getBoundingClientRect();
   setCamera(c=>zoomCamera(c,c.zoom+(e.deltaY<0?.18:-.18),{x:e.clientX-rect.left-rect.width/2,y:e.clientY-rect.top-rect.height/2},el.clientWidth,el.clientHeight,ratio));
  };
  el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);
 },[focused]);
 useEffect(()=>{if(previousSelection.current!==selected&&focused)focusRegion(selected);previousSelection.current=selected;},[selected,focused]);
 useEffect(()=>setRouteIndex(0),[selected,heroId,state.revision]);
 const allRoute=move?[me.location,...move.path]:[];
 const flight=(a:string,b:string)=>!regionById[a].neighbors.includes(b);
 const blockedReason=selected===me.location?'Ovdje je tvoj junak.':destination.home&&destination.home!==character(p,heroId).faction?'Početno polje protivničke frakcije.':state.enemies.some(e=>e.region===me.location&&e.color==='blue')?'Plava stvorenja: prvo riješi obavezni izazov.':me.actions<1?'Junak je potrošio obje akcije.':character(p,heroId).faction!==state.faction?'Frakcija ovog junaka nije na potezu.':!moves.length?'Putovanje trenutno nije dostupno.':'Izvan dosega ove akcije ili iza plave prepreke.';
 return <section className={`campaign-map territorial-map ${focused?'interacting':'overview'}`} aria-label="Mapa Lordaerona">
  <div className="map-toolbar"><span><Icon name="compass"/>LORDAERON <small>67 POLJA · 7 OBLASTI</small></span><div>
   {focused&&<><select className="map-jump" aria-label="Pronađi regiju" value={selected} onChange={e=>{onSelect(e.target.value);focusRegion(e.target.value);}}>{p.regions.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><button className="icon-button" aria-label="Pronađi svog junaka" onClick={()=>{onSelect(me.location);focusRegion(me.location);}}><Icon name="target"/></button><button className="icon-button" aria-label="Smanji mapu" onClick={()=>changeZoom(-.25)} disabled={camera.zoom===1}><Icon name="minus"/></button><output className="map-zoom" aria-label="Uvećanje mape">{Math.round(camera.zoom*100)}%</output><button className="icon-button" aria-label="Povećaj mapu" onClick={()=>changeZoom(.25)} disabled={camera.zoom===4}><Icon name="plus"/></button><button className="icon-button" title="Cijela mapa (0)" aria-label="Cijela mapa" onClick={reset}><Icon name="reset"/></button><button className={`icon-button ${showLabels?'selected':''}`} aria-label="Nazivi regija" aria-pressed={showLabels} onClick={()=>setShowLabels(v=>!v)}><Icon name="pin"/></button></>}
   <button className="icon-button" aria-label="Pravila mape" aria-expanded={showRules} onClick={()=>setShowRules(v=>!v)}><Icon name="help"/></button>
   <button ref={entryButton} className="map-interact" aria-pressed={focused} onClick={onToggleFocus}><Icon name={focused?'x':'expand'} size={15}/>{focused?'Završi interakciju':'Interact with map'}<kbd>{focused?'ESC':'F'}</kbd></button>
  </div></div>
  {showRules&&<div className="map-rules"><strong>Jedna Travel akcija = najviše 2 polja</strong><span>Obojena zajednička granica: prolaz. Crni rub: neprohodan teren. Dodir u uglu nije prolaz.</span><span>Prijateljski let troši 1 korak. Ulazak na plavo stvorenje završava kretanje; sljedeća akcija je Challenge. Tuđe početno polje nije dostupno.</span><a href="https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/wowrules.pdf#page=9" target="_blank" rel="noreferrer">Pravilnik · str. 9–10</a></div>}
  <div ref={canvas} className={`campaign-map-scroll ${dragging?'dragging':''}`} tabIndex={0} role="region" aria-label={focused?'Interaktivna mapa: točkić ili plus i minus za zoom, strelice ili povlačenje za pomak, 0 za pregled, Escape za izlaz':'Pregled cijele table'}
   onKeyDown={e=>{if(!focused)return;if(['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'].includes(e.key)){e.preventDefault();e.stopPropagation();if(e.key==='Escape')onToggleFocus();else if(e.key==='0')reset();else if(e.key==='+'||e.key==='=')changeZoom(.25);else if(e.key==='-')changeZoom(-.25);else setCamera(c=>clamp({...c,x:c.x+(e.key==='ArrowLeft'?70:e.key==='ArrowRight'?-70:0),y:c.y+(e.key==='ArrowUp'?70:e.key==='ArrowDown'?-70:0)}));}}}
   onPointerDown={e=>{didDrag.current=false;if(!focused||e.button!==0)return;drag.current={x:e.clientX,y:e.clientY,panX:camera.x,panY:camera.y};}}
   onPointerMove={e=>{const start=drag.current;if(!start)return;if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>5){didDrag.current=true;setDragging(true);e.currentTarget.setPointerCapture(e.pointerId);setCamera(c=>clamp({...c,x:start.panX+e.clientX-start.x,y:start.panY+e.clientY-start.y}));}}}
   onPointerUp={e=>{drag.current=null;setDragging(false);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
   onPointerCancel={()=>{drag.current=null;didDrag.current=false;setDragging(false);}}
   onClickCapture={e=>{if(didDrag.current){e.preventDefault();e.stopPropagation();didDrag.current=false;}}}>
   <svg viewBox={`${board.x} ${board.y} ${board.width} ${board.height}`} style={{transform:`translate(${camera.x}px,${camera.y}px) scale(${camera.zoom})`}} role="group" aria-label="2D tabla sa 67 omeđenih regija">
    <defs>
     <pattern id="mountain-terrain" width="44" height="39" patternUnits="userSpaceOnUse"><path d="M2 30 15 10 24 25 31 17 43 33 M15 10 16 25 21 30" fill="none" stroke="#aa946e" strokeOpacity=".12" strokeWidth="1.3"/></pattern>
     <clipPath id="playable-regions">{BOARD_SHAPES.map(r=><polygon key={r.id} points={points(r.id)}/>)}</clipPath>
     <clipPath id="map-portrait"><circle r="12"/></clipPath>
     <filter id="token-shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity=".8"/></filter>
    </defs>
    <rect x={board.x} y={board.y} width={board.width} height={board.height} fill="#25291f"/>
    <rect x={board.x} y={board.y} width={board.width} height={board.height} fill="url(#mountain-terrain)"/>
    {p.regions.map(r=><polygon key={r.id} points={points(r.id)} fill={r.home==='horde'?'#8d463a':r.home==='alliance'?'#3d6982':ZONE_COLORS[r.zone].fill} stroke="#090d0b" strokeWidth="6" strokeLinejoin="round"/>)}
    <image href="/assets/warcraft/lordaeron.webp" width="1600" height="1108" clipPath="url(#playable-regions)" opacity=".22" pointerEvents="none"/>
    <g className="board-borders" pointerEvents="none">{BOARD_BORDERS.map((b,i)=><path key={i} data-border={b.regions.length===2?'passable':'impassable'} d={`M${b.a.join(',')} L${b.b.join(',')}`} fill="none" stroke={b.regions.length===2?ZONE_COLORS[regionById[b.regions[0]].zone].border:'#080d09'} strokeWidth={b.regions.length===2?2.4:5} strokeLinejoin="round" strokeLinecap="round"/>)}</g>
    <g className="map-zone-titles" pointerEvents="none">{[['TIRISFAL GLADES',439,176],['SILVERPINE FOREST',218,497],['ALTERAC MOUNTAINS',591,491],['HILLSBRAD FOOTHILLS',579,978],['WESTERN PLAGUELANDS',800,169],['EASTERN PLAGUELANDS',1260,117],['THE HINTERLANDS',1100,910]].map(([name,x,y])=><text key={name} x={x} y={y} textAnchor="middle">{name}</text>)}</g>
    <g className="map-field-layer">{p.regions.map(r=>{
     const active=r.id===selected,can=reachable.has(r.id),target=markers.some(m=>m.region===r.id&&m.quest.id===selectedQuest),[x,y]=centers[r.id];
     return <g key={r.id}>
      <polygon className={`map-field ${active?'selected':''} ${can?'reachable':''} ${target?'quest-target':''}`} data-region={r.id} points={points(r.id)} role="button" tabIndex={0} aria-pressed={active} aria-label={`${r.name}${can?` · dostupno za ${reachable.get(r.id)} koraka`:''}`} onClick={()=>onSelect(r.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(r.id);}}}><title>{`${r.name} · ${r.zone}${can?` · ${reachable.get(r.id)} koraka za jednu akciju`:''}`}</title></polygon>
      {showLabels&&<text className={`field-name ${active?'active':''}`} x={x} y={y} textAnchor="middle" pointerEvents="none">{labelLines(r.name).map((line,i,arr)=><tspan x={x} dy={i?13:-(arr.length-1)*6} key={i}>{line}</tspan>)}</text>}
      {(r.flight||r.town||r.graveyard)&&<g transform={`translate(${x},${y+17})`} className={`field-services ${r.flight??r.town??'neutral'}`} pointerEvents="none"><title>{[r.flight?`Let: ${r.flight==='both'?'obje frakcije':r.flight}`:'',r.town?`Grad: ${r.town}`:'',r.graveyard?'Groblje':''].filter(Boolean).join(' · ')}</title>{r.flight&&<path d="M-10 -4 -3 -1 0 -5 3 -1 10 -4 7 2 0 6 -7 2Z"/>}{r.town&&<path d={`M${r.flight?15:-5},5 v-8 l5,-4 5,4 v8 Z`}/>} {r.graveyard&&<path d="M-3 7 V0 H-7 V-4 H-3 V-8 H3 V-4 H7 V0 H3 V7Z"/>}</g>}
      {can&&<g className="step-counter" transform={`translate(${x-28},${y-18})`} pointerEvents="none"><circle r="8"/><text y="3" textAnchor="middle">{reachable.get(r.id)}</text></g>}
     </g>;
    })}</g>
    {move&&<g className="map-route" pointerEvents="none">{move.path.map((id,i)=>{
     const from=allRoute[i],[ax,ay]=centers[from],[bx,by]=centers[id],air=flight(from,id),line=air?`M${ax},${ay} Q${(ax+bx)/2},${Math.min(ay,by)-100} ${bx},${by}`:`M${walkingLine(from,id).map(p=>p.join(',')).join(' L')}`;
     return <g key={i}><path d={line} className={air?'flight-route':'walking-route'}/><circle cx={bx} cy={by-25} r="12"/><text x={bx} y={by-21} textAnchor="middle">{i+1}</text></g>;
    })}</g>}
    {p.regions.map(r=>{
     const [x,y]=centers[r.id],enemies=state.enemies.filter(e=>e.region===r.id),people=state.heroes.filter(h=>h.location===r.id);
     const counts=(['green','red','blue'] as Color[]).map(color=>({color,count:enemies.filter(e=>e.color===color).length})).filter(c=>c.count);
     const tokens=markers.filter(m=>m.region===r.id);
     return <g key={r.id} className="map-tokens">
      {counts.map(({color,count},i)=><g key={color} className={`creature-counter ${color}`} transform={`translate(${x+(i-(counts.length-1)/2)*23},${y+33})`} pointerEvents="none"><title>{`${count} ${colorLabel[color]} stvorenja u ${r.name}`}</title><circle r="10"/><text textAnchor="middle" y="4">{count}</text></g>)}
      {tokens.map((m,i)=><g key={m.quest.id} role="button" tabIndex={0} aria-label={`${m.label} · ${m.quest.name} · ${m.remaining} meta · ${r.name}`} className={`quest-map-token ${m.quest.faction} ${selectedQuest===m.quest.id?'active':''}`} transform={`translate(${x+36},${y-22+i*23})`} onClick={()=>{onSelect(r.id);onQuest?.(m.quest.id,r.id);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(r.id);onQuest?.(m.quest.id,r.id);}}}><title>{`${m.quest.name} · ${m.remaining} meta`}</title><path d="M-20 -11 H20 V8 L0 14 -20 8Z"/><text textAnchor="middle" y="4">{m.label}</text></g>)}
      {people.map((h,i)=>{const d=character(p,h.id);return <g key={h.id} className="map-hero" transform={`translate(${x+(i-(people.length-1)/2)*28},${y-36})`} filter="url(#token-shadow)" pointerEvents="none"><title>{`${d.name} · ${r.name}`}</title><image href="/assets/warcraft/characters-base.webp" clipPath="url(#map-portrait)" x={-12-d.portrait%4*24} y={-12-Math.floor(d.portrait/4)*24} width="96" height="96"/><circle r="13" fill="none" stroke={h.id===heroId?'#fff0b3':d.faction==='horde'?'#e5806a':'#8cb9ec'} strokeWidth={h.id===heroId?3:2}/></g>;})}
     </g>;
    })}
    {state.overlord.region&&centers[state.overlord.region]&&<g className="map-overlord" transform={`translate(${centers[state.overlord.region][0]},${centers[state.overlord.region][1]-33})`} pointerEvents="none"><title>{p.overlords.find(o=>o.id===state.overlord.id)?.name}</title><path d="M-15 6 -18 -9 -7 -3 0 -15 7 -3 18 -9 15 6Z"/></g>}
    {(state.world??[]).filter(w=>!w.cleared).flatMap(w=>{const e=p.events.find(e=>e.id===w.id)!;return(e.boss?[e.boss.region]:e.script==='plague'?w.tokens:[]).map(id=>{const [x,y]=centers[id];return <g className="world-map-marker" key={`${w.id}-${id}`} transform={`translate(${x-31},${y+19})`} pointerEvents="none"><title>{e.name}</title><path d="M-12 0 0-19 12 0 0 11Z" fill={e.boss?'#573665':'#4d6c30'} stroke="#c1ae79" strokeWidth="2"/><text textAnchor="middle" y="2" fontSize="12">{e.boss?'!':'☣'}</text></g>;});})}
    {state.kazzak?.filter(t=>!t.revealed).map(t=>{const[x,y]=centers[t.region];return <g className="world-map-marker" key={t.region} transform={`translate(${x-31},${y+19})`} pointerEvents="none"><title>Kazzakov trag</title><circle r="14" fill="#482328" stroke="#cf9569" strokeWidth="2"/><text textAnchor="middle" y="5" fontSize="18">{t.real===undefined?'?':t.real?'!':'×'}</text></g>;})}
    <g className="map-cartouche" transform="translate(1080,965)" pointerEvents="none"><text textAnchor="middle">LORDAERON</text><text textAnchor="middle" y="21" className="cartouche-small">THE WAR TABLE · 2005</text></g>
   </svg>
   {!focused&&<span className="world-view-label">WORLD VIEW <span>Pregled table</span></span>}
   {focused&&<span className="map-gesture-hint">TOČKIĆ · ZOOM &nbsp; POVUCI · POMAK &nbsp; 0 · CIJELA MAPA</span>}
  </div>
  <div className="map-legend"><span><i className="legend-border passable"/>Prolaz</span><span><i className="legend-border impassable"/>Neprohodno</span><span><i className="legend-reachable"/>Doseg 1–2</span><span><i className="creature-dot blue"/>Zaustavljanje</span><span className="legend-quests"><i className="legend-token horde"/>Horda <i className="legend-token alliance"/>Alijansa</span></div>
  <div className="campaign-destination"><div><span className="eyebrow">{destination.zone}</span><h3>{destination.name}</h3><p>{destination.home?'Početno polje · ':''}{destination.town?'Grad · ':''}{destination.flight?'Let · ':''}{destination.graveyard?'Groblje · ':''}{here.length} stvorenja</p></div><div className="destination-controls">
   {destinations.length>1&&<select aria-label="Putanja putovanja" value={Math.min(routeIndex,destinations.length-1)} onChange={e=>setRouteIndex(Number(e.target.value))}>{destinations.map((m,i)=><option value={i} key={i}>{m.power?card(p,m.power).name:'Travel'}: {m.path.map(id=>regionById[id].name).join(' → ')}</option>)}</select>}
   <button className="gold-button" disabled={!move} onClick={()=>move&&onMove(move)}>Putuj ovdje <small>{move?`${move.path.length} ${move.path.length===1?'polje':'polja'} · 1 akcija`:'Nedostupno'}</small><Icon name="walk"/></button>
  </div></div>
  <div className="map-travel-detail" aria-live="polite">{move?<><span className="route-origin">{regionById[me.location].name}</span>{move.path.map((id,i)=><span key={i}><Icon name={flight(allRoute[i],id)?'wind':'right'} size={12}/><b>{i+1}</b>{regionById[id].name}</span>)}{move.power&&<em>{card(p,move.power).name}</em>}{here.some(e=>e.color==='blue')&&<em>Plavo stvorenje završava kretanje.</em>}</>:<span>{blockedReason}</span>}</div>
  {localMarkers.length>0&&<div className="destination-quests">{localMarkers.map(m=><button key={m.quest.id} className={selectedQuest===m.quest.id?'selected':''} onClick={()=>onInspectQuest?.(m.quest.id)}><span className={`quest-reference ${m.quest.faction}`}>{m.label}</span>{m.quest.name}<small>{m.remaining} meta</small><Icon name="book" size={12}/></button>)}</div>}
 </section>;
}
