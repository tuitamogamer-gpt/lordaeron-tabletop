import { AbilityArt, type PaintedIcon } from './Art';

const interfaceIcons = ['health', 'energy', 'gold', 'experience', 'actions', 'characters', 'quests', 'bag', 'encounters'] as const;
export type GameIconName = typeof interfaceIcons[number] | PaintedIcon;

/** Painted game symbols are decorative; their adjacent labels carry the meaning. */
export function GameIcon({ name, size = 26, className = '' }: { name: GameIconName; size?: number; className?: string }) {
  return <span className={`game-icon game-icon-${name} ${className}`} style={{ width: size, height: size }} aria-hidden="true">
    {(interfaceIcons as readonly string[]).includes(name)
      ? <img src={`/assets/ui-icons/${name}.webp`} width={96} height={96} alt="" draggable={false} />
      : <AbilityArt icon={name as PaintedIcon} />}
  </span>;
}
