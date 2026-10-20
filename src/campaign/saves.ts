import { BASE_PACK as pack, DEFAULT_SETUP } from '../data/base';
import { createGame } from '../rules/game';
import { importSession, newSession } from '../rules/session';

export const SAVE_KEY = 'lordaeron-base-save-v7';
export const PREVIOUS_SAVE_KEY = `${SAVE_KEY}-before-new`;
export const RECOVERY_SAVE_KEY = `${SAVE_KEY}-recovery`;
export const BOTS_KEY = 'lordaeron-base-bots-v3';

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

export function loadCampaign(): LoadedCampaign {
 let unreadableSave: string | undefined, storageUnavailable = false;
 try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
   try { return importSession(pack, raw); }
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
