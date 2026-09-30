import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { BASE_PACK as p, DEFAULT_SETUP } from '../data/base';
import { character } from '../rules/common';
import { createGame } from '../rules/game';
import type { Setup, Variants } from '../rules/model';
import { Icon } from '../components';
import { HeroPortrait, factionLabel } from './parts';
import { BossPortrait } from './design-system';
import { bossRules } from './event-text';
import { FactionCrest } from './Art';
import { QuestSetupPreview } from './QuestReveal';

export function setupErrors(setup: Setup, count: number): string[] {
 const defs = setup.roster.map(id => p.characters.find(c => c.id === id));
 const errors: string[] = [];
 if (setup.roster.length !== count || ![4, 6].includes(count)) errors.push(`Choose exactly ${count} characters.`);
 if (defs.some(c => !c)) errors.push('Choose a valid character for every seat.');
 if (new Set(defs.map(c => c?.classId)).size !== defs.length) errors.push('Each class may appear only once across both factions.');
 for (const side of ['horde', 'alliance']) if (defs.filter(c => c?.faction === side).length !== count / 2) errors.push(`${factionLabel(side)} needs ${count / 2} characters.`);
 if (!Number.isInteger(setup.seed) || setup.seed < 1 || setup.seed > 0xffffffff) errors.push('Use a seed between 1 and 4294967295.');
 if (!p.overlords.some(o => o.id === setup.overlord)) errors.push('Choose an Overlord.');
 return errors;
}

const reviewTabs = ['Overview', 'Starting quests', 'Shuffle'] as const;

