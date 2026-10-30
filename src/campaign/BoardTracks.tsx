import type { CSSProperties } from 'react';
import { BASE_PACK as p } from '../data/base';
import { character, faction } from '../rules/common';
import type { GameView } from '../rules/view';

const TRACK = 30;
const deckName: Record<string, string> = { triangle: 'triangle', square: 'square', circle: 'circle' };
const spaceText = (n: number) => p.track[n] === 'event' ? 'Event cards are drawn' : p.track[n] ? `a ${deckName[p.track[n]]} item joins the merchant` : 'no event';

/** The turn track printed along the board: thirty faction turns, the Event and merchant spaces, and the hourglass marker. */
export function TurnTrack({ state }: { state: Pick<GameView, 'turn' | 'lap' | 'faction' | 'variants'> }) {
 const lap = state.lap ?? 1, next = Array.from({ length: TRACK - state.turn }, (_, i) => state.turn + 1 + i).find(n => p.track[n] === 'event');
 return <div className="board-turns" role="img" aria-label={`Turn track: turn ${state.turn} of ${TRACK}${lap > 1 ? `, lap ${lap}` : ''}. ${next ? `Next Event cards on turn ${next}.` : 'No further Event cards this lap.'}`}>
  <span className="board-turns-title">Turn<br/>track</span>
  <ol aria-hidden="true">
   {Array.from({ length: TRACK }, (_, i) => {
    const n = i + 1, icon = p.track[n];
    return <li key={n} className={`${n === state.turn ? 'current' : n < state.turn ? 'past' : ''} ${icon ?? ''}`} title={`Turn ${n}: ${spaceText(n)}`}>
     <b>{n}</b>{icon && <i className={`board-turns-icon ${icon}`}/>}{n === state.turn && <span className={`board-turns-marker ${state.faction}`}/>}
    </li>;
   })}
   <li className="board-turns-end">{state.variants?.overlordOnly ? `Lap ${lap}` : 'End'}</li>
  </ol>
 </div>;
}

/** The experience track printed down the board's edge: each character counter climbs toward level 5, one lane per faction. */
export function ExperienceTrack({ state }: { state: Pick<GameView, 'heroes'> }) {
 const max = p.xp[4], at = (xp: number) => Math.min(xp, max) / max;
 const lanes = (['horde', 'alliance'] as const).map(f => state.heroes.filter(h => faction(p, h.id) === f));
 return <div className="board-xp" role="img" aria-label={`Experience track: ${state.heroes.map(h => `${character(p, h.id).name.split(' ')[0]} ${h.xp} XP, level ${h.level}`).join('; ')}.`}>
  <span className="board-xp-title">Experience</span>
  <div className="board-xp-scale" aria-hidden="true">
   {p.xp.slice(1).map((xp, i) => <span key={xp} className="board-xp-level" style={{ '--at': at(xp) } as CSSProperties}><b>{i + 2}</b></span>)}
   {lanes.map((heroes, lane) => <div key={lane} className={`board-xp-lane ${lane ? 'alliance' : 'horde'}`}>
    {heroes.map(h => {
     const stack = heroes.filter(v => Math.min(v.xp, max) === Math.min(h.xp, max)).indexOf(h);
     return <span key={h.id} className="board-xp-counter" style={{ '--at': at(h.xp), '--stack': stack } as CSSProperties} title={`${character(p, h.id).name} · ${h.xp} XP · level ${h.level}`}><img src={`/assets/portraits/${h.id}.webp`} alt="" draggable={false}/></span>;
    })}
   </div>)}
  </div>
  <span className="board-xp-start">Start</span>
 </div>;
}
