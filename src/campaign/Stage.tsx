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
 * then gives way to the next. A click, Space or Enter moves on at once; Escape clears everything that waits. Nothing here
 * decides anything: the game has already moved, and the bots and the dialogs wait until the stage is empty.
 */
export default function Stage({ queue, pace, next, clear }: { queue: Beat[]; pace: Pace; next: () => void; clear: () => void }) {
 const beat = queue[0], hold = beat ? holdOf(beat, pace) : 0;
 const [held, setHeld] = useState(false);
 useEffect(() => {
  if (!beat) return;
  setHeld(false);
  const { sfx, voice, stinger } = beat.cue;
  if (stinger) audio.stinger(stinger);
  if (sfx) void audio.play('sfx', sfx);
  if (voice) void audio.play('voice', voice);
 }, [beat?.id]);
 // A pointer resting on a card keeps it up for reading; the hold starts again when it leaves.
 useEffect(() => {
  if (!beat || held) return;
  const timer = setTimeout(next, hold);
  return () => clearTimeout(timer);
 }, [beat?.id, held, hold]);
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
  <i className={`stage-timer ${held ? 'held' : ''}`} key={beat.id} style={timing} aria-hidden="true" />
  <span>{held ? 'Held while you read' : <><span className="stage-pointer">Click or press Space to continue</span><span className="stage-touch">Tap to continue</span></>}{more > 0 ? ` · ${more} more` : ''}</span>
  {more > 0 && <button type="button" className="quiet-button" onClick={e => { e.stopPropagation(); clear(); }}>Skip all</button>}
 </div>;
 return <div className={`table-stage ${beat.size} kind-${beat.kind}`} role="status" aria-live="polite" aria-label="What just happened at the table" onClick={next}>
  {beat.size === 'card'
   ? <article key={beat.id} className="stage-card" onPointerEnter={e => { if (e.pointerType === 'mouse') setHeld(true); }} onPointerLeave={() => setHeld(false)}>
    {beat.art && <div className="stage-art"><Art art={beat.art} title={beat.title} /></div>}
    <div className="stage-body">{text}{foot}</div>
   </article>
   : <article key={beat.id} className="stage-banner">
    {beat.art && <div className="stage-art"><Art art={beat.art} title={beat.title} /></div>}
    {text}
    <i className="stage-timer" style={timing} aria-hidden="true" />
    <span className="stage-skip"><Icon name="right" size={14} />{more > 0 ? `${more} more` : 'Space'}</span>
   </article>}
 </div>;
}