export default function CampaignSetup({ onStart, onCancel, existing = false }: { onStart: (setup: Setup, human: string, bots: boolean) => void; onCancel: () => void; existing?: boolean }) {
 const [step, setStep] = useState(0), [count, setCount] = useState<4 | 6>(6), [roster, setRoster] = useState(DEFAULT_SETUP.roster), [boss, setBoss] = useState(DEFAULT_SETUP.overlord), [seed, setSeed] = useState(() => String(globalThis.crypto.getRandomValues(new Uint32Array(1))[0] || 1)), [bots, setBots] = useState(true), [human, setHuman] = useState(DEFAULT_SETUP.roster[0]);
 const [variants, setVariants] = useState<Variants>({ overlordOnly: true });
 const [reviewTab, setReviewTab] = useState(0);
 const heading = useRef<HTMLHeadingElement>(null), reviewButtons = useRef<(HTMLButtonElement | null)[]>([]);
 const reviewId = useId();
 const setup = { seed: Number(seed), roster, overlord: boss, variants }, errors = setupErrors(setup, count), humanId = roster.includes(human) ? human : roster[0];
 const preview = useMemo(() => {
  if (setupErrors({ seed: Number(seed), roster, overlord: boss }, count).length) return;
  return createGame(p, { seed: Number(seed), roster, overlord: boss, variants });
 }, [seed, roster, boss, count, variants]);
 const setSize = (n: 4 | 6) => {
  if (n === count) return;
  setCount(n);
  setRoster(n === 6 ? DEFAULT_SETUP.roster : [...DEFAULT_SETUP.roster.slice(0, 2), ...DEFAULT_SETUP.roster.slice(3, 5)]);
 };
 const rosterErrors = errors.filter(e => !e.startsWith('Use a seed'));
 useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [step]);
 const navigateReview = (event: KeyboardEvent<HTMLButtonElement>, current: number) => {
  let next: number;
  if (event.key === 'ArrowRight') next = (current + 1) % reviewTabs.length;
  else if (event.key === 'ArrowLeft') next = (current + reviewTabs.length - 1) % reviewTabs.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = reviewTabs.length - 1;
  else return;
  event.preventDefault();
  setReviewTab(next);
  reviewButtons.current[next]?.focus({ preventScroll: true });
 };
 const titles = ['A campaign begins with a party.', 'Gather your characters.', 'One Overlord. Two rival factions.', 'Everything in its place.'];
 const introductions = [
  'Choose your table size and who controls the heroes. Both factions begin with distinct classes.',
  `Choose ${count / 2} per faction. A selected class is reserved for the whole game. Shaman belongs to Horde; Paladin belongs to Alliance.`,
  `The first faction to defeat this Overlord wins. The ${count}-character profile is applied automatically.`,
  'Your first turn belongs to Horde. Review your table, then begin when you’re ready.',
 ];
 return <div className="setup-wizard setup-flow">
  <nav className="setup-steps" aria-label="Setup steps">{['Table', 'Characters', 'Overlord', 'Ready to play'].map((label, i) => <button key={label} aria-current={step === i ? 'step' : undefined} disabled={i > step} onClick={() => setStep(i)}><b>{i < step ? <Icon name="check" size={14}/> : i + 1}</b>{label}</button>)}</nav>
  <div className={`setup-page setup-stage-${step}`}>
   <header className="setup-stage-heading"><span className="sheet-eyebrow">{['01 / PREPARE YOUR TABLE', '02 / CHOOSE DISTINCT CLASSES', '03 / CHOOSE YOUR ENEMY', '04 / THE TABLE IS SET'][step]}</span><h3 ref={heading} tabIndex={-1}>{titles[step]}</h3><p>{introductions[step]}</p></header>
   <div className="setup-stage-content" key={step}>
    {step === 0 && <div className="setup-table-grid">
     <section className="setup-table-choice" aria-label="Table size">
      <div className="table-size-options">{([6, 4] as const).map(n => <button key={n} aria-pressed={count === n} onClick={() => setSize(n)}><Icon name="users" size={24}/><strong>{n} characters</strong><span>{n / 2} Horde · {n / 2} Alliance</span><small>{n === 6 ? 'Standard game · 5–6 players' : 'Smaller table · 2–4 players'}</small></button>)}</div>
      <label className="setup-ai-option"><input type="checkbox" checked={bots} onChange={e => setBots(e.target.checked)}/><span><strong>Play with AI companions</strong><small>You control one hero; AI controls the other {count - 1}. Turn this off to play all {count} heroes on this device.</small></span></label>
      <div className="setup-rule-note"><Icon name="book"/><p>In a two-player game each player controls two characters. With three players, one player controls both characters of a faction. With five players, one player controls two characters. Local AI can fill those roles.</p></div>
     </section>
     <section className="setup-table-rules" aria-label="Campaign rules">
      <div className="setup-rule-note setup-objective"><Icon name="crown"/><div><strong>Campaign objective · Defeat the Overlord</strong><p>The first faction to defeat the Overlord wins. After turn 30, the track begins another lap; the campaign continues until the Overlord falls.</p></div></div>
      <fieldset className="setup-variants"><legend>Optional combat rule · page 37</legend><label><input type="checkbox" checked={!!variants.deadlyPvp} onChange={e => setVariants(v => ({ ...v, deadlyPvp: e.target.checked }))}/><span><strong>Deadly PvP</strong><small>Both factions suffer the opposing hits. Fewer unabsorbed wounds breaks a simultaneous defeat. The campaign objective stays the same.</small></span></label></fieldset>
      <p className="setup-table-footnote"><Icon name="users" size={15}/>The base game splits the party evenly. Each class appears once across both factions.</p>
     </section>
    </div>}
    {step === 1 && <>
     <div className="draft-factions">{(['horde', 'alliance'] as const).map(side => <section key={side} aria-label={`${factionLabel(side)} characters`}><header><FactionCrest faction={side}/><h4>{factionLabel(side)}</h4><b>{roster.filter(id => character(p, id).faction === side).length} / {count / 2}</b></header><div>{p.characters.filter(c => c.faction === side).map(c => {
      const chosen = roster.includes(c.id), reservedBy = roster.find(id => id !== c.id && character(p, id).classId === c.classId), full = roster.filter(id => character(p, id).faction === side).length >= count / 2;
      const reason = reservedBy ? `${c.classId} is already selected: ${character(p, reservedBy).name}.` : full ? `Deselect a ${factionLabel(side)} character to choose ${c.name}.` : undefined;
      return <button key={c.id} aria-pressed={chosen} disabled={!chosen && (!!reservedBy || full)} title={!chosen ? reason : undefined} onClick={() => setRoster(v => chosen ? v.filter(id => id !== c.id) : [...v, c.id])}><HeroPortrait id={c.id} small/><span><strong>{c.name}</strong><small>{c.classId} · {c.capacities[0].health} health / {c.capacities[0].energy} energy</small>{reservedBy && <em>Class already selected</em>}</span>{chosen && <Icon name="check" size={16}/>}</button>;
     })}</div></section>)}</div>
     <div className="setup-draft-footer">{bots ? <label className="setting-row">Your character<select value={humanId ?? ''} onChange={e => setHuman(e.target.value)}>{roster.map(id => <option value={id} key={id}>{character(p, id).name}</option>)}</select></label> : <p>You control every selected hero on this device.</p>}<p className={rosterErrors.length ? 'setup-validation' : 'setup-draft-note'} role="status">{rosterErrors.length ? rosterErrors.join(' ') : 'For a tabletop draft, randomly decide the picking order first.'}</p></div>
    </>}
    {step === 2 && <>
     <div className="boss-selection">{p.overlords.map(o => <button key={o.id} aria-pressed={boss === o.id} className={boss === o.id ? 'selected' : ''} onClick={() => setBoss(o.id)}><BossPortrait id={o.id}/><strong>{o.name}</strong><small>{o.stats[count].threat}+ threat · {o.stats[count].attack} attack · {o.stats[count].health} health</small>{boss === o.id && <span className="setup-boss-selected"><Icon name="check" size={14}/>Selected</span>}</button>)}</div>
     <div className="setup-rule-note"><Icon name="crown"/><p>{bossRules[p.overlords.find(o => o.id === boss)!.combat]}</p></div>
    </>}
    {step === 3 && <>
     <div className="setup-review-tabs" role="tablist" aria-label="Review campaign setup">{reviewTabs.map((label, i) => <button key={label} ref={node => { reviewButtons.current[i] = node; }} id={`${reviewId}-tab-${i}`} role="tab" aria-selected={reviewTab === i} aria-controls={`${reviewId}-panel-${i}`} tabIndex={reviewTab === i ? 0 : -1} onClick={() => setReviewTab(i)} onKeyDown={e => navigateReview(e, i)}>{label}</button>)}</div>
     <div className="setup-review-panels">
      <section className="setup-review-panel" role="tabpanel" id={`${reviewId}-panel-0`} aria-labelledby={`${reviewId}-tab-0`} tabIndex={0} hidden={reviewTab !== 0}>
       {preview ? <><div className="setup-checklist">{[
        ['users', 'Characters ready', `${count} unique classes · ${count / 2} per faction. Level 1, 0 XP, 5 gold, printed abilities and full starting health / energy.`],
        ['book', 'Class decks', '12 Power and 12 Talent cards per class. Buy Powers into the spellbook; choose one free Talent on each level gained. Bag and spellbook start empty.'],
        ['map', 'Starting regions', 'Horde in Brill. Alliance in Southshore. Each hero has two actions on their faction’s turn.'],
        ['scroll', 'Quest decks', `${count / 2 + 1} grey + 1 green quest per faction. Creatures and markers are placed automatically; unused grey quests are removed.`],
        ['coins', 'Merchant ready', '3 white triangle + 2 blue square + 1 purple circle items, face up. Other items stay in their separate shuffled decks.'],
        ['layers', 'Event deck', `${preview.eventDeck.length} shuffled events${boss === 'kelthuzad' ? ', including the five Kel’Thuzad events' : '; the five Kel’Thuzad events are excluded'}. Draw events as instructed by the turn track.`],
        ['crown', 'Campaign objective', 'Defeat the Overlord. The campaign continues across turn-track laps. Later laps add purple circle items at every item space.'],
        ['crown', 'Overlord placed', `${p.overlords.find(o => o.id === boss)!.name} · ${count}-character profile.${boss === 'kazzak' ? ' Five hidden clue tokens are placed on the map.' : ''}`],
       ].map(([icon, title, copy]) => <article key={title}><Icon name={icon} size={17}/><div><h4>{title}</h4><p>{copy}</p></div><Icon name="check" size={14}/></article>)}</div>
       <div className="first-turn-guide"><b>Your first move</b><p>Choose your hero under <strong>Characters</strong>, then use <strong>Travel</strong>, <strong>Rest</strong>, <strong>Train</strong>, <strong>Town</strong> or <strong>Challenge</strong>. After every ally has used both actions, continue to <strong>Management</strong> to equip learned powers and items.</p></div>
       <p className="setup-variant-summary">{bots ? `You play ${character(p, humanId).name}; AI controls the other ${count - 1} heroes.` : `You control all ${count} heroes.`} · PvP: {variants.deadlyPvp ? 'Deadly PvP enabled' : 'standard'}</p></> : <p className="setup-validation" role="alert">{errors.join(' ')}</p>}
      </section>
      <section className="setup-review-panel" role="tabpanel" id={`${reviewId}-panel-1`} aria-labelledby={`${reviewId}-tab-1`} tabIndex={0} hidden={reviewTab !== 1}>{preview ? <QuestSetupPreview state={preview}/> : <p className="setup-validation">Complete the setup to preview your starting quests.</p>}</section>
      <section className="setup-review-panel setup-shuffle-panel" role="tabpanel" id={`${reviewId}-panel-2`} aria-labelledby={`${reviewId}-tab-2`} tabIndex={0} hidden={reviewTab !== 2}>
       <div className="setup-shuffle-copy"><Icon name="layers" size={28}/><h4>A repeatable shuffle</h4><p>The same table, Overlord and seed produce the same opening. Keep this number to replay your campaign’s starting setup.</p><label className="seed-label">Game seed<input aria-label="Game seed" value={seed} onChange={e => setSeed(e.target.value)} inputMode="numeric" aria-invalid={errors.some(e => e.startsWith('Use a seed'))} aria-describedby={`${reviewId}-seed-help`}/></label><p id={`${reviewId}-seed-help`}>Use a whole number between 1 and 4294967295.</p>{errors.some(e => e.startsWith('Use a seed')) && <p className="setup-validation" role="alert">Use a seed between 1 and 4294967295.</p>}</div>
      </section>
     </div>
     {existing && <p className="setup-save-note"><Icon name="download" size={14}/>Beginning replaces your current autosave. A backup of the current campaign will be kept in this browser.</p>}
    </>}
   </div>
  </div>
  <footer className="setup-footer"><a href="https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/wowrules.pdf#page=6" target="_blank" rel="noreferrer">Official setup · pp. 6–8, 35–36 ↗</a><button className="quiet-button" onClick={() => step ? setStep(step - 1) : onCancel()}>{step ? 'Back' : 'Cancel'}</button>{step < 3 ? <button className="gold-button" disabled={step === 1 && rosterErrors.length > 0} onClick={() => setStep(step + 1)}>Continue <Icon name="arrow" size={15}/></button> : <button className="gold-button" disabled={errors.length > 0} onClick={() => onStart(setup, humanId, bots)}>Begin campaign <Icon name="arrow" size={15}/></button>}</footer>
 </div>;
}
