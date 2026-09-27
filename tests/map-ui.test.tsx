// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { view } from '../src/rules/view';
import CampaignMap from '../src/campaign/Map';
import QuestLedger, { QuestDecks } from '../src/campaign/QuestLedger';
import { questMarkers } from '../src/campaign/map-state';

beforeEach(()=>{
 vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});
 Object.defineProperty(HTMLElement.prototype,'clientWidth',{configurable:true,get:()=>900});
 Object.defineProperty(HTMLElement.prototype,'clientHeight',{configurable:true,get:()=>600});
 HTMLElement.prototype.getBoundingClientRect=()=>({x:0,y:0,top:0,left:0,right:900,bottom:600,width:900,height:600,toJSON:()=>({})});
 HTMLElement.prototype.scrollIntoView=vi.fn();
 HTMLElement.prototype.setPointerCapture=vi.fn();HTMLElement.prototype.hasPointerCapture=()=>false;
 vi.stubGlobal('PointerEvent',MouseEvent);
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

describe('table overview and map interaction',()=>{
 function Table({send=vi.fn()}:{send?:(c:unknown)=>void}){
  const[focused,setFocused]=useState(false),[selected,setSelected]=useState('brill'),[quest,setQuest]=useState<string>();
  const s=createGame(p,DEFAULT_SETUP);s.enemies=[];const v=view(s);
  return <CampaignMap state={v} heroId={s.heroes[0].id} selected={selected} legal={legalActions(p,s)} focused={focused} onToggleFocus={()=>setFocused(v=>!v)} onSelect={setSelected} onMove={send} selectedQuest={quest} onQuest={id=>setQuest(id)}/>;
 }
 it('leaves the world view fixed, enables zoom and drag on request, and restores the overview on Escape',()=>{
  const {container}=render(<Table/>),svg=container.querySelector('.campaign-map-scroll>svg')!;
  const overview=screen.getByRole('region',{name:"Entire board overview"});
  fireEvent.wheel(overview,{deltaY:-100,clientX:450,clientY:300});expect(svg.getAttribute('style')).toContain('scale(1)');
  fireEvent.click(screen.getByRole('button',{name:/Interact with map/}));
  const canvas=screen.getByRole('region',{name:/Interactive map:/});
  fireEvent.click(screen.getByRole('button',{name:"Zoom in"}));expect(screen.getByLabelText("Map zoom").textContent).toBe('125%');
  fireEvent.pointerDown(canvas,{button:0,clientX:350,clientY:250});fireEvent.pointerMove(canvas,{clientX:420,clientY:290});fireEvent.pointerUp(canvas);
  expect(svg.getAttribute('style')).toContain('translate(70px,40px)');
  fireEvent.keyDown(canvas,{key:'Escape'});expect(svg.getAttribute('style')).toContain('scale(1)');
  expect(document.activeElement).toBe(screen.getByRole('button',{name:/Interact with map/}));
 });
 it('previews a two-field route and only spends an action after explicit confirmation',()=>{
  const send=vi.fn();render(<Table send={send}/>);
  fireEvent.click(screen.getByRole('button',{name:/^Agamand Mills · reachable/}));
  expect(send).not.toHaveBeenCalled();expect(screen.getByText('2 regions · 1 action')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:/Travel here/}));
  expect(send).toHaveBeenCalledWith({type:'travel',hero:DEFAULT_SETUP.roster[0],path:['stillwater','agamand']});
 });
 it('does not treat dragging across a region as a click on that region',()=>{
  render(<Table/>);fireEvent.click(screen.getByRole('button',{name:/Interact with map/}));
  fireEvent.click(screen.getByRole('button',{name:"Zoom in"}));const canvas=screen.getByRole('region',{name:/Interactive map:/});
  const field=screen.getByRole('button',{name:/^Agamand Mills · reachable/});
  fireEvent.pointerDown(field,{button:0,clientX:350,clientY:250});fireEvent.pointerMove(canvas,{clientX:420,clientY:290});fireEvent.pointerUp(canvas);fireEvent.click(field);
  expect(field.getAttribute('aria-pressed')).toBe('false');
 });
 it('uses the same quest reference on cards and map tokens and connects both selections',()=>{
  const s=createGame(p,DEFAULT_SETUP),v=view(s),m=questMarkers(p,v)[0],select=vi.fn();
  render(<><QuestLedger state={v} selected={m.quest.id} onQuest={select} onInspect={()=>{}}/><CampaignMap state={v} heroId={s.heroes[0].id} selected={m.region} legal={[]} focused={false} onToggleFocus={()=>{}} onSelect={()=>{}} onMove={()=>{}} onQuest={select}/></>);
  const card=screen.getByRole('button',{name:`${m.label} · ${m.quest.name} · show on map`});fireEvent.click(card);
  expect(select).toHaveBeenLastCalledWith(m.quest.id,m.region);
  const token=screen.getByRole('button',{name:`${m.label} · ${m.quest.name} · ${m.remaining} objectives · ${p.regions.find(r=>r.id===m.region)!.name}`});fireEvent.click(token);
  expect(select).toHaveBeenLastCalledWith(m.quest.id,m.region);
 });
 it('shows deck counts without permitting an out-of-turn draw, then enables the legal replacement',()=>{
  const s=createGame(p,DEFAULT_SETUP),send=vi.fn(),r=render(<QuestDecks state={view(s)} side="horde" send={send}/>);
  const green=screen.getByRole('button',{name:'Green quest deck · 11 cards'}) as HTMLButtonElement;
  expect(green.disabled).toBe(true);fireEvent.click(green);expect(send).not.toHaveBeenCalled();
  s.phase='reward';s.reward={faction:'horde',eligible:[],offered:[],items:[],special:[],replacement:true};
  r.rerender(<QuestDecks state={view(s)} side="horde" legal={[{type:'quest',tier:'green'}]} send={send}/>);
  const enabled=within(r.container).getByRole('button',{name:'Green quest deck · 11 cards'}) as HTMLButtonElement;
  expect(enabled.disabled).toBe(false);fireEvent.click(enabled);expect(send).toHaveBeenCalledWith({type:'quest',tier:'green'});
 });
});
