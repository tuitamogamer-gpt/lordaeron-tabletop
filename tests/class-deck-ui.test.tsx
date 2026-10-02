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
  fireEvent.click(screen.getByRole('button',{name:/Confirm · 1 transaction/}));expect(send).toHaveBeenCalledWith({type:'town',hero:h.id,health:1,operations:[{op:'train',card:'mage-fireball'}],recoverAfter:1});
 });
 it('shows separate power and talent piles, level requirements, and free talent acquisition',()=>{
  render(<ClassDeck hero={mage()} inspect={()=>{}}/>);expect(screen.getByRole('button',{name:/Power deck.*12 in deck/})).toBeTruthy();expect(screen.getByRole('button',{name:/Talent deck.*12 in deck/})).toBeTruthy();
  const expectFreeTalents=(count:number)=>{
   const cards=screen.getAllByRole('button',{name:/^Inspect /});expect(cards).toHaveLength(count);
   for(const button of cards){
    fireEvent.focus(button);
    expect(within(screen.getByRole('tooltip')).getByRole('img',{name:/Free on level up/})).toBeTruthy();
    fireEvent.keyDown(button,{key:'Escape'});
   }
  };
  fireEvent.click(screen.getByRole('button',{name:/^Talent deck/}));expectFreeTalents(6);expect(screen.getByText('1–6 of 12 talents')).toBeTruthy();expect(screen.queryByText(/gold to learn/)).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Next class deck page'}));expectFreeTalents(6);expect(screen.getByText('7–12 of 12 talents')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Level 5'}));expectFreeTalents(3);
 });
 it('stages several affordable powers and disables purchases above the remaining budget',()=>{
  render(<Training h={mage()}/>);const entry=(name:string)=>within(screen.getByRole('button',{name:`Inspect ${name}`}).closest('.deck-card-entry')! as HTMLElement);
  fireEvent.click(entry('Fireball').getByRole('button',{name:'Add to training'}));fireEvent.click(entry('Frostbolt').getByRole('button',{name:'Add to training'}));
  expect(screen.getAllByRole('button',{name:'Remove from training'})).toHaveLength(2);expect((entry('Arcane Intellect').getByRole('button',{name:'Not enough gold'}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(entry('Fireball').getByRole('button',{name:'Remove from training'}));expect((entry('Arcane Intellect').getByRole('button',{name:'Add to training'}) as HTMLButtonElement).disabled).toBe(false);
 });
 it('permits browsing the deck without spending actions or gold',()=>{
  const h=mage(),copy=structuredClone(h),send=vi.fn();render(<ClassDeck hero={h} inspect={()=>{}} send={send}/>);fireEvent.click(screen.getByRole('button',{name:/^Talent deck/}));fireEvent.click(screen.getByRole('button',{name:'Level 2'}));expect(h).toEqual(copy);expect(send).not.toHaveBeenCalled();
 });
 it('preserves training selections across pages and resets paging when the level changes',()=>{
  const h=mage();h.level=5;h.gold=100;const copy=structuredClone(h),r=render(<Training h={h}/>);
  fireEvent.click(screen.getAllByRole('button',{name:'Add to training'})[0]);
  fireEvent.click(screen.getByRole('button',{name:'Next class deck page'}));
  expect(r.container.querySelectorAll('.deck-card-entry')).toHaveLength(6);
  expect(screen.getByText('7–12 of 12 powers',{exact:false})).toBeTruthy();
  fireEvent.click(screen.getAllByRole('button',{name:'Add to training'})[0]);
  fireEvent.click(screen.getByRole('button',{name:'Previous class deck page'}));
  expect(screen.getAllByRole('button',{name:'Remove from training'})).toHaveLength(1);
  expect(screen.getByText('· 2 selected',{exact:false})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Next class deck page'}));
  fireEvent.click(screen.getByRole('button',{name:'Level 1'}));
  expect((screen.getByRole('button',{name:'Previous class deck page'}) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getAllByRole('button',{name:'Remove from training'})).toHaveLength(1);expect(h).toEqual(copy);
 });
 it('previews energy and submits a pet re-equip with its explicit cost',()=>{
  const h=startingHero(p.characters.find(c=>c.classId==='hunter')!.id),send=vi.fn();h.level=2;h.energy=4;h.learned=['hunter-bear'];h.slots[0].card='hunter-bear';h.pets['hunter-bear']=1;
  render(<EquipmentEditor hero={h} send={send} busy={false}/>);fireEvent.click(screen.getByRole('checkbox',{name:/Re-equip Bear/}));expect(screen.getByText(/Energy: 4 → 1/)).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Confirm equipment'}));expect(send.mock.calls[0][0].reEquip).toEqual(['hunter-bear']);
 });
 it('fixes the Overlord objective and offers Deadly PvP as an independent combat rule',()=>{
  const start=vi.fn();render(<CampaignSetup onStart={start} onCancel={()=>{}}/>);expect(screen.getByText('Campaign objective · Defeat the Overlord')).toBeTruthy();expect(screen.queryByRole('checkbox',{name:/Defeat the Overlord/})).toBeNull();fireEvent.click(screen.getByRole('checkbox',{name:/Deadly PvP/}));
  for(let i=0;i<3;i++)fireEvent.click(screen.getByRole('button',{name:/^Continue/}));expect(screen.getByText('Class decks')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:/Begin campaign/}));expect(start.mock.calls[0][0].variants).toEqual({deadlyPvp:true,overlordOnly:true});
 });
 it('defaults to six heroes and lets either added faction seat be the human-controlled hero',()=>{
  const start=vi.fn();render(<CampaignSetup onStart={start} onCancel={()=>{}}/>);
  expect(screen.getByRole('button',{name:/^6 characters/}).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText('You control one hero; AI controls the other 5. Turn this off to play all 6 heroes on this device.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:/^Continue/}));
  const picker=screen.getByRole('combobox',{name:'Your character'});
  expect(within(picker).getAllByRole('option')).toHaveLength(6);
  for(const id of [DEFAULT_SETUP.roster[2],DEFAULT_SETUP.roster[5]]){fireEvent.change(picker,{target:{value:id}});expect((picker as HTMLSelectElement).value).toBe(id);}
  for(let i=0;i<2;i++)fireEvent.click(screen.getByRole('button',{name:/^Continue/}));
  fireEvent.click(screen.getByRole('tab',{name:'Starting quests'}));
  expect(screen.getByRole('region',{name:'Starting quests and creature placement'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:/Begin campaign/}));
  expect(start).toHaveBeenCalledWith(expect.objectContaining({roster:DEFAULT_SETUP.roster,variants:{overlordOnly:true}}),DEFAULT_SETUP.roster[5],true);
 });
 it.each(['v4','v6'])('preserves the %s save and presents a fresh setup under the new rules',version=>{
  const key=`lordaeron-base-save-${version}`;
  const old=JSON.stringify({format:'lordaeron-rules-session',version:2,pack:version==='v4'?'base-2005-faq-1.4-map-v4':'base-2005-faq-1.4-v6',contentHash:version==='v4'?'131aa8d4':'4c24b6cf',setup:DEFAULT_SETUP,commands:[]});localStorage.setItem(key,old);render(<Campaign/>);
  expect(screen.getByRole('dialog',{name:'New campaign'})).toBeTruthy();expect(localStorage.getItem(key)).toBe(old);expect(localStorage.getItem('lordaeron-base-save-v7')).toBeNull();expect(character(p,DEFAULT_SETUP.roster[0]).classId).toBe('warrior');
 });
});
