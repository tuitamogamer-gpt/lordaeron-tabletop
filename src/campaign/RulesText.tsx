import { Fragment } from 'react';
import type { Color } from '../rules/model';
import { glyphFaces } from './dice-geometry';

/** Only explicit dice phrases are illustrated; blue creatures and card names stay text. */
const dicePhrase = /\b(?:(?:red|blue|green)(?:\s*(?:\/|,|or|and)\s*(?:red|blue|green))*|any color)\s+(?:dice|die)\b/gi;
const colors = /\b(red|blue|green)\b/gi;

function DieGlyph({ color }: { color?: Color }) {
 return <svg className={`rule-die ${color ?? 'any'}`} viewBox="0 0 72 76" aria-hidden="true" focusable="false" data-die-color={color ?? 'any'}>
  {glyphFaces.map(face => <g key={face.value}>
   <polygon className={`die-facet${face.value === 8 ? ' die-top' : ''}`} points={face.points} style={{ fill: face.fill(color) }} />
   {face.value === 8 && <path className="die-numeral" transform={face.plane} d="M24 17C17 17 17 25 24 25C31 25 31 17 24 17ZM24 25C16 25 16 34 24 34C32 34 32 25 24 25Z" />}
  </g>)}
 </svg>;
}

function DicePhrase({ text }: { text: string }) {
 const matches = [...text.matchAll(colors)];
 return <span className="rules-dice" role="img" aria-label={text} title={text}>
  {matches.length ? matches.map((match, i) => <Fragment key={i}>
   {i > 0 && <span className="dice-conjunction" aria-hidden="true">{text.slice(matches[i - 1].index! + matches[i - 1][0].length, match.index)}</span>}
   <DieGlyph color={match[0].toLowerCase() as Color} />
  </Fragment>) : <DieGlyph />}<span className="dice-word" aria-hidden="true">{/\bdie$/i.test(text)?'die':'dice'}</span>
 </span>;
}

/** Keeps authoritative quantities, thresholds and timing as text alongside accessible D8 symbols. */
export default function RulesText({ children: text }: { children: string }) {
 const matches = [...text.matchAll(dicePhrase)];
 if (!matches.length) return <>{text}</>;
 let end = 0;
 return <>{matches.map((match, i) => {
  const before = text.slice(end, match.index);
  end = match.index! + match[0].length;
  return <Fragment key={i}>{before}<DicePhrase text={match[0]} /></Fragment>;
 })}{text.slice(end)}</>;
}
