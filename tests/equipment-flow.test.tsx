// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import EquipmentEditor from '../src/campaign/EquipmentEditor';
import { TownEditor, TradeEditor } from '../src/campaign/Interactions';
import { startingHero } from '../src/campaign/CharacterSheet';
import { BASE_PACK as p } from '../src/data/base';
import { card, character } from '../src/rules/common';
import { fitsSlot, heroSlots } from '../src/rules/inventory';

afterEach(cleanup);
const heroFor = (classId: string) => startingHero(p.characters.find(c => c.classId === classId)!.id);

describe('bounded equipment flows', () => {
 it('keeps attachment selections when browsing its compact pages and resets paging for another slot', () => {
  const hero = heroFor('warrior'); hero.level = 5;
  const attachments = p.cards.filter(c => c.addon && !c.printed && fitsSlot(p, hero, c, heroSlots(p, hero)[6]));
  expect(attachments.length).toBeGreaterThan(2);
  hero.bag = attachments.map(c => c.id);
  render(<EquipmentEditor hero={hero} send={() => {}} busy={false} />);
  fireEvent.click(screen.getByRole('button', { name: /^Slot 7:/ }));
  expect(screen.getAllByRole('checkbox', { name: /one per function/ })).toHaveLength(2);
  const chosen = attachments[0];
  fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(`${chosen.name}.*one per function`) }));
  const pager = within(screen.getByRole('navigation', { name: 'Attachment pages' }));
  fireEvent.click(pager.getByRole('button', { name: 'Next' }));
  expect(screen.queryByLabelText(`${chosen.name} rules`)).toBeNull();
  fireEvent.click(pager.getByRole('button', { name: 'Previous' }));
  expect((screen.getByRole('checkbox', { name: new RegExp(`${chosen.name}.*one per function`) }) as HTMLInputElement).checked).toBe(true);
  fireEvent.click(pager.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: /^Slot 1:/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Slot 7:/ }));
  expect((within(screen.getByRole('navigation', { name: 'Attachment pages' })).getByRole('button', { name: 'Previous' }) as HTMLButtonElement).disabled).toBe(true);
 });

 it('shows an empty shelf after the last power is learned, with confirmation still available', () => {
  const hero = heroFor('mage'); hero.level = 5;
  hero.learned = p.cards.filter(c => c.kind === 'power' && !c.printed && c.classId === character(p, hero.id).classId).map(c => c.id);
  render(<TownEditor hero={hero} merchant={[]} send={() => {}} busy={false} />);
  expect(screen.getByText('You’ve learned every available power')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Confirm · 0 transactions · 1 action' }) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Buy items' }));
  expect(screen.getByText('The merchant’s shelf is empty')).toBeTruthy();
 });

 it('preserves offers across item pages and clears the previous ally’s offer when switching partners', () => {
  const hero = heroFor('mage'), allies = p.characters.filter(c => c.faction === character(p, hero.id).faction && c.id !== hero.id).slice(0, 2).map(c => startingHero(c.id));
  const exempt = p.cards.filter(c => c.kind === 'item' && !c.soulbound && c.bagExempt && !c.printed);
  const normal = p.cards.filter(c => c.kind === 'item' && !c.soulbound && !c.bagExempt && !c.printed);
  expect(exempt.length).toBeGreaterThan(1);
  hero.bag = [...normal.slice(0, 3), ...exempt.slice(0, 2)].map(c => c.id);
  allies[0].bag = [exempt[2].id];
  hero.gold = 10; allies[0].gold = 8;
  const send = vi.fn(); render(<TradeEditor hero={hero} heroes={[hero, ...allies]} send={send} busy={false} />);
  fireEvent.click(screen.getByRole('checkbox', { name: `You give: ${card(p, hero.bag[0]).name}` }));
  fireEvent.click(within(screen.getByRole('navigation', { name: 'You give: item pages' })).getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('checkbox', { name: `You give: ${card(p, hero.bag[4]).name}` }));
  fireEvent.change(screen.getByRole('spinbutton', { name: 'You give: gold' }), { target: { value: '3' } });
  fireEvent.click(screen.getByRole('checkbox', { name: `Ally gives: ${card(p, allies[0].bag[0]).name}` }));
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Ally gives: gold' }), { target: { value: '2' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Trade ally' }), { target: { value: allies[1].id } });
  expect((screen.getByRole('spinbutton', { name: 'Ally gives: gold' }) as HTMLInputElement).value).toBe('0');
  fireEvent.click(screen.getByRole('button', { name: 'Propose trade' }));
  expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'trade', hero: hero.id, to: allies[1].id, items: [hero.bag[0], hero.bag[4]], receiveItems: [], gold: 3, receiveGold: 0 });
 });

 it('locks trade inputs during submission while allowing the rules to be read', () => {
  const hero = heroFor('mage'), ally = startingHero(p.characters.find(c => c.faction === character(p, hero.id).faction && c.id !== hero.id)!.id);
  const item = p.cards.find(c => c.kind === 'item' && !c.soulbound && !c.printed)!;
  hero.bag = [item.id];
  render(<TradeEditor hero={hero} heroes={[hero, ally]} send={() => {}} busy />);
  expect((screen.getByRole('combobox', { name: 'Trade ally' }) as HTMLSelectElement).disabled).toBe(true);
  expect((screen.getByRole('checkbox', { name: `You give: ${item.name}` }) as HTMLInputElement).disabled).toBe(true);
  expect(screen.getAllByRole('spinbutton').every(input => (input as HTMLInputElement).disabled)).toBe(true);
  const rules = screen.getByLabelText(`You give: ${item.name} rules`);
  fireEvent.click(rules);
  expect(rules.closest('details')?.open).toBe(true);
 });
});
