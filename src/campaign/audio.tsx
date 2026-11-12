// Music, sound effects and voice lines made with Fish Audio (docs/EQUIPMENT-AND-SOUND-2026-11-10.md, docs/MUSIC-THEMES-2026-11-11.md,
// docs/SOUND-2026-11-12.md, scripts/prepare-audio.py), and short sounds made in the browser (stingers.ts).
// Sounds follow the game state rather than the buttons: whatever changes the state (a player, the AI, an undo) is heard the same way.
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Icon } from '../components';
import { character, faction } from '../rules/common';
import type { ContentPack } from '../rules/model';
import type { GameView } from '../rules/view';
import type { CombatCue, CombatPresentation } from './combat-flow';
import { STAGED_VOICES, type Stinger } from './stage';
import { STINGERS } from './stingers';

export type Sfx = 'dice' | 'sword' | 'card' | 'coins' | 'levelup' | 'victory' | 'hit' | 'block' | 'hurt' | 'roar' | 'slain' | 'spell';
/**
 * The voice cues and how many recordings each has: <cue>.mp3, <cue>-2.mp3, <cue>-3.mp3 in /assets/audio/voice. The recordings of
 * a cue take turns, so the same sentence is not heard twice running. scripts/voice-lines.json has every line's words and speaker.
 */
export const VOICES = {
 horde: 3, alliance: 3, 'turn-horde': 3, 'turn-alliance': 3, quest: 3, 'new-quest': 3, level: 3, 'level-5': 1, fallen: 3,
 event: 3, auction: 2, 'event-war': 2, 'event-boss': 2, 'event-bounty': 1, 'event-hatreds': 1, 'event-horizons': 1, 'event-zeppelin': 1, 'event-traders': 1,
 'event-beasts': 1, 'event-professions': 1, 'event-retrain': 1, 'event-subterfuge': 1, 'event-ears': 1, 'event-cleanse': 1, 'event-winds': 1,
 'war-won-horde': 1, 'war-won-alliance': 1, 'battle-won': 3, 'battle-lost': 2, merchant: 2, lap: 1, town: 3, train: 2,
 'taunt-kelthuzad': 3, 'taunt-nefarian': 3, 'taunt-kazzak': 3, 'nefarian-arrives': 1, 'kazzak-found': 1, 'kazzak-decoy': 1,
 'victory-horde': 1, 'victory-alliance': 1, draw: 1, 'overlord-kelthuzad': 1, 'overlord-nefarian': 1, 'overlord-kazzak': 1,
} as const;
export type Voice = keyof typeof VOICES;
/** The file of a cue's n-th recording, counted from 0. */
export const recording = (voice: Voice, n: number) => n ? `${voice}-${n + 1}` : voice;
/** The scene the music belongs to: the map, a battle, or a battle against the Overlord or another boss. */
export type Track = 'map' | 'battle' | 'boss';
export interface Cue { sfx?: Sfx; voice?: Voice; stinger?: Stinger }

/** What is said over an Event card of each kind the first time a card of that name is drawn. */
const EVENT_VOICES: Record<string, Voice> = {
 war: 'event-war', auction: 'auction', bounty: 'event-bounty', hatreds: 'event-hatreds', horizons: 'event-horizons', zeppelin: 'event-zeppelin', merchants: 'event-traders', sell: 'event-traders',
 beasts: 'event-beasts', professions: 'event-professions', retrain: 'event-retrain', subterfuge: 'event-subterfuge', ears: 'event-ears', cleanse: 'event-cleanse', winds: 'event-winds',
};
/**
 * The line over an Event card. Kel'Thuzad speaks over his own cards. A card whose name has not been drawn before in the campaign
 * gets the line of its kind (a War, a bounty, a world boss…); when the same card comes again, one of the lines about fate.
 */
