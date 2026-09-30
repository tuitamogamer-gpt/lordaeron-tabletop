// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import ClassDeck from '../src/campaign/ClassDeck';
import EquipmentEditor from '../src/campaign/EquipmentEditor';
import { startingHero } from '../src/campaign/CharacterSheet';
import { BASE_PACK as p } from '../src/data/base';
import { card } from '../src/rules/common';
import { fitsSlot, heroSlots, manage } from '../src/rules/inventory';
import type { Command, Hero } from '../src/rules/model';

afterEach(cleanup);
const heroFor = (classId: string) => startingHero(p.characters.find(c => c.classId === classId)!.id);

function Training({ hero }: { hero: Hero }) {
 const [selected, setSelected] = useState<string[]>([]);
 return <ClassDeck hero={hero} selected={selected} inspect={() => {}} toggle={id => setSelected(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id])} />;
}

describe('card and equipment polish', () => {
 it('announces the remaining training budget and restores it when a selection is removed', () => {
  const hero = heroFor('mage'), result = render(<Training hero={hero} />);
  const entry = within([...result.container.querySelectorAll('.deck-card-entry')].find(node => node.textContent?.includes('Fireball'))! as HTMLElement);
  expect(screen.getByRole('status', { name: '5 gold available' })).toBeTruthy();
  fireEvent.click(entry.getByRole('button', { name: 'Add to training' }));
  expect(screen.getByRole('status', { name: `${hero.gold - card(p, 'mage-fireball').price} gold remaining after training` })).toBeTruthy();
  expect(entry.getByText('Selected for training')).toBeTruthy();
  fireEvent.click(entry.getByRole('button', { name: 'Remove from training' }));
  expect(screen.getByRole('status', { name: '5 gold available' })).toBeTruthy();
  expect(hero.gold).toBe(5);
 });

 it('distinguishes unlocked talents from an available level-up choice', () => {
  const hero = heroFor('mage'); hero.level = 2;
  const result = render(<ClassDeck hero={hero} inspect={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /^Talent deck/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Level 2' }));
  expect(screen.getAllByText('Choose on level up')).toHaveLength(3);
  expect(screen.queryByText('Ready to learn')).toBeNull();
  result.rerender(<ClassDeck hero={{ ...hero, talentChoices: [2] }} inspect={() => {}} />);
  expect(screen.getAllByText('Ready to choose')).toHaveLength(3);
 });

 it('keeps valid overflow choices through no-op picks and changes to another slot', () => {
  const hero = heroFor('warrior'); hero.level = 5; hero.energy = 20;
  const areas = heroSlots(p, hero);
  const item = p.cards.find(c => c.kind === 'item' && !c.addon && !c.printed && !c.bagExempt && fitsSlot(p, hero, c, areas[6]))!;
  const power = p.cards.find(c => c.kind === 'power' && c.classId === 'warrior' && !c.printed && fitsSlot(p, hero, c, areas[0]))!;
  hero.slots[6].card = item.id;
  hero.bag = p.cards.filter(c => c.kind === 'item' && !c.printed && !c.bagExempt && c.id !== item.id).slice(0, 3).map(c => c.id);
  hero.learned = [power.id];
  const original = structuredClone(hero), send = vi.fn();
  render(<EquipmentEditor hero={hero} send={send} busy={false} />);
  fireEvent.click(screen.getByRole('button', { name: /^Slot 7:/ }));
  const restoreName = areas[6].printed ? new RegExp(`${card(p, areas[6].printed!).name}.*Restore starting`) : /Leave slot empty/;
  fireEvent.click(screen.getByRole('button', { name: restoreName }));
  const overflow = () => within(screen.getByRole('region', { name: 'Bag overflow' }));
  const discardName = card(p, hero.bag[0]).name;
  fireEvent.click(overflow().getByRole('checkbox', { name: discardName }));
  fireEvent.click(screen.getByRole('button', { name: restoreName }));
  expect((overflow().getByRole('checkbox', { name: discardName }) as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /^Slot 1:/ }));
  fireEvent.click(screen.getByRole('button', { name: `Equip ${power.name}` }));
  expect((overflow().getByRole('checkbox', { name: discardName }) as HTMLInputElement).checked).toBe(true);
  expect(screen.queryByRole('alert')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm equipment' }));
  const command = send.mock.calls[0][0] as Extract<Command, { type: 'manage' }>;
  const result = structuredClone(hero), market = { merchant: [] as string[] };
  manage(p, market, result, command.slots, command.discard, command.reEquip);
  expect(market.merchant).toEqual([hero.bag[0]]);
  expect(hero).toEqual(original);
 });

 it('removes obsolete overflow choices after making room by equipping an item', () => {
  const hero = heroFor('warrior'); hero.level = 5;
  const area = heroSlots(p, hero)[6];
  const item = p.cards.find(c => c.kind === 'item' && !c.addon && !c.printed && !c.bagExempt && fitsSlot(p, hero, c, area))!;
  hero.slots[6].card = item.id;
  hero.bag = p.cards.filter(c => c.kind === 'item' && !c.printed && !c.bagExempt && c.id !== item.id).slice(0, 3).map(c => c.id);
  const send = vi.fn(); render(<EquipmentEditor hero={hero} send={send} busy={false} />);
  fireEvent.click(screen.getByRole('button', { name: /^Slot 7:/ }));
  fireEvent.click(screen.getByRole('button', { name: area.printed ? new RegExp(`${card(p, area.printed).name}.*Restore starting`) : /Leave slot empty/ }));
  fireEvent.click(within(screen.getByRole('region', { name: 'Bag overflow' })).getByRole('checkbox', { name: item.name }));
  fireEvent.click(screen.getByRole('button', { name: `Equip ${item.name}` }));
  expect(screen.queryByRole('region', { name: 'Bag overflow' })).toBeNull();
  expect(screen.queryByRole('alert')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm equipment' }));
  expect(send.mock.calls[0][0].discard).toEqual([]);
 });

 it('locks compatible-card pagination while equipment submission is busy', () => {
  const hero = heroFor('mage'); hero.level = 5;
  hero.learned = p.cards.filter(c => c.classId === 'mage' && c.kind === 'power' && !c.printed).map(c => c.id);
  render(<EquipmentEditor hero={hero} send={() => {}} busy />);
  const pagination = within(screen.getByRole('navigation', { name: 'Compatible card pages' }));
  expect(pagination.getAllByRole('button').every(button => (button as HTMLButtonElement).disabled)).toBe(true);
 });

 it('makes attachment rules readable before selecting or equipping them', () => {
  const hero = heroFor('warrior'); hero.level = 5;
  const attachment = p.cards.find(c => c.name === 'Cobalt Buckler')!;
  hero.bag = [attachment.id];
  const send = vi.fn(); render(<EquipmentEditor hero={hero} send={send} busy={false} />);
  fireEvent.click(screen.getByRole('button', { name: /^Slot 7:/ }));
  const summary = screen.getByLabelText('Cobalt Buckler rules');
  fireEvent.click(summary);
  expect(summary.closest('details')?.open).toBe(true);
  expect(summary.closest('details')?.querySelector('.inscribed-rules')?.textContent).toBeTruthy();
  expect((screen.getByRole('checkbox', { name: /Cobalt Buckler/ }) as HTMLInputElement).checked).toBe(false);
  expect(send).not.toHaveBeenCalled();
 });
});
