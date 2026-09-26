import { useRef, useState } from 'react';
import { REGIONS, heroDefinition, regionById } from './data/content';
import { reachable } from './engine/game';
import type { GameState, Hero } from './engine/types';
import { Icon, Portrait } from './components';

export default function Board({state,hero,selected,onSelect,onTravel,effects,onReference}:{state:GameState;hero:Hero;selected:string;onSelect:(id:string)=>void;onTravel:(id:string)=>void;effects:boolean;onReference:()=>void}){
 const [zoom,setZoom]=useState(1);const [pan,setPan]=useState({x:0,y:0});const [routes,setRoutes]=useState(true);const drag=useRef<{x:number;y:number;px:number;py:number}|null>(null);
 const paths=reachable(state,hero);const region=regionById(selected);const here=selected===hero.location;
 const edges=REGIONS.flatMap(r=>r.neighbors.filter(id=>r.id<id).map(id=>[r,regionById(id)]));
 const enemies=state.enemies.filter(e=>e.region===selected && e.count>0);
 return <section className={`board ${effects?'animated':''}`} aria-label="Interaktivna mapa Lordaerona">
  <div className="map-viewport" onPointerDown={e=>{if(zoom<=1 || (e.target as HTMLElement).closest('button'))return;drag.current={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current)setPan({x:Math.max(-250,Math.min(250,drag.current.px+e.clientX-drag.current.x)),y:Math.max(-160,Math.min(160,drag.current.py+e.clientY-drag.current.y))});}} onPointerUp={()=>drag.current=null}>
   <div className="map-plane" style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}>
    <img className="map-art" src="/assets/lordaeron.png" alt="Ilustrirana mapa Lordaerona: šume Silverpinea, Alterac planine i zaražene zemlje na istoku" draggable="false"/>
    <svg className="map-paths" viewBox="0 0 1000 667" preserveAspectRatio="none" aria-hidden="true"><defs><filter id="glow"><feGaussianBlur stdDeviation="2.5"/></filter></defs>{routes && edges.map(([a,b])=><line key={a.id+b.id} x1={a.x*10} y1={a.y*6.67} x2={b.x*10} y2={b.y*6.67} className="route-line"/>)}{paths[selected] && [hero.location,...paths[selected]].slice(1).map((id,i)=>{const a=regionById([hero.location,...paths[selected]][i]);const b=regionById(id);return <line key={id} x1={a.x*10} y1={a.y*6.67} x2={b.x*10} y2={b.y*6.67} className="active-route"/>})}</svg>
    <span className="zone-name zone-tirisfal">TIRISFAL GLADES</span><span className="zone-name zone-silverpine">SILVERPINE FOREST</span><span className="zone-name zone-alterac">ALTERAC</span><span className="zone-name zone-hillsbrad">HILLSBRAD FOOTHILLS</span><span className="zone-name zone-western">WESTERN PLAGUELANDS</span><span className="zone-name zone-eastern">EASTERN PLAGUELANDS</span><span className="zone-name zone-hinterlands">THE HINTERLANDS</span>
    {REGIONS.map(r=>{const occupants=state.heroes.filter(h=>h.location===r.id);const monster=state.enemies.find(e=>e.region===r.id && e.count>0);const isReachable=!!paths[r.id];return <div key={r.id} className={`map-location ${r.id===selected?'selected':''} ${r.id===hero.location?'current':''} ${isReachable?'reachable':''} ${monster?.kind==='boss'?'boss-location':''}`} style={{left:`${r.x}%`,top:`${r.y}%`}}>
      <button className={`location-button ${r.town??''} ${monster?.kind??''}`} aria-label={`${r.name}${r.id===hero.location?' · tvoja lokacija':''}${monster?' · '+monster.name:''}`} aria-pressed={r.id===selected} onClick={()=>onSelect(r.id)} title={r.name}><Icon name={monster?monster.icon:r.town?'home':r.flight?'wind':'flag'} size={monster?.kind==='boss'?22:15}/>{monster && <span className="enemy-count">{monster.count}</span>}</button>
      <span className="location-label">{r.name}</span>
      {occupants.length>0 && <div className="map-party">{occupants.map(h=><span key={h.id} className={`map-hero ${heroDefinition(h.id).faction} ${h.id===hero.id?'active':''}`} title={heroDefinition(h.id).name}><Portrait id={h.id}/></span>)}</div>}
    </div>;})}
    {effects && <div className="map-atmosphere" aria-hidden="true">{Array.from({length:13},(_,i)=><i key={i} style={{left:`${10+i*7}%`,top:`${14+(i*23)%73}%`,animationDelay:`${i*-.83}s`}}/>)}</div>}
   </div>
  </div>
  <div className="map-topline"><span><i className="live-dot"/> ŽIVI SVIJET</span><div><span className="legend"><i className="gold-dot"/>Zadatak</span><span className="legend"><i className="blue-dot"/>Nezavisni</span><span className="legend"><i className="purple-dot"/>Overlord</span></div></div>
  <div className="map-tools"><button className="icon-button" aria-label="Uvećaj mapu" onClick={()=>setZoom(z=>Math.min(1.8,z+.2))} disabled={zoom>=1.8}><Icon name="plus"/></button><span>{Math.round(zoom*100)}%</span><button className="icon-button" aria-label="Umanji mapu" onClick={()=>{setZoom(z=>Math.max(1,z-.2));setPan({x:0,y:0});}} disabled={zoom<=1}><Icon name="minus"/></button><div className="tool-separator"/><button className={`icon-button ${routes?'on':''}`} aria-label="Prikaži puteve" aria-pressed={routes} onClick={()=>setRoutes(v=>!v)}><Icon name="layers"/></button><button className="icon-button" aria-label="Originalna ploča iz 2005." title="Originalna ploča iz 2005." onClick={onReference}><Icon name="map"/></button></div>
  <div className="compass-rose" aria-hidden="true"><span>N</span><Icon name="compass" size={54}/></div>
  <div className="region-preview" key={selected}><div className="region-heading"><div><span className="eyebrow">{here?'TVOJA LOKACIJA':region.zone}</span><h3>{region.name}</h3></div><span className="region-level">{region.level}<small>NIVO</small></span></div><p>{region.description}</p>{enemies.map(e=><div className="region-enemy" key={e.id}><Icon name={e.icon} size={14}/><span>{e.count} × {e.name}</span><b>{e.threat}+</b></div>)}{!here && <button className="travel-button" disabled={!paths[selected]} onClick={()=>onTravel(selected)}><Icon name="walk" size={15}/>{paths[selected]?`Putuj ovdje · ${paths[selected].length} korak${paths[selected].length===1?'':'a'}`:'Izvan dometa ovog poteza'}<Icon name="arrow" size={15}/></button>}</div>
  <div className="map-caption"><Icon name="mouse" size={12}/> Odaberi lokaciju za istraživanje {zoom>1?'· Povuci mapu':''}</div>
 </section>;
}
