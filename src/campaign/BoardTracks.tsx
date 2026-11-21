import type { CSSProperties } from 'react';
import { BASE_PACK as p } from '../data/base';
import { character, faction } from '../rules/common';
import type { GameView } from '../rules/view';
import { SCANS } from './scan-assets';

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
     <b>{n}</b>{icon && <i className={`board-turns-icon ${icon}`}/>}{n === state.turn && (SCANS.tokens.hourglass ? <img className={`board-turns-hourglass ${state.faction}`} src={SCANS.tokens.hourglass} alt="" draggable={false}/> : <span className={`board-turns-marker ${state.faction}`}/>)}
    </li>;
   })}
   <li className="board-turns-end">{state.variants?.overlordOnly ? `Lap ${lap}` : 'End'}</li>
  </ol>
 </div>;
}

/** The last space of the experience track: the experience that makes level 5. A counter never stands above it. */
export const XP_SPACES = p.xp[p.xp.length - 1];
/**
 * Where the counters stand beside the track. A counter stands exactly at the height of its space, and it is taller than a space,
 * so counters on the same space or on neighbouring ones stand side by side: each takes the first column that no counter within
 * one space of it has taken. The Horde's counters are placed first, so they stand nearest the track.
 */
export function xpColumns(heroes: readonly { id: string; xp: number }[]) {
 const placed: { id: string; space: number; column: number }[] = [];
 for (const h of [...heroes].sort((a, b) => Number(faction(p, a.id) === 'alliance') - Number(faction(p, b.id) === 'alliance'))) {
  const space = Math.max(0, Math.min(h.xp, XP_SPACES)), taken = placed.filter(v => Math.abs(v.space - space) <= 1).map(v => v.column);
  let column = 0; while (taken.includes(column)) column++;
  placed.push({ id: h.id, space, column });
 }
 return placed;
}

/**
 * The experience track printed down the board's edge, as the game prints it: one space for every experience point from Start to
 * the 28th, with the space that makes each level in green. Beside the spaces run the levels they belong to, and each character
 * counter stands at the height of its own space, tied to it by a line in its faction's colour.
 */
export function ExperienceTrack({ state }: { state: Pick<GameView, 'heroes'> }) {
 const placed = xpColumns(state.heroes), columns = Math.max(1, ...placed.map(v => v.column + 1));
 const first = (id: string) => character(p, id).name.split(' ')[0];
 const next = (h: GameView['heroes'][number]) => h.level < p.xp.length ? `${Math.max(0, p.xp[h.level] - h.xp)} XP to level ${h.level + 1}` : 'highest level';
 const vars = (v: { space: number; column: number }) => ({ '--space': v.space, '--column': v.column }) as CSSProperties;
 return <div className="board-xp" role="img" aria-label={`Experience track, Start to ${XP_SPACES} XP: ${state.heroes.map(h => `${first(h.id)} ${h.xp} XP, level ${h.level}, ${next(h)}`).join('; ')}.`}>
  <span className="board-xp-title">Experience</span>
  <div className="board-xp-scale" aria-hidden="true" style={{ '--spaces': XP_SPACES + 1, '--gaps': Math.max(1, columns - 1) } as CSSProperties}>
   <div className="board-xp-levels">
    {p.xp.map((from, i) => { const to = (p.xp[i + 1] ?? XP_SPACES + 1) - 1; return <span key={from} className="board-xp-level" style={{ '--from': from, '--span': to - from + 1 } as CSSProperties} title={`Level ${i + 1}: ${from === to ? `${from} XP` : `${from} to ${to} XP`}`}><b>{i + 1}</b></span>; })}
   </div>
   <ol className="board-xp-spaces">
    {Array.from({ length: XP_SPACES + 1 }, (_, n) => <li key={n} className={`board-xp-space ${n && p.xp.includes(n) ? 'level' : ''} ${placed.some(v => v.space === n) ? 'held' : ''}`}><b>{n}</b></li>)}
   </ol>
   <div className="board-xp-field">
    {placed.map(v => <i key={v.id} className={`board-xp-tie ${faction(p, v.id)}`} style={vars(v)}/>)}
    {placed.map(v => { const h = state.heroes.find(x => x.id === v.id)!;
     return <span key={v.id} className={`board-xp-counter ${faction(p, v.id)} ${SCANS.counters[v.id] ? 'scanned' : ''}`} style={vars(v)} title={`${character(p, v.id).name} · ${h.xp} XP · level ${h.level} · ${next(h)}`}><img src={SCANS.counters[v.id] ?? `/assets/portraits/${v.id}.webp`} alt="" draggable={false}/></span>; })}
   </div>
  </div>
  <span className="board-xp-start">Start</span>
 </div>;
}
