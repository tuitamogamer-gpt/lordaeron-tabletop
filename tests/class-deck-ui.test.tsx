// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react';
import { useState } from 'react';
import ClassDeck from '../src/campaign/ClassDeck';
import { EquipmentEditor, TownEditor } from '../src/campaign/Interactions';
import CampaignSetup from '../src/campaign/CampaignSetup';
import Campaign from '../src/Campaign';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { startingHero } from '../src/campaign/CharacterSheet';
import { character } from '../src/rules/common';
import type { Hero } from '../src/rules/model';
beforeEach(()=>{localStorage.clear();vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});window.scrollTo=vi.fn();HTMLElement.prototype.scrollIntoView=vi.fn();HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const mage=()=>startingHero(p.characters.find(c=>c.classId==='mage')!.id);
function Training({h}:{h:Hero}){const [selected,setSelected]=useState<string[]>([]);return <ClassDeck hero={h} inspect={()=>{}} selected={selected} toggle={id=>setSelected(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])}/>;}
describe('class deck and equipment interface',()=>{
 it('lets town recovery follow a purchase and includes the chosen order in the command',()=>{
  const h=mage(),send=vi.fn();h.health=1;render(<TownEditor hero={h} merchant={[]} send={send} busy={false}/>);
  fireEvent.click(screen.getByRole('button',{name:/Fireball/}));fireEvent.change(screen.getByRole('combobox',{name:'Recovery order'}),{target:{value:'1'}});
  fireEvent.click(screen.getByRole('button',{name:/Confirm · 1 transactions/}));expect(send).toHaveBeenCalledWith({type:'town',hero:h.id,health:1,operations:[{op:'train',card:'mage-fireball'}],recoverAfter:1});
 });
 it('shows separate power and talent piles, level requirements, and free talent acquisition',()=>{
  render(<ClassDeck hero={mage()} inspect={()=>{}}/>);expect(screen.getByRole('button',{name:/Power deck.*12 in deck/})).toBeTruthy();expect(screen.getByRole('button',{name:/Talent deck.*12 in deck/})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:/^Talent deck/}));expect(screen.getAllByText('Free on level up')).toHaveLength(12);expect(screen.queryByText(/gold to learn/)).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Level 5'}));expect(screen.getAllByText('Free on level up')).toHaveLength(3);
 });
 it('stages several affordable powers and disables purchases above the remaining budget',()=>{
  const r=render(<Training h={mage()}/>);const entry=(name:string)=>within([...r.container.querySelectorAll('.deck-card-entry')].find(e=>e.textContent?.includes(name))! as HTMLElement);
  fireEvent.click(entry('Fireball').getByRole('button',{name:'Add to training'}));fireEvent.click(entry('Frostbolt').getByRole('button',{name:'Add to training'}));
  expect(screen.getAllByRole('button',{name:'Remove from training'})).toHaveLength(2);expect((entry('Arcane Intellect').getByRole('button',{name:'Not enough gold'}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(entry('Fireball').getByRole('button',{name:'Remove from training'}));expect((entry('Arcane Intellect').getByRole('button',{name:'Add to training'}) as HTMLButtonElement).disabled).toBe(false);
 });
 it('permits browsing the deck without spending actions or gold',()=>{
  const h=mage(),copy=structuredClone(h),send=vi.fn();render(<ClassDeck hero={h} inspect={()=>{}} send={send}/>);fireEvent.click(screen.getByRole('button',{name:/^Talent deck/}));fireEvent.click(screen.getByRole('button',{name:'Level 2'}));expect(h).toEqual(copy);expect(send).not.toHaveBeenCalled();
 });
 it('previews energy and submits a pet re-equip with its explicit cost',()=>{
  const h=startingHero(p.characters.find(c=>c.classId==='hunter')!.id),send=vi.fn();h.level=2;h.energy=4;h.learned=['hunter-bear'];h.slots[0].card='hunter-bear';h.pets['hunter-bear']=1;
  render(<EquipmentEditor hero={h} send={send} busy={false}/>);fireEvent.click(screen.getByRole('checkbox',{name:/Re-equip Bear/}));expect(screen.getByText(/Energy: 4 → 1/)).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Confirm equipment'}));expect(send.mock.calls[0][0].reEquip).toEqual(['hunter-bear']);
 });
 it('offers both page-37 variants in setup and passes them into the game',()=>{
  const start=vi.fn();render(<CampaignSetup onStart={start} onCancel={()=>{}}/>);fireEvent.click(screen.getByRole('checkbox',{name:/Deadly PvP/}));fireEvent.click(screen.getByRole('checkbox',{name:/Defeat the Overlord/}));
  for(let i=0;i<3;i++)fireEvent.click(screen.getByRole('button',{name:/^Continue/}));expect(screen.getByText('Class decks')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:/Begin campaign/}));expect(start.mock.calls[0][0].variants).toEqual({deadlyPvp:true,overlordOnly:true});
 });
 it.each(['v4','v6'])('preserves the %s save and presents a fresh setup under the new rules',version=>{
  const key=`lordaeron-base-save-${version}`;
  const old=JSON.stringify({format:'lordaeron-rules-session',version:2,pack:version==='v4'?'base-2005-faq-1.4-map-v4':'base-2005-faq-1.4-v6',contentHash:version==='v4'?'131aa8d4':'4c24b6cf',setup:DEFAULT_SETUP,commands:[]});localStorage.setItem(key,old);render(<Campaign/>);
  expect(screen.getByRole('dialog',{name:'New campaign'})).toBeTruthy();expect(localStorage.getItem(key)).toBe(old);expect(localStorage.getItem('lordaeron-base-save-v7')).toBeNull();expect(character(p,DEFAULT_SETUP.roster[0]).classId).toBe('warrior');
 });
});
