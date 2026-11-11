// Music, sound effects and voice lines, all made with Fish Audio (docs/AUDIO-2026-11-10.md, scripts/prepare-audio.py).
// Sounds follow the game state rather than the buttons: whatever changes the state (a player, the AI, an undo) is heard the same way.
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Icon } from '../components';
import { faction } from '../rules/common';
import type { ContentPack } from '../rules/model';
import type { GameView } from '../rules/view';

export type Sfx = 'dice' | 'sword' | 'card' | 'coins' | 'levelup' | 'victory';
export type Voice = 'horde' | 'alliance' | 'turn-horde' | 'turn-alliance' | 'quest' | 'level' | 'victory-horde' | 'victory-alliance' | 'draw' | 'event'
 | 'overlord-kelthuzad' | 'overlord-nefarian' | 'overlord-kazzak' | 'fallen' | 'new-quest' | 'auction';
export type Track = 'map' | 'battle';
export interface Cue { sfx?: Sfx; voice?: Voice }

/**
 * What one change of the game state sounds like, most important first: the campaign's end, a new level, a finished quest, a fallen
 * hero, a battle beginning (with the Overlord's own line or the side's battle cry), dice, an event, a new quest, an auction, gold and
 * the next faction's turn. Silent when the state is not a step forward (a new or imported campaign, an undo).
 */
export function cues(p: ContentPack, prev: GameView | undefined, next: GameView): Cue[] {
 if (!prev || prev === next || next.pack !== prev.pack || next.revision <= prev.revision || next.revision - prev.revision > 30) return [];
 const out: Cue[] = [], before = (id: string) => prev.heroes.find(h => h.id === id);
 if (next.winner && !prev.winner) out.push({ sfx: 'victory', voice: next.winner === 'draw' ? 'draw' : `victory-${next.winner}` });
 if (next.heroes.some(h => h.level > (before(h.id)?.level ?? h.level))) out.push({ sfx: 'levelup', voice: 'level' });
 if (next.completed.length > prev.completed.length) out.push({ voice: 'quest' });
 if (next.respawns.length > prev.respawns.length) out.push({ voice: 'fallen' });
 if (next.battle && !prev.battle) {
  const overlord = p.overlords.find(o => o.id === next.battle!.boss), first = next.battle.participants[0];
  out.push({ sfx: 'sword', voice: overlord ? `overlord-${overlord.id}` as Voice : first ? faction(p, first) : next.faction });
 }
 const dice = (v: GameView) => v.battle?.active?.dice.map(d => `${d.id}:${d.value}:${d.rerolled ? 1 : 0}`).join(',') ?? '';
 if (dice(next) && dice(next) !== dice(prev) && (next.battle?.active?.dice.length ?? 0) >= (prev.battle?.active?.dice.length ?? 0)) out.push({ sfx: 'dice' });
 if (next.eventSeen.length > prev.eventSeen.length) out.push({ sfx: 'card', voice: 'event' });
 if (next.quests.some(q => !prev.quests.includes(q))) out.push({ sfx: 'card', voice: 'new-quest' });
 if (next.auction && !prev.auction) out.push({ voice: 'auction' });
 const gold = (v: GameView) => v.heroes.reduce((n, h) => n + h.gold, 0);
 if (gold(next) !== gold(prev)) out.push({ sfx: 'coins' });
 if (next.phase === 'actions' && (next.faction !== prev.faction || next.turn !== prev.turn)) out.push({ voice: `turn-${next.faction}` });
 return out;
}

/** At most one effect and one voice per change: the first of each in order of importance. */
export function pick(list: Cue[]): Cue {
 return { sfx: list.find(c => c.sfx)?.sfx, voice: list.find(c => c.voice)?.voice };
}

/** One stretch of music: the loop played this many times, then this many seconds of quiet. */
export interface Phrase { cycles: number; rest: number }
/**
 * The themes are loops of under fourteen seconds, and a loop that never stops wears thin within minutes. Each theme therefore plays in
 * phrases: a few cycles, a fade, a rest, then the next phrase. The map rests longer than a battle, and the pattern varies so that the
 * music does not return like clockwork.
 */
const PACING: Record<Track, Phrase[]> = {
 map: [{ cycles: 4, rest: 50 }, { cycles: 3, rest: 80 }, { cycles: 4, rest: 65 }, { cycles: 3, rest: 100 }],
 battle: [{ cycles: 5, rest: 20 }, { cycles: 4, rest: 30 }],
};
/** The n-th phrase of a theme, counted from 0. */
export function phrase(track: Track, n: number): Phrase { const list = PACING[track]; return list[n % list.length]; }
/** Seconds a phrase takes to fade in and to fade out; a theme pushed aside by the other scene fades in CROSSFADE. */
export const FADE_IN = 1.5, FADE_OUT = 4, CROSSFADE = 1.2;

