// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { createGame } from '../src/rules/game';
import { view } from '../src/rules/view';
import RasterCard from '../src/campaign/RasterCard';
import RulesGuide from '../src/campaign/RulesGuide';
import CharacterSheet, { startingHero } from '../src/campaign/CharacterSheet';
import { QuestDecks } from '../src/campaign/QuestLedger';
import { ExperienceTrack, TurnTrack } from '../src/campaign/BoardTracks';
import { faqNote, pickFace } from '../src/campaign/scan-assets';

const size = (src: string) => ({ src, width: 600, height: 930 });
const hero = p.characters[0].id;
// The user's scans are not in the repository, so the scan layer is exercised with a handful of made-up entries.
vi.mock('../src/campaign/scan-assets', async importOriginal => {
 const real = await importOriginal<typeof import('../src/campaign/scan-assets')>();
 const { BASE_PACK } = await import('../src/data/base');
 const id = BASE_PACK.characters[0].id;
 return { ...real, hasScans: true, SCANS: {
  cards: { 'mage-arcane-missiles': { src: '/scan/arcane-missiles.webp', width: 600, height: 930 } },
  counters: { [id]: '/scan/counter.webp' },
  tokens: { hourglass: '/scan/hourglass.webp' },
  backs: { 'quest-horde-green': { src: '/scan/quest-horde-green.webp', width: 360, height: 556 }, 'class-mage': { src: '/scan/class-mage.webp', width: 360, height: 553 }, event: { src: '/scan/event.webp', width: 360, height: 560 } },
  sheets: { [id]: { src: '/scan/sheet.webp', width: 1900, height: 1456 } },
  reference: { rules: { src: '/scan/rules.webp', width: 1800, height: 2476 } },
 } };
});

beforeEach(() => { HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); }; HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); }; });
afterEach(cleanup);

describe('faces from the user’s scans', () => {
 it('swaps in the scan only where one was prepared', () => {
  const baked = { src: '/baked.webp', width: 768, height: 1152 };
  expect(pickFace(baked)).toEqual({ ...baked, scanned: false });
  expect(pickFace(baked, size('/scan.webp'))).toEqual({ ...size('/scan.webp'), scanned: true });
 });

 it('knows which cards the FAQ corrected after they were printed', () => {
  expect(faqNote('mage-arcane-missiles')).toBe('Free only if used in the preceding round of this combat and unharmed');
  expect(faqNote('priest-shadowguard')).toBe('During the Defense phase');
  expect(faqNote('mage-fireball')).toBeUndefined();
  for (const id of ['rogue-slice-and-dice', 'special-pyric-caduceus', 'quest-horde-brutes-in-the-barrows']) expect(faqNote(id), id).toBeTruthy();
 });

 it('shows a scanned card as printed, with a ribbon for the FAQ change', () => {
  const { container } = render(<><RasterCard id="mage-arcane-missiles" title="Arcane Missiles"/><RasterCard id="mage-fireball" title="Fireball"/></>);
  const [scanned, illustrated] = [...container.querySelectorAll('article')];
  expect(scanned.className).toContain('scanned');
  expect(scanned.querySelector('img')!.getAttribute('src')).toBe('/scan/arcane-missiles.webp');
  expect(scanned.querySelector('.faq-note')!.textContent).toContain('Free only if used in the preceding round');
  expect(scanned.querySelector('img')!.getAttribute('alt')).toContain('FAQ 1.4 correction');
  expect(illustrated.className).not.toContain('scanned');
  expect(illustrated.querySelector('img')!.getAttribute('src')).toBe('/assets/card-faces/v9/mage-fireball.webp');
  expect(illustrated.querySelector('.faq-note')).toBeNull();
 });
});

describe('real counters, backs and sheets', () => {
 it('puts the printed back on each quest deck that has one', () => {
  const s = createGame(p, DEFAULT_SETUP);
  render(<QuestDecks state={view(s)} side="horde"/>);
  const [green, yellow] = screen.getAllByRole('button');
  expect(green.className).toContain('scanned-back');
  expect(green.style.backgroundImage).toContain('/scan/quest-horde-green.webp');
  expect(yellow.className).not.toContain('scanned-back');
  expect(yellow.style.backgroundImage).toBe('');
 });

 it('climbs the experience track with the printed counters and turns the hourglass on the track', () => {
  const s = createGame(p, DEFAULT_SETUP); s.faction = 'horde';
  const { container } = render(<><ExperienceTrack state={view(s)}/><TurnTrack state={view(s)}/></>);
  const counters = [...container.querySelectorAll('.board-xp-counter')];
  expect(counters.find(c => c.querySelector('img')!.getAttribute('src') === '/scan/counter.webp')!.className).toContain('scanned');
  expect(counters.filter(c => c.className.includes('scanned'))).toHaveLength(1);
  expect(container.querySelector('li.current > img.board-turns-hourglass.horde')!.getAttribute('src')).toBe('/scan/hourglass.webp');
  expect(container.querySelector('.board-turns-marker')).toBeNull();
 });

 it('opens the printed character sheet from the dossier', () => {
  render(<CharacterSheet hero={startingHero(hero)} inspect={() => {}} open={() => {}}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Printed sheet' }));
  const dialog = screen.getByRole('dialog');
  expect(dialog.querySelector('img')!.getAttribute('src')).toBe('/scan/sheet.webp');
  expect(dialog.querySelector('img')!.getAttribute('alt')).toContain('printed character sheet');
 });

 it('also offers it when browsing every hero on the Heroes page', () => {
  render(<CharacterSheet hero={startingHero(hero)} inspect={() => {}} preview/>);
  expect(screen.queryByRole('button', { name: 'Manage equipment' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Printed sheet' }));
  expect(screen.getByRole('dialog').querySelector('img')!.getAttribute('src')).toBe('/scan/sheet.webp');
 });

 it('offers a printed sheet only for characters whose scan was prepared', () => {
  render(<CharacterSheet hero={startingHero(p.characters[1].id)} inspect={() => {}} open={() => {}}/>);
  expect(screen.queryByRole('button', { name: 'Printed sheet' })).toBeNull();
 });

 it('lists the printed reference sheets that exist on the rules page', () => {
  render(<RulesGuide onSetup={() => {}} onDesign={() => {}}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Printed sheets' }));
  expect(screen.getByRole('img', { name: 'Rules reference, as printed in the box' }).getAttribute('src')).toBe('/scan/rules.webp');
  expect(screen.queryByRole('img', { name: /Creature reference/ })).toBeNull();
 });
});