export function eventVoice(p: ContentPack, id: string, earlier: string[]): Voice {
 const e = p.events.find(e => e.id === id);
 if (!e) return 'event';
 if (e.overlord === 'kelthuzad') return 'taunt-kelthuzad';
 const own = e.boss ? 'event-boss' : EVENT_VOICES[e.script ?? ''];
 return own && !earlier.some(other => p.events.find(v => v.id === other)?.name === e.name) ? own : 'event';
}
/** The Overlord's own remark when he moves, when a character dies at his hand, or over his own cards. */
export const taunt = (p: ContentPack, overlord: string): Voice | undefined => { const voice = `taunt-${overlord}`; return voice in VOICES && p.overlords.some(o => o.id === overlord) ? voice as Voice : undefined; };
/** The faction a chronicle line names as the winner of a War ("The Horde wins The Andorhal War, holding…"). */
export const warWinner = (text: string): 'horde' | 'alliance' | undefined => /^The (Horde|Alliance) wins .*War/.test(text) ? text.startsWith('The Horde') ? 'horde' : 'alliance' : undefined;

/**
 * What one change of the game state sounds like, most important first: the campaign's end, a new level, a finished quest, a fallen
 * hero, a battle beginning (with the Overlord's own line or the side's battle cry), dice, a Kazzak clue, an Event card (with the
 * line of its kind), the Overlord's move, a War won, a new quest, an auction, the merchant's new wares, gold and the next faction's
 * turn. Silent when the state is not a step forward (a new or imported campaign, an undo).
 */
export function cues(p: ContentPack, prev: GameView | undefined, next: GameView): Cue[] {
 if (!prev || prev === next || next.pack !== prev.pack || next.revision <= prev.revision || next.revision - prev.revision > 30) return [];
 const out: Cue[] = [], before = (id: string) => prev.heroes.find(h => h.id === id);
 if (next.winner && !prev.winner) out.push({ sfx: 'victory', voice: next.winner === 'draw' ? 'draw' : `victory-${next.winner}` });
 const risen = next.heroes.filter(h => h.level > (before(h.id)?.level ?? h.level));
 if (risen.length) out.push({ sfx: 'levelup', voice: risen.some(h => h.level === 5) ? 'level-5' : 'level' });
 if (next.completed.length > prev.completed.length) out.push({ voice: 'quest' });
 if (next.respawns.length > prev.respawns.length) out.push({ voice: 'fallen' });
 if (next.battle && !prev.battle) {
  const b = next.battle, overlord = p.overlords.find(o => o.id === b.boss), first = b.participants[0];
  // Nefarian speaks differently when he has reached the Bulwark, and Kazzak when his hiding place is found.
  const arrived = overlord?.id === 'nefarian' && b.region === 'bulwark' && !prev.nefarianFinal?.length;
  const found = overlord?.id === 'kazzak' && prev.kazzak?.some(t => t.region === b.region && !t.revealed);
  out.push({ sfx: 'sword', voice: arrived ? 'nefarian-arrives' : found ? 'kazzak-found' : overlord ? `overlord-${overlord.id}` as Voice : first ? faction(p, first) : next.faction });
 }
 const dice = (v: GameView) => v.battle?.active?.dice.map(d => `${d.id}:${d.value}:${d.rerolled ? 1 : 0}`).join(',') ?? '';
 if (dice(next) && dice(next) !== dice(prev) && (next.battle?.active?.dice.length ?? 0) >= (prev.battle?.active?.dice.length ?? 0)) out.push({ sfx: 'dice' });
 // A Kazzak clue: a challenged decoy leaves the board; a clue looked at tells the faction whether he is there.
 const clue = next.kazzak?.find(t => t.real !== undefined && prev.kazzak?.find(o => o.region === t.region)?.real === undefined);
 if ((prev.kazzak?.length ?? 0) > (next.kazzak?.length ?? 0) && !next.battle) out.push({ voice: 'kazzak-decoy' });
 else if (clue && !next.battle) out.push({ voice: clue.real ? 'taunt-kazzak' : 'kazzak-decoy' });
 // The discard pile grows with every Event card drawn; eventSeen is emptied again when an Event resolves without a decision.
 if (next.eventDiscard.length > prev.eventDiscard.length) out.push({ sfx: 'card', voice: eventVoice(p, next.eventDiscard[prev.eventDiscard.length], prev.eventDiscard) });
 const mocking = next.overlord.region !== prev.overlord.region && !next.battle ? taunt(p, next.overlord.id) : undefined;
 if (mocking) out.push({ voice: mocking });
 const since = prev.log.at(-1)?.id ?? 0, won = next.log.filter(entry => entry.id > since).map(entry => warWinner(entry.text)).find(Boolean);
 if (won) out.push({ voice: `war-won-${won}` });
 if (next.quests.some(q => !prev.quests.includes(q))) out.push({ sfx: 'card', voice: 'new-quest' });
 if (next.auction && !prev.auction) out.push({ voice: 'auction' });
 if (next.turn !== prev.turn && next.merchant.some(id => !prev.merchant.includes(id))) out.push({ voice: 'merchant' });
 const gold = (v: GameView) => v.heroes.reduce((n, h) => n + h.gold, 0);
 if (gold(next) !== gold(prev)) out.push({ sfx: 'coins' });
 if (next.phase === 'actions' && (next.faction !== prev.faction || next.turn !== prev.turn)) out.push({ voice: (next.lap ?? 1) > (prev.lap ?? 1) ? 'lap' : `turn-${next.faction}` });
 return out;
}

