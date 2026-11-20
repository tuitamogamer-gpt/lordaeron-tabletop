// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Tabletop from '../src/campaign/Tabletop';
import { beats } from '../src/campaign/stage';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { character } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import type { Command, State } from '../src/rules/model';
import { view } from '../src/rules/view';

/**
 * How a campaign ends (20. 11. 2026). The rulebook's own ending is one final PvP battle when turn 30 ends with the Overlord
 * standing; the variant from page 37 plays on in laps instead. Every new campaign used to take the variant without asking, so a
 * player expecting the final battle found himself on "turn 34". The setup now asks (tests/class-deck-ui.test.tsx); here: what
 * the table shows when turn 30 ends under the standard rules.
 */
beforeEach(() => {
 window.scrollTo = vi.fn(); HTMLElement.prototype.scrollIntoView = vi.fn();
 vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
 HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

/** The Alliance has finished its equipment in turn 30: the next command ends the turn. */
function lastTurn(overlordOnly: boolean) {
 const s = createGame(p, { ...DEFAULT_SETUP, variants: { ...DEFAULT_SETUP.variants, overlordOnly } });
 s.turn = 30; s.faction = 'alliance'; s.phase = 'management'; s.wars = [];
 s.managed = s.heroes.filter(h => character(p, h.id).faction === 'alliance').map(h => h.id);
 return s;
}
const table = (s: State, human: string, send: (c: Command) => void = () => {}) => {
 const bots = s.heroes.map(h => h.id).filter(id => id !== human), legal = legalActions(p, s).filter(c => !('hero' in c) || c.hero === human);
 return render(<Tabletop state={view(s, [human])} h={s.heroes.find(h => h.id === human)!} legal={legal} controlled={[human]} bots={bots} auto={false} botReady botReason="" selectHero={() => {}} selected={s.heroes[0].location} selectRegion={() => {}} inspect={() => {}} open={() => {}} send={send} botStep={() => {}} toggleBots={() => {}} focused={false} toggleFocus={() => {}} notify={() => {}} />);
};

describe('the end of turn 30', () => {
 it('under the standard rules leads to the final battle, and the table announces it', () => {
  const before = lastTurn(false), after = apply(p, before, { type: 'endManagement' });
  expect(after).toMatchObject({ phase: 'final-management', turn: 30 });
  const shown = beats(p, view(before), view(after), { type: 'endManagement' }, false);
  expect(shown.map(b => b.title)).toEqual(['The final battle']);
  expect(shown[0]).toMatchObject({ eyebrow: 'Turn 30 is over', size: 'banner' });
  expect(shown[0].lines.join(' ')).toContain('prepares first, then attacks');
 });
 it('in the Defeat the Overlord variant begins another lap instead', () => {
  const after = apply(p, lastTurn(true), { type: 'endManagement' });
  expect(after).toMatchObject({ turn: 1, lap: 2 });
  expect(after.phase).not.toBe('final-management');
 });
 it('names the last preparation for what it is, and its button begins the final battle', () => {
  let s = apply(p, lastTurn(false), { type: 'endManagement' });
  const human = s.heroes.find(h => character(p, h.id).faction !== s.faction)!.id;
  // The attacking faction prepares first; then the defenders, the player's character among them.
  const confirm = (id: string) => { s = apply(p, s, { type: 'manage', hero: id, slots: structuredClone(s.heroes.find(h => h.id === id)!.slots), discard: [] }); };
  for (const h of s.heroes.filter(h => character(p, h.id).faction === s.faction)) confirm(h.id);
  table(s, human);
  expect(screen.getByRole('region', { name: 'Next campaign step' }).textContent).toContain('Prepare for the final battle');
  expect(screen.queryByRole('button', { name: /^Begin the final battle/ })).toBeNull();
  cleanup();
  for (const h of s.heroes.filter(h => !s.finalReady.includes(h.id))) confirm(h.id);
  const send = vi.fn();
  table(s, human, send);
  expect(screen.getByRole('region', { name: 'Next campaign step' }).textContent).toContain('Both factions now meet in one last PvP battle');
  expect(screen.queryByRole('button', { name: /^End turn/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /^Begin the final battle/ }));
  expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'endManagement' });
  // The rules agree: that command opens the final battle with every character in it.
  expect(apply(p, s, { type: 'endManagement' }).battle).toMatchObject({ kind: 'final', participants: s.heroes.map(h => h.id) });
 });
});
