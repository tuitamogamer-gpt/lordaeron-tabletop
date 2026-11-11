import { BUILD } from '../build';
import { RULES_REVISION } from '../rules/common';
import { hasScans, SCANS } from './scan-assets';

/** Which build this is, which rules revision the open campaign uses and whether the printed game's scans are part of it. */
export default function BuildStamp({ rules }: { rules?: number } = {}) {
 const count = (group: Record<string, unknown>, noun: string) => { const n = Object.keys(group).length; return `${n} ${noun}${n === 1 ? '' : 's'}`; };
 return <p className="build-stamp" role="note">
  <span>Build <b>{BUILD.commit}</b>{BUILD.date && ` · ${BUILD.date}`}</span>{' '}
  {rules !== undefined && <span>{rules >= RULES_REVISION ? `Rules: 2005 rulebook, corrected to revision ${RULES_REVISION}.` : `Rules: this campaign began under revision ${rules} of the rules and keeps it. A new campaign uses revision ${RULES_REVISION}.`}</span>}{' '}
  <span>{hasScans ? `Real scans in use: ${count(SCANS.cards, 'card face')}, ${count(SCANS.counters, 'character counter')}, ${count(SCANS.portraits, 'painted portrait')}` : 'Illustrated faces only (no scans installed)'}</span>
 </p>;
}
