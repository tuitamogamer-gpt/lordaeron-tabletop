import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import { Icon, ResourceBar } from '../components';
import { BASE_PACK as p } from '../data/base';
import { capacity, card, character } from '../rules/common';
import { abilityEnergyCost, availableCards } from '../rules/effects';
import { heroSlots } from '../rules/inventory';
import type { Command } from '../rules/model';
import type { GameView } from '../rules/view';
import CombatAbilities, { type AbilityCommand } from './CombatAbilities';
import CombatLoadout from './CombatLoadout';
import { triggerLabels } from './design-system';
import { CardThumbnail, HeroPortrait } from './parts';

type Props = {
 state: GameView; skills: AbilityCommand[]; dice: number[]; send: (command: Command) => void; busy: boolean;
 bots: string[]; selectedPower?: string; onChoosePower: (key: string) => void; onChooseHero: () => void;
 contentRef: RefObject<HTMLDivElement | null>; children: ReactNode;
};

/** The battle sheet keeps the equipped cards and their legal actions on one surface. */
export default function CombatCharacterSheet({ state, skills, dice, send, busy, bots, selectedPower, onChoosePower, onChooseHero, contentRef, children }: Props) {
 const b = state.battle!, activeId = b.active?.heroId;
 const heroIds = [...new Set([...b.participants, ...skills.map(command => command.hero)])];
 const preferredId = activeId && !bots.includes(activeId) ? activeId : skills[0]?.hero ?? activeId ?? heroIds[0];
 const [viewedId, setViewedId] = useState<string>();
 useEffect(() => { setViewedId(undefined); }, [activeId]);
 const h = state.heroes.find(hero => hero.id === (viewedId && heroIds.includes(viewedId) ? viewedId : preferredId))!;
 const d = character(p, h.id), cap = capacity(p, h), used = b.current[h.id]?.cards ?? [];
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
 const ready = (id: string) => skills.filter(command => command.hero === h.id && command.card === id);
 const cards = [...entries, ...extras].sort((left, right) => Number(!!ready(right.id).length) - Number(!!ready(left.id).length));
 const status = (id: string) => {
  const c = card(p, id), manual = c.abilities.filter(ability => !ability.automatic && !ability.judgement);
  if (manual.length) {
   if (manual.some(ability => used.includes(`${id}:${ability.id}`))) return 'Used this round';
   const cost = Math.min(...manual.map(ability => abilityEnergyCost(p, state, h, id, ability.id)));
   if (cost > h.energy) return `Needs ${cost} energy · ${h.energy} available`;
   return [...new Set(manual.map(ability => triggerLabels[ability.timing] ?? ability.timing))].join(' / ');
  }
  return c.abilities.some(ability => ability.automatic) ? 'Automatic effect' : 'Equipped';
 };
 return <article className={`combat-character-sheet ${d.faction}`} aria-label={`${d.name} character sheet`}>
  <nav className="combat-sheet-heroes" aria-label="Battle character sheets">{heroIds.map(id => {
   const available = skills.some(command => command.hero === id);
   return <button key={id} type="button" aria-label={`Show ${character(p, id).name} character sheet`} aria-pressed={h.id === id} onClick={() => { setViewedId(id); onChooseHero(); }}><HeroPortrait id={id} small /><span>{character(p, id).name.split(' ')[0]}<small>{activeId === id ? 'Current attacker' : b.participants.includes(id) ? 'In this battle' : 'Supporting ally'}</small></span>{available && <i aria-label="Abilities available" />}</button>;
  })}</nav>
  <header className="combat-sheet-profile"><HeroPortrait id={h.id} /><div><span className="sheet-eyebrow">LEVEL {h.level} · {d.race} · {d.classId}</span><h3>{d.name}</h3><p>{bots.includes(h.id) ? 'Bot character' : 'Player character'}{b.defeated.includes(h.id) ? ' · defeated' : activeId === h.id ? ' · current attacker' : ''}</p></div><div className="combat-sheet-conditions"><span><Icon name="heart" size={12} />Stun <b>{h.stun}</b></span><span><Icon name="skull" size={12} />Curse <b>{h.curse}</b></span></div></header>
  <div className="combat-sheet-vitals"><ResourceBar type="health" value={h.health} max={cap.health} /><ResourceBar type="energy" value={h.energy} max={cap.energy} /></div>
  <div className="combat-choice-content" ref={contentRef}>
   <div className="combat-sheet-card-heading"><h4>Powers & equipment</h4><span>{skills.filter(command => command.hero === h.id).length ? 'Choose a card to use its ability' : 'Hover or focus a card for full rules'}</span></div>
   <div className="combat-sheet-card-grid">{cards.map(({ id, label }) => {
    const commands = ready(id), key = `${h.id}:${id}`;
    return <div className={`combat-sheet-card ${commands.length ? 'ready' : ''} ${selectedPower === key ? 'selected' : ''}`} key={key}><span className="combat-sheet-slot-label">{label}</span>{commands.length ? <CombatAbilities key={`${b.round}:${b.stage}:${key}`} commands={commands} state={state} dice={dice} send={send} busy={busy} expanded={selectedPower === key} onToggle={() => onChoosePower(key)} /> : <><CardThumbnail card={card(p, id)} footer="Preview full rules" /><small className="combat-sheet-card-status">{status(id)}</small></>}</div>;
   })}</div>
   {!skills.some(command => command.hero === h.id) && b.stage !== 'over' && <p className="combat-no-powers">No optional abilities available for {d.name.split(' ')[0]} at this step.</p>}
   {h.id === activeId && <CombatLoadout state={state} skills={skills} showBudget={false} />}
  </div>
  <div className="combat-sheet-controls" aria-label="Character combat controls"><div className="combat-sheet-controls-heading"><strong>{activeId ? `${character(p, activeId).name.split(' ')[0]} · dice & combat` : 'Party · combat controls'}</strong>{b.active && <span>Rerolls {Math.max(0, b.active.reroll)} · Attrition {Math.max(0, b.active.attrition)}</span>}</div>{children}</div>
 </article>;
}
