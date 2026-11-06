import { BUILD } from '../build';
import { hasScans, SCANS } from './scan-assets';

/** Which build this is and whether the printed game's scans are part of it, so that "is this the latest?" is answered at a glance. */
export default function BuildStamp() {
 const count = (group: Record<string, unknown>, noun: string) => { const n = Object.keys(group).length; return `${n} ${noun}${n === 1 ? '' : 's'}`; };
 return <p className="build-stamp" role="note">
  <span>Build <b>{BUILD.commit}</b>{BUILD.date && ` · ${BUILD.date}`}</span>{' '}
  <span>{hasScans ? `Real scans in use: ${count(SCANS.cards, 'card face')}, ${count(SCANS.counters, 'character counter')}, ${count(SCANS.portraits, 'painted portrait')}` : 'Illustrated faces only (no scans installed)'}</span>
 </p>;
}
