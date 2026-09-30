import { Icon } from '../components';
import { BASE_PACK as p } from '../data/base';
import { capacity, character, faction } from '../rules/common';
import type { GameView } from '../rules/view';
import { BossPortrait, CreatureGlyph } from './design-system';
import { factionLabel, HeroPortrait } from './parts';
import type { CombatPresentation } from './combat-flow';

export default function CombatScene({ state, busy, presentation }: { state: GameView; busy: boolean; presentation?: CombatPresentation }) {
 const b = state.battle!, cue = presentation?.cue, phase = presentation?.phase ?? 'idle';
 const heroId = cue?.heroId ?? b.active?.heroId ?? b.participants.find(id => !b.defeated.includes(id)) ?? b.participants[0];
 const hero = state.heroes.find(h => h.id === heroId);
 const enemy = state.enemies.find(e => b.enemies.includes(e.id)) ?? cue?.before.enemies.find(e => cue.before.battle?.enemies.includes(e.id)) ?? b.killed?.[0];
 const creature = p.creatures.find(c => c.id === enemy?.creature), boss = p.overlords.find(o => o.id === b.boss);
 const opponent = b.kind !== 'pve' ? b.participants.find(id => faction(p, id) !== faction(p, heroId)) : undefined;
 const over = b.stage === 'over', won = b.winner === b.first;
 const result = b.winner === 'draw' ? 'Draw' : b.kind === 'pve' ? won ? 'Victory' : 'Defeat' : `${factionLabel(b.winner ?? '')} victory`;
 const revealed = phase === 'impact' || phase === 'recovery';
 const heading = busy ? 'The dice are in motion…' : cue ? phase === 'anticipation' ? cue.anticipation : over && revealed ? result : cue.title : over ? result : b.active ? `${character(p, b.active.heroId).name.split(' ')[0]} prepares an attack` : `Round ${b.round} · The battlefield`;
 const detail = cue ? revealed ? cue.detail : 'A moment before the clash' : over ? 'The battle is settled. Collect your rewards below.' : 'Ranged first. Hold the line. Strike back.';
 const kind = busy ? 'rolling' : cue?.kind ?? 'ready';
 const phaseIndex = ['anticipation', 'action', 'impact', 'recovery'].indexOf(phase);
 const fighterClass = (side: 'hero' | 'enemy') => {
  if (!cue) return busy && side === 'hero' ? 'channeling' : '';
  if (side === 'hero') return cue.kind === 'hurt' ? 'receiving' : cue.kind === 'heal' || cue.kind === 'bank' || cue.kind === 'power' ? 'channeling' : cue.kind === 'defend' ? 'guarding' : 'attacking';
  return cue.kind === 'hurt' || cue.kind === 'defend' ? 'attacking' : cue.kind === 'melee' || cue.kind === 'ranged' ? 'receiving' : '';
 };
 return <section key={cue?.key ?? 'ready'} className={`battle-scene cinematic-scene beat-${phase} cue-${kind} ${over && (!cue || revealed) ? `finished ${won ? 'victory' : 'defeat'}` : ''}`} aria-label="Battle animation" aria-busy={presentation?.busy || busy}>
  <div className="battle-scene-horizon" aria-hidden="true" />
  <span className="battle-scene-caption">{over && (!cue || revealed) ? 'ENCOUNTER COMPLETE' : 'THE BATTLEFIELD'}</span>
  <div className={`battle-fighter hero ${fighterClass('hero')}`}><div className="battle-portrait-ring"><HeroPortrait id={heroId} small /><i className="battle-shield"><Icon name="shield" size={32} /></i></div><span>{character(p, heroId).name.split(' ')[0]}</span>{hero && <span className="battle-health"><i style={{ width: `${Math.max(0, hero.health / capacity(p, hero).health * 100)}%` }} /><small>{hero.health} HP</small></span>}</div>
  <div className="battle-scene-center">
   <div className="battle-exchange" aria-hidden="true"><i className="battle-projectile" /><i className="battle-slash" /><i className="battle-shockwave" /><Icon name={over && (!cue || revealed) ? won ? 'trophy' : 'flag' : busy || kind === 'power' ? 'spark' : kind === 'hurt' || kind === 'heal' ? 'heart' : kind === 'bank' || kind === 'defend' ? 'shield' : 'swords'} size={25} /></div>
   <strong role="status">{heading}</strong><small>{detail}</small>
   <div className="battle-beats" aria-label={cue ? `Battle animation: ${phase}` : 'Ready for your decision'}>{['Prepare', 'Strike', 'Impact', 'Settle'].map((label, index) => <span key={label} className={index === phaseIndex ? 'active' : index < phaseIndex ? 'complete' : ''}><i />{label}</span>)}</div>
  </div>
  <div className={`battle-fighter enemy ${fighterClass('enemy')}`}><div className="battle-portrait-ring">{opponent ? <HeroPortrait id={opponent} small /> : boss ? <BossPortrait id={boss.id} /> : creature ? <CreatureGlyph type={creature.rule} name={creature.name} /> : <Icon name="skull" size={44} />}</div><span>{opponent ? character(p, opponent).name.split(' ')[0] : boss?.name ?? creature?.name ?? 'Encounter'}</span></div>
 </section>;
}