export interface SoundSettings { muted: boolean; music: number; effects: number; voices: boolean }
const KEY = 'lordaeron-audio-v1', DEFAULTS: SoundSettings = { muted: false, music: 0.35, effects: 0.8, voices: true };
function loadSettings(): SoundSettings {
 try { const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null'); return saved && typeof saved === 'object' ? { ...DEFAULTS, ...saved } : DEFAULTS; } catch { return DEFAULTS; }
}
const src = (kind: 'music' | 'sfx' | 'voice', name: string) => `/assets/audio/${kind}/${name}.mp3`;

/** Plays everything through Web Audio, once the browser allows sound (after the first click or key press). Without Web Audio it stays silent. */
export class AudioDirector {
 settings = loadSettings();
 private ctx?: AudioContext;
 private buses?: Record<'music' | 'sfx' | 'voice', GainNode>;
 private buffers = new Map<string, Promise<AudioBuffer | undefined>>();
 private track?: { name: Track; source: AudioBufferSourceNode; gain: GainNode; rest: number };
 private wanted?: Track;
 /** How many phrases each theme has begun, and until when (performance.now) each one rests. */
 private phrases: Record<Track, number> = { map: 0, battle: 0 };
 private restUntil: Record<Track, number> = { map: 0, battle: 0 };
 private timer?: ReturnType<typeof setTimeout>;
 private voiceUntil = 0;
 private recent = new Map<string, number>();
 private listeners = new Set<() => void>();

 subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
 snapshot = () => this.settings;

 update(change: Partial<SoundSettings>) {
  this.settings = { ...this.settings, ...change };
  try { localStorage.setItem(KEY, JSON.stringify(this.settings)); } catch { /* The choice lasts until the tab closes. */ }
  this.applyVolumes();
  // Whoever turns the music on or moves its volume hears it at once, not after the current rest.
  if (this.settings.muted || this.settings.music <= 0) this.stopMusic(); else if (this.wanted) void this.music(this.wanted, 'muted' in change || 'music' in change);
  this.listeners.forEach(l => l());
 }

 /** Creates or resumes the audio context; browsers only allow this in answer to the player's own click or key press. */
 unlock = () => {
  if (!this.ctx) {
   const Context = typeof window === 'undefined' ? undefined : window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
   if (!Context) return;
   try { this.ctx = new Context(); } catch { return; }
   const bus = () => { const g = this.ctx!.createGain(); g.connect(this.ctx!.destination); return g; };
   this.buses = { music: bus(), sfx: bus(), voice: bus() };
   this.applyVolumes();
  }
  if (this.ctx.state === 'suspended') void this.ctx.resume().then(this.resumeMusic).catch(() => {}); else this.resumeMusic();
 };

 /** A hidden tab is silent, and the music's schedule waits with it. */
 suspend(hidden: boolean) { if (!this.ctx) return; void (hidden ? this.ctx.suspend() : this.ctx.resume().then(this.resumeMusic)).catch(() => {}); }

 private resumeMusic = () => { if (this.wanted && !this.track) void this.music(this.wanted); };

 private applyVolumes() {
  if (!this.buses || !this.ctx) return;
  const s = this.settings, now = this.ctx.currentTime;
  this.buses.music.gain.setTargetAtTime(s.muted ? 0 : s.music, now, 0.1);
  this.buses.sfx.gain.setTargetAtTime(s.muted ? 0 : s.effects, now, 0.05);
  this.buses.voice.gain.setTargetAtTime(s.muted || !s.voices ? 0 : Math.min(1, s.effects + 0.15), now, 0.05);
 }

 private load(url: string) {
  if (!this.buffers.has(url)) {
   this.buffers.set(url, fetch(url).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(url)))
    .then(data => this.ctx!.decodeAudioData(data)).catch(() => { this.buffers.delete(url); return undefined; }));
  }
  return this.buffers.get(url)!;
 }

 private ready() { return !!this.ctx && this.ctx.state === 'running' && !this.settings.muted; }

 /** Plays an effect or a voice; the same sound is not repeated within 0.35 s, and voices never talk over each other. */
 async play(kind: 'sfx' | 'voice', name: string) {
  if (!this.ready() || (kind === 'voice' && !this.settings.voices)) return;
  const now = performance.now(), key = `${kind}:${name}`;
  if ((this.recent.get(key) ?? -1e9) > now - 350) return;
  if (kind === 'voice' && this.voiceUntil > now) return;
  this.recent.set(key, now);
  if (kind === 'voice') this.voiceUntil = now + 900;
  const buffer = await this.load(src(kind, name));
  if (!buffer || !this.ctx || !this.buses) return;
  if (kind === 'voice') this.voiceUntil = performance.now() + buffer.duration * 1000 + 150;
  const source = this.ctx.createBufferSource();
  source.buffer = buffer; source.connect(this.buses[kind]); source.start();
 }

 /**
  * Keeps the scene's theme on its schedule: a phrase of a few cycles (the files loop without a seam), a fade, a rest, the next phrase.
  * The other scene's theme fades out and starts its rest. A battle's theme begins with the battle; the map's waits out its rest.
  * `now` skips the rest.
  */
 async music(name: Track, now = false) {
  if (now || name === 'battle' && this.wanted !== name) this.restUntil[name] = 0;
  this.wanted = name;
  clearTimeout(this.timer);
  if (!this.ready() || this.settings.music <= 0 || this.track?.name === name) return;
  const wait = this.restUntil[name] - performance.now();
  if (wait > 0) {
   this.stopMusic(CROSSFADE, true);
   this.timer = setTimeout(() => { if (this.wanted === name) void this.music(name); }, wait);
   return;
  }
  const buffer = await this.load(src('music', name));
  if (!buffer || !this.ctx || !this.buses || this.wanted !== name || this.track?.name === name || !this.ready()) return;
  this.stopMusic(CROSSFADE, true);
  const { cycles, rest } = phrase(name, this.phrases[name]++), play = buffer.duration * cycles;
  const gain = this.ctx.createGain(), source = this.ctx.createBufferSource(), t = this.ctx.currentTime;
  gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(1, t + FADE_IN);
  gain.gain.setValueAtTime(1, t + play - FADE_OUT); gain.gain.linearRampToValueAtTime(0, t + play);
  gain.connect(this.buses.music);
  source.buffer = buffer; source.loop = true; source.connect(gain); source.start(); source.stop(t + play + 0.05);
  const track = { name, source, gain, rest };
  // The phrase ran its length (audio time: a hidden tab pauses it): the rest begins, and the next phrase follows it.
  source.onended = () => {
   if (this.track !== track) return;
   this.track = undefined;
   this.restUntil[name] = performance.now() + rest * 1000;
   if (this.wanted === name) void this.music(name);
  };
  this.track = track;
 }

 /** Fades the playing theme out. With `rest`, its rest begins as if the phrase had ended: it does not start over the moment its scene returns. */
 stopMusic(fade = 0.6, rest = false) {
  const track = this.track;
  this.track = undefined;
  if (!track || !this.ctx) return;
  if (rest) this.restUntil[track.name] = performance.now() + track.rest * 1000;
  const { source, gain } = track, t = this.ctx.currentTime;
  gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(gain.gain.value, t); gain.gain.linearRampToValueAtTime(0, t + fade);
  try { source.stop(t + fade + 0.05); } catch { /* already stopped */ }
 }

 /** No music while there is no campaign on the table. */
 silence() { this.wanted = undefined; clearTimeout(this.timer); this.stopMusic(); this.restUntil = { map: 0, battle: 0 }; this.phrases = { map: 0, battle: 0 }; }
}

