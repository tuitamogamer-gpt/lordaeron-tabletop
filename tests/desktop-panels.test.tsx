// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { capacity, card, character } from '../src/rules/common';
import { createGame } from '../src/rules/game';
import { fitsSlot, heroSlots, manage, townOperations } from '../src/rules/inventory';
import { legalActions, commandLabel } from '../src/rules/legal';
import { startRewards } from '../src/rules/reward-engine';
import type { Command, State } from '../src/rules/model';
import { view } from '../src/rules/view';
import { startingHero } from '../src/campaign/CharacterSheet';
import EquipmentEditor from '../src/campaign/EquipmentEditor';
import { TownEditor } from '../src/campaign/Interactions';
import WorldDecision from '../src/campaign/WorldDecision';

afterEach(cleanup);
const mage=()=>startingHero(p.characters.find(c=>c.classId==='mage')!.id);
const decision=(s:State,legal:Command[],send=vi.fn(),inspect=vi.fn())=><WorldDecision state={view(s)} legal={legal} send={send} inspect={inspect} botStep={()=>{}} botReady={false} auto={false} toggleBots={()=>{}}/>;
const inventoryItems=p.cards.filter(c=>c.kind==='item'&&!c.soulbound&&!c.bagExempt&&!c.printed);

describe('compact talent decisions',()=>{
 it('offers one choose action per thumbnail and keeps inspecting separate from choosing',()=>{
  const s=createGame(p,DEFAULT_SETUP),h=s.heroes[0];h.level=2;h.talentChoices=[2];
  const legal=legalActions(p,s),talents=legal.filter((c):c is Extract<Command,{type:'talent'}>=>c.type==='talent');
  expect(talents.length).toBeGreaterThan(1);
  const send=vi.fn(),inspect=vi.fn(),r=render(decision(s,legal,send,inspect));
  expect(r.container.querySelectorAll('.talent-choice')).toHaveLength(talents.length);
  expect(r.container.querySelector('.decision-options')).toBeNull();
  for(const choice of talents)expect(screen.getAllByRole('button',{name:commandLabel(p,choice)})).toHaveLength(1);
  const selected=talents[1];
  fireEvent.click(screen.getByRole('button',{name:`Inspect ${card(p,selected.card).name}`}));
  expect(inspect).toHaveBeenCalledWith(selected.card);expect(send).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:commandLabel(p,selected)}));
  expect(send).toHaveBeenCalledExactlyOnceWith(selected);
 });
 it('finishes pending talent choices before revealing reward selection',()=>{
  const s=createGame(p,DEFAULT_SETUP),h=s.heroes[0];s.phase='reward';
  startRewards(p,s,[h.id],[h.id],{xp:0,gold:0,items:[{deck:'triangle',draw:2}]});
  h.level=2;h.talentChoices=[2];
  const r=render(decision(s,legalActions(p,s)));
  expect(screen.getByRole('dialog',{name:'New talent'})).toBeTruthy();
  expect(screen.queryByRole('region',{name:'Reward resolution'})).toBeNull();
  expect(screen.queryByRole('button',{name:/^Claim /})).toBeNull();
  h.talentChoices=[];s.revision++;
  r.rerender(decision(s,legalActions(p,s)));
  expect(screen.getByRole('region',{name:'Reward resolution'})).toBeTruthy();
  expect(screen.getByRole('button',{name:/^Claim /})).toBeTruthy();
 });
 it('clears a previous search when a new decision replaces the open dialog',()=>{
  const s=createGame(p,DEFAULT_SETUP),h=s.heroes[0];h.level=5;h.talentChoices=[5];
  const many:Command[]=p.cards.filter(c=>c.kind==='talent').slice(0,13).map(c=>({type:'talent',hero:h.id,card:c.id}));
  const r=render(decision(s,many));
  fireEvent.change(screen.getByRole('textbox',{name:'Filter decisions'}),{target:{value:'no matching card'}});
  expect(r.container.querySelectorAll('.talent-choice')).toHaveLength(0);
  s.revision++;
  r.rerender(decision(s,many.slice(0,3)));
  expect(screen.queryByRole('textbox',{name:'Filter decisions'})).toBeNull();
  expect(r.container.querySelectorAll('.talent-choice')).toHaveLength(3);
 });
});