/** At most one effect and one voice per change: the first of each in order of importance. */
export function pick(list: Cue[]): Cue {
 return { sfx: list.find(c => c.sfx)?.sfx, voice: list.find(c => c.voice)?.voice };
}

export type Sound = Cue & { /** Seconds after the moment it belongs to. */ delay?: number };
const CASTERS = ['mage', 'warlock', 'priest', 'druid', 'shaman', 'paladin'];
/** A caster's power sounds like a spell, a fighter's like a blade or a bowstring. */
const casts = (p: ContentPack, heroId?: string) => !!heroId && CASTERS.includes(character(p, heroId).classId);
/**
 * What an exchange of a combat sounds like at each moment of its staging (combat-flow.ts › combatCue). A power is heard as it
 * is played. Ranged damage is loosed, then lands; melee lands; an enemy that falls is heard falling. When the enemy strikes,
 * it is heard first (a beast roars, Kel'Thuzad casts, another character's blade rings), then the shields take the blow; a
 * wound and a healing are heard when the Health changes; hits put aside are counters put down.
 */
export function combatSounds(p: ContentPack, cue: Pick<CombatCue, 'kind' | 'heroId' | 'kills' | 'before'>, phase: CombatPresentation['phase']): Sound[] {
 const battle = cue.before.battle, magic: Sound = { sfx: 'spell', stinger: 'spark' }, fallen: Sound[] = cue.kills ? [{ sfx: 'slain', delay: 0.28 }] : [];
 switch (cue.kind) {
  case 'power': return phase === 'anticipation' ? [casts(p, cue.heroId) ? magic : { stinger: 'power' }] : [];
  case 'bank': return phase === 'impact' ? [{ stinger: 'tokens' }] : [];
  case 'ranged': return phase === 'action' ? [casts(p, cue.heroId) ? magic : { stinger: 'volley' }] : phase === 'impact' ? [{ sfx: 'hit' }, ...fallen] : [];
  case 'melee': return phase === 'impact' ? [{ sfx: 'hit' }, ...fallen] : [];
  case 'defend': return phase === 'anticipation' ? [battle?.kind !== 'pve' ? { sfx: 'sword' } : battle.boss === 'kelthuzad' ? magic : { sfx: 'roar' }] : phase === 'impact' ? [{ sfx: 'block' }] : [];
  case 'hurt': return phase === 'impact' ? [{ sfx: 'hurt' }] : [];
  case 'heal': return phase === 'impact' ? [{ stinger: 'heal' }] : [];
  default: return [];
 }
}
/**
 * How a finished fight is announced: the horn and a line for the side that won it, two falling notes and a line for a party
 * that lost, and the Overlord's own remark when he was the one who beat it. Nothing when the fight ended the campaign: that
 * has its fanfare.
 */
