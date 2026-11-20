import { type PointerEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon, useModalDialog } from '../components';
import { BASE_PACK as p } from '../data/base';
import { BOARD, BOARD_VIEW as board, LEGACY_BOARD, ZONE_COLORS, walkingLine } from '../data/board-geometry';
import { capacity, card, character, contentFor, revised } from '../rules/common';
import type { Command, Color, Region } from '../rules/model';
import type { GameView } from '../rules/view';
import { clampCamera, OVERVIEW_CAMERA, panCamera, pinchCamera, questMarkers, zoomCamera, questLabel, type Pinch, type QuestMarker } from './map-state';
import { BoardTokenArt } from './Art';
import { creatureStacks, MapPortraitToken, type TokenHelp, type ShowTokenHelp } from './MapTokens';
import { ServiceBadge, ServiceIcon } from './MapServices';
import { factionName, flightsFrom, placeNames, SERVICE_BOX, serviceName, serviceRule, servicesOf, serves, type Service } from './map-services';
import { boardTokenPositions, labelLines, serviceMarks, TAG } from './token-layout';
import { encounterProfile, ThreatLevel } from './feedback';
import { ExperienceTrack, TurnTrack } from './BoardTracks';
import { SCANS } from './scan-assets';
import { bossRuleText, eventText } from './event-text';
import { FLAT_RELIEF, lie, LYING_BOX, LYING_RELIEF, outline, sizeAt } from './lying-board';
import type { MapDecision } from './map-decision';
import { MapDecisionBar } from './MapDecision';

/** Where the step being announced happened (campaign/stage.ts): the region, and for a journey where it began and the regions it passed. */
export type Spotlight = { region?: string; from?: string; path?: string[] };
/** `standing` shows a character in another region than the game has him in: a figure on its way is walked there one region at a time. */
type Props = { spotlight?: Spotlight; standing?: Record<string,string>; focused: boolean; onToggleFocus: () => void; state: GameView; selected: string; heroId: string; legal: Command[]; onSelect: (id: string) => void; onMove: (c: Command) => void; selectedQuest?: string; onQuest?: (id: string, region: string) => void; onInspectQuest?: (id: string) => void; onHero?: (id: string) => void; controlled?: string[]; /** A decision that is made on the board (map-decision.ts): the map lights the choices and sends the one confirmed. */ decision?: MapDecision; onDecide?: (c: Command) => void; };
const ratio = board.width / board.height;
const colorLabel: Record<Color,string> = { green: "green", red: "red", blue: "blue" };

