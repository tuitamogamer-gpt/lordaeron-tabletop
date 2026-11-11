import { useId, type ReactNode } from 'react';
import { BASE_PACK as p } from '../data/base';
import { stats } from '../rules/combat';
import { capacity, character, faction } from '../rules/common';
import type { GameView } from '../rules/view';
import { BossPortrait, CreatureGlyph, creatureRules } from './design-system';
import { bossRuleText } from './event-text';
import { HeroPortrait, factionLabel } from './parts';
import RulesText from './RulesText';

const FIGURE: Record<string, string> = { green: 'Green figure · quest target', red: 'Red figure · quest target', blue: 'Blue figure · independent' };

function Stats({ threat, attack, health }: { threat: number; attack: number; health: number }) {
 return <dl className="enemy-info-stats"><div><dt>Threat</dt><dd>{threat}+</dd></div><div><dt>Attack</dt><dd>{attack}</dd></div><div><dt>Health</dt><dd>{health}</dd></div></dl>;
}

/** Everything known about the other side of a battle: each creature group, the boss or Overlord with its rules, or the opposing heroes. */
export function EnemyDetails({ state }: { state: GameView }) {
 const b = state.battle!;
 if (b.kind !== 'pve') {
  const sides = [...new Set(b.participants.map(id => faction(p, id)))];
  return <>{sides.map(side => <section key={side}><h5>{factionLabel(side)}</h5>{b.participants.filter(id => faction(p, id) === side).map(id => {
   const h = state.heroes.find(v => v.id === id)!, cap = capacity(p, h), d = character(p, id);
   return <div className="enemy-info-row" key={id}><HeroPortrait id={id} small /><span><strong>{d.name}</strong><small>Level {h.level} · {d.classId}{b.defeated.includes(id) ? ' · defeated' : ''}</small></span><dl className="enemy-info-stats"><div><dt>Health</dt><dd>{h.health}/{cap.health}</dd></div><div><dt>Energy</dt><dd>{h.energy}/{cap.energy}</dd></div></dl></div>;
  })}</section>)}</>;
 }
 if (b.boss) {
  const overlord = p.overlords.find(o => o.id === b.boss), event = p.events.find(e => e.id === b.boss), rule = overlord ? bossRuleText(overlord.combat) : event?.boss ? bossRuleText(event.boss.combat) : '';
  return <section><div className="enemy-info-row"><BossPortrait id={b.boss} /><span><strong>{overlord?.name ?? event?.name}</strong><small>{overlord ? 'Overlord' : 'Event boss'}</small></span></div><Stats {...stats(p, state)} />{rule && <p><RulesText>{rule}</RulesText></p>}</section>;
 }
 const groups = new Map<string, { creature: string; color: string; count: number; id: string }>();
 for (const id of b.enemies) {
  const e = state.enemies.find(v => v.id === id); if (!e) continue;
  const key = `${e.creature}:${e.color}`, group = groups.get(key);
  if (group) group.count++; else groups.set(key, { creature: e.creature, color: e.color, count: 1, id });
 }
 const rules = new Map<string, string>();
 return <section>{[...groups.values()].map(g => {
  const c = p.creatures.find(v => v.id === g.creature)!;
  rules.set(c.rule, creatureRules[c.rule]);
  return <div className="enemy-info-row" key={`${g.creature}:${g.color}`}><CreatureGlyph type={c.rule} name={c.name} /><span><strong>{g.count > 1 ? `${g.count} × ` : ''}{c.name}</strong><small>{FIGURE[g.color] ?? g.color}</small></span><Stats {...stats(p, state, g.id)} /></div>;
 })}{!!b.killed?.length && <p className="enemy-info-note">{b.killed.length} already defeated in this battle.</p>}
  {[...rules.values()].filter(Boolean).map(rule => <p key={rule}><RulesText>{rule}</RulesText></p>)}</section>;
}

/** Hovering or focusing the opponent shows its details; the card is part of the page, so screen readers reach it through the description. */
export default function EnemyInfo({ state, children, className = '' }: { state: GameView; children: ReactNode; className?: string }) {
 const id = useId();
 return <div className={`enemy-info ${className}`} tabIndex={0} role="group" aria-label="Opponent details" aria-describedby={id}>
  {children}
  <div className="enemy-info-card" role="tooltip" id={id}><span className="enemy-info-title">Opponent</span><EnemyDetails state={state} /></div>
 </div>;
}
