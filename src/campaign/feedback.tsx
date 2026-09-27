import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components';
import { BASE_PACK as p } from '../data/base';
import { worldAttack } from '../rules/world';
import type { GameView } from '../rules/view';
import type { Command } from '../rules/model';

/** Values stay authoritative; only their transition is decorative. */
export function AnimatedValue({ value }: { value: number }) {
 const previous = useRef(value), [delta, setDelta] = useState(0);
 useEffect(() => {
  const amount = value - previous.current; previous.current = value;
  if (!amount) return;
  setDelta(amount); const timer = setTimeout(() => setDelta(0), 950);
  return () => clearTimeout(timer);
 }, [value]);
 return <span className={`animated-value ${delta ? 'value-changed' : ''}`}><span key={value}>{value}</span>{delta !== 0 && <span className="value-delta" aria-hidden="true" data-direction={delta > 0 ? 'up' : 'down'} data-delta={`${delta > 0 ? '+' : '−'}${Math.abs(delta)}`} />}</span>;
}

export function ThreatLevel({ value, compact = false, greenEightOnly = false, label = 'Threat level' }: { value: number; compact?: boolean; greenEightOnly?: boolean; label?: string }) {
 const successes = Math.max(0, Math.min(8, 9 - Math.ceil(value)));
 const description = `${successes} of 8 D8 faces hit${greenEightOnly ? '; green dice only hit on 8' : ''}. Abilities and creature rules can change results.`;
 const tone = value >= 7 ? 'deadly' : value >= 5 ? 'high' : 'guarded';
 return <span className={`threat-level ${tone} ${compact ? 'compact' : ''}`} title={`${label}: ${value}+. ${description}`} aria-label={`${label} ${value}+. ${description}`}>
  <Icon name="skull" size={compact ? 14 : 18} /><span className="threat-copy"><small>{label}</small><strong><AnimatedValue value={value} />+</strong></span>
  {!compact && <span className="threat-scale"><span className="threat-faces" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} className={i + 1 >= value ? 'success' : ''}>{i + 1}</i>)}</span><small>{successes}/8 faces hit{greenEightOnly ? ' · green: 8 only' : ''}</small></span>}
 </span>;
}

/** Public encounter stats include the same world and Overlord modifiers as combat. */
export function encounterProfile(state: GameView, target: string, region?: string) {
 const enemy = state.enemies.find(e => e.id === target);
 if (enemy) {
  const raw = p.creatures.find(c => c.id === enemy.creature)!.stats[enemy.color];
  return { ...raw, attack: raw.attack + worldAttack(p, { world: state.world }, enemy.region) };
 }
 const boss = p.overlords.find(o => o.id === target);
 if (boss) {
  const raw = boss.stats[state.heroes.length as 4 | 6];
  return { threat: raw.threat + state.overlord.threat, attack: raw.attack + state.overlord.attack + worldAttack(p, { world: state.world, battle: { boss: boss.id, first: state.faction } }, region ?? state.overlord.region), health: raw.health + state.overlord.health };
 }
 const event = p.events.find(e => e.id === target)?.boss;
 if (event) return { ...event.stats, attack: event.stats.attack + worldAttack(p, { world: state.world }, region ?? event.region) };
}

/** A challenge fights the entire matching group, including mixed quest colors. */
export function challengeProfile(state: GameView, command: Extract<Command, { type: 'challenge' }>) {
 const target = state.enemies.find(e => e.id === command.target);
 if (!target) { const profile = encounterProfile(state, command.target, command.region); return profile ? { ...profile, count: 1 } : undefined; }
 const enemies = state.enemies.filter(e => e.region === target.region && e.creature === target.creature && (e.color === 'blue') === (target.color === 'blue') && e.faction === target.faction);
 const profiles = enemies.map(e => encounterProfile(state, e.id)!);
 return { count: enemies.length, threat: Math.max(...profiles.map(s => s.threat)), attack: profiles.reduce((n, s) => n + s.attack, 0), health: profiles.reduce((n, s) => n + s.health, 0) };
}
