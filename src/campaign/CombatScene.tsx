import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components';
import { BASE_PACK as p } from '../data/base';
import { character, faction } from '../rules/common';
import type { GameView } from '../rules/view';
import { BossPortrait, CreatureGlyph } from './design-system';
import { factionLabel, HeroPortrait } from './parts';

type Cue = { key: number; kind: 'strike' | 'hurt' | 'heal' | 'bank' | 'power'; text: string; heroId?: string };
export default function CombatScene({ state, busy }: { state: GameView; busy: boolean }) {
 const b = state.battle!, previous = useRef(state), [cue, setCue] = useState<Cue>();
 useEffect(() => {
  const before = previous.current; previous.current = state;
  if (before.revision === state.revision || !before.battle) return;
  const messages: string[] = []; let kind: Cue['kind'] | undefined, changedHero: string | undefined;
  for (const id of b.participants) {
   const h = state.heroes.find(h => h.id === id), old = before.heroes.find(h => h.id === id);
   if (h && old && h.health !== old.health) {
    const delta = h.health - old.health;
    kind = delta < 0 ? 'hurt' : kind ?? 'heal';
    changedHero ??= id;
    messages.push(`${character(p, id).name.split(' ')[0]} ${delta > 0 ? '+' : '−'}${Math.abs(delta)} health`);
   }
  }
  const kills = (b.killed?.length ?? 0) - (before.battle.killed?.length ?? 0);
  if (kills > 0) { kind ??= 'strike'; messages.push(`${kills} ${kills === 1 ? 'enemy' : 'enemies'} defeated`); }
  const actor = b.active ?? before.battle.active;
  const side = actor ? faction(p, actor.heroId) : b.first;
  const total = b.boxes[side], oldTotal = before.battle.boxes[side];
  const gained = total.damage + total.defense + total.armor + total.attrition - oldTotal.damage - oldTotal.defense - oldTotal.armor - oldTotal.attrition;
  if (gained > 0) { kind ??= 'bank'; messages.push(`+${gained} to ${factionLabel(side)} totals`); }
  if (!kind && b.active && before.battle.active?.heroId === b.active.heroId && b.active.used.length > before.battle.active.used.length) {
   kind = 'power'; messages.push(`${character(p, b.active.heroId).name.split(' ')[0]} activates a power`);
  }
  if (kind) setCue({ key: state.revision, kind, text: messages.join(' · '), heroId: changedHero });
 }, [state.revision]);
 useEffect(() => { if (!cue) return; const timer = setTimeout(() => setCue(undefined), 1600); return () => clearTimeout(timer); }, [cue]);
 const heroId = cue?.heroId ?? b.active?.heroId ?? b.participants.find(id => !b.defeated.includes(id)) ?? b.participants[0];
 const enemy = state.enemies.find(e => b.enemies.includes(e.id)) ?? b.killed?.[0];
 const creature = p.creatures.find(c => c.id === enemy?.creature), boss = p.overlords.find(o => o.id === b.boss);
 const opponent = b.kind !== 'pve' ? b.participants.find(id => faction(p, id) !== faction(p, heroId)) : undefined;
 const over = b.stage === 'over', won = b.winner === b.first;
 const result = b.winner === 'draw' ? 'Draw' : b.kind === 'pve' ? won ? 'Victory' : 'Defeat' : `${factionLabel(b.winner ?? '')} victory`;
 return <section className={`battle-scene ${over ? `finished ${won ? 'victory' : 'defeat'}` : ''}`} aria-label="Battle animation">
  <div key={`${heroId}:${cue?.key}`} className={`battle-fighter hero ${cue?.kind === 'hurt' ? 'impact' : cue?.kind === 'power' || busy ? 'casting' : ''}`}><HeroPortrait id={heroId} small /><span>{character(p, heroId).name.split(' ')[0]}</span></div>
  <div className="battle-scene-center">
   <div className={`battle-motion ${busy ? 'rolling' : cue?.kind ?? 'ready'}`} key={`motion:${busy ? 'rolling' : cue?.key ?? 'ready'}`} aria-hidden="true"><i /><Icon name={over ? won ? 'trophy' : 'flag' : busy ? 'spark' : cue?.kind === 'hurt' ? 'heart' : cue?.kind === 'bank' ? 'shield' : 'swords'} size={24} /><i /></div>
   <strong key={`message:${over ? result : cue?.key ?? 'ready'}`} role="status">{over ? result : busy ? 'The dice are in motion…' : cue?.text ?? (b.stage === 'attacker' ? 'Choose your next attacker' : `Round ${b.round} · ${b.kind === 'pve' ? 'Your party vs the encounter' : 'Faction battle'}`)}</strong>
   <small>{over ? 'Review the totals, then continue below.' : 'Ranged → defense → melee & attrition'}</small>
  </div>
  <div key={`enemy:${cue?.key}`} className={`battle-fighter enemy ${cue?.kind === 'strike' ? 'impact' : ''}`}>{opponent ? <HeroPortrait id={opponent} small /> : boss ? <BossPortrait id={boss.id} /> : creature ? <CreatureGlyph type={creature.rule} name={creature.name} /> : <Icon name="skull" size={35} />}<span>{opponent ? character(p, opponent).name.split(' ')[0] : boss?.name ?? creature?.name ?? 'Encounter'}</span></div>
 </section>;
}