export function battleOutcome(p: ContentPack, state: Pick<GameView, 'battle' | 'winner'>): Sound[] {
 const b = state.battle;
 if (!b || b.stage !== 'over' || !b.winner || state.winner) return [];
 if (b.winner === 'draw') return [{ stinger: 'defeat' }];
 // Against creatures the challengers are `first`; between characters one faction has won.
 return b.kind !== 'pve' || b.winner === b.first ? [{ stinger: 'triumph', voice: 'battle-won' }] : [{ stinger: 'defeat', voice: (b.boss && taunt(p, b.boss)) || 'battle-lost' }];
}

/**
 * The themes of each scene, by file name in /assets/audio/themes. Every phrase plays the next theme of its scene, so a theme returns
 * only after the others. A boss fight opens with its own theme and then alternates with the first battle theme.
 */
export const THEMES: Record<Track, string[]> = {
 map: ['map', 'map-road', 'map-blight', 'map-council'],
 battle: ['battle', 'battle-charge'],
 boss: ['boss', 'battle'],
};
/**
 * Every theme is one period of music that repeats without a seam, with `lead` seconds of the same music before and after it in the
 * file (scripts/prepare-audio.py). Looping between those two marks keeps the loop points inside continuous sound, whatever the MP3
 * coder and the browser's decoder do at the edges of the file.
 */
export const LOOP = { lead: 0.2, period: 13.6 };
/** One stretch of music: the theme's period played this many times, then this many seconds of quiet. */
export interface Phrase { cycles: number; rest: number }
/**
 * A period of under fourteen seconds that never stops wears thin within minutes, so the music plays in phrases: a few cycles of one
 * theme, a fade, a rest, then the next theme. The map rests longer than a battle, and the pattern is not as long as the list of
 * themes, so a theme does not always come with the same length and rest.
 */
const PACING: Record<Track, Phrase[]> = {
 map: [{ cycles: 4, rest: 40 }, { cycles: 3, rest: 60 }, { cycles: 4, rest: 50 }],
 battle: [{ cycles: 5, rest: 15 }, { cycles: 4, rest: 25 }, { cycles: 4, rest: 20 }],
 boss: [{ cycles: 5, rest: 12 }, { cycles: 4, rest: 18 }, { cycles: 4, rest: 15 }],
};
/** The n-th phrase of a scene, counted from 0. */
export function phrase(track: Track, n: number): Phrase { const list = PACING[track]; return list[n % list.length]; }
/** The theme of a scene's n-th phrase; `first` is the place in the list where this session began. */
export function theme(track: Track, n: number, first = 0): string { const list = THEMES[track]; return list[(first + n) % list.length]; }
/** The scene whose music fits the table. */
export function scene(state: Pick<GameView, 'phase' | 'battle'>): Track { return state.phase !== 'combat' ? 'map' : state.battle?.boss ? 'boss' : 'battle'; }
/** Seconds a phrase takes to fade in and to fade out; a theme pushed aside by another scene fades in CROSSFADE. */
export const FADE_IN = 1.5, FADE_OUT = 4, CROSSFADE = 1.2;

