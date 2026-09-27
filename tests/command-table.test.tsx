// @vitest-environment jsdom
import { useState } from 'react';
import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,within } from '@testing-library/react';
import Campaign from '../src/Campaign';
import CampaignSetup, { setupErrors } from '../src/campaign/CampaignSetup';
import CharacterSheet, { startingHero } from '../src/campaign/CharacterSheet';
import Tabletop from '../src/campaign/Tabletop';
import { BASE_PACK as p,DEFAULT_SETUP } from '../src/data/base';
import { createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { view } from '../src/rules/view';
import { card,character } from '../src/rules/common';
import { newSession } from '../src/rules/session';
import type { State } from '../src/rules/model';
beforeEach(()=>{
 localStorage.clear();
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
 HTMLElement.prototype.scrollIntoView=vi.fn();window.scrollTo=vi.fn();
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const next=()=>fireEvent.click(screen.getByRole('button',{name:/^Continue/}));
describe('guided campaign setup',()=>{
 it('opens for a fresh browser and does not save a placeholder campaign',()=>{
  render(<Campaign/>);expect(screen.getByRole('dialog',{name:'New campaign'})).toBeTruthy();
  expect(localStorage.getItem('lordaeron-base-save-v6')).toBeNull();
  expect(screen.queryByRole('region',{name:'Map of Lordaeron'})).toBeNull();
 });
 it('continues an existing save without forcing setup',()=>{
  const raw=JSON.stringify(newSession(p,DEFAULT_SETUP));localStorage.setItem('lordaeron-base-save-v6',raw);
  render(<Campaign/>);expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByRole('region',{name:'Map of Lordaeron'})).toBeTruthy();
 });
 it.each([4,6] as const)('previews the %i-character rules and starts only after the last step',count=>{
  const start=vi.fn();render(<CampaignSetup onStart={start} onCancel={()=>{}}/>);
  fireEvent.click(screen.getByRole('button',{name:new RegExp(`^${count} characters`)}));next();next();next();
  expect(start).not.toHaveBeenCalled();expect(screen.getByText(new RegExp(`${count/2+1} grey \\+ 1 green quest per faction`))).toBeTruthy();
  expect(screen.getByText(/3 white triangle \+ 2 blue square \+ 1 purple circle/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:/^Begin campaign/}));
  const [setup]=start.mock.calls[0],state=createGame(p,setup);
  expect(state.heroes).toHaveLength(count);expect(state.quests).toHaveLength((count/2+2)*2);expect(state.merchant).toHaveLength(6);expect(state.faction).toBe('horde');
  expect(state.heroes.every(h=>h.gold===5&&h.xp===0&&h.level===1&&h.location===(character(p,h.id).faction==='horde'?'brill':'southshore'))).toBe(true);
 });
 it('requires balanced factions and prevents drafting a repeated class',()=>{
  render(<CampaignSetup onStart={()=>{}} onCancel={()=>{}}/>);next();
  const grumbaz=screen.getByRole('button',{name:/^Grumbaz Crowsblood/});fireEvent.click(grumbaz);
  expect((screen.getByRole('button',{name:/^Continue/}) as HTMLButtonElement).disabled).toBe(true);
  const allianceWarrior=p.characters.find(c=>c.faction==='alliance'&&c.classId==='warrior')!;
  expect(setupErrors({...DEFAULT_SETUP,roster:[...DEFAULT_SETUP.roster.slice(0,5),allianceWarrior.id]},6).length).toBeGreaterThan(0);
  fireEvent.click(grumbaz);expect((screen.getByRole('button',{name:/^Continue/}) as HTMLButtonElement).disabled).toBe(false);
 });
 it('excludes the five Kel’Thuzad events for another Overlord and rejects invalid seeds',()=>{
  render(<CampaignSetup onStart={()=>{}} onCancel={()=>{}}/>);next();next();fireEvent.click(screen.getByRole('button',{name:/^Nefarian/}));next();
  expect(screen.getByText(/47 shuffled events/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Game seed'),{target:{value:'0'}});
  expect((screen.getByRole('button',{name:/^Begin campaign/}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Game seed'),{target:{value:'99'}});
  expect((screen.getByRole('button',{name:/^Begin campaign/}) as HTMLButtonElement).disabled).toBe(false);
 });
});
function Table({initial=createGame(p,DEFAULT_SETUP),send=vi.fn()}:{initial?:State;send?:(c:unknown)=>void}){
 const [id,setId]=useState(initial.heroes[0].id),[selected,setSelected]=useState('brill');
 return <Tabletop state={view(initial,initial.heroes.map(h=>h.id))} h={initial.heroes.find(h=>h.id===id)!} legal={legalActions(p,initial)} controlled={initial.heroes.map(h=>h.id)} bots={[]} auto={false} botReady={false} botReason="" selectHero={setId} selected={selected} selectRegion={setSelected} inspect={()=>{}} open={()=>{}} send={send} botStep={()=>{}} toggleBots={()=>{}} focused={false} toggleFocus={()=>{}} notify={()=>{}}/>;
}
describe('on-demand game panels',()=>{
 it('keeps sheets and shops out of the map until opened, and switches within the dialog',()=>{
  render(<Table/>);expect(screen.queryByRole('dialog')).toBeNull();expect(screen.queryByText('Powers & equipment')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:/^Characters/}));
  let dialog=screen.getByRole('dialog',{name:'Characters'});expect(within(dialog).getByText('Powers & equipment')).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('button',{name:/^Merchant/}));
  dialog=screen.getByRole('dialog',{name:'Merchant'});expect(within(dialog).getByText('Arms for the road ahead.')).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('button',{name:/^Merchant/}));expect(screen.queryByRole('dialog')).toBeNull();
 });
 it('allows inspection but no shopping outside a town, and never draws events on inspection',()=>{
  const s=createGame(p,DEFAULT_SETUP),send=vi.fn();s.heroes[0].location='stillwater';render(<Table initial={s} send={send}/>);
  fireEvent.click(screen.getByRole('button',{name:/^Merchant/}));let d=screen.getByRole('dialog');
  expect((within(d).getByRole('button',{name:/Visit merchant/}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(within(d).getByRole('button',{name:/^Encounter deck/}));d=screen.getByRole('dialog');
  expect(within(d).getByText('cards remain')).toBeTruthy();expect(within(d).queryByRole('button',{name:/^Draw/})).toBeNull();expect(send).not.toHaveBeenCalled();
 });
 it('can inspect opponents and dismiss panels with Escape without game mutations',()=>{
  const send=vi.fn();render(<Table send={send}/>);fireEvent.click(screen.getByRole('button',{name:/^Characters/}));
  const dialog=screen.getByRole('dialog');fireEvent.click(within(dialog).getByRole('button',{name:/^Brandon/}));
  expect(within(dialog).getByRole('article',{name:'Brandon Lightstone character sheet'})).toBeTruthy();
  fireEvent(dialog,new Event('cancel',{bubbles:true,cancelable:true}));expect(screen.queryByRole('dialog')).toBeNull();expect(send).not.toHaveBeenCalled();
 });
 it('yields to a mandatory event when AI advances the game while a panel is open',()=>{
  const s=createGame(p,DEFAULT_SETUP),r=render(<Table initial={s}/>);fireEvent.click(screen.getByRole('button',{name:/^Characters/}));
  expect(screen.getByRole('dialog')).toBeTruthy();const nextState=structuredClone(s);nextState.phase='event';r.rerender(<Table initial={nextState}/>);
  expect(screen.queryByRole('dialog')).toBeNull();
 });
});
describe('complete character sheets',()=>{
 it.each(p.characters.map(c=>[c.id,c.name]))('renders all printed slots and racial rules for %s',id=>{
  const h=startingHero(id),d=character(p,id),r=render(<CharacterSheet hero={h} inspect={()=>{}}/>);
  expect(r.container.querySelectorAll('.character-slot')).toHaveLength(7);
  for(const slot of d.slots)if(slot.printed)expect(screen.getByText(card(p,slot.printed).name)).toBeTruthy();
  expect(r.container.querySelector('.racial-inscription .inscribed-rules')?.textContent?.length).toBeGreaterThan(10);
  expect(r.container.querySelectorAll('.sheet-levels>div')).toHaveLength(5);
 });
 it('shows the spellbook, three bag slots, four talent slots, and the Hood’s eighth slot',()=>{
  const h=startingHero(DEFAULT_SETUP.roster[0]);h.auctionItems=['auction-hood-of-shadow'];h.slots.push({addons:[]});
  const r=render(<CharacterSheet hero={h} inspect={()=>{}}/>);expect(r.container.querySelectorAll('.character-slot')).toHaveLength(8);
  fireEvent.click(screen.getByRole('button',{name:/^Spellbook/}));expect(r.container.querySelectorAll('.spell-entry')).toHaveLength(0);expect(screen.getByText(/Your spellbook is empty/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:/^Class deck/}));expect(r.container.querySelectorAll('.deck-card-entry')).toHaveLength(12);
  fireEvent.click(screen.getByRole('button',{name:/^Bag/}));expect(r.container.querySelectorAll('.bag-empty')).toHaveLength(3);
  expect(screen.getByText('Hood of Shadow')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:/^Talents/}));expect(r.container.querySelectorAll('.talent-slots>section')).toHaveLength(4);
 });
});
