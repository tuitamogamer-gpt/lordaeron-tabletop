import { useEffect, useState, type ReactNode } from 'react';
import { Icon, ResourceBar } from '../components';
import { BASE_PACK as p } from '../data/base';
import { capacity, card, character } from '../rules/common';
import { availableCards } from '../rules/effects';
import { heroSlots } from '../rules/inventory';
import type { Command } from '../rules/model';
import type { GameView } from '../rules/view';
import CombatAbilities, { type AbilityCommand } from './CombatAbilities';
import { attackPreview, cardNote, energyNote } from './combat-readiness';
import { CardThumbnail, ConditionToken, HeroPortrait } from './parts';
import { effectText } from './rules-text';
import RulesText from './RulesText';

/** The last power a player used, while it can still be taken back: it rolled nothing and revealed nothing. */
export type TakeBack = { hero: string; card: string; undo: () => void };
type Props = {
 state: GameView; skills: AbilityCommand[]; dice: number[]; send: (command: Command) => void; busy: boolean;
 bots: string[]; takeBack?: TakeBack; children: ReactNode;
};
const first = (id: string) => character(p, id).name.split(' ')[0];
/** More played powers than this are listed by name only. */
const BRIEF = 3;

/**
 * The battle sheet. Above: who the character is, his health and energy, and every card on his sheet with what it does or
 * why it waits. Below, docked together: the powers that can be played right now, each with its own Use button, and the
 * step's main action. A phone keeps that dock at the bottom of the screen.
 */
