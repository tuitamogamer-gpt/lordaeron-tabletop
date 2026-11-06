import { AbilityArt, type PaintedIcon } from './Art';
import { SCANS } from './scan-assets';

const interfaceIcons = ['health', 'energy', 'gold', 'experience', 'actions', 'characters', 'quests', 'bag', 'encounters'] as const;
/** Symbols the printed game has a token for: they show the token when the scans are installed. */
const printedTokens = ['health', 'energy', 'gold', 'bag', 'spellbook'];
export type GameIconName = typeof interfaceIcons[number] | 'spellbook' | PaintedIcon;

/** Painted game symbols are decorative; their adjacent labels carry the meaning. */
export function GameIcon({ name, size = 26, className = '' }: { name: GameIconName; size?: number; className?: string }) {
  const token = printedTokens.includes(name) ? SCANS.tokens[name] : undefined;
  if (token) return <span className={`game-icon game-icon-${name} game-icon-token ${className}`} style={{ width: size, height: size }} aria-hidden="true"><img src={token} width={96} height={96} alt="" draggable={false} /></span>;
  return <span className={`game-icon game-icon-${name} ${className}`} style={{ width: size, height: size }} aria-hidden="true">
    {(interfaceIcons as readonly string[]).includes(name)
      ? <img src={`/assets/ui-icons/${name}.webp`} width={96} height={96} alt="" draggable={false} />
      : <AbilityArt icon={(name === 'spellbook' ? 'arcane' : name) as PaintedIcon} />}
  </span>;
}
