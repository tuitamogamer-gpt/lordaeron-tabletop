// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { BASE_PACK as p } from '../src/data/base';
import { loadouts } from '../src/ai/loadout';
import { card } from '../src/rules/common';
import { fitsSlot, heroSlots } from '../src/rules/inventory';
import type { Command } from '../src/rules/model';
import { startingHero } from '../src/campaign/CharacterSheet';
import EquipmentEditor from '../src/campaign/EquipmentEditor';

afterEach(cleanup);
/**
 * 20. 11. 2026: equipment at the end of a turn was found slot by slot. A power learned this turn showed nowhere until the
 * right slot was opened, and the cards for a slot stood in a narrow column of four-line labels beside an empty panel.
 */
const WARRIOR = p.characters.find(c => c.classId === 'warrior' && c.faction === 'horde')!, MAGE = p.characters.find(c => c.classId === 'mage' && c.faction === 'horde')!;
/** A warrior of level 2 who has learned three powers and carries a shield he has not put on. */
function trained() {
 const h = startingHero(WARRIOR.id);
 h.level = 2; h.energy = 4; h.learned = ['warrior-thunder-clap', 'warrior-heroic-strike', 'warrior-battle-shout'];
 h.bag = [p.cards.find(c => c.kind === 'item' && !c.addon && heroSlots(p, h).some(a => fitsSlot(p, h, c, a)) && c.level <= 2 && !c.printed)!.id];
 return h;
}
const slotsOf = (send: ReturnType<typeof vi.fn>) => (send.mock.calls[0][0] as Extract<Command, { type: 'manage' }>).slots;

describe('what is owned and not equipped', () => {
 it('stands in a row of its own, each card with the slot it would go to', () => {
  const h = trained();
  render(<EquipmentEditor hero={h} send={vi.fn()} busy={false} />);
  const tray = screen.getByRole('region', { name: 'Cards not equipped' });
  expect(within(tray).getAllByRole('button')).toHaveLength(4);
  for (const id of [...h.learned, ...h.bag]) {
   const button = within(tray).getByRole('button', { name: new RegExp(`^${card(p, id).name}: put in slot \\d+$`) });
   const slot = Number(button.getAttribute('aria-label')!.match(/slot (\d+)$/)![1]) - 1;
   expect(fitsSlot(p, h, card(p, id), heroSlots(p, h)[slot])).toBe(true);
  }
  // A slot says how many of those cards fit it.
  expect(screen.getAllByText(/^\+\d+ to equip$/).length).toBeGreaterThan(0);
 });
 it('goes into its slot with one click, which opens that slot; nothing is saved before the confirmation', () => {
  const h = trained(), send = vi.fn();
  render(<EquipmentEditor hero={h} send={send} busy={false} />);
  const tray = () => screen.getByRole('region', { name: 'Cards not equipped' });
  const button = within(tray()).getByRole('button', { name: /^Thunder Clap: put in slot/ }), slot = Number(button.getAttribute('aria-label')!.match(/slot (\d+)$/)![1]);
  fireEvent.click(button);
  expect(send).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: new RegExp(`^Slot ${slot}: .*Thunder Clap`) }).getAttribute('aria-pressed')).toBe('true');
  expect(within(tray()).queryByRole('button', { name: /^Thunder Clap:/ })).toBeNull();
  expect(within(tray()).getAllByRole('button')).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: 'Confirm equipment' }));
  expect(slotsOf(send)[slot - 1].card).toBe('warrior-thunder-clap');
 });
 it('is not shown when everything that fits is equipped', () => {
  render(<EquipmentEditor hero={startingHero(MAGE.id)} send={vi.fn()} busy={false} />);
  expect(screen.queryByRole('region', { name: 'Cards not equipped' })).toBeNull();
 });
});

describe('“Suggest a loadout”', () => {
 it('lays out the loadout an AI character would choose, for the player to confirm or change', () => {
  const h = trained(), send = vi.fn(), best = loadouts(p, h)[0];
  render(<EquipmentEditor hero={h} send={send} busy={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Suggest a loadout' }));
  expect(send).not.toHaveBeenCalled();
  expect(screen.getByRole('status').textContent).toContain('Suggested loadout laid out');
  fireEvent.click(screen.getByRole('button', { name: 'Confirm equipment' }));
  expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'manage', hero: h.id, slots: best.slots, discard: best.discard, reEquip: best.reEquip ?? [] });
  // Asked again with that loadout laid out, it has nothing to add.
  fireEvent.click(screen.getByRole('button', { name: 'Suggest a loadout' }));
  expect(screen.getByRole('status').textContent).toContain('already the strongest loadout');
 });
 it('can be undone with Reset changes', () => {
  const h = trained(), send = vi.fn();
  render(<EquipmentEditor hero={h} send={send} busy={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Suggest a loadout' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset changes' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm equipment' }));
  expect(slotsOf(send)).toEqual(h.slots);
 });
});

describe('several characters to equip', () => {
 it('says who follows, so that confirming is known to go on to the next character', () => {
  const ui = render(<EquipmentEditor hero={trained()} send={vi.fn()} busy={false} pending={[MAGE.id]} />);
  expect(ui.container.querySelector('.loadout-queue')?.textContent).toBe(`Then ${MAGE.name.split(' ')[0]}`);
  expect(ui.container.querySelector('.loadout-next')?.textContent).toBe(`Next: ${MAGE.name.split(' ')[0]}`);
  cleanup();
  expect(render(<EquipmentEditor hero={trained()} send={vi.fn()} busy={false} />).container.querySelector('.loadout-next')).toBeNull();
 });
});

describe('how text breaks', () => {
 it('is set once, in the stylesheet loaded last: no stub lines in running text, even lines in headings and labels', () => {
  const main = readFileSync('src/main.tsx', 'utf8'), imports = [...main.matchAll(/import '\.\/campaign\/([\w-]+\.css)';/g)].map(m => m[1]);
  expect(imports.at(-1)).toBe('clean-layout.css');
  const css = readFileSync('src/campaign/clean-layout.css', 'utf8');
  expect(css).toMatch(/body\{text-wrap:pretty\}/);
  expect(css).toMatch(/:is\(h1,h2,h3,h4,h5,h6,[^)]*button[^)]*\)[^{]*\{text-wrap:balance\}/);
 });
});
