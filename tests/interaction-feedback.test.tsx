// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { startingHero } from '../src/campaign/CharacterSheet';
import EquipmentEditor from '../src/campaign/EquipmentEditor';
import CombatScene from '../src/campaign/CombatScene';
import { COMBAT_BEATS, useCombatPresentation } from '../src/campaign/combat-flow';
import { AnimatedValue, challengeProfile, distinctChallenges, encounterProfile, ThreatLevel } from '../src/campaign/feedback';
import { createGame } from '../src/rules/game';
import { beginBattle, chooseAttacker, stats } from '../src/rules/combat';
import { card, character } from '../src/rules/common';
import { fitsSlot, heroSlots, manage } from '../src/rules/inventory';
import { view, type GameView } from '../src/rules/view';
import type { Command } from '../src/rules/model';
import { Modal } from '../src/components';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
const mage = () => { const h = startingHero(p.characters.find(c => c.classId === 'mage')!.id); h.learned = ['mage-fireball', 'mage-arcane-intellect']; return h; };
function PresentedScene({ state }: { state: GameView }) {
 const presentation = useCombatPresentation(state);
 return <CombatScene state={state} busy={false} presentation={presentation} />;
}

describe('equipment selection and confirmation', () => {
 it('previews costs, moves a power once, and submits a valid loadout without changing the hero early', () => {
  const h = mage(), original = structuredClone(h), send = vi.fn();
  render(<EquipmentEditor hero={h} send={send} busy={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Equip Arcane Intellect' }));
  expect(screen.getByText(/Energy: 4 → 3/)).toBeTruthy();
  expect(h).toEqual(original); expect(send).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /^Slot 2:/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Equip Arcane Intellect' }));
  fireEvent.click(screen.getByRole('button', { name: /^Slot 1:/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Equip Fireball' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm equipment' }));
  const command = send.mock.calls[0][0] as Extract<Command, { type: 'manage' }>;
  expect(command.slots.filter(s => s.card === 'mage-arcane-intellect')).toHaveLength(1);
  expect(command.slots[0].card).toBe('mage-fireball'); expect(command.slots[1].card).toBe('mage-arcane-intellect');
  const result = structuredClone(h); manage(p, { merchant: [] }, result, command.slots, command.discard, command.reEquip);
  expect(result.energy).toBe(3); expect(h).toEqual(original);
 });
 it('blocks unaffordable equipment, resets changes, and locks every picker while busy', () => {
  const h = mage(); h.energy = 0; const send = vi.fn(), r = render(<EquipmentEditor hero={h} send={send} busy={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Equip Arcane Intellect' }));
  expect(screen.getByRole('alert').textContent).toMatch(/Not enough energy/);
  expect((screen.getByRole('button', { name: 'Confirm equipment' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Reset changes' }));
  expect(screen.queryByRole('alert')).toBeNull();
  const printedSlot=character(p,h.id).slots.findIndex(s=>!!s.printed);
  fireEvent.click(screen.getByRole('button',{name:new RegExp(`^Slot ${printedSlot+1}:`)}));
  r.rerender(<EquipmentEditor hero={h} send={send} busy />);
  for (const button of r.container.querySelectorAll('.loadout-slot,.loadout-choice,.loadout-confirm button')) expect((button as HTMLButtonElement).disabled).toBe(true);
  fireEvent.focus(screen.getByRole('button',{name:/^Preview /}));
  expect(screen.getByRole('tooltip')).toBeTruthy();
  expect(send).not.toHaveBeenCalled();
 });
 it('requires an explicit overflow choice when unequipping into a full bag', () => {
  const h = startingHero(p.characters.find(c => c.classId === 'warrior')!.id); h.level = 5;
  const item = p.cards.find(c => c.kind === 'item' && !c.addon && !c.printed && !c.bagExempt && fitsSlot(p, h, c, heroSlots(p, h)[6]))!;
  h.slots[6].card = item.id;
  h.bag = p.cards.filter(c => c.kind === 'item' && !c.printed && !c.bagExempt && c.id !== item.id).slice(0, 3).map(c => c.id);
  const send = vi.fn(); render(<EquipmentEditor hero={h} send={send} busy={false} />);
  fireEvent.click(screen.getByRole('button', { name: /^Slot 7:/ }));
  const printed = character(p, h.id).slots[6].printed;
  fireEvent.click(screen.getByRole('button', { name: printed ? new RegExp(`${card(p, printed).name}.*Restore starting`) : /Leave slot empty/ }));
  expect(screen.getByRole('region', { name: 'Bag overflow' })).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Confirm equipment' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox', { name: card(p, h.bag[0]).name }));
  expect(screen.queryByRole('alert')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm equipment' }));
  const command = send.mock.calls[0][0] as Extract<Command, { type: 'manage' }>;
  const result = structuredClone(h), market = { merchant: [] as string[] };
  manage(p, market, result, command.slots, command.discard);
  expect(result.bag).toHaveLength(3); expect(market.merchant).toEqual([h.bag[0]]);
 });
 it('replaces an attachment with the same function without creating duplicate cards', () => {
  const h = startingHero(p.characters.find(c => c.classId === 'warrior')!.id); h.level = 5;
  const first = p.cards.find(c => c.name === 'Cobalt Buckler')!, second = p.cards.find(c => c.name === 'Skullance Shield')!;
  h.bag = [first.id, second.id]; const send = vi.fn(); render(<EquipmentEditor hero={h} send={send} busy={false} />);
  fireEvent.click(screen.getByRole('button', { name: /^Slot 7:/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: /Cobalt Buckler/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: /Skullance Shield/ }));
  expect((screen.getByRole('checkbox', { name: /Cobalt Buckler/ }) as HTMLInputElement).checked).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Confirm equipment' }));
  const command = send.mock.calls[0][0] as Extract<Command, { type: 'manage' }>;
  expect(command.slots[6].addons).toEqual([second.id]);
  const result = structuredClone(h); manage(p, { merchant: [] }, result, command.slots, command.discard);
  expect(result.bag).toContain(first.id);
 });
});

describe('encounter feedback uses actual rules and outcomes', () => {
 it.each([[1, 8], [5, 4], [7, 2], [9, 0]])('explains a %i+ threshold as %i successful D8 faces', (threshold, faces) => {
  render(<ThreatLevel value={threshold} />);
  expect(screen.getByLabelText(new RegExp(`${faces} of 8 D8 faces hit`))).toBeTruthy();
 });
 it('previews a mixed-color challenge as a group without counting independent or rival enemies', () => {
  const s = createGame(p, DEFAULT_SETUP);
  s.enemies = [
   { id: 'green', creature: 'gnoll', color: 'green', region: 'brill', faction: 'horde' },
   { id: 'red', creature: 'gnoll', color: 'red', region: 'brill', faction: 'horde' },
   { id: 'blue', creature: 'gnoll', color: 'blue', region: 'brill' },
   { id: 'rival', creature: 'gnoll', color: 'red', region: 'brill', faction: 'alliance' },
  ];
  const profile = challengeProfile(view(s), { type: 'challenge', hero: s.heroes[0].id, target: 'green', allies: [] })!;
  expect(profile.count).toBe(2);
  const expected = ['green', 'red'].map(id => stats(p, s, id));
  expect(profile.threat).toBe(Math.max(...expected.map(e => e.threat)));
  expect(profile.attack).toBe(expected.reduce((n, e) => n + e.attack, 0));
  expect(profile.health).toBe(expected.reduce((n, e) => n + e.health, 0));
 });
 it('includes live Overlord modifiers and the cauldron penalty before entering combat', () => {
  const s = createGame(p, DEFAULT_SETUP); s.overlord.attack = 2; s.overlord.threat = 1; s.overlord.health = 3;
  const cauldron = p.events.find(e => e.boss?.combat === 'cauldrons')!;
  s.world = [{ id: cauldron.id, tokens: [], attempts: [], gold: 0, items: [], trophies: { horde: [], alliance: [] } }];
  const preview = encounterProfile(view(s), 'kelthuzad');
  beginBattle(s, 'pve', [s.heroes[0].id], [], 'horde', 'stratholme', 'kelthuzad');
  expect(preview).toEqual(stats(p, s));
 });
 it('offers one challenge per creature group while preserving party and target choices', () => {
  const s = createGame(p, DEFAULT_SETUP), hero = s.heroes[0].id, ally = s.heroes[1].id;
  s.enemies = [
   { id: 'green', creature: 'gnoll', color: 'green', region: 'brill', faction: 'horde' },
   { id: 'red', creature: 'gnoll', color: 'red', region: 'brill', faction: 'horde' },
   { id: 'blue', creature: 'gnoll', color: 'blue', region: 'brill' },
   { id: 'rival', creature: 'gnoll', color: 'red', region: 'brill', faction: 'alliance' },
  ];
  const commands = s.enemies.flatMap(e => [[], [ally]].map(allies => ({ type: 'challenge' as const, hero, target: e.id, allies })));
  const choices = distinctChallenges(view(s), commands);
  expect(choices).toHaveLength(6);
  expect(choices.map(c => c.target)).toEqual(['green', 'green', 'blue', 'blue', 'rival', 'rival']);
  expect(choices.filter(c => c.target === 'green').map(c => c.allies)).toEqual([[], [ally]]);
 });
 it('shows health feedback for the hero who was hurt and expires the cue', async () => {
  vi.useFakeTimers(); const s = createGame(p, DEFAULT_SETUP); const [a, h] = s.heroes;
  s.enemies = [{ id: 'enemy', creature: 'gnoll', color: 'green', region: 'brill' }];
  beginBattle(s, 'pve', [a.id, h.id], ['enemy'], 'horde', 'brill'); chooseAttacker(p, s, a.id);
  const r = render(<PresentedScene state={view(s)} />);
  h.health--; s.revision++; r.rerender(<PresentedScene state={view(s)} />);
  expect(screen.getByRole('status').textContent).toContain('Brace for impact');
  await act(async () => { vi.advanceTimersByTime(COMBAT_BEATS.impact); });
  expect(screen.getByText(`${character(p, h.id).name.split(' ')[0]} −1 health`)).toBeTruthy();
  expect(screen.getByRole('img', { name: character(p, h.id).name })).toBeTruthy();
  await act(async () => { vi.advanceTimersByTime(COMBAT_BEATS.complete - COMBAT_BEATS.impact); });
  expect(screen.queryByText(`${character(p, h.id).name.split(' ')[0]} −1 health`)).toBeNull();
 });
 it('replaces successive combat cues without accumulating animation elements', () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const s = createGame(p, DEFAULT_SETUP), h = s.heroes[0];
  s.enemies = [{ id: 'enemy', creature: 'gnoll', color: 'green', region: 'brill' }];
  beginBattle(s, 'pve', [h.id], ['enemy'], 'horde', 'brill'); chooseAttacker(p, s, h.id);
  const r = render(<PresentedScene state={view(s)} />);
  for (let i = 0; i < 5; i++) {
   s.battle!.boxes.horde.damage++; s.revision++;
   r.rerender(<PresentedScene state={view(s)} />);
   expect(r.container.querySelectorAll('.battle-exchange')).toHaveLength(1);
   expect(screen.getAllByRole('status')).toHaveLength(1);
  }
  expect(errors).not.toHaveBeenCalled();
 });
 it('updates numeric values immediately without adding decorative deltas to their accessible text', async () => {
  vi.useFakeTimers(); const r = render(<output aria-label="Health"><AnimatedValue value={5} /></output>);
  r.rerender(<output aria-label="Health"><AnimatedValue value={2} /></output>);
  expect(screen.getByLabelText('Health').textContent).toBe('2');
  expect(r.container.querySelector('[data-delta]')?.getAttribute('data-delta')).toBe('−3');
  await act(async () => { vi.advanceTimersByTime(950); });
  expect(r.container.querySelector('[data-delta]')).toBeNull();
 });
});

it('keeps scrolling locked until the last dialog is removed, even when its parent closes first', () => {
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
 document.body.style.overflow = 'auto';
 const first = render(<Modal title="First" onClose={() => { }}>First</Modal>);
 const second = render(<Modal title="Second" onClose={() => { }}>Second</Modal>);
 first.unmount(); expect(document.body.style.overflow).toBe('hidden');
 second.unmount(); expect(document.body.style.overflow).toBe('auto'); document.body.style.overflow = '';
});