export interface SoundSettings { muted: boolean; music: number; effects: number; voices: boolean }
const KEY = 'lordaeron-audio-v1', DEFAULTS: SoundSettings = { muted: false, music: 0.35, effects: 0.8, voices: true };
function loadSettings(): SoundSettings {
 try { const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null'); return saved && typeof saved === 'object' ? { ...DEFAULTS, ...saved } : DEFAULTS; } catch { return DEFAULTS; }
}
const src = (kind: 'themes' | 'sfx' | 'voice', name: string) => `/assets/audio/${kind}/${name}.mp3`;
/** The effects heard many times in one fight are set a little under the rest. */
const SFX_LEVEL: Partial<Record<Sfx, number>> = { hit: 0.9, block: 0.9, hurt: 0.9, roar: 0.6, slain: 0.75, spell: 0.7 };
/** A voice line asked for while another is spoken waits for it up to this long (ms); a longer wait and it is left unsaid. */
export const VOICE_WAIT = 2600;
/** And they are played a little higher or lower from one time to the next, so that three blows are not one sound three times. */
const SFX_TUNES: Partial<Record<Sfx, number[]>> = { hit: [1, 0.93, 1.07], block: [1, 1.06, 0.95], hurt: [1, 0.95, 1.05], roar: [1, 0.9, 1.08], slain: [1, 0.94] };

/** Plays everything through Web Audio, once the browser allows sound (after the first click or key press). Without Web Audio it stays silent. */
export class AudioDirector {
 settings = loadSettings();
 private ctx?: AudioContext;
 private buses?: Record<'music' | 'sfx' | 'voice', GainNode>;
 private buffers = new Map<string, Promise<AudioBuffer | undefined>>();
 private track?: { name: Track; source: AudioBufferSourceNode; gain: GainNode; rest: number };
 private wanted?: Track;
 /** How many phrases each scene has begun, until when (performance.now) each one rests, and with which theme this session began. */
 private phrases: Record<Track, number> = { map: 0, battle: 0, boss: 0 };
 private restUntil: Record<Track, number> = { map: 0, battle: 0, boss: 0 };
 private first: Record<Track, number>;
 private timer?: ReturnType<typeof setTimeout>;
 private voiceUntil = 0;
 /** The voice lines asked for, said in the order they were asked. */
 private speech: Promise<void> = Promise.resolve();
 private recent = new Map<string, number>();
 private listeners = new Set<() => void>();
 /** The next recording of each voice cue, and how many times each tuned effect has played. */
 private turn = new Map<Voice, number>();
 private tuned = new Map<string, number>();
 private random: () => number;

 /**
  * `random` picks the theme each session starts with on the map and in battle (a boss fight always opens with the boss theme)
  * and the recording each voice cue starts with.
  */
 constructor(random: () => number = Math.random) {
  this.random = random;
  const pick = (track: Track) => Math.floor(random() * THEMES[track].length) % THEMES[track].length;
  this.first = { map: pick('map'), battle: pick('battle'), boss: 0 };
 }

 /** The recording of a cue that plays now. A cue begins with one of its recordings by chance and then takes them in turn, so no line is heard twice running. */
 take(voice: Voice): string {
  const count = VOICES[voice], n = this.turn.get(voice) ?? Math.floor(this.random() * count) % count;
  this.turn.set(voice, (n + 1) % count);
  return recording(voice, n);
 }

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

 /**
  * Plays an effect or a voice, `delay` seconds from now; the same sound is not repeated within 0.35 s. A voice cue plays the
  * next of its recordings, and voice lines are said one after another (see `say`).
  */
 async play(kind: 'sfx' | 'voice', name: string, delay = 0) {
  if (!this.ready() || (kind === 'voice' && !this.settings.voices)) return;
  const now = performance.now(), key = `${kind}:${name}`;
  if ((this.recent.get(key) ?? -1e9) > now - 350) return;
  this.recent.set(key, now);
  if (kind === 'voice') { this.speech = this.speech.then(() => this.say(name, delay)).catch(() => {}); return this.speech; }
  const buffer = await this.load(src(kind, name));
  if (!buffer || !this.ctx || !this.buses) return;
  const source = this.ctx.createBufferSource(), level = SFX_LEVEL[name as Sfx] ?? 1, tunes = SFX_TUNES[name as Sfx];
  source.buffer = buffer;
  if (tunes) { const n = this.tuned.get(name) ?? 0; this.tuned.set(name, n + 1); source.playbackRate.value = tunes[n % tunes.length]; }
  if (level === 1) source.connect(this.buses[kind]);
  else { const gain = this.ctx.createGain(); gain.gain.value = level; source.connect(gain); gain.connect(this.buses[kind]); }
  source.start(this.ctx.currentTime + delay);
 }

 /**
  * Says one voice line. Lines never talk over each other: a line asked for while another is spoken waits until it has ended,
  * if that is within VOICE_WAIT, and is left unsaid otherwise. (Until 12. 11. 2026 the second line was always dropped: the
  * victory in a fight swallowed the "Quest complete" that followed it.)
  */
 private async say(name: string, delay: number) {
  const pending = Math.max(0, this.voiceUntil - performance.now());
  if (pending > VOICE_WAIT) return;
  const buffer = await this.load(src('voice', name in VOICES ? this.take(name as Voice) : name));
  if (!buffer || !this.ctx || !this.buses || !this.ready() || !this.settings.voices) return;
  const wait = Math.max(delay, Math.max(0, this.voiceUntil - performance.now()) / 1000);
  this.voiceUntil = performance.now() + (wait + buffer.duration) * 1000 + 150;
  const source = this.ctx.createBufferSource();
  source.buffer = buffer; source.connect(this.buses.voice); source.start(this.ctx.currentTime + wait);
 }

 /** A short sound made on the spot for a moment that has no recording (stingers.ts); not repeated within a quarter of a second. */
 stinger(name: Stinger, delay = 0) {
  if (!this.ready() || !this.ctx || !this.buses) return;
  const now = performance.now(), key = `stinger:${name}`;
  if ((this.recent.get(key) ?? -1e9) > now - 250) return;
  this.recent.set(key, now);
  try { STINGERS[name](this.ctx, this.buses.sfx, this.ctx.currentTime + 0.01 + delay); } catch { /* a browser without these nodes stays silent */ }
 }

 /** Everything one cue asks for: its sound made in the browser, its recorded effect and its voice line. */
 cue({ stinger, sfx, voice, delay = 0 }: Sound) {
  if (stinger) this.stinger(stinger, delay);
  if (sfx) void this.play('sfx', sfx, delay);
  if (voice) void this.play('voice', voice, delay);
 }

 /**
  * Keeps the scene's music on its schedule: a phrase of a few cycles of one theme, a fade, a rest, the next theme. The other scene's
  * music fades out and starts its rest. A battle's music begins with the battle, and a boss fight opens with the boss theme; the
  * map's music waits out its rest. `now` skips the rest.
  */
 async music(name: Track, now = false) {
  const entering = this.wanted !== name;
  if (now || name !== 'map' && entering) this.restUntil[name] = 0;
  if (name === 'boss' && entering) this.phrases.boss = 0;
  this.wanted = name;
  clearTimeout(this.timer);
  if (!this.ready() || this.settings.music <= 0 || this.track?.name === name) return;
  const wait = this.restUntil[name] - performance.now();
  if (wait > 0) {
   this.stopMusic(CROSSFADE, true);
   this.timer = setTimeout(() => { if (this.wanted === name) void this.music(name); }, wait);
   return;
  }
  const n = this.phrases[name], buffer = await this.load(src('themes', theme(name, n, this.first[name])));
  if (!this.ctx || !this.buses || this.wanted !== name || this.track?.name === name || this.phrases[name] !== n || !this.ready()) return;
  this.phrases[name] = n + 1;
  // A theme that cannot be loaded gives its turn to the next one at the next call.
  if (!buffer) return;
  this.stopMusic(CROSSFADE, true);
  const { cycles, rest } = phrase(name, n), play = LOOP.period * cycles;
  const gain = this.ctx.createGain(), source = this.ctx.createBufferSource(), t = this.ctx.currentTime;
  gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(1, t + FADE_IN);
  gain.gain.setValueAtTime(1, t + play - FADE_OUT); gain.gain.linearRampToValueAtTime(0, t + play);
  gain.connect(this.buses.music);
  source.buffer = buffer; source.loop = true; source.loopStart = LOOP.lead; source.loopEnd = LOOP.lead + LOOP.period;
  source.connect(gain); source.start(t, LOOP.lead); source.stop(t + play + 0.05);
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
 silence() { this.wanted = undefined; clearTimeout(this.timer); this.stopMusic(); this.restUntil = { map: 0, battle: 0, boss: 0 }; this.phrases = { map: 0, battle: 0, boss: 0 }; }
}

export const audio = new AudioDirector();

/**
 * The map's themes on the table, the battle themes in combat, the boss theme against the Overlord, and the cues of each change of
 * the game state. With `staged`, the cues that belong to a step the stage announces (an Event card, a new quest, the next turn…)
 * are left to the stage, which plays them when that step is shown.
 */
export function useGameAudio(p: ContentPack, state: GameView | undefined, staged = false) {
 const previous = useRef<GameView | undefined>(undefined);
 useEffect(() => {
  const unlock = () => audio.unlock(), visibility = () => audio.suspend(document.hidden);
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', visibility);
  return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); document.removeEventListener('visibilitychange', visibility); };
 }, []);
 useEffect(() => {
  if (!state) { audio.silence(); previous.current = undefined; return; }
  // Inside a combat the stage is silent, so the combat's own changes keep all their cues.
  const within = previous.current?.phase === 'combat' && state.phase === 'combat';
  const { sfx, voice } = pick(cues(p, previous.current, state).filter(cue => !staged || within || !cue.voice || !STAGED_VOICES.includes(cue.voice)));
  previous.current = state;
  if (sfx) void audio.play('sfx', sfx);
  if (voice) void audio.play('voice', voice);
  void audio.music(scene(state));
 }, [p, state, staged]);
}

