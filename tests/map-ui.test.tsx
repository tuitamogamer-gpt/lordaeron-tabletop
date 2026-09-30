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
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});

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
  expect(screen.getByLabelText("Map zoom").textContent).toBe('200%');
  fireEvent.click(screen.getByRole('button',{name:"Entire map"}));
  fireEvent.click(screen.getByRole('button',{name:"Zoom in"}));expect(screen.getByLabelText("Map zoom").textContent).toBe('125%');
  fireEvent.pointerDown(canvas,{button:0,clientX:350,clientY:250});fireEvent.pointerMove(canvas,{clientX:420,clientY:290});fireEvent.pointerUp(canvas);
  expect(svg.getAttribute('style')).toContain('translate(70px,40px)');
  fireEvent.keyDown(canvas,{key:'Escape'});expect(svg.getAttribute('style')).toContain('scale(1)');
  expect(document.activeElement).toBe(screen.getByRole('button',{name:/Interact with map/}));
 });
 it('pans with wheel and trackpad on both axes, uses Shift for horizontal scrolling, and reserves Control-wheel for zoom',()=>{
  const {container}=render(<Table/>);fireEvent.click(screen.getByRole('button',{name:/Interact with map/}));
  fireEvent.click(screen.getByRole('button',{name:'Entire map'}));
  for(let i=0;i<4;i++)fireEvent.click(screen.getByRole('button',{name:'Zoom in'}));
  const canvas=screen.getByRole('region',{name:/Interactive map:/}),svg=container.querySelector('.campaign-map-scroll>svg')!;
  fireEvent.wheel(canvas,{deltaX:60,deltaY:80});expect(svg.getAttribute('style')).toContain('translate(-60px,-80px) scale(2)');
  fireEvent.wheel(canvas,{deltaY:30,shiftKey:true});expect(svg.getAttribute('style')).toContain('translate(-90px,-80px) scale(2)');
  fireEvent.wheel(canvas,{deltaY:-100,ctrlKey:true,clientX:450,clientY:300});expect(screen.getByLabelText('Map zoom').textContent).toBe('218%');
  fireEvent.click(screen.getByRole('button',{name:/Done interacting/}));expect(svg.getAttribute('style')).toContain('translate(0px,0px) scale(1)');
  fireEvent.wheel(canvas,{deltaX:100,deltaY:100});expect(svg.getAttribute('style')).toContain('translate(0px,0px) scale(1)');
 });
 it('explains quest ownership and live objectives on hover, and blue movement blockers on keyboard focus',()=>{
  const s=createGame(p,DEFAULT_SETUP),v=view(s),m=questMarkers(p,v)[0];
  const {container}=render(<CampaignMap state={v} heroId={s.heroes[0].id} selected={m.region} legal={[]} focused={false} onToggleFocus={()=>{}} onSelect={()=>{}} onMove={()=>{}}/>);
  const token=screen.getByRole('button',{name:`${m.label} · ${m.quest.name} · ${m.remaining} objectives · ${p.regions.find(r=>r.id===m.region)!.name}`});
  fireEvent.pointerEnter(token);let tooltip=screen.getByRole('tooltip');
  expect(within(tooltip).getByText(m.quest.name)).toBeTruthy();expect(tooltip.textContent).toContain(`${m.remaining} remaining objective`);expect(tooltip.textContent).toContain(m.label);
  fireEvent.pointerLeave(token);expect(screen.queryByRole('tooltip')).toBeNull();
  fireEvent.focus(container.querySelector('.portrait-map-token.creature.blue')!);tooltip=screen.getByRole('tooltip');
  expect(tooltip.textContent).toContain('Your next action must be Challenge');expect(tooltip.textContent).toContain('do not count toward quest completion');
 });
 it('keeps a measured tooltip inside a short map viewport near the center',()=>{
  vi.spyOn(HTMLElement.prototype,'clientHeight','get').mockReturnValue(343);
  vi.spyOn(HTMLElement.prototype,'offsetWidth','get').mockReturnValue(288);
  vi.spyOn(HTMLElement.prototype,'offsetHeight','get').mockReturnValue(250);
  const s=createGame(p,DEFAULT_SETUP),m=questMarkers(p,view(s))[0];
  render(<CampaignMap state={view(s)} heroId={s.heroes[0].id} selected={m.region} legal={[]} focused={false} onToggleFocus={()=>{}} onSelect={()=>{}} onMove={()=>{}}/>);
  const canvas=screen.getByRole('region',{name:'Entire board overview'}),token=screen.getByRole('button',{name:`${m.label} · ${m.quest.name} · ${m.remaining} objectives · ${p.regions.find(r=>r.id===m.region)!.name}`});
  canvas.getBoundingClientRect=()=>({x:0,y:0,top:0,left:0,right:900,bottom:343,width:900,height:343,toJSON:()=>({})});
  token.getBoundingClientRect=()=>({x:880,y:140,top:140,left:880,right:920,bottom:165,width:40,height:25,toJSON:()=>({})});
  fireEvent.pointerEnter(token);const tooltip=screen.getByRole('tooltip');
  expect(tooltip.style.top).toBe('85px');expect(tooltip.style.left).toBe('748px');
 });
 it('keeps region units in an optional drawer instead of increasing the board’s height',()=>{
  render(<Table/>);expect(screen.queryByRole('complementary',{name:'Region details: Brill'})).toBeNull();
  const toggle=screen.getByRole('button',{name:/^Region details/});expect(toggle.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(toggle);expect(screen.getByRole('complementary',{name:'Region details: Brill'})).toBeTruthy();expect(toggle.getAttribute('aria-expanded')).toBe('true');
  fireEvent.click(screen.getByRole('button',{name:'Close region details'}));expect(screen.queryByRole('complementary')).toBeNull();
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