export default function CombatCharacterSheet({ state, skills, dice, send, busy, bots, takeBack, children }: Props) {
 const b = state.battle!, activeId = b.active?.heroId;
 const heroIds = [...new Set([...b.participants, ...skills.map(command => command.hero)])];
 const preferredId = activeId && !bots.includes(activeId) ? activeId : skills[0]?.hero ?? activeId ?? heroIds.find(id => !bots.includes(id)) ?? heroIds[0];
 const [viewedId, setViewedId] = useState<string>();
 useEffect(() => { setViewedId(undefined); }, [activeId]);
 const h = state.heroes.find(hero => hero.id === (viewedId && heroIds.includes(viewedId) ? viewedId : preferredId))!;
 const d = character(p, h.id), cap = capacity(p, h);
 const slots = heroSlots(p, h);
 const entries = slots.flatMap((slot, index) => {
  const id = h.slots[index]?.card ?? slot.printed;
  return id ? [{ id, label: `Slot ${String(index + 1).padStart(2, '0')} · ${slot.stanceOnly ? 'Stance' : slot.types.join(' / ')}` }] : [];
 });
 const slotIds = new Set(entries.map(entry => entry.id));
 const extras = availableCards(p, h).filter(id => !slotIds.has(id)).map(id => {
  const c = card(p, id);
  return { id, label: c.kind === 'racial' ? 'Racial ability' : c.kind === 'talent' ? 'Permanent talent' : c.addon ? 'Equipment attachment' : 'Carried ability' };
 });
 const playable = (hero: string, id: string) => skills.some(command => command.hero === hero && command.card === id);
 const resting = [...entries, ...extras].filter(({ id }) => !playable(h.id, id));
 // The hand: every power the player may use now, the attacker's first, then the character whose sheet is open.
 const order = (id: string) => id === activeId ? 0 : id === h.id ? 1 : 2;
 const hand = [...new Set(skills.map(command => `${command.hero}:${command.card}`))]
  .map(key => { const commands = skills.filter(command => `${command.hero}:${command.card}` === key); return { key, hero: commands[0].hero, card: commands[0].card, commands }; })
  .sort((left, right) => order(left.hero) - order(right.hero));
 // Powers played this round: the player's own, and the current attacker's when a bot attacks, so its move can be read after the fact.
 const played = b.participants.filter(id => id === activeId || !bots.includes(id)).flatMap(id => {
  const hero = state.heroes.find(hero => hero.id === id), used = b.current[id]?.cards ?? [];
  return hero ? availableCards(p, hero).flatMap(cardId => card(p, cardId).abilities.filter(a => !a.automatic && !a.judgement && used.includes(`${cardId}:${a.id}`)).map(a => ({ hero: id, card: cardId, ability: a }))) : [];
 });
 const soon = b.stage === 'attacker' ? b.participants.filter(id => !bots.includes(id)).flatMap(id => (attackPreview(p, state, id)?.powers ?? []).map(cardId => `${card(p, cardId).name} once ${first(id)} attacks`)) : [];
 const note = energyNote(p, state, h.id, cap.energy), many = heroIds.length > 1;
 const [open, setOpen] = useState(false);
 return <article className={`combat-character-sheet ${d.faction} ${open ? 'sheet-open' : ''}`} aria-label={`${d.name} character sheet`}>
  {/* A phone shows this one line and keeps the rest of the sheet folded until asked for. */}
  <button type="button" className="combat-sheet-summary" aria-expanded={open} aria-label={`${open ? 'Hide' : 'Show'} the cards on ${first(h.id)}’s sheet`} onClick={() => setOpen(!open)}><HeroPortrait id={h.id} small /><strong>{first(h.id)}</strong><span><Icon name="heart" size={12} />{h.health}/{cap.health}</span><span><Icon name="bolt" size={12} />{h.energy}/{cap.energy}</span>{h.stun > 0 && <i>Stun {h.stun}</i>}{h.curse > 0 && <i>Curse {h.curse}</i>}<em>{open ? 'Hide sheet' : 'Sheet'}<Icon name={open ? 'x' : 'down'} size={12} /></em></button>
  <div className="combat-sheet-reference">
   {many && <nav className="combat-sheet-heroes" aria-label="Battle character sheets">{heroIds.map(id => {
    const available = skills.some(command => command.hero === id);
    return <button key={id} type="button" aria-label={`Show ${character(p, id).name} character sheet`} aria-pressed={h.id === id} onClick={() => setViewedId(id)}><HeroPortrait id={id} small /><span>{first(id)}<small>{activeId === id ? 'Current attacker' : b.participants.includes(id) ? 'In this battle' : 'Supporting ally'}</small></span>{available && <i aria-label="Abilities available" />}</button>;
   })}</nav>}
   <header className="combat-sheet-profile"><HeroPortrait id={h.id} /><div><span className="sheet-eyebrow">LEVEL {h.level} · {d.race} · {d.classId}</span><h3>{d.name}</h3><p>{bots.includes(h.id) ? 'Bot character' : 'Player character'}{b.defeated.includes(h.id) ? ' · defeated' : activeId === h.id ? ' · current attacker' : ''}</p></div><div className="combat-sheet-conditions"><span><ConditionToken kind="stun" fallback={<Icon name="heart" size={12} />} />Stun <b>{h.stun}</b></span><span><ConditionToken kind="curse" fallback={<Icon name="skull" size={12} />} />Curse <b>{h.curse}</b></span></div></header>
   <div className="combat-sheet-vitals"><ResourceBar type="health" value={h.health} max={cap.health} /><ResourceBar type="energy" value={h.energy} max={cap.energy} /></div>
   <div className="combat-choice-content">
    <div className="combat-sheet-card-heading"><h4>Powers & equipment</h4><span>Hover or focus a card for its full rules</span></div>
    <div className="combat-sheet-card-grid">{resting.map(({ id, label }) => {
     const status = cardNote(p, state, h.id, id);
     return <div className={`combat-sheet-card ${status.tone}`} key={`${h.id}:${id}`}><span className="combat-sheet-slot-label">{label}</span><CardThumbnail card={card(p, id)} footer="Preview full rules" /><strong className="combat-sheet-card-name">{card(p, id).name}</strong><small className="combat-sheet-card-status" title={status.text}><RulesText>{status.text}</RulesText></small></div>;
    })}</div>
    {!resting.length && <p className="combat-no-powers">Every card on this sheet can be used now: they are listed below.</p>}
   </div>
  </div>
  <div className="combat-play-dock">
   {b.stage !== 'over' && <section className="combat-hand" aria-label="Powers to use now">
    <p className="combat-energy-line" aria-label={`${first(h.id)} energy`}><Icon name="bolt" size={13} /><b>{first(h.id)} · energy {h.energy}<small> / {cap.energy}</small></b>{note && <span>{note}</span>}</p>
    {hand.map(({ key, commands }) => <CombatAbilities key={`${b.round}:${b.stage}:${key}`} commands={commands} state={state} dice={dice} send={send} busy={busy} owner={many} />)}
    {!hand.length && !played.length && <p className="combat-no-powers">{soon.length ? `No power to use yet. Ready: ${soon.join(', ')}.` : 'No power to use at this step.'}</p>}
    {!!played.length && <ul className={`combat-played ${played.length > BRIEF ? 'brief' : ''}`} aria-label="Powers used this round">{played.map(({ hero, card: id, ability }) => {
     const back = takeBack?.hero === hero && takeBack.card === id;
     // A long list keeps to names; the card that can still be taken back always shows what it did.
     return <li key={`${hero}:${id}:${ability.id}`}><Icon name="check" size={12} /><span><b>{many ? `${first(hero)} · ` : ''}{card(p, id).name}</b>{(played.length <= BRIEF || back) && <> <RulesText>{ability.effects.map(effectText).join(' · ')}</RulesText></>}</span>{back && <button type="button" className="quiet-button" disabled={busy} onClick={takeBack.undo} aria-label={`Take back ${card(p, id).name}`}>Take back</button>}</li>;
    })}</ul>}
   </section>}
   <div className="combat-sheet-controls" aria-label="Character combat controls">{children}</div>
  </div>
 </article>;
}
