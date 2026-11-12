import { type PointerEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon, useModalDialog } from '../components';
import { BASE_PACK as p } from '../data/base';
import { BOARD, BOARD_VIEW as board, LEGACY_BOARD, ZONE_COLORS, walkingLine } from '../data/board-geometry';
import { capacity, card, character, contentFor, revised } from '../rules/common';
import type { Command, Color } from '../rules/model';
import type { GameView } from '../rules/view';
import { clampCamera, OVERVIEW_CAMERA, panCamera, pinchCamera, questMarkers, zoomCamera, questLabel, type Pinch, type QuestMarker } from './map-state';
import { BoardTokenArt } from './Art';
import { creatureStacks, MapPortraitToken, type TokenHelp, type ShowTokenHelp } from './MapTokens';
import { boardTokenPositions, labelLines } from './token-layout';
import { encounterProfile, ThreatLevel } from './feedback';
import { ExperienceTrack, TurnTrack } from './BoardTracks';
import { SCANS } from './scan-assets';
import { bossRuleText, eventText } from './event-text';
import { FLAT_RELIEF, lie, LYING_BOX, LYING_RELIEF, outline, sizeAt } from './lying-board';

/** Where the step being announced happened (campaign/stage.ts): the region, and for a journey where it began and the regions it passed. */
export type Spotlight = { region?: string; from?: string; path?: string[] };
type Props = { spotlight?: Spotlight; focused: boolean; onToggleFocus: () => void; state: GameView; selected: string; heroId: string; legal: Command[]; onSelect: (id: string) => void; onMove: (c: Command) => void; selectedQuest?: string; onQuest?: (id: string, region: string) => void; onInspectQuest?: (id: string) => void; onHero?: (id: string) => void; controlled?: string[]; };
const ratio = board.width / board.height;
const colorLabel: Record<Color,string> = { green: "green", red: "red", blue: "blue" };

