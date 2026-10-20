import { Icon } from '../components';

export default function SaveManager({ needsSetup, unavailable, importing, previous, recovered, legacy, exported, onExport, onImport, onDownload, onRestore }: {
 needsSetup: boolean; unavailable: boolean; importing: boolean;
 previous: string | null; recovered: string | null; legacy: string | null; exported: string;
 onExport: () => void; onImport: () => void; onDownload: (raw: string, name: string) => void; onRestore: () => void;
}) {
 return <section className="save-manager" aria-label="Saved games">
  <p className={`save-status ${unavailable ? 'save-status-warning' : ''}`} role="status">
   <Icon name={unavailable ? 'help' : 'check'}/>
   {unavailable ? 'Autosave is unavailable. Export your game before closing this tab.' : needsSetup ? 'Start or import a campaign to save your progress.' : 'Your progress is saved in this browser after every move.'}
  </p>
  <div className="settings-buttons">
   <button className="quiet-button" disabled={needsSetup} onClick={onExport}><Icon name="download"/>Export game</button>
   <button className="quiet-button" disabled={importing} onClick={onImport}><Icon name="upload"/>{importing ? 'Verifying game…' : 'Import game'}</button>
  </div>
  {previous && <div className="save-backup-actions"><p>Your previous campaign is kept when you start or import another game.</p>
   <button className="quiet-button" disabled={importing} onClick={onRestore}><Icon name="reset"/>Restore previous campaign</button>
   <button className="quiet-button" onClick={() => onDownload(previous, 'lordaeron-previous-campaign.json')}>Download previous campaign</button>
  </div>}
  {recovered && <div className="save-recovery-note"><p>A saved game could not be opened. Its original file is preserved so you can download it for recovery.</p>
   <button className="quiet-button" onClick={() => onDownload(recovered, 'lordaeron-recovery.json')}><Icon name="download"/>Download recovery file</button>
  </div>}
  {legacy && <p className="legacy-save-note">Your previous game uses an earlier rules version. It is preserved in a separate save. <button className="quiet-button" onClick={() => onDownload(legacy, 'lordaeron-previous-rules-backup.json')}><Icon name="download"/>Download previous game</button></p>}
  {exported && <label className="save-copy-label">Game backup <small>If the download did not start, copy this text into a .json file.</small><textarea className="save-text" value={exported} readOnly aria-label="Game backup" onFocus={event => event.target.select()}/></label>}
 </section>;
}