const RAISED_KEY='lordaeron-board-raised';
/** The live board is shown lying on the table, seen a little from the front (lying-board.ts); a player may prefer it flat. */
function loadRaised(){try{return localStorage.getItem(RAISED_KEY)!=='flat';}catch{return true;}}
export default function CampaignMap({ state: game, selected, heroId, legal, onSelect, onMove, focused, onToggleFocus, selectedQuest, onQuest, onInspectQuest, onHero, controlled, spotlight, standing, decision: asked, onDecide }: Props) {
 // The board shows a figure where the hand has it; everything else (routes, legal moves, details) reads the game.
 const state=useMemo(()=>standing?{...game,heroes:game.heroes.map(h=>standing[h.id]?{...h,location:standing[h.id]}:h)}:game,[game,standing]);
 // A campaign is drawn on the board it is played on: the corrected one from rules revision 4, the first tracing before.
 const geo=revised(state,4)?BOARD:LEGACY_BOARD,regions=contentFor(p,state).regions;
 const centers=useMemo(()=>Object.fromEntries(geo.shapes.map(s=>[s.id,s.center])),[geo]),regionById=useMemo(()=>Object.fromEntries(regions.map(r=>[r.id,r])),[regions]);
 const [camera,setCamera]=useState(OVERVIEW_CAMERA),[dragging,setDragging]=useState(false),[routeIndex,setRouteIndex]=useState(0),[showLabels,setShowLabels]=useState(true),[showRules,setShowRules]=useState(false),[strongBorders,setStrongBorders]=useState(false),[raised,setRaised]=useState(loadRaised),[showDetails,setShowDetails]=useState(false);
 const [tokenHelp,setTokenHelp]=useState<(TokenHelp&{x:number;y:number;below:boolean;box:{left:number;right:number;top:number;bottom:number}})|null>(null);
 // The region under the pointer, when the pointer is on the region itself and not on something that stands in it.
 const [pointed,setPointed]=useState<string>();
 // A decision is made on the fullscreen map only: there every region can be told apart and picked.
 const decision=focused?asked:undefined;
 // What is in hand for the decision being made: the group picked up, and the region it would go to. Nothing is sent before the
 // button at the foot of the map; a question that changes (the next group, the next character) starts with empty hands.
 const [pick,setPick]=useState<{key?:string;source?:string;target?:string}>({});
 const held=decision&&pick.key===decision.key?pick:{};
 const source=decision?.sources?.find(s=>s.key===held.source)??(decision?.sources?.length===1?decision.sources[0]:undefined);
 const offers=decision?decision.targets.filter(t=>!decision.sources||t.source===source?.key):[],offered=new Map(offers.map(t=>[t.region,t]));
 const chosen=held.target?offered.get(held.target):undefined,origin=source?.region??decision?.from;
 /** A click on the board while a decision is made: a lit region is where the piece goes; a group that can move is picked up. */
 const choose=(id:string,creature?:string)=>{
  if(!decision)return;
  if(offered.has(id)){setPick({key:decision.key,source:source?.key,target:id});return;}
  const here=decision.sources?.filter(s=>s.region===id)??[],next=here.find(s=>s.creature===creature)??here[0];
  if(next)setPick({key:decision.key,source:next.key});
 };
 const select=(id:string,creature?:string)=>decision?choose(id,creature):onSelect(id);
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
 const me=game.heroes.find(h=>h.id===heroId)!;
 const moves=legal.filter((c):c is Extract<Command,{type:'travel'}>=>c.type==='travel'&&c.hero===heroId);
 const reachable=new Map(moves.map(c=>[c.path.at(-1)!,c.path.length]));
 const destinations=moves.filter(c=>c.path.at(-1)===selected),move=destinations[routeIndex]??destinations[0];
 const destination=regionById[selected],here=state.enemies.filter(e=>e.region===selected),localMarkers=markers.filter(m=>m.region===selected);
 const clamp=(next:typeof camera)=>{const el=canvas.current;return el?clampCamera(next,el.clientWidth,el.clientHeight,ratio):next;};
 const changeZoom=(delta:number)=>{const el=canvas.current;if(el)setCamera(c=>zoomCamera(c,c.zoom+delta,{x:0,y:0},el.clientWidth,el.clientHeight,ratio));};
 const reset=()=>setCamera(OVERVIEW_CAMERA);
 const showTokenHelp:ShowTokenHelp=(help,target)=>{
  const el=canvas.current;if(!help||!target||!el){setTokenHelp(null);return;}
  // A quest's tag is measured by its own outline: the box of its artwork is wider than what is drawn.
  const outline=target.querySelector?.('.token-hit-area')?.getBoundingClientRect(),bounds=el.getBoundingClientRect(),own=outline&&outline.width>0?outline:target.getBoundingClientRect();
  // The help keeps clear of the whole region it lights, not only of the counter: the region is what must be seen.
  const field=help.region?el.querySelector<SVGElement>(`.map-field[data-region="${help.region}"]`)?.getBoundingClientRect():undefined;
  const token=field&&field.width>0&&field.height>0&&field.width<bounds.width/2&&field.height<bounds.height/2?{left:Math.min(own.left,field.left),right:Math.max(own.right,field.right),top:Math.min(own.top,field.top),bottom:Math.max(own.bottom,field.bottom),get width(){return this.right-this.left;},get height(){return this.bottom-this.top;}}:own;
  const x=Math.max(144,Math.min(bounds.width-144,token.left+token.width/2-bounds.left));
  const centerY=token.top+token.height/2-bounds.top,below=centerY<bounds.height/2;
  // What a region says of itself is short, and is not followed by advice: it is read in passing, with the pointer on the move.
  setTokenHelp({...help,hint:focused||help.brief?help.hint:[help.hint,'Open fullscreen to select regions and act on the map.'].filter(Boolean).join(' '),x,y:Math.max(8,Math.min(bounds.height-8,below?token.bottom-bounds.top+12:token.top-bounds.top-12)),below,box:{left:token.left-bounds.left,right:token.right-bounds.left,top:token.top-bounds.top,bottom:token.bottom-bounds.top}});
 };
 useLayoutEffect(()=>{
  const el=canvas.current,tip=tooltip.current;if(!el||!tip||!tokenHelp)return;
  const width=tip.offsetWidth,height=tip.offsetHeight;
  let x=Math.max(width/2+8,Math.min(el.clientWidth-width/2-8,tokenHelp.x));
  let y=tokenHelp.below?Math.max(8,Math.min(el.clientHeight-height-8,tokenHelp.y)):Math.min(el.clientHeight-8,Math.max(height+8,tokenHelp.y));
  // Where the help has no room above or below the thing it is about, it stands beside it: the thing and its lit region stay in
  // sight. (A tall help used to be pushed down over the very counter it described.)
  const box=tokenHelp.box,room=tokenHelp.below?el.clientHeight-box.bottom-12:box.top-12;
  if(height+8>room){
   const right=box.right+12+width<=el.clientWidth-8,left=box.left-12-width>=8;
   if(right||left){
    x=right?box.right+12+width/2:box.left-12-width/2;
    const top=Math.max(8,Math.min(el.clientHeight-height-8,(box.top+box.bottom)/2-height/2));
    y=tokenHelp.below?top:top+height;
   }
  }
  tip.style.left=`${x}px`;tip.style.top=`${y}px`;
 },[tokenHelp]);
 const focusRegion=(id:string)=>{
  const el=canvas.current;if(!el||!centers[id])return;
  const [x,y]=centers[id],scale=Math.min(el.clientWidth/board.width,el.clientHeight/board.height),zoom=Math.max(2,camera.zoom);
  setCamera(clamp({zoom,x:(board.x+board.width/2-x)*scale*zoom,y:(board.y+board.height/2-y)*scale*zoom}));
 };
 /** Brings several regions into view together: everything a decision offers is seen at once. */
 const fitRegions=(ids:string[])=>{
  const el=canvas.current,found=ids.flatMap(id=>geo.byId[id]?.points??[]);if(!el||!found.length)return;
  const xs=found.map(v=>v[0]),ys=found.map(v=>v[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  const scale=Math.min(el.clientWidth/board.width,el.clientHeight/board.height);
  const zoom=Math.max(1,Math.min(2.6,el.clientWidth/((x1-x0+220)*scale),el.clientHeight/((y1-y0+220)*scale)));
  setCamera(clampCamera({zoom,x:(board.x+board.width/2-(x0+x1)/2)*scale*zoom,y:(board.y+board.height/2-(y0+y1)/2)*scale*zoom},el.clientWidth,el.clientHeight,ratio));
 };
 /** The regions walked through from one region to another, by shared borders. */
 const way=(from:string,to:string)=>{
  const before:Record<string,string>={[from]:''},queue=[from];
  while(queue.length){const at=queue.shift()!;if(at===to)break;for(const next of regionById[at]?.neighbors??[])if(before[next]===undefined){before[next]=at;queue.push(next);}}
  const path:string[]=[];if(before[to]===undefined)return path;for(let at=to;at&&at!==from;at=before[at])path.unshift(at);return path;
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
  else {canvas.current?.focus();if(!asked)focusRegion(selected);}
  wasFocused.current=focused;
  const el=canvas.current;if(!el||!focused)return;
  const wheel=(e:WheelEvent)=>{
   e.preventDefault();setTokenHelp(null);const rect=el.getBoundingClientRect(),unit=e.deltaMode===1?16:e.deltaMode===2?el.clientHeight:1;
   if(e.ctrlKey||e.metaKey)setCamera(c=>zoomCamera(c,c.zoom+(e.deltaY<0?.18:-.18),{x:e.clientX-rect.left-rect.width/2,y:e.clientY-rect.top-rect.height/2},el.clientWidth,el.clientHeight,ratio));
   else setCamera(c=>panCamera(c,{x:(e.deltaX+(e.shiftKey?e.deltaY:0))*unit,y:(e.shiftKey?0:e.deltaY)*unit},el.clientWidth,el.clientHeight,ratio));
  };
  el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);
 },[focused]);
 useEffect(()=>{if(previousSelection.current!==selected&&focused&&!asked)focusRegion(selected);previousSelection.current=selected;},[selected,focused]);
 useEffect(()=>setRouteIndex(0),[selected,heroId,state.revision]);
 // The map opens on everything the decision offers; with a group in hand, on that group and the regions it can reach.
 useEffect(()=>{if(decision)fitRegions([...(origin?[origin]:[]),...(decision.sources&&!source?decision.sources.map(v=>v.region):offers.map(t=>t.region))]);},[focused,decision?.key,source?.key]);
 useEffect(()=>setTokenHelp(null),[state.revision,selected]);
 const allRoute=move?[me.location,...move.path]:[];
 const flight=(a:string,b:string)=>!regionById[a].neighbors.includes(b);
 const blockedReason=selected===me.location?"Your hero is here.":controlled&&!controlled.includes(heroId)?`The AI controls ${character(p,heroId).name.split(' ')[0]}. Select one of your own characters, or take control in Characters.`:destination.home&&destination.home!==character(p,heroId).faction?"The opposing faction’s starting region.":state.enemies.some(e=>e.region===me.location&&e.color==='blue')?"Blue creatures: resolve the mandatory Challenge first.":me.actions<1?"This hero has used both actions.":character(p,heroId).faction!==state.faction?"It is not this hero’s faction’s turn.":state.phase!=='actions'?"Travel is available during the party’s action phase.":!moves.length?"Travel is currently unavailable.":"Outside this action’s range or blocked by blue creatures.";
 const mine=character(p,heroId).name.split(' ')[0];
 /** How the character in hand stands to a region: there already, within this Travel action, or farther. Nothing when he cannot travel now. */
 const reach=(region:string)=>region===me.location?`${mine} stands here.`:reachable.has(region)?`${mine} reaches it with this Travel action (${reachable.get(region)} ${reachable.get(region)===1?'region':'regions'}).`:moves.length?`Farther than ${mine} travels with one action.`:'';
 /** The creatures of a region as a line each: "1 × Ghoul · green · quest H08 Legacy of Evil". */
 const stands=(region:string)=>creatureStacks(state.enemies.filter(e=>e.region===region)).map(stack=>{
  const quests=[...new Set(state.enemies.filter(e=>e.region===region&&e.creature===stack.creature&&e.color===stack.color).map(e=>e.quest).filter((id):id is string=>!!id&&state.quests.includes(id)))];
  return `${stack.count} × ${p.creatures.find(c=>c.id===stack.creature)!.name} · ${stack.color}${stack.color==='blue'?' · stops movement':quests.length?` · quest ${quests.map(id=>`${questLabel(p,id)} ${p.quests.find(q=>q.id===id)!.name}`).join(', ')}`:''}`;
 });
 /** What stands where the journey in hand would end: said beside the button that makes it. */
 const arrival=stands(selected);
 /** What pointing at a region itself says: its name, and exactly what stands in it. */
 const regionHelp=(r:Region):TokenHelp=>{
  const creatures=stands(r.id),people=state.heroes.filter(h=>h.location===r.id).map(h=>character(p,h.id).name.split(' ')[0]),boss=state.overlord.region===r.id?p.overlords.find(o=>o.id===state.overlord.id)!.name:'';
  return {brief:true,title:r.name,category:r.zone,region:r.id,summary:creatures.length?`${creatures.length===1&&creatures[0].startsWith('1 ×')?'One creature stands':'Creatures stand'} here:`:'No creatures stand here.',details:[...creatures,...(boss?[`${boss} · Overlord`]:[]),...(people.length?[`Characters: ${people.join(', ')}`]:[])],hint:reach(r.id)};
 };
 const questHelp=(m:QuestMarker):TokenHelp=>({region:m.region,where:`In ${regionById[m.region].name}`,title:m.quest.name,category:`${m.quest.faction==='horde'?'Horde':'Alliance'} quest · ${m.label}`,summary:`${m.remaining} remaining objective${m.remaining===1?'':'s'} in ${regionById[m.region].name}.`,details:creatureStacks(state.enemies.filter(e=>e.quest===m.quest.id&&e.region===m.region&&e.color!=='blue')).map(s=>`${s.count} × ${p.creatures.find(c=>c.id===s.creature)!.name} · ${s.color}`),hint:'Select to track this quest on the map. Blue creatures are not quest objectives.'});
 const creatureHelp=(stack:ReturnType<typeof creatureStacks>[number],region:string):TokenHelp=>{
  const enemies=state.enemies.filter(e=>e.region===region&&e.creature===stack.creature&&e.color===stack.color),creature=p.creatures.find(c=>c.id===stack.creature)!,stats=encounterProfile(state,enemies[0].id)!;
  const quests=[...new Set(enemies.map(e=>e.quest).filter((id):id is string=>!!id&&state.quests.includes(id)))].map(id=>`${questLabel(p,id)} · ${p.quests.find(q=>q.id===id)!.name}`);
  return {region,where:`Stands in ${regionById[region].name}`,title:`${stack.count} × ${creature.name}`,category:`${stack.color} ${stack.count===1?'creature':'creatures'}`,summary:stack.color==='blue'?'Entering this region ends Travel. Your next action must be Challenge.':'Quest creatures. Defeat the matching group with a Challenge action.',details:[`Each: threat ${stats.threat}+ · ${stats.attack} attack · ${stats.health} health`,...(quests.length?quests.map(q=>`${stack.color==='blue'?'Placed by':'Objective for'} ${q}`):['No active quest association.']),creature.description],hint:[reach(region),stack.color==='blue'?'Blue creatures do not count toward quest completion.':''].filter(Boolean).join(' ')||'Select the region to inspect its creatures and quests.'};
 };
 /** What a town, flight path or graveyard mark says when it is pointed at: whose it is, what it is for, and whether the character in hand may use it. */
 const serviceHelp=(service:Service,r:Region):TokenHelp=>{
  const rule=serviceRule(service,regions,r),mine=character(p,heroId).faction,name=character(p,heroId).name.split(' ')[0];
  return {region:r.id,title:serviceName(service),category:`${r.name} · ${r.zone}`,summary:rule.summary,details:[...rule.details,...(service.side?[`${serves(service.side,mine)?'Open':'Closed'} to ${name} (${factionName(mine)}).`]:[])]};
 };
 const boss=p.overlords.find(o=>o.id===state.overlord.id)!,bossStats=encounterProfile(state,boss.id)!;
 // What is lit: the region of the thing whose help is shown, else the region under the pointer.
 const lit=tokenHelp?.region??pointed;
 const map=<section className={`campaign-map territorial-map ${focused?'interacting':'overview'} ${strongBorders?'strong-borders':''} ${lying?'raised':''} ${decision?'deciding':''}`} aria-label="Map of Lordaeron">
  <div className="map-toolbar"><span><Icon name="compass"/>LORDAERON <small>67 REGIONS · 7 ZONES</small></span><div>
   {focused&&<><select className="map-jump" aria-label="Find a region" value={selected} onChange={e=>{onSelect(e.target.value);focusRegion(e.target.value);}}>{regions.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><button className="icon-button" aria-label="Find your hero" onClick={()=>{onSelect(me.location);focusRegion(me.location);}}><Icon name="target"/></button><button className="icon-button" aria-label="Zoom out" onClick={()=>changeZoom(-.25)} disabled={camera.zoom===1}><Icon name="minus"/></button><output className="map-zoom" aria-label="Map zoom">{Math.round(camera.zoom*100)}%</output><button className="icon-button" aria-label="Zoom in" onClick={()=>changeZoom(.25)} disabled={camera.zoom===4}><Icon name="plus"/></button><button className="icon-button" title="Entire map (0)" aria-label="Entire map" onClick={reset}><Icon name="reset"/></button><button className={`icon-button ${showLabels?'selected':''}`} aria-label="Region labels" aria-pressed={showLabels} onClick={()=>setShowLabels(v=>!v)}><Icon name="pin"/></button></>}
   {!focused&&<button className="map-border-toggle" aria-pressed={raised} title={raised?'The board lies on the table, seen slightly from the front. Press for a flat view.':'The board is shown flat. Press to lay it on the table.'} onClick={()=>setRaised(v=>{try{localStorage.setItem(RAISED_KEY,v?'flat':'raised');}catch{/* the choice lasts until the tab closes */}return !v;})}><Icon name="layers" size={14}/>3D</button>}
   <button className="map-border-toggle" aria-pressed={strongBorders} onClick={()=>setStrongBorders(v=>!v)}><Icon name="map" size={14}/>Borders</button>
   <button className="icon-button" aria-label="Map rules" aria-expanded={showRules} onClick={()=>setShowRules(v=>!v)}><Icon name="help"/></button>
   <button ref={entryButton} className="map-interact" aria-pressed={focused} onClick={onToggleFocus}><Icon name={focused?'x':'expand'} size={15}/>{decision?'Look at the table':focused?"Done interacting":'Interact with map'}<kbd>{focused?'ESC':'F'}</kbd></button>
  </div></div>
  {showRules&&<div className="map-rules"><strong>One Travel action = up to 2 regions</strong><span>Colored shared border: passable. Black edge: impassable terrain. Regions touching only at a corner are not connected.</span><span>A friendly flight costs 1 step. Entering a region with blue creatures ends movement; your next action must be Challenge. You cannot enter the opposing starting region.</span><span>Towns and flight paths carry their faction’s colour: red for the Horde, blue for the Alliance, both colours where both factions use them. Only your own faction’s serve you: the Town action and the better rest in a town, one step between any two flight paths.</span><a href="https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/wowrules.pdf#page=9" target="_blank" rel="noreferrer">Rulebook · pp. 9–10</a></div>}
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
     const active=!decision&&r.id===selected,can=reachable.has(r.id),target=markers.some(m=>m.region===r.id&&m.quest.id===selectedQuest),[x,y]=centers[r.id],places=placeNames(r),lines=labelLines(r.name);
     return <g key={r.id}>
      <polygon className={`map-field ${active?'selected':''} ${can?'reachable':''} ${target?'quest-target':''} ${decision?(offered.has(r.id)||decision.sources?.some(v=>v.region===r.id)?'decision-pick':'decision-out'):''}`} data-region={r.id} points={points(r.id)} role="button" tabIndex={0} aria-pressed={active} aria-label={[r.name,can?`reachable in ${reachable.get(r.id)} steps`:'',offered.has(r.id)?'can be chosen for this decision':decision?.sources?.some(v=>v.region===r.id)?'a group here can be moved':'',...places].filter(Boolean).join(' · ')} onPointerEnter={e=>{/* A finger that touches a region selects it; only a pointer that hovers is told what stands there. */if(e.pointerType!=='touch'){setPointed(r.id);showTokenHelp(regionHelp(r),e.currentTarget);}}} onPointerLeave={()=>{setPointed(undefined);showTokenHelp(null);}} onClick={()=>select(r.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(r.id);}}}><title>{[r.name,r.zone,...places,can?`${reachable.get(r.id)} steps in one action`:''].filter(Boolean).join(' · ')}</title></polygon>
      {showLabels&&<text className={`field-name ${active?'active':''}`} {...named(x,y)} textAnchor="middle" pointerEvents="none">{lines.map((line,i,arr)=><tspan x={lying?0:x} dy={i?13:-(arr.length-1)*6} key={i}>{line}</tspan>)}</text>}
      {/* The marks of the board's key stand under the name: whose a town or a flight path is reads from its colour (map-services.ts). */}
      {(()=>{
       const marks=serviceMarks(geo.byId[r.id],r.name,servicesOf(r));if(!marks.length)return null;
       const first=marks[0],last=marks.at(-1)!,mx=(first.dx-SERVICE_BOX[first.kind].w/2+last.dx+SERVICE_BOX[last.kind].w/2)/2,my=first.dy;
       // The row stands about its own middle, so that the stylesheet can draw it larger where the board is small (map.css).
       return <g className="map-services" transform={stand(x,y,mx,my)}><g className="map-services-size">{marks.map(m=>{const help=serviceHelp(m,r);return <g key={m.kind} className="map-service" data-service={`${r.id}:${m.kind}`} data-side={m.side} transform={`translate(${m.dx-mx},${m.dy-my})`} onPointerEnter={e=>showTokenHelp(help,e.currentTarget)} onPointerLeave={()=>showTokenHelp(null)} onClick={()=>select(r.id)}><ServiceBadge kind={m.kind} side={m.side}/></g>;})}</g></g>;
      })()}
      {can&&<g className="step-counter" transform={stand(x,y,-28,-18)} pointerEvents="none"><circle r="8"/><text y="3" textAnchor="middle">{reachable.get(r.id)}</text></g>}
     </g>;
    })}</g>
    {/* A decision made on the board: every region that is no choice steps back, the group in hand and the regions it may go to are lit,
        and the way to the region pointed at or picked is drawn. */}
    {decision&&<g className="map-decision-layer" pointerEvents="none">
     {regions.filter(r=>!offered.has(r.id)&&r.id!==origin&&!decision.sources?.some(v=>v.region===r.id)).map(r=><polygon key={r.id} className="decision-dim" points={points(r.id)}/>)}
     {decision.sources?.filter((v,i,all)=>all.findIndex(o=>o.region===v.region)===i).map(v=><polygon key={v.region} className={`decision-source ${v.region===source?.region?'held':source?'idle':''}`} data-decision-source={v.region} points={points(v.region)}/>)}
     {!decision.sources&&origin&&centers[origin]&&<polygon className="decision-source held" points={points(origin)}/>}
     {offers.map(t=><polygon key={t.region} className={`decision-target ${t.region===chosen?.region?'chosen':''}`} data-decision-target={t.region} points={points(t.region)}/>)}
     {(()=>{
      const aim=pointed&&offered.has(pointed)?pointed:chosen?.region;if(!aim||!origin||aim===origin||!centers[aim]||!centers[origin])return null;
      const steps=decision.kind==='beasts'?way(origin,aim):[];
      return <g className={`decision-route ${aim===chosen?.region?'chosen':'preview'}`}>{steps.length?steps.map((id,i)=><path key={id} d={walk(i?steps[i-1]:origin,id)}/>):<path d={arc(centers[origin],centers[aim])}/>}</g>;
     })()}
    </g>}
    {spotlight?.region&&centers[spotlight.region]&&<g className="map-spotlight" key={`${spotlight.from}:${spotlight.path?.join()}:${spotlight.region}`} pointerEvents="none">
     {spotlight.from&&spotlight.path?.map((id,i,all)=>{const from=i?all[i-1]:spotlight.from!;if(!centers[from]||!centers[id])return null;return <path key={i} className="spotlight-route" d={flight(from,id)?arc(centers[from],centers[id]):walk(from,id)}/>;})}
     <polygon className="spotlight-field" points={points(spotlight.region)}/>
     {(()=>{const[cx,cy]=at(centers[spotlight.region]);return <circle className="spotlight-ring" cx={cx} cy={cy} r={lying?30*sizeAt(centers[spotlight.region][1]):30}/>;})()}
    </g>}
    {/* The region of whatever is pointed at, lit whole: its counter may stand near a border, its region is never in doubt. */}
    {lit&&centers[lit]&&<g className="map-pointed" key={lit} pointerEvents="none"><polygon className="pointed-field" points={points(lit)}/></g>}
    {/* Where the selected region's flight path leads, in its faction's colour: every other flight path of that faction. */}
    {focused&&destination.flight&&centers[selected]&&<g className="map-flight-network" pointerEvents="none">{(['horde','alliance'] as const).flatMap(f=>flightsFrom(regions,destination,f).map(to=><path key={`${f}:${to.id}`} className={f} data-flight={`${f}:${to.id}`} d={arc(centers[selected],centers[to.id])}/>))}</g>}
    {move&&<g className="map-route" pointerEvents="none">{move.path.map((id,i)=>{
     const from=allRoute[i],[bx,by]=centers[id],air=flight(from,id),line=air?arc(centers[from],centers[id]):walk(from,id);
     return <g key={i}><path d={line} className={air?`flight-route ${character(p,heroId).faction}`:'walking-route'}/>{lying?<g transform={stand(bx,by)}><circle cy="-25" r="12"/><text y="-21" textAnchor="middle">{i+1}</text></g>:<><circle cx={bx} cy={by-25} r="12"/><text x={bx} y={by-21} textAnchor="middle">{i+1}</text></>}</g>;
    })}</g>}
    {regions.map(r=>{
     const [x,y]=centers[r.id],enemies=state.enemies.filter(e=>e.region===r.id);
     const stacks=creatureStacks(enemies);
     const tokens=markers.filter(m=>m.region===r.id);
     // The counters are laid out on the flat board (token-layout.ts) and then stood where that place is seen. Laying the board down
     // or lifting it draws them anew, so that they do not glide between the two views the way they glide between regions.
     return <g key={`${r.id}${lying?':lying':''}`} className="map-tokens">
      {stacks.map(stack=>{const[sx,sy]=tokenAt[`c:${r.id}:${stack.creature}:${stack.color}`]??[x,y+38];return <MapPortraitToken key={stack.creature+stack.color} kind="creature" {...piece(sx,sy)} color={stack.color} count={stack.count} name={p.creatures.find(c=>c.id===stack.creature)!.name} label={`${stack.count} × ${p.creatures.find(c=>c.id===stack.creature)!.name} · ${colorLabel[stack.color]} · ${r.name}`} src={`/assets/tokens/plastic/${stack.creature}-${stack.color}.webp`} onClick={()=>select(r.id,stack.color==='blue'?stack.creature:undefined)} help={creatureHelp(stack,r.id)} onHelp={showTokenHelp}/>;})}
      {tokens.map((m,i)=>{const help=questHelp(m);return <g key={m.quest.id} role="button" tabIndex={0} aria-label={`${m.label} · ${m.quest.name} · ${m.remaining} objectives · ${r.name}`} aria-describedby={`quest-help-${m.quest.id}-${r.id}`} className={`quest-map-token ${m.quest.faction} ${selectedQuest===m.quest.id?'active':''}`} transform={stand(...(tokenAt[`q:${r.id}:${m.quest.id}`]??[x+36,y-22+i*23]) as [number,number])} onPointerEnter={e=>showTokenHelp(help,e.currentTarget)} onPointerLeave={()=>showTokenHelp(null)} onFocus={e=>showTokenHelp(help,e.currentTarget)} onBlur={()=>showTokenHelp(null)} onClick={()=>{select(r.id);if(!decision)onQuest?.(m.quest.id,r.id);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(r.id);if(!decision)onQuest?.(m.quest.id,r.id);}}}><title>{`${m.quest.name} · ${m.remaining} objectives`}</title><desc id={`quest-help-${m.quest.id}-${r.id}`}>{[help.category,help.summary,...help.details??[],help.hint].join('. ')}</desc><rect className="token-hit-area" x={-TAG.w/2-3} y={-TAG.h/2-3} width={TAG.w+6} height={TAG.h+6} rx="5"/><BoardTokenArt index={m.quest.faction==='horde'?0:1} x={-TAG.w/2} y={-TAG.h/2} width={TAG.w} height={TAG.h}/><text textAnchor="middle" y="3.5">{m.label}</text></g>;})}
     </g>;
    })}
    {/* The characters' counters stand in a layer of their own, so that a counter stays the same element when its character
        changes region: only then can it be seen walking there (stage.css). Inside its region's group it was drawn anew in
        each region, and never moved. */}
    <g key={lying?'heroes:lying':'heroes'} className="map-tokens map-heroes">{state.heroes.map(h=>{const r=regionById[h.location];if(!r||!centers[r.id])return null;const [x,y]=centers[r.id],people=state.heroes.filter(v=>v.location===r.id),i=people.findIndex(v=>v.id===h.id),d=character(p,h.id),cap=capacity(p,h),[hx,hy]=tokenAt[`h:${h.id}`]??[x+(i-(people.length-1)/2)*49,y-43];return <MapPortraitToken key={h.id} kind="hero" {...piece(hx,Math.max(board.y+40,hy))} src={SCANS.counters[h.id]??`/assets/portraits/${h.id}.webp`} bare={!!SCANS.counters[h.id]} name={d.name} label={`${d.name} · level ${h.level} · ${r.name}`} color={d.faction} active={h.id===heroId} level={h.level} onClick={()=>{select(r.id);if(!decision)onHero?.(h.id);}} help={{region:r.id,where:`Stands in ${r.name}`,title:d.name,category:`${d.faction==='horde'?'Horde':'Alliance'} ${d.classId} · level ${h.level}`,summary:r.name,details:[`${h.health} / ${cap.health} health · ${h.energy} / ${cap.energy} energy`,`${h.gold} gold · ${h.actions} / 2 actions remaining`],hint:'Select to control or inspect this character.'}} onHelp={showTokenHelp}/>;})}</g>
    {state.overlord.region&&centers[state.overlord.region]&&<MapPortraitToken key={lying?'lying':'flat'} kind="overlord" {...piece((tokenAt.overlord??centers[state.overlord.region])[0],Math.max(board.y+44,(tokenAt.overlord??[0,centers[state.overlord.region][1]-40])[1]))} src={SCANS.tokens[state.overlord.id]??`/assets/portraits/${state.overlord.id}.webp`} bare={!!SCANS.tokens[state.overlord.id]} name={boss.name} label={`Overlord · ${boss.name} · ${regionById[state.overlord.region].name}`} onClick={()=>select(state.overlord.region)} help={{region:state.overlord.region,where:`Stands in ${regionById[state.overlord.region].name}`,title:boss.name,category:'Overlord · campaign objective',summary:`Defeat the Overlord in ${regionById[state.overlord.region].name}.`,details:[`Threat ${bossStats.threat}+ · ${bossStats.attack} attack · ${bossStats.health} health`,bossRuleText(boss.combat)],hint:'Select this region to plan your party’s final challenge.'}} onHelp={showTokenHelp}/>}
    {(state.world??[]).filter(w=>!w.cleared).flatMap(w=>{const e=p.events.find(e=>e.id===w.id)!;return(e.boss?[e.boss.region]:e.script==='plague'?w.tokens:[]).map(id=>{const [x,y]=centers[id],help:TokenHelp={region:id,where:`In ${regionById[id].name}`,title:e.name,category:e.boss?'World encounter':'Plague token',summary:eventText(e),hint:'Select to inspect this region.'};return <g className="world-map-marker" key={`${w.id}-${id}`} transform={stand(...(tokenAt[`w:${id}:${w.id}`]??[x-31,y+19]) as [number,number])} role="button" tabIndex={0} aria-label={`${e.name} · ${regionById[id].name}`} aria-describedby={`event-help-${w.id}-${id}`} onPointerEnter={ev=>showTokenHelp(help,ev.currentTarget)} onPointerLeave={()=>showTokenHelp(null)} onFocus={ev=>showTokenHelp(help,ev.currentTarget)} onBlur={()=>showTokenHelp(null)} onClick={()=>select(id)} onKeyDown={ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();select(id);}}}><title>{e.name}</title><desc id={`event-help-${w.id}-${id}`}>{help.summary}</desc><path d="M-12 0 0-19 12 0 0 11Z" fill={e.boss?'#573665':'#4d6c30'} stroke="#c1ae79" strokeWidth="2"/><text textAnchor="middle" y="2" fontSize="12">{e.boss?'!':'☣'}</text></g>;});})}
    {state.kazzak?.filter(t=>!t.revealed).map(t=>{const[x,y]=centers[t.region],help:TokenHelp={region:t.region,where:`In ${regionById[t.region].name}`,title:'Kazzak clue',category:'Hidden Overlord token',summary:t.real===undefined?'One of the five clues hides the real Kazzak. This clue has not been revealed to your faction.':t.real?'Your faction knows the real Kazzak is here.':'Your faction knows this clue is a decoy.',hint:'Select this region to plan your search. Opposing faction knowledge stays hidden.'};return <g className="world-map-marker" key={t.region} transform={stand(x,y,-31,19)} role="button" tabIndex={0} aria-label={`Kazzak clue · ${regionById[t.region].name}`} aria-describedby={`clue-help-${t.region}`} onPointerEnter={ev=>showTokenHelp(help,ev.currentTarget)} onPointerLeave={()=>showTokenHelp(null)} onFocus={ev=>showTokenHelp(help,ev.currentTarget)} onBlur={()=>showTokenHelp(null)} onClick={()=>select(t.region)} onKeyDown={ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();select(t.region);}}}><title>Kazzak clue</title><desc id={`clue-help-${t.region}`}>{help.summary}</desc><circle r="14" fill="#482328" stroke="#cf9569" strokeWidth="2"/><text textAnchor="middle" y="5" fontSize="18">{t.real===undefined?'?':t.real?'!':'×'}</text></g>;})}
    {decision&&<g className="map-decision-pieces" pointerEvents="none">
     {decision.sources?.map(v=>{const at=tokenAt[`c:${v.region}:${v.creature}:blue`];return at?<circle key={v.key} className={v.key===source?.key?'held':source?'idle':''} transform={stand(at[0],at[1])} r="25"/>:null;})}
     {decision.piece&&tokenAt[decision.piece.token]&&<circle className="held" transform={stand(tokenAt[decision.piece.token][0],tokenAt[decision.piece.token][1])} r={decision.piece.token==='overlord'?34:29}/>}
     {chosen&&centers[chosen.region]&&<g className="decision-landing" transform={stand(centers[chosen.region][0],centers[chosen.region][1],0,24)}><circle r="14"/><path d="M-6 0 L-1.5 4.5 L6.5 -5"/></g>}
    </g>}
    {lit&&centers[lit]&&<g className="map-pointed-pieces" pointerEvents="none">
     {Object.entries(tokenAt).filter(([key])=>key.startsWith(`c:${lit}:`)).map(([key,[x,y]])=><circle key={key} transform={stand(x,y)} r="22"/>)}
     {/* The region's name on a plate over its upper edge, where no counter covers it. */}
     {(()=>{const shape=geo.byId[lit],ys=shape.points.map(v=>v[1]),name=regionById[lit].name,w=name.length*7.4+22,under=!!tokenHelp&&!tokenHelp.below;return <g className="pointed-name" transform={stand(shape.center[0],under?Math.min(board.y+board.height-8,Math.max(...ys)+27):Math.max(board.y+26,Math.min(...ys)-6))}><rect x={-w/2} y="-21" width={w} height="22" rx="4"/><text textAnchor="middle" y="-5">{name}</text></g>;})()}
    </g>}
    <g className="map-cartouche" transform={stand(1080,965)} pointerEvents="none"><text textAnchor="middle">LORDAERON</text><text textAnchor="middle" y="21" className="cartouche-small">THE WAR TABLE · 2005</text></g>
   </svg>
   {!focused&&<ExperienceTrack state={state}/>}
   {!focused&&<span className="world-view-label">LIVE BOARD <span>Fullscreen to interact</span></span>}
   {focused&&<span className="map-gesture-hint"><span className="pointer-hint">SCROLL / DRAG · PAN &nbsp; SHIFT · HORIZONTAL &nbsp; CTRL + SCROLL · ZOOM</span><span className="touch-hint">DRAG · PAN &nbsp; PINCH · ZOOM &nbsp; TAP · SELECT</span></span>}
   {tokenHelp&&!dragging&&<div ref={tooltip} className={`map-token-tooltip ${tokenHelp.below?'below':'above'} ${tokenHelp.brief?'brief':''}`} role="tooltip" style={{left:tokenHelp.x,top:tokenHelp.y}}><small>{tokenHelp.category}</small><strong>{tokenHelp.title}</strong>{tokenHelp.where&&<b className="token-where"><Icon name="pin" size={13}/>{tokenHelp.where}</b>}<p>{tokenHelp.summary}</p>{!!tokenHelp.details?.length&&<ul>{tokenHelp.details.filter(Boolean).map((detail,i)=><li key={i}>{detail}</li>)}</ul>}{tokenHelp.hint&&<em>{tokenHelp.hint}</em>}</div>}
  </div>
  {!focused&&<TurnTrack state={state}/>}
  <div className="map-legend">
   <span className="legend-group"><span><i className="legend-border passable"/>Passable</span><span><i className="legend-border impassable"/>Impassable</span><span><i className="legend-reachable"/>Range 1–2</span><span><i className="creature-dot blue"/>Stop movement</span></span>
   {/* The printed board's key: whose each town, flight path and quest token is. */}
   <span className="legend-group legend-key" role="group" aria-label="Key: towns, flight paths, quests and graveyards">
    {(['horde','alliance'] as const).map(f=><span key={f} className={`legend-faction ${f}`} role="group" aria-label={`${factionName(f)} marks`}><b>{factionName(f)}</b><span title={serviceRule({kind:'town',side:f},regions,destination).summary}><ServiceIcon kind="town" side={f}/>town</span><span title={serviceRule({kind:'flight',side:f},regions,destination).summary}><ServiceIcon kind="flight" side={f} height={12}/>flight path</span><span className="legend-quests"><i className={`legend-token ${f}`}/>quest</span></span>)}
    <span className="legend-faction both" role="group" aria-label="Marks of both factions" title="A town and a flight path that both factions use."><b>Both</b><ServiceIcon kind="town" side="both"/><ServiceIcon kind="flight" side="both" height={12}/></span>
    <span title={serviceRule({kind:'graveyard'},regions,destination).summary}><ServiceIcon kind="graveyard" height={14}/>Graveyard</span>
   </span>
  </div>
  {decision&&<MapDecisionBar decision={decision} source={source} target={chosen} overlord={state.overlord.id} arrival={chosen&&chosen.region!==origin?[...stands(chosen.region).map(line=>line.split(' · ').slice(0,2).join(' · ')),...state.heroes.filter(h=>h.location===chosen.region&&!(decision.piece?.token===`h:${h.id}`)).map(h=>character(p,h.id).name.split(' ')[0])]:[]} onSource={key=>setPick({key:decision.key,source:key})} onClear={()=>setPick({key:decision.key,source:''})} onSend={c=>{setPick({});onDecide?.(c);}}/>}
  {focused&&!decision&&<>
  <div className="campaign-destination"><div><span className="eyebrow">{destination.zone}</span><h3>{destination.name}</h3><p className="region-places">{destination.home&&<span className={`place-chip ${destination.home}`}>{factionName(destination.home)} starting region</span>}{servicesOf(destination).map(m=><span key={m.kind} className={`place-chip ${m.kind==='graveyard'?'neutral':m.side}`}><ServiceIcon kind={m.kind} side={m.side} height={m.kind==='flight'?11:14}/>{serviceName(m)}</span>)}{arrival.length?arrival.map(line=><span key={line} className={`stands-chip ${line.split(' · ')[1]}`}><i className={`creature-dot ${line.split(' · ')[1]}`}/>{line}</span>):<span className="stands-chip nothing">No creatures stand here</span>}</p></div><div className="destination-controls">
   <button className="quiet-button region-details-toggle" aria-expanded={showDetails} aria-controls="map-region-details" onClick={()=>setShowDetails(v=>!v)}><Icon name={showDetails?'x':'help'} size={14}/>{showDetails?'Close details':'Region details'}<small>{here.length} creatures · {localMarkers.length} quests</small></button>
   {destinations.length>1&&<select aria-label="Travel route" value={Math.min(routeIndex,destinations.length-1)} onChange={e=>setRouteIndex(Number(e.target.value))}>{destinations.map((m,i)=><option value={i} key={i}>{m.power?card(p,m.power).name:'Travel'}: {m.path.map(id=>regionById[id].name).join(' → ')}</option>)}</select>}
   <button className="gold-button" disabled={!move} onClick={()=>move&&onMove(move)}>Travel here <small>{move?`${move.path.length} ${move.path.length===1?"region":"regions"} · 1 action`:"Unavailable"}</small><Icon name="walk"/></button>
  </div></div>
  <div className="map-travel-detail" aria-live="polite">{move?<><span className="route-origin">{regionById[me.location].name}</span>{move.path.map((id,i)=><span key={i}><Icon name={flight(allRoute[i],id)?'wind':'right'} size={12}/><b>{i+1}</b>{regionById[id].name}</span>)}{move.power&&<em>{card(p,move.power).name}</em>}{here.some(e=>e.color==='blue')&&<em>Blue creatures end movement.</em>}<strong className={`route-arrival ${arrival.length?'':'nothing'}`}>{arrival.length?`In ${destination.name}: ${arrival.map(line=>line.split(' · ').slice(0,2).join(' · ')).join(', ')}`:`Nothing to fight in ${destination.name}`}</strong></>:<span>{blockedReason}</span>}</div>
  {showDetails&&<aside id="map-region-details" className="map-region-details" aria-label={`Region details: ${destination.name}`}><header><strong>{destination.name}</strong><button className="icon-button" aria-label="Close region details" onClick={()=>setShowDetails(false)}><Icon name="x" size={14}/></button></header>{(destination.home||servicesOf(destination).length>0)&&<ul className="region-services" aria-label="What this region offers">{destination.home&&<li className={destination.home}><b>{factionName(destination.home)} starting region</b><span>The {factionName(destination.home==='horde'?'alliance':'horde')} cannot enter it.</span></li>}{servicesOf(destination).map(m=>{const help=serviceHelp(m,destination);return <li key={m.kind} className={m.kind==='graveyard'?'neutral':m.side}><ServiceIcon kind={m.kind} side={m.side} height={m.kind==='flight'?14:18}/><b>{help.title}</b><span>{help.summary}</span>{help.details?.map(d=><em key={d}>{d}</em>)}</li>;})}</ul>}<div className="destination-units" aria-label="Units in selected region">{creatureStacks(here).map(stack=>{const c=p.creatures.find(c=>c.id===stack.creature)!,stats=encounterProfile(state,here.find(e=>e.creature===stack.creature&&e.color===stack.color)!.id)!;return <span className={stack.color} key={stack.creature+stack.color}><img src={`/assets/tokens/${stack.creature}.webp`} alt=""/><b>{stack.count} × {c.name}</b><small><ThreatLevel value={stats.threat} compact/> · {stats.attack} attack · {stats.health} health</small></span>;})}{state.heroes.filter(h=>h.location===selected).map(h=><span key={h.id}><img src={`/assets/portraits/${h.id}.webp`} alt=""/><b>{character(p,h.id).name}</b><small>Level {h.level} · {h.health} health</small></span>)}{state.overlord.region===selected&&<span className="overlord"><img src={`/assets/portraits/${state.overlord.id}.webp`} alt=""/><b>{p.overlords.find(o=>o.id===state.overlord.id)!.name}</b><small><ThreatLevel value={encounterProfile(state,state.overlord.id)!.threat} compact/> · Overlord</small></span>}</div>
  {localMarkers.length>0&&<div className="destination-quests">{localMarkers.map(m=><button key={m.quest.id} className={selectedQuest===m.quest.id?'selected':''} onClick={()=>onInspectQuest?.(m.quest.id)}><span className={`quest-reference ${m.quest.faction}`}>{m.label}</span>{m.quest.name}<small>{m.remaining} objectives</small><Icon name="book" size={12}/></button>)}</div>}
  {!here.length&&!localMarkers.length&&<p className="region-empty">No creatures or quest objectives in this region.</p>}</aside>}
  </>}
 </section>;
 return focused&&typeof document!=='undefined'?createPortal(<dialog ref={fullscreen} className="campaign-app map-fullscreen-dialog" aria-label="Interact with map" aria-modal="true" onCancel={e=>{e.preventDefault();onToggleFocus();}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onToggleFocus();}}}>{map}</dialog>,document.body):map;
}