const RAISED_KEY='lordaeron-board-raised';
/** The live board is shown lying on the table, seen a little from the front (lying-board.ts); a player may prefer it flat. */
function loadRaised(){try{return localStorage.getItem(RAISED_KEY)!=='flat';}catch{return true;}}
export default function CampaignMap({ state, selected, heroId, legal, onSelect, onMove, focused, onToggleFocus, selectedQuest, onQuest, onInspectQuest, onHero, controlled, spotlight }: Props) {
 // A campaign is drawn on the board it is played on: the corrected one from rules revision 4, the first tracing before.
 const geo=revised(state,4)?BOARD:LEGACY_BOARD,regions=contentFor(p,state).regions;
 const centers=useMemo(()=>Object.fromEntries(geo.shapes.map(s=>[s.id,s.center])),[geo]),regionById=useMemo(()=>Object.fromEntries(regions.map(r=>[r.id,r])),[regions]);
 const [camera,setCamera]=useState(OVERVIEW_CAMERA),[dragging,setDragging]=useState(false),[routeIndex,setRouteIndex]=useState(0),[showLabels,setShowLabels]=useState(true),[showRules,setShowRules]=useState(false),[strongBorders,setStrongBorders]=useState(false),[raised,setRaised]=useState(loadRaised),[showDetails,setShowDetails]=useState(false);
 const [tokenHelp,setTokenHelp]=useState<(TokenHelp&{x:number;y:number;below:boolean})|null>(null);
 // In the overview the board lies on the table, unless the player prefers it flat: every point is then drawn where it is seen
 // from the front, and whatever stands on the board at the size it has there (lying-board.ts). The fullscreen map is always
 // flat, and there every helper below hands back exactly what the flat board always had.
 const lying=raised&&!focused;
 const at=(v:readonly number[])=>lying?lie(v):v;
 const points=(id:string)=>geo.byId[id].points.map(v=>at(v).join(',')).join(' ');
 /** The transform of something standing at a point of the board, shifted from that point by a few of its own units. */
 const stand=(x:number,y:number,dx=0,dy=0)=>{if(!lying)return `translate(${x+dx},${y+dy})`;const[X,Y]=lie([x,y]);return `translate(${X},${Y}) scale(${sizeAt(y)})${dx||dy?` translate(${dx},${dy})`:''}`;};
 /** A name keeps its x and y on the flat board; on the lying one it is moved and sized as one piece. */
 const named=(x:number,y:number)=>lying?{transform:stand(x,y)}:{x,y};
 /** A counter's place and size. */
 const piece=(x:number,y:number)=>{const[X,Y]=at([x,y]);return {x:X,y:Y,scale:lying?sizeAt(y):undefined};};
 /** The board's own rectangle, or a frame inset from its edge: a rectangle when flat, its four corners as they are seen when lying. */
 const sheet=(inset:number,props:{className?:string;fill?:string;pointerEvents?:'none'})=>lying?<polygon points={outline(inset).map(v=>v.join(',')).join(' ')} {...props}/>:<rect x={board.x+inset} y={board.y+inset} width={board.width-inset*2} height={board.height-inset*2} {...props}/>;
 const fold=(a:number[],b:number[],key?:number)=>{const[x1,y1]=at(a),[x2,y2]=at(b);return <line key={key} x1={x1} y1={y1} x2={x2} y2={y2}/>;};
 /** A flight is drawn as an arc over the board, a walk as the line through the shared border. */
 const arc=(a:readonly number[],b:readonly number[])=>`M${at(a).join(',')} Q${at([(a[0]+b[0])/2,Math.min(a[1],b[1])-100]).join(',')} ${at(b).join(',')}`;
 const walk=(from:string,to:string)=>`M${walkingLine(from,to,geo).map(v=>at(v).join(',')).join(' L')}`;
 const canvas=useRef<HTMLDivElement>(null),entryButton=useRef<HTMLButtonElement>(null),tooltip=useRef<HTMLDivElement>(null);
 const fullscreen=useRef<HTMLDialogElement>(null);
 useModalDialog(fullscreen,focused);
 const drag=useRef<{x:number;y:number;panX:number;panY:number}|null>(null),didDrag=useRef(false),previousSelection=useRef(selected),wasFocused=useRef(false);
 // Touch points on the fullscreen map: one finger pans, two fingers pinch to zoom.
 const pointers=useRef(new Map<number,{x:number;y:number}>()),pinch=useRef<Pinch|null>(null),cameraNow=useRef(camera);cameraNow.current=camera;
 const gesture=()=>{const el=canvas.current!,r=el.getBoundingClientRect(),[a,b]=[...pointers.current.values()];return {mid:{x:(a.x+b.x)/2-r.left-r.width/2,y:(a.y+b.y)/2-r.top-r.height/2},distance:Math.hypot(a.x-b.x,a.y-b.y)};};
 const release=(e:PointerEvent<HTMLDivElement>)=>{
  pointers.current.delete(e.pointerId);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  const rest=[...pointers.current.values()][0];
  if(pinch.current&&pointers.current.size>=2)pinch.current={camera:cameraNow.current,...gesture()};
  else if(pinch.current){pinch.current=null;drag.current=rest?{x:rest.x,y:rest.y,panX:cameraNow.current.x,panY:cameraNow.current.y}:null;}
  else if(!rest)drag.current=null;
  if(!rest)setDragging(false);
 };
 const markers=useMemo(()=>questMarkers(p,state),[state.quests,state.enemies]);
 // Every token stands inside its own region's border (token-layout.ts).
 const tokenAt=useMemo(()=>boardTokenPositions(p,state,markers,geo),[state.heroes,state.enemies,state.overlord.region,state.world,markers,geo]);
 const me=state.heroes.find(h=>h.id===heroId)!;
 const moves=legal.filter((c):c is Extract<Command,{type:'travel'}>=>c.type==='travel'&&c.hero===heroId);
 const reachable=new Map(moves.map(c=>[c.path.at(-1)!,c.path.length]));
 const destinations=moves.filter(c=>c.path.at(-1)===selected),move=destinations[routeIndex]??destinations[0];
 const destination=regionById[selected],here=state.enemies.filter(e=>e.region===selected),localMarkers=markers.filter(m=>m.region===selected);
 const clamp=(next:typeof camera)=>{const el=canvas.current;return el?clampCamera(next,el.clientWidth,el.clientHeight,ratio):next;};
 const changeZoom=(delta:number)=>{const el=canvas.current;if(el)setCamera(c=>zoomCamera(c,c.zoom+delta,{x:0,y:0},el.clientWidth,el.clientHeight,ratio));};
 const reset=()=>setCamera(OVERVIEW_CAMERA);
 const showTokenHelp:ShowTokenHelp=(help,target)=>{
  const el=canvas.current;if(!help||!target||!el){setTokenHelp(null);return;}
  const bounds=el.getBoundingClientRect(),token=target.getBoundingClientRect();
  const x=Math.max(144,Math.min(bounds.width-144,token.left+token.width/2-bounds.left));
  const centerY=token.top+token.height/2-bounds.top,below=centerY<bounds.height/2;
  setTokenHelp({...help,hint:focused?help.hint:[help.hint,'Open fullscreen to select regions and act on the map.'].filter(Boolean).join(' '),x,y:Math.max(8,Math.min(bounds.height-8,below?token.bottom-bounds.top+12:token.top-bounds.top-12)),below});
 };
 useLayoutEffect(()=>{
  const el=canvas.current,tip=tooltip.current;if(!el||!tip||!tokenHelp)return;
  const width=tip.offsetWidth,height=tip.offsetHeight;
  const x=Math.max(width/2+8,Math.min(el.clientWidth-width/2-8,tokenHelp.x));
  const y=tokenHelp.below?Math.max(8,Math.min(el.clientHeight-height-8,tokenHelp.y)):Math.min(el.clientHeight-8,Math.max(height+8,tokenHelp.y));
  tip.style.left=`${x}px`;tip.style.top=`${y}px`;
 },[tokenHelp]);
 const focusRegion=(id:string)=>{
  const el=canvas.current;if(!el||!centers[id])return;
  const [x,y]=centers[id],scale=Math.min(el.clientWidth/board.width,el.clientHeight/board.height),zoom=Math.max(2,camera.zoom);
  setCamera(clamp({zoom,x:(board.x+board.width/2-x)*scale*zoom,y:(board.y+board.height/2-y)*scale*zoom}));
 };
 useEffect(()=>{
  const el=canvas.current;if(!el)return;
  const resize=new ResizeObserver(()=>{setCamera(c=>clampCamera(c,el.clientWidth,el.clientHeight,ratio));setTokenHelp(null);});
  resize.observe(el);return()=>resize.disconnect();
 },[focused]);
 useEffect(()=>{
  setTokenHelp(null);
  pointers.current.clear();pinch.current=null;
  if(!focused){reset();drag.current=null;setDragging(false);if(wasFocused.current)entryButton.current?.focus();}
  else {canvas.current?.focus();focusRegion(selected);}
  wasFocused.current=focused;
  const el=canvas.current;if(!el||!focused)return;
  const wheel=(e:WheelEvent)=>{
   e.preventDefault();setTokenHelp(null);const rect=el.getBoundingClientRect(),unit=e.deltaMode===1?16:e.deltaMode===2?el.clientHeight:1;
   if(e.ctrlKey||e.metaKey)setCamera(c=>zoomCamera(c,c.zoom+(e.deltaY<0?.18:-.18),{x:e.clientX-rect.left-rect.width/2,y:e.clientY-rect.top-rect.height/2},el.clientWidth,el.clientHeight,ratio));
   else setCamera(c=>panCamera(c,{x:(e.deltaX+(e.shiftKey?e.deltaY:0))*unit,y:(e.shiftKey?0:e.deltaY)*unit},el.clientWidth,el.clientHeight,ratio));
  };
  el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);
 },[focused]);
 useEffect(()=>{if(previousSelection.current!==selected&&focused)focusRegion(selected);previousSelection.current=selected;},[selected,focused]);
 useEffect(()=>setRouteIndex(0),[selected,heroId,state.revision]);
 useEffect(()=>setTokenHelp(null),[state.revision,selected]);
 const allRoute=move?[me.location,...move.path]:[];
 const flight=(a:string,b:string)=>!regionById[a].neighbors.includes(b);
 const blockedReason=selected===me.location?"Your hero is here.":controlled&&!controlled.includes(heroId)?`The AI controls ${character(p,heroId).name.split(' ')[0]}. Select one of your own characters, or take control in Characters.`:destination.home&&destination.home!==character(p,heroId).faction?"The opposing faction’s starting region.":state.enemies.some(e=>e.region===me.location&&e.color==='blue')?"Blue creatures: resolve the mandatory Challenge first.":me.actions<1?"This hero has used both actions.":character(p,heroId).faction!==state.faction?"It is not this hero’s faction’s turn.":state.phase!=='actions'?"Travel is available during the party’s action phase.":!moves.length?"Travel is currently unavailable.":"Outside this action’s range or blocked by blue creatures.";
 const questHelp=(m:QuestMarker):TokenHelp=>({title:m.quest.name,category:`${m.quest.faction==='horde'?'Horde':'Alliance'} quest · ${m.label}`,summary:`${m.remaining} remaining objective${m.remaining===1?'':'s'} in ${regionById[m.region].name}.`,details:creatureStacks(state.enemies.filter(e=>e.quest===m.quest.id&&e.region===m.region&&e.color!=='blue')).map(s=>`${s.count} × ${p.creatures.find(c=>c.id===s.creature)!.name} · ${s.color}`),hint:'Select to track this quest on the map. Blue creatures are not quest objectives.'});
 const creatureHelp=(stack:ReturnType<typeof creatureStacks>[number],region:string):TokenHelp=>{
  const enemies=state.enemies.filter(e=>e.region===region&&e.creature===stack.creature&&e.color===stack.color),creature=p.creatures.find(c=>c.id===stack.creature)!,stats=encounterProfile(state,enemies[0].id)!;
  const quests=[...new Set(enemies.map(e=>e.quest).filter((id):id is string=>!!id&&state.quests.includes(id)))].map(id=>`${questLabel(p,id)} · ${p.quests.find(q=>q.id===id)!.name}`);
  return {title:`${stack.count} × ${creature.name}`,category:`${stack.color} creatures · ${regionById[region].name}`,summary:stack.color==='blue'?'Entering this region ends Travel. Your next action must be Challenge.':'Quest creatures. Defeat the matching group with a Challenge action.',details:[`Each: threat ${stats.threat}+ · ${stats.attack} attack · ${stats.health} health`,...(quests.length?quests.map(q=>`${stack.color==='blue'?'Placed by':'Objective for'} ${q}`):['No active quest association.']),creature.description],hint:stack.color==='blue'?'Blue creatures do not count toward quest completion.':'Select the region to inspect its creatures and quests.'};
 };
 const boss=p.overlords.find(o=>o.id===state.overlord.id)!,bossStats=encounterProfile(state,boss.id)!;
 const map=<section className={`campaign-map territorial-map ${focused?'interacting':'overview'} ${strongBorders?'strong-borders':''} ${lying?'raised':''}`} aria-label="Map of Lordaeron">
  <div className="map-toolbar"><span><Icon name="compass"/>LORDAERON <small>67 REGIONS · 7 ZONES</small></span><div>
   {focused&&<><select className="map-jump" aria-label="Find a region" value={selected} onChange={e=>{onSelect(e.target.value);focusRegion(e.target.value);}}>{regions.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><button className="icon-button" aria-label="Find your hero" onClick={()=>{onSelect(me.location);focusRegion(me.location);}}><Icon name="target"/></button><button className="icon-button" aria-label="Zoom out" onClick={()=>changeZoom(-.25)} disabled={camera.zoom===1}><Icon name="minus"/></button><output className="map-zoom" aria-label="Map zoom">{Math.round(camera.zoom*100)}%</output><button className="icon-button" aria-label="Zoom in" onClick={()=>changeZoom(.25)} disabled={camera.zoom===4}><Icon name="plus"/></button><button className="icon-button" title="Entire map (0)" aria-label="Entire map" onClick={reset}><Icon name="reset"/></button><button className={`icon-button ${showLabels?'selected':''}`} aria-label="Region labels" aria-pressed={showLabels} onClick={()=>setShowLabels(v=>!v)}><Icon name="pin"/></button></>}
   {!focused&&<button className="map-border-toggle" aria-pressed={raised} title={raised?'The board lies on the table, seen slightly from the front. Press for a flat view.':'The board is shown flat. Press to lay it on the table.'} onClick={()=>setRaised(v=>{try{localStorage.setItem(RAISED_KEY,v?'flat':'raised');}catch{/* the choice lasts until the tab closes */}return !v;})}><Icon name="layers" size={14}/>3D</button>}
   <button className="map-border-toggle" aria-pressed={strongBorders} onClick={()=>setStrongBorders(v=>!v)}><Icon name="map" size={14}/>Borders</button>
   <button className="icon-button" aria-label="Map rules" aria-expanded={showRules} onClick={()=>setShowRules(v=>!v)}><Icon name="help"/></button>
   <button ref={entryButton} className="map-interact" aria-pressed={focused} onClick={onToggleFocus}><Icon name={focused?'x':'expand'} size={15}/>{focused?"Done interacting":'Interact with map'}<kbd>{focused?'ESC':'F'}</kbd></button>
  </div></div>
  {showRules&&<div className="map-rules"><strong>One Travel action = up to 2 regions</strong><span>Colored shared border: passable. Black edge: impassable terrain. Regions touching only at a corner are not connected.</span><span>A friendly flight costs 1 step. Entering a region with blue creatures ends movement; your next action must be Challenge. You cannot enter the opposing starting region.</span><a href="https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/wowrules.pdf#page=9" target="_blank" rel="noreferrer">Rulebook · pp. 9–10</a></div>}
  <div ref={canvas} className={`campaign-map-scroll ${dragging?'dragging':''}`} tabIndex={0} role="region" aria-label={focused?"Interactive map: scroll or drag to pan, Control and wheel or plus and minus to zoom, 0 for overview, Escape to exit":"Entire board overview"}
   onKeyDownCapture={e=>{if(!focused&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();}}}
   onKeyDown={e=>{if(!focused)return;if(['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'].includes(e.key)){e.preventDefault();e.stopPropagation();if(e.key==='Escape')onToggleFocus();else if(e.key==='0')reset();else if(e.key==='+'||e.key==='=')changeZoom(.25);else if(e.key==='-')changeZoom(-.25);else setCamera(c=>clamp({...c,x:c.x+(e.key==='ArrowLeft'?70:e.key==='ArrowRight'?-70:0),y:c.y+(e.key==='ArrowUp'?70:e.key==='ArrowDown'?-70:0)}));}}}
   onPointerDown={e=>{if(!focused||e.button!==0){didDrag.current=false;return;}setTokenHelp(null);pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.current.size===2){drag.current=null;didDrag.current=true;setDragging(true);for(const id of pointers.current.keys())try{e.currentTarget.setPointerCapture(id);}catch{/* the pointer already lifted */}pinch.current={camera:cameraNow.current,...gesture()};}
    else if(pointers.current.size===1){didDrag.current=false;drag.current={x:e.clientX,y:e.clientY,panX:camera.x,panY:camera.y};}}}
   onPointerMove={e=>{if(!pointers.current.has(e.pointerId))return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const el=canvas.current;if(pinch.current&&pointers.current.size>=2&&el){const g=gesture();setCamera(pinchCamera(pinch.current,g.mid,g.distance,el.clientWidth,el.clientHeight,ratio));return;}
    const start=drag.current;if(!start)return;if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>5){didDrag.current=true;setDragging(true);e.currentTarget.setPointerCapture(e.pointerId);setCamera(c=>clamp({...c,x:start.panX+e.clientX-start.x,y:start.panY+e.clientY-start.y}));}}}
   onPointerUp={release}
   onPointerCancel={e=>{release(e);if(!pointers.current.size)didDrag.current=false;}}
   onClickCapture={e=>{if(!focused||didDrag.current){e.preventDefault();e.stopPropagation();didDrag.current=false;}}}>
   <svg viewBox={`${board.x} ${board.y} ${board.width} ${board.height}`} style={lying?undefined:{transform:`translate(${camera.x}px,${camera.y}px) scale(${camera.zoom})`}} role="group" aria-label="2D board with 67 bordered regions">
    <defs>
     <clipPath id="map-portrait"><circle r="12"/></clipPath>
     <filter id="token-shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity=".8"/></filter>
     {lying&&<>
      <filter id="board-cast-blur" x="-10%" y="-200%" width="120%" height="500%"><feGaussianBlur stdDeviation="13"/></filter>
      {/* Light falls on the board from the far side of the table: the near edge is a little darker. */}
      <linearGradient id="board-light" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff3d0" stopOpacity=".1"/><stop offset=".45" stopColor="#fff3d0" stopOpacity="0"/><stop offset="1" stopColor="#000" stopOpacity=".2"/></linearGradient>
      <linearGradient id="board-edge-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6b4f2c"/><stop offset=".18" stopColor="#3a2916"/><stop offset="1" stopColor="#120c06"/></linearGradient>
      <clipPath id="board-outline"><polygon points={outline().map(v=>v.join(',')).join(' ')}/></clipPath>
     </>}
    </defs>
    {/* The lying board as an object: its shadow on the table and its near edge. */}
    {lying&&(()=>{const[,,nearRight,nearLeft]=outline(),thick=15*sizeAt(board.y+board.height);return <g className="board-slab" pointerEvents="none"><rect className="board-cast" x={nearLeft[0]+24} y={nearLeft[1]+4} width={nearRight[0]-nearLeft[0]-48} height={30} rx="14" filter="url(#board-cast-blur)"/><path className="board-edge" d={`M${nearLeft} L${nearRight} l-5,${thick} H${nearLeft[0]+5} Z`} fill="url(#board-edge-fill)"/><path className="board-edge-light" d={`M${nearLeft[0]},${nearLeft[1]+.8} H${nearRight[0]}`}/></g>;})()}
    {sheet(0,{fill:'#25291f'})}
    {/* A painting cannot be turned by moving points: the lying board has its terrain painted as it is seen (scripts/prepare-lying-board.ts). */}
    {lying?<image className="board-terrain" href={LYING_RELIEF} {...LYING_BOX} preserveAspectRatio="none" clipPath="url(#board-outline)" pointerEvents="none"/>:<image className="board-terrain" href={FLAT_RELIEF} x={board.x} y={board.y} width={board.width} height={board.height} preserveAspectRatio="none" pointerEvents="none"/>}
    {regions.map(r=><polygon key={r.id} points={points(r.id)} fill={r.home==='horde'?'#8d463a':r.home==='alliance'?'#3d6982':ZONE_COLORS[r.zone].fill} fillOpacity={r.home ? .28 : .06} pointerEvents="none"/>)}
    <g className="board-borders" pointerEvents="none">{geo.borders.map((b,i)=>{const passable=b.regions.length===2,path=`M${at(b.a).join(',')} L${at(b.b).join(',')}`;return <g key={i}><path className="border-underlay" d={path} fill="none" stroke={passable?'#17140e':'#ccb680'} strokeWidth={passable?4.6:6} vectorEffect="non-scaling-stroke" strokeLinecap="round" opacity={strongBorders?1:.35}/><path data-border={passable?'passable':'impassable'} d={path} fill="none" stroke={passable?(strongBorders?'#efd69b':ZONE_COLORS[regionById[b.regions[0]].zone].border):'#080d09'} strokeWidth={passable?(strongBorders?1.7:1):4.1} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/></g>;})}</g>
    <g className="map-zone-titles" pointerEvents="none">{[['TIRISFAL GLADES',439,176],['SILVERPINE FOREST',218,497],['ALTERAC MOUNTAINS',591,491],['HILLSBRAD FOOTHILLS',579,978],['WESTERN PLAGUELANDS',800,169],['EASTERN PLAGUELANDS',1260,117],['THE HINTERLANDS',1100,910]].map(([name,x,y])=><text key={name} {...named(x as number,y as number)} textAnchor="middle">{name}</text>)}</g>
    {/* The physical board folds into six panels and has a printed frame; both stay faint under the regions. */}
    <g className="board-folds" pointerEvents="none">{[1,2].map(i=>fold([board.x+board.width*i/3,board.y],[board.x+board.width*i/3,board.y+board.height],i))}{fold([board.x,board.y+board.height/2],[board.x+board.width,board.y+board.height/2])}</g>
    {sheet(4,{className:'board-frame',pointerEvents:'none'})}
    {lying&&sheet(0,{className:'board-light',fill:'url(#board-light)',pointerEvents:'none'})}
    <g className="map-field-layer">{regions.map(r=>{
     const active=r.id===selected,can=reachable.has(r.id),target=markers.some(m=>m.region===r.id&&m.quest.id===selectedQuest),[x,y]=centers[r.id];
     return <g key={r.id}>
      <polygon className={`map-field ${active?'selected':''} ${can?'reachable':''} ${target?'quest-target':''}`} data-region={r.id} points={points(r.id)} role="button" tabIndex={0} aria-pressed={active} aria-label={`${r.name}${can?` · reachable in ${reachable.get(r.id)} steps`:''}`} onClick={()=>onSelect(r.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(r.id);}}}><title>{`${r.name} · ${r.zone}${can?` · ${reachable.get(r.id)} steps in one action`:''}`}</title></polygon>
      {showLabels&&<text className={`field-name ${active?'active':''}`} {...named(x,y)} textAnchor="middle" pointerEvents="none">{labelLines(r.name).map((line,i,arr)=><tspan x={lying?0:x} dy={i?13:-(arr.length-1)*6} key={i}>{line}</tspan>)}</text>}
      {(r.flight||r.town||r.graveyard)&&<g transform={stand(x,y,0,17)} className={`field-services ${r.flight??r.town??'neutral'}`} pointerEvents="none"><title>{[r.flight?`Flight: ${r.flight==='both'?"both factions":r.flight}`:'',r.town?`Town: ${r.town}`:'',r.graveyard?"Graveyard":''].filter(Boolean).join(' · ')}</title>{r.flight&&<path d="M-10 -4 -3 -1 0 -5 3 -1 10 -4 7 2 0 6 -7 2Z"/>}{r.town&&<path d={`M${r.flight?15:-5},5 v-8 l5,-4 5,4 v8 Z`}/>} {r.graveyard&&<path d="M-3 7 V0 H-7 V-4 H-3 V-8 H3 V-4 H7 V0 H3 V7Z"/>}</g>}
      {can&&<g className="step-counter" transform={stand(x,y,-28,-18)} pointerEvents="none"><circle r="8"/><text y="3" textAnchor="middle">{reachable.get(r.id)}</text></g>}
     </g>;
    })}</g>
    {spotlight?.region&&centers[spotlight.region]&&<g className="map-spotlight" key={`${spotlight.from}:${spotlight.path?.join()}:${spotlight.region}`} pointerEvents="none">
     {spotlight.from&&spotlight.path?.map((id,i,all)=>{const from=i?all[i-1]:spotlight.from!;if(!centers[from]||!centers[id])return null;return <path key={i} className="spotlight-route" d={flight(from,id)?arc(centers[from],centers[id]):walk(from,id)}/>;})}
     <polygon className="spotlight-field" points={points(spotlight.region)}/>
     {(()=>{const[cx,cy]=at(centers[spotlight.region]);return <circle className="spotlight-ring" cx={cx} cy={cy} r={lying?30*sizeAt(centers[spotlight.region][1]):30}/>;})()}
    </g>}
    {move&&<g className="map-route" pointerEvents="none">{move.path.map((id,i)=>{
     const from=allRoute[i],[bx,by]=centers[id],air=flight(from,id),line=air?arc(centers[from],centers[id]):walk(from,id);
     return <g key={i}><path d={line} className={air?'flight-route':'walking-route'}/>{lying?<g transform={stand(bx,by)}><circle cy="-25" r="12"/><text y="-21" textAnchor="middle">{i+1}</text></g>:<><circle cx={bx} cy={by-25} r="12"/><text x={bx} y={by-21} textAnchor="middle">{i+1}</text></>}</g>;
    })}</g>}
    {regions.map(r=>{
     const [x,y]=centers[r.id],enemies=state.enemies.filter(e=>e.region===r.id),people=state.heroes.filter(h=>h.location===r.id);
     const stacks=creatureStacks(enemies);
     const tokens=markers.filter(m=>m.region===r.id);
     // The counters are laid out on the flat board (token-layout.ts) and then stood where that place is seen. Laying the board down
     // or lifting it draws them anew, so that they do not glide between the two views the way they glide between regions.
     return <g key={`${r.id}${lying?':lying':''}`} className="map-tokens">
      {stacks.map(stack=>{const[sx,sy]=tokenAt[`c:${r.id}:${stack.creature}:${stack.color}`]??[x,y+38];return <MapPortraitToken key={stack.creature+stack.color} kind="creature" {...piece(sx,sy)} color={stack.color} count={stack.count} name={p.creatures.find(c=>c.id===stack.creature)!.name} label={`${stack.count} × ${p.creatures.find(c=>c.id===stack.creature)!.name} · ${colorLabel[stack.color]} · ${r.name}`} src={`/assets/tokens/plastic/${stack.creature}-${stack.color}.webp`} onClick={()=>onSelect(r.id)} help={creatureHelp(stack,r.id)} onHelp={showTokenHelp}/>;})}
      {tokens.map((m,i)=>{const help=questHelp(m);return <g key={m.quest.id} role="button" tabIndex={0} aria-label={`${m.label} · ${m.quest.name} · ${m.remaining} objectives · ${r.name}`} aria-describedby={`quest-help-${m.quest.id}-${r.id}`} className={`quest-map-token ${m.quest.faction} ${selectedQuest===m.quest.id?'active':''}`} transform={stand(...(tokenAt[`q:${r.id}:${m.quest.id}`]??[x+36,y-22+i*23]) as [number,number])} onPointerEnter={e=>showTokenHelp(help,e.currentTarget)} onPointerLeave={()=>showTokenHelp(null)} onFocus={e=>showTokenHelp(help,e.currentTarget)} onBlur={()=>showTokenHelp(null)} onClick={()=>{onSelect(r.id);onQuest?.(m.quest.id,r.id);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(r.id);onQuest?.(m.quest.id,r.id);}}}><title>{`${m.quest.name} · ${m.remaining} objectives`}</title><desc id={`quest-help-${m.quest.id}-${r.id}`}>{[help.category,help.summary,...help.details??[],help.hint].join('. ')}</desc><rect className="token-hit-area" x="-22" y="-17" width="44" height="34" rx="5"/><BoardTokenArt index={m.quest.faction==='horde'?0:1} x={-24} y={-19} width={48} height={38}/><text textAnchor="middle" y="5">{m.label}</text></g>;})}
      {people.map((h,i)=>{const d=character(p,h.id),cap=capacity(p,h),[hx,hy]=tokenAt[`h:${h.id}`]??[x+(i-(people.length-1)/2)*49,y-43];return <MapPortraitToken key={h.id} kind="hero" {...piece(hx,Math.max(board.y+40,hy))} src={SCANS.counters[h.id]??`/assets/portraits/${h.id}.webp`} bare={!!SCANS.counters[h.id]} name={d.name} label={`${d.name} · level ${h.level} · ${r.name}`} color={d.faction} active={h.id===heroId} level={h.level} onClick={()=>{onSelect(r.id);onHero?.(h.id);}} help={{title:d.name,category:`${d.faction==='horde'?'Horde':'Alliance'} ${d.classId} · level ${h.level}`,summary:r.name,details:[`${h.health} / ${cap.health} health · ${h.energy} / ${cap.energy} energy`,`${h.gold} gold · ${h.actions} / 2 actions remaining`],hint:'Select to control or inspect this character.'}} onHelp={showTokenHelp}/>;})}
     </g>;
    })}
    {state.overlord.region&&centers[state.overlord.region]&&<MapPortraitToken key={lying?'lying':'flat'} kind="overlord" {...piece((tokenAt.overlord??centers[state.overlord.region])[0],Math.max(board.y+44,(tokenAt.overlord??[0,centers[state.overlord.region][1]-40])[1]))} src={SCANS.tokens[state.overlord.id]??`/assets/portraits/${state.overlord.id}.webp`} bare={!!SCANS.tokens[state.overlord.id]} name={boss.name} label={`Overlord · ${boss.name} · ${regionById[state.overlord.region].name}`} onClick={()=>onSelect(state.overlord.region)} help={{title:boss.name,category:'Overlord · campaign objective',summary:`Defeat the Overlord in ${regionById[state.overlord.region].name}.`,details:[`Threat ${bossStats.threat}+ · ${bossStats.attack} attack · ${bossStats.health} health`,bossRuleText(boss.combat)],hint:'Select this region to plan your party’s final challenge.'}} onHelp={showTokenHelp}/>}
    {(state.world??[]).filter(w=>!w.cleared).flatMap(w=>{const e=p.events.find(e=>e.id===w.id)!;return(e.boss?[e.boss.region]:e.script==='plague'?w.tokens:[]).map(id=>{const [x,y]=centers[id],help:TokenHelp={title:e.name,category:`${e.boss?'World encounter':'Plague token'} · ${regionById[id].name}`,summary:eventText(e),hint:'Select to inspect this region.'};return <g className="world-map-marker" key={`${w.id}-${id}`} transform={stand(...(tokenAt[`w:${id}:${w.id}`]??[x-31,y+19]) as [number,number])} role="button" tabIndex={0} aria-label={`${e.name} · ${regionById[id].name}`} aria-describedby={`event-help-${w.id}-${id}`} onPointerEnter={ev=>showTokenHelp(help,ev.currentTarget)} onPointerLeave={()=>showTokenHelp(null)} onFocus={ev=>showTokenHelp(help,ev.currentTarget)} onBlur={()=>showTokenHelp(null)} onClick={()=>onSelect(id)} onKeyDown={ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();onSelect(id);}}}><title>{e.name}</title><desc id={`event-help-${w.id}-${id}`}>{help.summary}</desc><path d="M-12 0 0-19 12 0 0 11Z" fill={e.boss?'#573665':'#4d6c30'} stroke="#c1ae79" strokeWidth="2"/><text textAnchor="middle" y="2" fontSize="12">{e.boss?'!':'☣'}</text></g>;});})}
    {state.kazzak?.filter(t=>!t.revealed).map(t=>{const[x,y]=centers[t.region],help:TokenHelp={title:'Kazzak clue',category:`Hidden Overlord token · ${regionById[t.region].name}`,summary:t.real===undefined?'One of the five clues hides the real Kazzak. This clue has not been revealed to your faction.':t.real?'Your faction knows the real Kazzak is here.':'Your faction knows this clue is a decoy.',hint:'Select this region to plan your search. Opposing faction knowledge stays hidden.'};return <g className="world-map-marker" key={t.region} transform={stand(x,y,-31,19)} role="button" tabIndex={0} aria-label={`Kazzak clue · ${regionById[t.region].name}`} aria-describedby={`clue-help-${t.region}`} onPointerEnter={ev=>showTokenHelp(help,ev.currentTarget)} onPointerLeave={()=>showTokenHelp(null)} onFocus={ev=>showTokenHelp(help,ev.currentTarget)} onBlur={()=>showTokenHelp(null)} onClick={()=>onSelect(t.region)} onKeyDown={ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();onSelect(t.region);}}}><title>Kazzak clue</title><desc id={`clue-help-${t.region}`}>{help.summary}</desc><circle r="14" fill="#482328" stroke="#cf9569" strokeWidth="2"/><text textAnchor="middle" y="5" fontSize="18">{t.real===undefined?'?':t.real?'!':'×'}</text></g>;})}
    <g className="map-cartouche" transform={stand(1080,965)} pointerEvents="none"><text textAnchor="middle">LORDAERON</text><text textAnchor="middle" y="21" className="cartouche-small">THE WAR TABLE · 2005</text></g>
   </svg>
   {!focused&&<ExperienceTrack state={state}/>}
   {!focused&&<span className="world-view-label">LIVE BOARD <span>Fullscreen to interact</span></span>}
   {focused&&<span className="map-gesture-hint"><span className="pointer-hint">SCROLL / DRAG · PAN &nbsp; SHIFT · HORIZONTAL &nbsp; CTRL + SCROLL · ZOOM</span><span className="touch-hint">DRAG · PAN &nbsp; PINCH · ZOOM &nbsp; TAP · SELECT</span></span>}
   {tokenHelp&&!dragging&&<div ref={tooltip} className={`map-token-tooltip ${tokenHelp.below?'below':'above'}`} role="tooltip" style={{left:tokenHelp.x,top:tokenHelp.y}}><small>{tokenHelp.category}</small><strong>{tokenHelp.title}</strong><p>{tokenHelp.summary}</p>{!!tokenHelp.details?.length&&<ul>{tokenHelp.details.filter(Boolean).map((detail,i)=><li key={i}>{detail}</li>)}</ul>}{tokenHelp.hint&&<em>{tokenHelp.hint}</em>}</div>}
  </div>
  {!focused&&<TurnTrack state={state}/>}
  <div className="map-legend"><span><i className="legend-border passable"/>Passable</span><span><i className="legend-border impassable"/>Impassable</span><span><i className="legend-reachable"/>Range 1–2</span><span><i className="creature-dot blue"/>Stop movement</span><span className="legend-quests"><i className="legend-token horde"/>Horde <i className="legend-token alliance"/>Alliance</span></div>
  {focused&&<>
  <div className="campaign-destination"><div><span className="eyebrow">{destination.zone}</span><h3>{destination.name}</h3><p>{destination.home?"Starting region · ":''}{destination.town?"Town · ":''}{destination.flight?"Flight · ":''}{destination.graveyard?"Graveyard · ":''}{here.length} creatures</p></div><div className="destination-controls">
   <button className="quiet-button region-details-toggle" aria-expanded={showDetails} aria-controls="map-region-details" onClick={()=>setShowDetails(v=>!v)}><Icon name={showDetails?'x':'help'} size={14}/>{showDetails?'Close details':'Region details'}<small>{here.length} creatures · {localMarkers.length} quests</small></button>
   {destinations.length>1&&<select aria-label="Travel route" value={Math.min(routeIndex,destinations.length-1)} onChange={e=>setRouteIndex(Number(e.target.value))}>{destinations.map((m,i)=><option value={i} key={i}>{m.power?card(p,m.power).name:'Travel'}: {m.path.map(id=>regionById[id].name).join(' → ')}</option>)}</select>}
   <button className="gold-button" disabled={!move} onClick={()=>move&&onMove(move)}>Travel here <small>{move?`${move.path.length} ${move.path.length===1?"region":"regions"} · 1 action`:"Unavailable"}</small><Icon name="walk"/></button>
  </div></div>
  <div className="map-travel-detail" aria-live="polite">{move?<><span className="route-origin">{regionById[me.location].name}</span>{move.path.map((id,i)=><span key={i}><Icon name={flight(allRoute[i],id)?'wind':'right'} size={12}/><b>{i+1}</b>{regionById[id].name}</span>)}{move.power&&<em>{card(p,move.power).name}</em>}{here.some(e=>e.color==='blue')&&<em>Blue creatures end movement.</em>}</>:<span>{blockedReason}</span>}</div>
  {showDetails&&<aside id="map-region-details" className="map-region-details" aria-label={`Region details: ${destination.name}`}><header><strong>{destination.name}</strong><button className="icon-button" aria-label="Close region details" onClick={()=>setShowDetails(false)}><Icon name="x" size={14}/></button></header><div className="destination-units" aria-label="Units in selected region">{creatureStacks(here).map(stack=>{const c=p.creatures.find(c=>c.id===stack.creature)!,stats=encounterProfile(state,here.find(e=>e.creature===stack.creature&&e.color===stack.color)!.id)!;return <span className={stack.color} key={stack.creature+stack.color}><img src={`/assets/tokens/${stack.creature}.webp`} alt=""/><b>{stack.count} × {c.name}</b><small><ThreatLevel value={stats.threat} compact/> · {stats.attack} attack · {stats.health} health</small></span>;})}{state.heroes.filter(h=>h.location===selected).map(h=><span key={h.id}><img src={`/assets/portraits/${h.id}.webp`} alt=""/><b>{character(p,h.id).name}</b><small>Level {h.level} · {h.health} health</small></span>)}{state.overlord.region===selected&&<span className="overlord"><img src={`/assets/portraits/${state.overlord.id}.webp`} alt=""/><b>{p.overlords.find(o=>o.id===state.overlord.id)!.name}</b><small><ThreatLevel value={encounterProfile(state,state.overlord.id)!.threat} compact/> · Overlord</small></span>}</div>
  {localMarkers.length>0&&<div className="destination-quests">{localMarkers.map(m=><button key={m.quest.id} className={selectedQuest===m.quest.id?'selected':''} onClick={()=>onInspectQuest?.(m.quest.id)}><span className={`quest-reference ${m.quest.faction}`}>{m.label}</span>{m.quest.name}<small>{m.remaining} objectives</small><Icon name="book" size={12}/></button>)}</div>}
  {!here.length&&!localMarkers.length&&<p className="region-empty">No creatures or quest objectives in this region.</p>}</aside>}
  </>}
 </section>;
 return focused&&typeof document!=='undefined'?createPortal(<dialog ref={fullscreen} className="campaign-app map-fullscreen-dialog" aria-label="Interact with map" aria-modal="true" onCancel={e=>{e.preventDefault();onToggleFocus();}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onToggleFocus();}}}>{map}</dialog>,document.body):map;
}