export const audio = new AudioDirector();

/** The map theme on the table, the battle theme in combat, and the cues of each change of the game state. */
export function useGameAudio(p: ContentPack, state: GameView | undefined) {
 const previous = useRef<GameView | undefined>(undefined);
 useEffect(() => {
  const unlock = () => audio.unlock(), visibility = () => audio.suspend(document.hidden);
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', visibility);
  return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); document.removeEventListener('visibilitychange', visibility); };
 }, []);
 useEffect(() => {
  if (!state) { audio.silence(); previous.current = undefined; return; }
  const { sfx, voice } = pick(cues(p, previous.current, state));
  previous.current = state;
  if (sfx) void audio.play('sfx', sfx);
  if (voice) void audio.play('voice', voice);
  void audio.music(state.phase === 'combat' ? 'battle' : 'map');
 }, [p, state]);
}

export function useSoundSettings() { return useSyncExternalStore(audio.subscribe, audio.snapshot, audio.snapshot); }

/** The speaker in the header: sound on or off at once. */
export function SoundToggle() {
 const s = useSoundSettings();
 return <button className="icon-button sound-toggle" aria-label={s.muted ? 'Turn sound on' : 'Turn sound off'} aria-pressed={!s.muted} title={s.muted ? 'Sound is off' : 'Sound is on: music, effects and voices'} onClick={() => { audio.unlock(); audio.update({ muted: !s.muted }); }}><Icon name={s.muted ? 'mute' : 'sound'} /></button>;
}

/** Music and effect volume and the voice lines, in Settings. */
export function SoundControls() {
 const s = useSoundSettings();
 const volume = (key: 'music' | 'effects', label: string) => <label className="setting-row sound-volume"><span>{label}</span><input type="range" min={0} max={100} step={5} value={Math.round(s[key] * 100)} aria-label={`${label} volume`} onChange={e => { audio.unlock(); audio.update({ [key]: Number(e.target.value) / 100, muted: false }); }} /><b>{Math.round(s[key] * 100)}%</b></label>;
 return <section className="sound-settings" aria-label="Sound"><h3><Icon name="music" size={16} />Sound</h3>
  <label className="setting-row"><input type="checkbox" checked={!s.muted} onChange={e => { audio.unlock(); audio.update({ muted: !e.target.checked }); }} />Play music and sound effects</label>
  {volume('music', 'Music')}{volume('effects', 'Effects')}
  <label className="setting-row"><input type="checkbox" checked={s.voices} onChange={e => { audio.unlock(); audio.update({ voices: e.target.checked }); }} />Voice lines (battle cries, turns, quests, the Overlord)</label>
  <p className="sound-credit">The music comes and goes: each theme plays for about a minute, then rests. Music, effects and voices made with Fish Audio.</p>
 </section>;
}
