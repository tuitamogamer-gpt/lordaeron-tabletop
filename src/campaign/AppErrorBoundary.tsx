import { Component, type ErrorInfo, type ReactNode } from 'react';
import { SAVE_KEY } from './saves';

const RELOAD_KEY = 'lordaeron-update-reload';

/** A code chunk from an earlier deployment is gone from the server, so a lazy import or its preload failed. */
export const staleChunk = (error: unknown) => /dynamically imported module|Importing a module script failed|Unable to preload|Loading (CSS )?chunk/i.test(error instanceof Error ? error.message : String(error));

/**
 * Reloads once to pick up the new deployment. The autosave restores the campaign, so nothing is lost.
 * A second failure within a minute is a real problem and is shown instead of reloading in a loop.
 */
export function reloadForUpdate(now = Date.now()) {
 try {
  if (now - Number(sessionStorage.getItem(RELOAD_KEY) ?? 0) < 60_000) return false;
  sessionStorage.setItem(RELOAD_KEY, String(now));
 } catch { return false; }
 location.reload();
 return true;
}

function downloadAutosave() {
 let raw: string | null = null;
 try { raw = localStorage.getItem(SAVE_KEY); } catch { /* Storage is blocked; the button explains below. */ }
 if (!raw) return false;
 const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' })), a = document.createElement('a');
 a.href = url; a.download = 'lordaeron-autosave.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
 return true;
}

/** Keeps a rendering failure from leaving a blank page: the player can reload or take the autosave with them. */
export default class AppErrorBoundary extends Component<{ children: ReactNode }, { error?: Error; noSave?: boolean }> {
 state: { error?: Error; noSave?: boolean } = {};
 static getDerivedStateFromError(error: Error) { return { error }; }
 componentDidCatch(error: Error, info: ErrorInfo) {
  console.error(error, info.componentStack);
  if (staleChunk(error)) reloadForUpdate();
 }
 render() {
  const { error, noSave } = this.state;
  if (!error) return this.props.children;
  const update = staleChunk(error);
  return <div className="app-crash">
   <section className="app-crash-panel" role="alert" aria-labelledby="app-crash-title">
    <span className="sheet-eyebrow">{update ? 'A new version is available' : 'Something went wrong'}</span>
    <h1 id="app-crash-title">{update ? 'The game was updated' : 'The table could not be drawn'}</h1>
    <p>{update ? 'Reload to continue with the latest version.' : 'This is a fault in the game, not in your campaign.'} Your campaign is saved after every move, so reloading continues where you left off.</p>
    <div className="app-crash-actions">
     <button className="gold-button" onClick={() => location.reload()}>Reload the game</button>
     <button className="quiet-button" onClick={() => { if (!downloadAutosave()) this.setState({ noSave: true }); }}>Download the autosave</button>
    </div>
    {noSave && <p className="app-crash-note">No autosave was found in this browser.</p>}
    <details><summary>Error details</summary><pre>{error.message}</pre></details>
   </section>
  </div>;
 }
}
