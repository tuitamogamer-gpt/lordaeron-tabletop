import { BASE_PACK as pack, DEFAULT_SETUP } from '../data/base';
import { createGame } from '../rules/game';
import { importSession, newSession, OWN_SAVE, resumeSession, type Session } from '../rules/session';
import type { State } from '../rules/model';
import { BUILD } from '../build';

export const SAVE_KEY = 'lordaeron-base-save-v7';
export const PREVIOUS_SAVE_KEY = `${SAVE_KEY}-before-new`;
export const RECOVERY_SAVE_KEY = `${SAVE_KEY}-recovery`;
export const BOTS_KEY = 'lordaeron-base-bots-v3';
export const SNAPSHOT_KEY = `${SAVE_KEY}-state`;

/**
 * A snapshot belongs to one build: another build may compute a different state from the same moves, so it replays.
 * The build is the commit plus the name of the bundle this code was built into, which changes with its content, so a
 * local build of uncommitted changes is a build of its own. The development server and the tests always replay.
 */
export function snapshotBuild() {
 const dev = (import.meta as { env?: { DEV?: boolean } }).env?.DEV;
 if (dev || BUILD.commit === 'dev' || BUILD.commit === 'local') return '';
 let bundle = ''; try { bundle = new URL(import.meta.url).pathname.split('/').pop() ?? ''; } catch { /* No bundle name outside a browser build. */ }
 return `${BUILD.commit}/${bundle}`;
}
const fingerprint = (text: string, end: number) => { let hash = 2166136261; for (let i = 0; i < end; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); } return hash >>> 0; };
type Snapshot = { build: string; count: number; head: number; hash: number; state: State };

/**
 * Stores the state that follows the saved moves, next to the autosave. Opening a long campaign then resumes from
 * it; without it every move is replayed before the first screen appears (seconds for a few thousand moves).
 * `json` is the autosave text of the same game. The snapshot never costs the save: it is dropped if it does not fit.
 */
export function writeSnapshot(game: { state: State; session: Session }, json: string, build = snapshotBuild()) {
 if (!build) return;
 try {
  // The fingerprint covers the header and every move up to here, so the snapshot only matches a save that starts the same way.
  const head = json.length - 2, snapshot: Snapshot = { build, count: game.session.commands.length, head, hash: fingerprint(json, head), state: game.state };
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
 } catch { dropSnapshot(); }
}
export function dropSnapshot() { try { localStorage.removeItem(SNAPSHOT_KEY); } catch { /* Nothing to remove. */ } }
function resumeFromSnapshot(raw: string, build: string) {
 const text = build ? localStorage.getItem(SNAPSHOT_KEY) : null;
 if (!text) return undefined;
 const snapshot = JSON.parse(text) as Partial<Snapshot>;
 if (snapshot.build !== build || typeof snapshot.count !== 'number' || typeof snapshot.head !== 'number' || !snapshot.state) return undefined;
 if (snapshot.head < 1 || snapshot.head > raw.length - 2 || fingerprint(raw, snapshot.head) !== snapshot.hash) return undefined;
 return resumeSession(pack, raw, { state: snapshot.state, count: snapshot.count });
}

export function readSave(key: string) {
 try { return localStorage.getItem(key); } catch { return null; }
}

export function recoverySave() {
 try {
  const current = localStorage.getItem(RECOVERY_SAVE_KEY);
  if (current) return current;
  // Older releases archived failed imports under timestamped keys.
  const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)!)
   .filter(key => key.startsWith(`${RECOVERY_SAVE_KEY}-`)).sort().reverse();
  return keys.length ? localStorage.getItem(keys[0]) : null;
 } catch { return null; }
}

type LoadedCampaign = ReturnType<typeof importSession> & {
 needsSetup?: boolean;
 unreadableSave?: string;
 storageUnavailable?: boolean;
};

export function loadCampaign(build = snapshotBuild()): LoadedCampaign {
 let unreadableSave: string | undefined, storageUnavailable = false;
 try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
   // A snapshot that does not match this save or this build is ignored, and the moves are replayed as before.
   try { const resumed = resumeFromSnapshot(raw, build); if (resumed) return resumed; } catch { dropSnapshot(); }
   try { return importSession(pack, raw, OWN_SAVE); }
   catch { unreadableSave = raw; }
  }
 } catch { storageUnavailable = true; }
 return {
  state: createGame(pack, DEFAULT_SETUP), session: newSession(pack, DEFAULT_SETUP),
  needsSetup: true, unreadableSave, storageUnavailable,
 };
}

export function loadBots(roster: string[]) {
 try {
  const saved: unknown = JSON.parse(localStorage.getItem(BOTS_KEY) ?? 'null');
  if (Array.isArray(saved)) return [...new Set(saved.filter((id): id is string => typeof id === 'string' && roster.includes(id)))];
 } catch { /* Use the campaign's actual roster when the preference cannot be read. */ }
 return roster.slice(1);
}
