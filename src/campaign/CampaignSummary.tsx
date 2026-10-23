import { BASE_PACK as p } from '../data/base';
import { character, faction } from '../rules/common';
import type { GameView } from '../rules/view';
import { Icon } from '../components';
import { FactionCrest } from './Art';
import { BossPortrait } from './design-system';
import { regionName } from './event-text';
import { HeroPortrait, factionLabel } from './parts';

const TRACK = 30;
const names = (ids: string[]) => { const n = ids.map(id => character(p, id).name.split(' ')[0]); return n.length > 1 ? `${n.slice(0, -1).join(', ')} and ${n.at(-1)}` : n[0] ?? ''; };

/** How the campaign ended, in one sentence, from the battle or event that closed it. */
export function endingText(state: GameView) {
 const b = state.battle, boss = p.overlords.find(o => o.id === state.overlord.id)?.name ?? 'The Overlord';
 if (state.winner === 'draw' && state.nefarianFinal?.length === 2) return `${boss} defeats both factions. The campaign ends in a draw.`;
 if (b?.kind === 'final') return state.winner === 'draw' ? 'The final battle leaves no faction standing.' : `The ${factionLabel(state.winner ?? '')} wins the final battle in ${regionName(b.region)}.`;
 if (b?.boss) { const victors = b.participants.filter(id => !b.defeated.includes(id)); return `${boss} falls in ${regionName(b.region)}${victors.length ? ` to ${names(victors)}` : ''}.`; }
 return state.winner === 'draw' ? 'The campaign ends in a draw.' : `The ${factionLabel(state.winner ?? '')} claims Lordaeron.`;
}

/** Faction turns played, counting every full lap of the 30-space track in Overlord-only campaigns. */
export const turnsPlayed = (state: Pick<GameView, 'turn' | 'lap'>) => ((state.lap ?? 1) - 1) * TRACK + state.turn;

export default function CampaignSummary({ state, onNew, onChronicle, onHide }: { state: GameView; onNew: () => void; onChronicle: () => void; onHide: () => void }) {
 const lap = state.lap ?? 1, sides = ['horde', 'alliance'] as const;
 const quests = (f: string) => state.completed.filter(id => p.quests.find(q => q.id === id)?.faction === f).length;
 return <section className={`campaign-summary ${state.winner ?? 'draw'}`} role="dialog" aria-modal="false" aria-labelledby="campaign-summary-title">
  <header>
   <BossPortrait id={state.overlord.id}/>
   <div><span className="sheet-eyebrow">Campaign complete</span><h2 id="campaign-summary-title">{state.winner === 'draw' ? 'The campaign ends in a draw' : `${factionLabel(state.winner ?? '')} wins!`}</h2><p>{endingText(state)}</p></div>
   <Icon name="trophy" size={34}/>
  </header>
  <dl className="summary-stats">
   <div><dt>Turns played</dt><dd>{turnsPlayed(state)}</dd><small>{lap > 1 ? `Lap ${lap} · turn ${state.turn} of ${TRACK}` : `Turn ${state.turn} of ${TRACK}`}</small></div>
   {sides.map(f => <div key={f} className={f}><dt>{factionLabel(f)} quests</dt><dd>{quests(f)}</dd><small>completed</small></div>)}
  </dl>
  <div className="summary-factions">{sides.map(f => <section key={f} className={`${f} ${state.winner === f ? 'winner' : ''}`} aria-label={`${factionLabel(f)} party`}>
   <h3><FactionCrest faction={f}/>{factionLabel(f)}{state.winner === f && <small>Victor</small>}</h3>
   <ul>{state.heroes.filter(h => faction(p, h.id) === f).map(h => <li key={h.id}><HeroPortrait id={h.id} small/><span><strong>{character(p, h.id).name}</strong><small>Level {h.level} · {h.gold} gold</small></span></li>)}</ul>
  </section>)}</div>
  <footer><button className="quiet-button" onClick={onChronicle}>Read the chronicle</button><button className="quiet-button" onClick={onHide}>View the table</button><button className="gold-button" onClick={onNew}>New campaign</button></footer>
 </section>;
}