/**
 * The sounds of a combat, in step with its staging: each exchange at the moments combatSounds names, and the outcome once the
 * last exchange has been shown.
 */
export function useCombatAudio(p: ContentPack, state: GameView | undefined, presentation: CombatPresentation) {
 const played = useRef(''), announced = useRef(false), latest = useRef(state);
 latest.current = state;
 const cue = presentation.cue, over = state?.battle?.stage === 'over';
 useEffect(() => {
  if (!cue) return;
  const moment = `${cue.key}:${presentation.phase}`;
  if (played.current === moment) return;
  played.current = moment;
  for (const sound of combatSounds(p, cue, presentation.phase)) audio.cue(sound);
 }, [p, cue, presentation.phase]);
 useEffect(() => {
  if (!over) { announced.current = false; return; }
  if (presentation.busy || announced.current) return;
  // The staging of the exchange that ended the fight starts a moment after the state changes; the wait lets it begin first.
  const timer = setTimeout(() => { announced.current = true; if (latest.current) for (const sound of battleOutcome(p, latest.current)) audio.cue(sound); }, 160);
  return () => clearTimeout(timer);
 }, [p, over, presentation.busy]);
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
  <label className="setting-row"><input type="checkbox" checked={s.voices} onChange={e => { audio.unlock(); audio.update({ voices: e.target.checked }); }} />Voice lines (battle cries, turns, quests, Event cards, the Overlord, the merchant)</label>
  <p className="sound-credit">The music comes and goes: a theme plays for about a minute, then rests, and another follows. Music, voices and the recorded effects made with Fish Audio; the short sounds of steps, bells and counters are made in your browser.</p>
 </section>;
}
