import type { Card } from '../rules/model';
import illustrations from '../data/card-art.json';
import generatedIllustrations from '../data/generated-card-art.json';
const cardArt:Record<string,string>={...illustrations,...generatedIllustrations};

const abilityIcons = {
  melee: 0, arcane: 1, armor: 2, warrior: 3,
  mage: 4, paladin: 5, druid: 6, shaman: 7,
  hunter: 8, rogue: 9, warlock: 10, priest: 11,
  travel: 12, rest: 13, train: 14, town: 15,
} as const;
export type PaintedIcon = keyof typeof abilityIcons;

export const creatureIcons: Record<string, number> = {
  murloc: 0, gnoll: 1, ghoul: 2, crusader: 3,
  naga: 4, spider: 5, worgen: 6, wildkin: 7,
  ogre: 8, wraith: 9, doomguard: 10, drake: 11,
  infernal: 12, overlord: 13, event: 14, treasure: 15,
};

/** Clip the atlas in SVG so portraits retain their proportions in any card shape. */
export function PaintedArt({index, atlas='abilities', name, className=''}: {
  index: number; atlas?: 'abilities' | 'bestiary'; name?: string; className?: string;
}) {
  return <svg className={`painted-art ${className}`} viewBox={`${index % 4 * 100} ${Math.floor(index / 4) * 100} 100 100`}
    preserveAspectRatio="xMidYMid slice" role={name ? 'img' : undefined} aria-label={name} aria-hidden={name ? undefined : true}>
    <image href={`/assets/warcraft/${atlas}.webp`} width="400" height="400"/>
  </svg>;
}

export function AbilityArt({icon, className=''}: {icon: PaintedIcon; className?: string}) {
  return <PaintedArt index={abilityIcons[icon]} className={`ability-art ${className}`}/>;
}

export function CardArt({card,className=''}:{card:Card;className?:string}) {
 const src=cardArt[card.id];
 return src?<img className={`painted-art ability-art card-illustration ${className}`} src={src} alt="" loading="lazy" width="192" height="192"/>:<AbilityArt icon={cardIllustration(card)} className={className}/>;
}

export function EventArt({script='horizons'}:{script?:string}) {return <img className="painted-art event-illustration" src={`/assets/event-art/${script}.webp`} alt="" loading="lazy" width="256" height="256"/>;}

export function FactionCrest({faction, className=''}: {faction: string; className?: string}) {
  return <span aria-hidden="true" className={`faction-crest ${faction} ${className}`}/>;
}

/** The artwork is decorative; references and counts are drawn as live text. */
export function BoardTokenArt({index,x=0,y=0,width=32,height=32}: {index:number;x?:number;y?:number;width?:number;height?:number}) {
  return <svg className="board-token-art" x={x} y={y} width={width} height={height} viewBox={`${index%3*100} ${Math.floor(index/3)*100} 100 100`} preserveAspectRatio="none" aria-hidden="true" pointerEvents="none">
    <image href="/assets/warcraft/board-tokens-v2.webp" width="300" height="200"/>
  </svg>;
}

export function cardIllustration(card: Card): PaintedIcon {
  if (card.classId && card.classId in abilityIcons) return card.classId as PaintedIcon;
  if (card.type === 'armor') return 'armor';
  if (card.type === 'melee') return 'melee';
  if (card.type === 'ranged') return 'hunter';
  if (card.type === 'bag') return 'druid';
  if (card.kind === 'talent') return 'train';
  return 'arcane';
}
