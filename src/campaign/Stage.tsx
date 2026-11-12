import { useEffect, useState, type CSSProperties } from 'react';
import { Icon } from '../components';
import { audio } from './audio';
import { FactionCrest } from './Art';
import { BossPortrait } from './design-system';
import { HeroPortrait } from './parts';
import { rasterFace } from './RasterCard';
import RulesText from './RulesText';
import { paceFactor, type Beat, type BeatArt, type Pace } from './stage';

/** The shortest time a step stays up, whatever the pace: long enough to see that something happened. */
export const MIN_HOLD = 700;
export const holdOf = (beat: Beat, pace: Pace) => Math.max(MIN_HOLD, Math.round(beat.hold * paceFactor(pace)));

function Art({ art, title }: { art: BeatArt; title: string }) {
 if (art.kind === 'hero') return <HeroPortrait id={art.id} />;
 if (art.kind === 'faction') return <FactionCrest faction={art.id} className="stage-crest" />;
 if (art.kind === 'overlord') return <BossPortrait id={art.id} />;
 try { const face = rasterFace(art.id); return <img className="stage-face" src={face.src} width={face.width} height={face.height} alt={`${title} card`} draggable={false} />; }
 catch { return null; }
}

/**
 * Shows what just happened at the table, one step at a time: the first waiting beat stays up for its hold, with its sound,
 * then gives way to the next. A click, Space or Enter moves on at once; Escape clears everything that waits. At the pace
 * "Step by step" a beat has no hold: it stays until the player moves on. Nothing here
 * decides anything: the game has already moved, and the bots and the dialogs wait until the stage is empty.
 */
export default function Stage({ queue, pace, next, clear }: { queue: Beat[]; pace: Pace; next: () => void; clear: () => void }) {
 const beat = queue[0], hold = beat ? holdOf(beat, pace) : 0;
 // Step by step: nothing moves on by itself.
 const manual = pace === 'step';
 const [held, setHeld] = useState(false);
 useEffect(() => {
  if (!beat) return;
  setHeld(false);
  const { sfx, voice, stinger } = beat.cue;
  if (stinger) audio.stinger(stinger);
  if (sfx) void audio.play('sfx', sfx);
  if (voice) void audio.play('voice', voice);
 }, [beat?.id]);
 // A card is kept up only when the player asks for it with its Hold button; its time starts again when he lets it go.
 // (Until 12. 11. 2026 a mouse pointer on the card held it. Cards appear in the middle of the table, where the pointer
 // often is, and a card held that way waits for a click. Whether a card that appears under a pointer at rest counts as
 // entered depends on the browser; headless Chromium does not count it. Holding is now the player's own choice.)
 useEffect(() => {
  if (!beat || held || manual) return;
  const timer = setTimeout(next, hold);
  return () => clearTimeout(timer);
 }, [beat?.id, held, hold, manual]);
 useEffect(() => {
  if (!beat) return;
  const key = (e: KeyboardEvent) => {
   if (e.key === 'Escape') { e.preventDefault(); clear(); return; }
   if (e.key !== ' ' && e.key !== 'Enter') return;
   if ((e.target as HTMLElement | null)?.closest?.('input,select,textarea,button,a,[role=button],[contenteditable=true]')) return;
   e.preventDefault(); next();
  };
  window.addEventListener('keydown', key);
  return () => window.removeEventListener('keydown', key);
 }, [beat?.id]);
 if (!beat) return null;
 const more = queue.length - 1, timing = { '--stage-hold': `${hold}ms` } as CSSProperties;
 const text = <div className="stage-text">
  <span className="stage-eyebrow">{beat.eyebrow}</span>
  <strong className="stage-title">{beat.title}</strong>
  {beat.lines.map((line, i) => <p key={i} style={{ '--stage-line': i } as CSSProperties}><RulesText>{line}</RulesText></p>)}
 </div>;
 const foot = <div className="stage-foot">
  {!manual && <i className={`stage-timer ${held ? 'held' : ''}`} key={beat.id} style={timing} aria-hidden="true" />}
  <span>{manual ? <><span className="stage-pointer">Click or press Space for the next step</span><span className="stage-touch">Tap for the next step</span></> : held ? <><span className="stage-pointer">Held while you read · click or press Space to continue</span><span className="stage-touch">Held while you read · tap to continue</span></> : <><span className="stage-pointer">Moves on by itself · click or press Space to continue now</span><span className="stage-touch">Moves on by itself · tap to continue now</span></>}{more > 0 ? ` · ${more} more` : ''}</span>
  <span className="stage-buttons">
   {!manual && <button type="button" className="quiet-button stage-hold" aria-pressed={held} title={held ? 'Let this step move on by itself again' : 'Keep this step up until you continue'} onClick={e => { e.stopPropagation(); setHeld(v => !v); }}>{held ? 'Release' : 'Hold'}</button>}
   {more > 0 && <button type="button" className="quiet-button" onClick={e => { e.stopPropagation(); clear(); }}>Skip all</button>}
  </span>
 </div>;
 return <div className={`table-stage ${beat.size} kind-${beat.kind} ${manual ? 'waits' : ''}`} role="status" aria-live="polite" aria-label="What just happened at the table" onClick={next}>
  {beat.size === 'card'
   ? <article key={beat.id} className="stage-card">
    {beat.art && <div className="stage-art"><Art art={beat.art} title={beat.title} /></div>}
    <div className="stage-body">{text}{foot}</div>
   </article>
   : <article key={beat.id} className="stage-banner">
    {beat.art && <div className="stage-art"><Art art={beat.art} title={beat.title} /></div>}
    {text}
    {!manual && <i className="stage-timer" style={timing} aria-hidden="true" />}
    <span className="stage-skip"><Icon name="right" size={14} />{manual ? `Click for the next step${more > 0 ? ` · ${more} more` : ''}` : more > 0 ? `${more} more` : 'Space'}</span>
   </article>}
 </div>;
}
