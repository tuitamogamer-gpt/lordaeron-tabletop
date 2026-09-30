import { Fragment } from 'react';
import type { Color } from '../rules/model';

/** Only explicit dice phrases are illustrated; blue creatures and card names stay text. */
const dicePhrase = /\b(?:(?:red|blue|green)(?:\s*(?:\/|,|or|and)\s*(?:red|blue|green))*|any color)\s+(?:dice|die)\b/gi;
const colors = /\b(red|blue|green)\b/gi;

function DieGlyph({ color }: { color?: Color }) {
 if(color)return <svg className={`rule-die ${color}`} viewBox="0 0 36 36" aria-hidden="true" focusable="false" data-die-color={color}><image href={`/assets/ability-ui/d8-${color}.webp`} width="36" height="36"/></svg>;
 return <svg className={`rule-die ${color ?? 'any'}`} viewBox="0 0 32 36" aria-hidden="true" focusable="false" data-die-color={color ?? 'any'}>
  <path className="die-silhouette" d="M16 1.5 30 10v16L16 34.5 2 26V10Z" />
  <path className="die-top" d="M16 1.5 30 10 16 13 2 10Z" />
  <path className="die-left" d="M2 10 16 13 8 25 2 26Z" />
  <path className="die-right" d="M30 10 30 26 24 25 16 13Z" />
  <path className="die-bottom" d="M2 26 8 25 16 13 24 25 30 26 16 34.5Z" />
  <path className="die-face" d="M16 13 24 25H8Z" />
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
