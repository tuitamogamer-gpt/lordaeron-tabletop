import type { ReactNode } from 'react';
import type { Card, Creature, EventCard, Overlord, Quest } from '../rules/model';
import { BASE_PACK as p } from '../data/base';
import { PaintedArt, creatureIcons } from './Art';
import RasterCard from './RasterCard';
export { triggerLabels, creatureRules } from './card-labels';
/** Presentation never reads an imported scan. A scan can supply verified content, not layout. */
export const DESIGN = {
 name:'Lordaeron · Warforged Chronicles',
 colors:{ink:'#101316',surface:'#252729',ivory:'#f4e4bf',gold:'#e2b969',horde:'#df6654',alliance:'#77bce8',energy:'#69bdf1',nature:'#a9cb6a',arcane:'#c79ef0'},
} as const;
const glyphPaths:Record<string,string[]>={
 murloc:['M27 66 Q10 48 30 30 L33 15 L45 27 L61 20 L60 33 Q83 48 66 68 L47 83Z','M24 45 L10 36 L14 61 L28 58 M68 40 L84 27 L81 62 L70 57','M36 44h1 M58 43h1 M35 62Q48 71 62 59'],
 gnoll:['M23 28L19 12L37 25L50 20L65 23L80 11L73 35L71 64L50 85L28 66Z','M28 41L42 47 M69 39L55 47 M41 57L59 57L52 70L46 70Z','M28 66L21 82 M70 66L79 81'],
 ghoul:['M26 43Q23 18 49 17Q79 18 73 49L68 77L32 79Z','M34 45L42 49L33 53Z M66 44L57 48L67 52Z','M39 65L62 63 M43 62V74 M53 61V74 M61 63V70'],
 crusader:['M23 29L50 12L78 29L73 72L50 86L27 71Z','M50 21V78 M25 46L75 46','M36 33H43 M57 33H64'],
 naga:['M38 15Q61 10 64 30L57 44Q78 57 64 72Q49 88 25 77Q55 78 54 64L34 48Z','M36 32L22 19L25 52L35 47 M62 26L77 18L72 49L59 42','M42 29H45 M55 27H58'],
 spider:['M50 22Q70 22 67 44L58 65L43 65L33 44Q30 23 50 22Z','M33 35L16 22L8 32 M34 44L13 39L5 52 M39 55L17 57L11 75 M44 64L29 77L30 91','M67 35L84 22L92 32 M66 44L87 39L95 52 M61 55L83 57L89 75 M56 64L71 77L70 91','M42 36H44 M55 36H57'],
 worgen:['M25 34L19 10L39 27L53 22L71 9L71 39L83 55L63 79L41 85L23 60Z','M31 42L43 47 M63 42L53 47 M38 63L55 71L72 57','M47 63L50 72 M61 61L58 72'],
 wildkin:['M22 24L37 32L50 17L65 33L81 23L72 61L61 81L36 81L24 64Z','M28 44Q35 32 45 45Q37 59 28 44Z M56 44Q65 31 73 43Q65 58 56 44Z','M43 53L50 65L57 53 M33 69L40 73 M61 71L68 65'],
 ogre:['M24 32Q19 9 37 16L49 22L60 14Q80 9 78 33L79 58L66 80L35 85L20 67Z','M28 41L42 43 M59 42L72 37 M30 64Q52 78 73 60','M36 64L37 55L42 67 M64 66L64 55L58 69'],
 wraith:['M18 77L29 41Q26 16 49 14Q74 16 73 42L85 85L65 76L53 88L39 78Z','M33 35Q50 27 66 36L61 56L49 65L38 55Z','M39 44H43 M55 44H59'],
 doomguard:['M31 26L17 8L16 30L29 40L26 69L47 85L71 67L69 39L82 28L84 8L65 25Z','M34 41L44 46 M63 41L54 46 M37 66L60 65 M40 61L44 71 M57 59L54 70','M28 50L7 39L12 79L28 68 M71 50L91 39L86 79L71 68'],
 drake:['M20 77L31 55L25 29L43 41L57 27L57 10L69 24L80 20L72 39L90 51L69 60L53 53L43 75Z','M33 51L13 34L10 59L21 58 M45 48L40 21L26 17','M63 38H66 M70 49L80 49 M70 50L71 56'],
 infernal:['M35 34L30 14L46 25L60 9L69 28L78 41L70 59L76 82L50 90L25 81L31 58L19 40Z','M34 43L45 49L36 54 M64 42L55 49L65 54 M39 70L61 69','M41 58L51 53L59 58L51 65Z'],
};
export function CreatureGlyph({type,name,className=''}:{type:string;name?:string;className?:string}) {
 if (type in creatureIcons) return <PaintedArt index={creatureIcons[type]} atlas="bestiary" name={name??type} className={`creature-glyph ${className}`}/>;
 return <svg viewBox="0 0 100 100" className={`creature-glyph ${className}`} role="img" aria-label={name??type}><circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="40"/>{(glyphPaths[type]??glyphPaths.doomguard).map((d,i)=><path key={i} d={d} className={i===0?'glyph-body':''}/>)}</svg>;
}
export function CreatureCard({creature:c}:{creature:Creature}) {
 return <RasterCard id={`creature-${c.id}`} title={c.name}/>;
}
export function QuestCard({quest:q,onClick}:{quest:Quest;onClick?:()=>void}) {
 return <RasterCard id={q.id} title={q.name} onClick={onClick}/>;
}
export function EventCardView({event:e}:{event:EventCard}) {
 return <RasterCard id={e.id} title={e.name}/>;
}
export function OverlordCard({overlord:o,count=6}:{overlord:Overlord;count?:4|6}) {
 return <RasterCard id={`overlord-${o.id}-${count}`} title={o.name}/>;
}
export function BossPortrait({id}:{id:string}){return <span className="boss-portrait" role="img" aria-label={p.overlords.find(o=>o.id===id)?.name??id} style={{backgroundImage:`url(/assets/portraits/${id}.webp)`,backgroundSize:'cover',backgroundPosition:'center 30%'}}/>;}
export function AbilityCard({card:c,onClick,disabled,selected}:{card:Card;children?:ReactNode;footer?:string;onClick?:()=>void;disabled?:boolean;selected?:boolean}) {
 return <RasterCard id={c.id} title={c.name} onClick={onClick} disabled={disabled} selected={selected} ability/>;
}
