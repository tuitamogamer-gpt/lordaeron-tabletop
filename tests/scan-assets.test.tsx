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
import BuildStamp from '../src/campaign/BuildStamp';
import { ConditionToken, HeroPortrait } from '../src/campaign/parts';
import { GameIcon } from '../src/campaign/GameIcon';
import { FactionCrest } from '../src/campaign/Art';
import CombatArea from '../src/campaign/CombatArea';
import { beginBattle } from '../src/rules/combat';
import { BossPortrait, CreatureGlyph } from '../src/campaign/design-system';
import { ExperienceTrack, TurnTrack } from '../src/campaign/BoardTracks';
import { faqNote, pickFace } from '../src/campaign/scan-assets';

const size = (src: string) => ({ src, width: 600, height: 930 });
const hero = p.characters[0].id;
// The user's scans are not in the repository, so the scan layer is exercised with a handful of made-up entries.
vi.mock('../src/campaign/scan-assets', async importOriginal => {
 const real = await importOriginal<typeof import('../src/campaign/scan-assets')>();
 const { BASE_PACK } = await import('../src/data/base');
 const id = BASE_PACK.characters[0].id, starting = BASE_PACK.characters[0].slots.find(s => s.printed)!.printed!, overlord = BASE_PACK.overlords[0].id;
 return { ...real, hasScans: true, SCANS: {
  cards: { 'mage-arcane-missiles': { src: '/scan/arcane-missiles.webp', width: 600, height: 930 }, [`${id}-racial`]: { src: '/scan/racial.webp', width: 471, height: 892 }, [starting]: { src: '/scan/starting.webp', width: 471, height: 737 } },
  counters: { [id]: '/scan/counter.webp' },
  tokens: { hourglass: '/scan/hourglass.webp', stun: '/scan/stun.webp', horde: '/scan/horde.webp', hit: '/scan/hit.webp', armor: '/scan/armor.webp', health: '/scan/health.webp' },
  backs: { 'quest-horde-green': { src: '/scan/quest-horde-green.webp', width: 360, height: 556 }, 'class-mage': { src: '/scan/class-mage.webp', width: 360, height: 553 }, event: { src: '/scan/event.webp', width: 360, height: 560 } },
  sheets: { [id]: { src: '/scan/sheet.webp', width: 1900, height: 1456 } },
  portraits: { [id]: { src: '/scan/portrait.webp', width: 520, height: 624 }, [overlord]: { src: '/scan/overlord.webp', width: 640, height: 450 } },
  creatures: { murloc: '/scan/murloc.webp' },
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

describe('the character’s own faces', () => {
 it('uses the printed counter in small portraits and the painted portrait in the large one', () => {
  const other = p.characters[1].id;
  render(<><HeroPortrait id={hero} small/><HeroPortrait id={hero}/><HeroPortrait id={other} small/></>);
  const [counter, art, illustrated] = screen.getAllByRole('img');
  expect(counter.className).toContain('scanned-counter');
  expect(counter.style.backgroundImage).toContain('/scan/counter.webp');
  expect(art.className).toContain('scanned-art');
  expect(art.style.backgroundImage).toContain('/scan/portrait.webp');
  expect(illustrated.className).not.toContain('scanned');
  expect(illustrated.style.backgroundImage).toContain(`/assets/portraits/${other}.webp`);
 });

 it('shows the starting cards and the racial panel of a new character as they are printed on the sheet', () => {
  const starting = p.characters[0].slots.find(s => s.printed)!.printed!;
  const { container } = render(<CharacterSheet hero={startingHero(hero)} inspect={() => {}} open={() => {}}/>);
  const faces = [...container.querySelectorAll('img.card-portrait-face')].map(img => img.getAttribute('src'));
  expect(faces).toContain('/scan/starting.webp');
  expect(faces).toContain('/scan/racial.webp');
  expect(container.querySelector('.sheet-slot-card img')!.getAttribute('src')).toBe('/scan/starting.webp');
  expect(container.querySelector('.sheet-portrait .scanned-art')).not.toBeNull();
  expect(starting).toBeTruthy();
 });

 it('says in Settings which build is running and whether the scans are in it', () => {
  render(<BuildStamp/>);
  const note = screen.getByRole('note').textContent!;
  expect(note).toMatch(/^Build \S+/);
  expect(note).toContain('Real scans in use: 3 card faces, 1 character counter, 2 painted portraits');
 });
});

describe('the Overlords’ own faces', () => {
 it('paints an Overlord with the painting from its printed sheet, and the others with the illustration', () => {
  const [first, second] = p.overlords;
  render(<><BossPortrait id={first.id}/><BossPortrait id={second.id}/></>);
  const [scanned, illustrated] = screen.getAllByRole('img') as HTMLElement[];
  expect(scanned.style.backgroundImage).toContain('/scan/overlord.webp');
  expect(illustrated.style.backgroundImage).toContain(`/assets/portraits/${second.id}.webp`);
 });
});

describe('the printed game tokens', () => {
 it('draws the health token where the interface has a health symbol and keeps painted icons for the rest', () => {
  const { container } = render(<><GameIcon name="health"/><GameIcon name="experience"/></>);
  const [health, experience] = [...container.querySelectorAll('.game-icon')];
  expect(health.className).toContain('game-icon-token');
  expect(health.querySelector('img')!.getAttribute('src')).toBe('/scan/health.webp');
  expect(experience.className).not.toContain('game-icon-token');
  expect(experience.querySelector('img')!.getAttribute('src')).toBe('/assets/ui-icons/experience.webp');
 });

 it('puts the printed Stun token beside a condition and the given fallback where there is none', () => {
  const { container } = render(<><span><ConditionToken kind="stun"/>Stun</span><span><ConditionToken kind="curse" fallback={<b data-testid="fallback"/>}/>Curse</span></>);
  expect(container.querySelector('img.condition-token')!.getAttribute('src')).toBe('/scan/stun.webp');
  expect(container.querySelectorAll('img.condition-token')).toHaveLength(1);
  expect(screen.getByTestId('fallback')).toBeTruthy();
 });

 it('stands the printed faction hexagon in for the painted crest, for the factions that have one', () => {
  const { container } = render(<><FactionCrest faction="horde"/><FactionCrest faction="alliance"/></>);
  const [horde, alliance] = [...container.querySelectorAll('.faction-crest')] as HTMLElement[];
  expect(horde.className).toContain('printed');
  expect(horde.style.backgroundImage).toContain('/scan/horde.webp');
  expect(alliance.className).not.toContain('printed');
  expect(alliance.style.backgroundImage).toBe('');
 });

 it('lays the printed hit and armor tokens in the circles of the combat area, one per token', () => {
  const s = createGame(p, DEFAULT_SETUP);
  s.enemies = [{ id: 'ogre', creature: 'ogre', color: 'green', region: 'brill' }];
  beginBattle(s, 'pve', [s.heroes[0].id], ['ogre'], 'horde', 'brill');
  s.battle!.boxes.horde = { damage: 1, defense: 2, armor: 7, attrition: 1 };
  const { container } = render(<CombatArea battle={s.battle!} side="horde"/>);
  const pile = (box: string, kind: string) => [...container.querySelectorAll(`.combat-token-box.${box} .combat-token-pile.${kind} img`)].map(i => i.getAttribute('src'));
  expect(pile('damage', 'hit')).toEqual(['/scan/hit.webp']);
  expect(pile('defense', 'hit')).toEqual(['/scan/hit.webp', '/scan/hit.webp']);
  expect(pile('defense', 'armor')).toEqual(Array(6).fill('/scan/armor.webp'));
  expect(container.querySelector('.combat-token-box.defense .combat-token-pile.armor .combat-token-more')!.textContent).toBe('+1');
  expect(pile('attrition', 'hit')).toEqual(['/scan/hit.webp']);
  expect(container.querySelector('output[aria-label="Horde armor"]')!.textContent).toBe('7');
 });
});

describe('the creatures’ own faces', () => {
 it('shows the round portrait from the monster reference sheet for a creature that has one', () => {
  render(<><CreatureGlyph type="murloc" name="Murloc"/><CreatureGlyph type="gnoll" name="Gnoll"/></>);
  const murloc = screen.getByRole('img', { name: 'Murloc' }), gnoll = screen.getByRole('img', { name: 'Gnoll' });
  expect(murloc.tagName).toBe('IMG');
  expect(murloc.getAttribute('src')).toBe('/scan/murloc.webp');
  expect(murloc.className).toContain('scanned-creature');
  expect(gnoll.tagName.toLowerCase()).toBe('svg');
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