describe('Town thumbnail transactions',()=>{
 it('stages a chosen overflow discard, a sale and training, then sends the exact valid transaction order',()=>{
  const h=mage();h.level=5;h.gold=100;h.health=capacity(p,h).health;h.energy=capacity(p,h).energy;
  h.bag=inventoryItems.slice(0,3).map(c=>c.id);
  const purchased=inventoryItems[3],sold=h.bag[0],discarded=h.bag[1],original=structuredClone(h),send=vi.fn();
  render(<TownEditor hero={h} merchant={[purchased.id]} send={send} busy={false}/>);
  fireEvent.change(screen.getByRole('combobox',{name:`Discard to buy ${purchased.name}`}),{target:{value:discarded}});
  fireEvent.click(screen.getByRole('button',{name:'Add purchase'}));
  fireEvent.click(screen.getByRole('button',{name:'Sell items'}));
  fireEvent.click(screen.getByRole('button',{name:`Sell ${card(p,sold).name}`}));
  fireEvent.click(screen.getByRole('button',{name:'Learn powers'}));
  fireEvent.click(screen.getByRole('button',{name:'Learn Fireball'}));
  expect(send).not.toHaveBeenCalled();expect(h).toEqual(original);
  fireEvent.click(screen.getByRole('button',{name:'Confirm · 3 transactions · 1 action'}));
  const command=send.mock.calls[0][0] as Extract<Command,{type:'town'}>;
  expect(command).toEqual({type:'town',hero:h.id,health:0,operations:[{op:'buy',card:purchased.id,discard:discarded},{op:'sell',card:sold},{op:'train',card:'mage-fireball'}]});
  const result=structuredClone(h),market={merchant:[purchased.id]};
  townOperations(p,market,result,command.health,command.operations,command.recoverAfter);
  expect(result.bag).toEqual([h.bag[2],purchased.id]);expect(result.learned).toContain('mage-fireball');
  expect(market.merchant).toEqual([discarded,sold]);
  expect(result.gold).toBe(100-purchased.price+Math.ceil(card(p,sold).price/2)-card(p,'mage-fireball').price);
 });
 it('keeps every stock item reachable by pages and clamps the page after the last purchase',()=>{
  const h=mage();h.gold=100;const merchant=inventoryItems.slice(0,13).map(c=>c.id),send=vi.fn();
  const r=render(<TownEditor hero={h} merchant={merchant} send={send} busy={false}/>);
  expect(r.container.querySelectorAll('.town-card-entry')).toHaveLength(12);
  fireEvent.click(within(screen.getByRole('navigation',{name:'Town card pages'})).getByRole('button',{name:'Next'}));
  expect(r.container.querySelectorAll('.town-card-entry')).toHaveLength(1);
  expect(screen.getByRole('button',{name:`Preview ${card(p,merchant[12]).name}`})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Add purchase'}));
  expect(screen.queryByRole('navigation',{name:'Town card pages'})).toBeNull();
  expect(r.container.querySelectorAll('.town-card-entry')).toHaveLength(12);
  fireEvent.click(screen.getByRole('button',{name:'Confirm · 1 transactions · 1 action'}));
  expect(send).toHaveBeenCalledWith(expect.objectContaining({operations:[{op:'buy',card:merchant[12],discard:undefined}]}));
 });
 it('allows previewing unaffordable or busy cards without staging a transaction',()=>{
  const h=mage();h.gold=0;h.bag=[inventoryItems[0].id];const send=vi.fn(),r=render(<TownEditor hero={h} merchant={[]} send={send} busy={false}/>);
  const fireball=screen.getByRole('button',{name:'Learn Fireball'});
  expect(fireball.getAttribute('aria-disabled')).toBe('true');
  fireEvent.focus(fireball);expect(screen.getByRole('tooltip',{name:'Fireball full card'})).toBeTruthy();
  fireEvent.click(fireball);expect(screen.getByText('No transactions staged')).toBeTruthy();
  r.rerender(<TownEditor hero={h} merchant={[]} send={send} busy/>);
  fireEvent.click(screen.getByRole('button',{name:'Sell items'}));
  const sell=screen.getByRole('button',{name:`Sell ${inventoryItems[0].name}`});
  expect(sell.getAttribute('aria-disabled')).toBe('true');fireEvent.click(sell);
  expect(screen.getByText('No transactions staged')).toBeTruthy();expect(send).not.toHaveBeenCalled();
 });
});

describe('compact equipment pages',()=>{
 it('reaches a spell on the final picker page, preserves its selection, and resets paging for another slot',()=>{
  const h=mage();h.level=5;h.energy=capacity(p,h).energy;
  h.learned=p.cards.filter(c=>c.kind==='power'&&!c.printed&&c.classId===character(p,h.id).classId).map(c=>c.id);
  const compatible=h.learned.filter(id=>fitsSlot(p,h,card(p,id),heroSlots(p,h)[0]));
  expect(compatible.length).toBeGreaterThan(4);
  const send=vi.fn();render(<EquipmentEditor hero={h} send={send} busy={false}/>);
  const pager=screen.getByRole('navigation',{name:'Compatible card pages'});
  while(!(within(pager).getByRole('button',{name:'Next'}) as HTMLButtonElement).disabled)fireEvent.click(within(pager).getByRole('button',{name:'Next'}));
  const selected=compatible.at(-1)!;
  fireEvent.click(screen.getByRole('button',{name:`Equip ${card(p,selected).name}`}));
  fireEvent.click(screen.getByRole('button',{name:/^Slot 2:/}));
  const otherPager=screen.queryByRole('navigation',{name:'Compatible card pages'});
  if(otherPager)expect((within(otherPager).getByRole('button',{name:'Previous'}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Confirm equipment'}));
  const command=send.mock.calls[0][0] as Extract<Command,{type:'manage'}>;
  expect(command.slots[0].card).toBe(selected);
  const result=structuredClone(h);manage(p,{merchant:[]},result,command.slots,command.discard,command.reEquip);
  expect(result.slots[0].card).toBe(selected);
 });
});
