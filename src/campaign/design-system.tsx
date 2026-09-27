import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '../components';
import type { Card, Creature, EventCard, Overlord, Quest } from '../rules/model';
import { BASE_PACK as p } from '../data/base';
import { AbilityArt, PaintedArt, cardIllustration, creatureIcons } from './Art';
import { eventText, overlordText, rewardText } from './event-text';

/** Presentation never reads an imported scan. A scan can supply verified content, not layout. */
export const DESIGN = {
 name:'Lordaeron · Warforged Chronicles',
 colors:{ink:'#101316',surface:'#252729',ivory:'#f4e4bf',gold:'#e2b969',horde:'#df6654',alliance:'#77bce8',energy:'#69bdf1',nature:'#a9cb6a',arcane:'#c79ef0'},
} as const;
export const triggerLabels:Record<string,string>={'round-start':'Početak runde','after-tokens':'Kraj postavljanja pogodaka','energy-spent':'Nakon trošenja energije',rest:'Pri odmoru',learn:'Odabir talenta','turn-start':'Početak smjene','combat-end':'Kraj borbe',pool:'Priprema', 'after-pool':'Poslije bacanja',reroll:'Reroll','after-reroll':'Poslije rerolla',tokens:'Pogoci',defense:'Odbrana',wound:'Prije poraza','round-end':'Kraj runde',action:'Tokom akcije',equip:'Opremanje'};
export function CardFrame({kind,title,subtitle,rank,art,children,footer,accent='gold',onClick,disabled,selected=false}:{kind:string;title:string;subtitle?:string;rank?:string|number;art:ReactNode;children:ReactNode;footer:ReactNode;accent?:string;onClick?:()=>void;disabled?:boolean;selected?:boolean}) {
 const style={'--card-accent':DESIGN.colors[accent as keyof typeof DESIGN.colors]??accent} as CSSProperties;
 const body=<><span className="folio-top"><span>{kind}</span><b>{rank??'◆'}</b></span><span className="folio-art" aria-hidden="true">{art}<i/><i/></span><span className="folio-title"><strong>{title}</strong>{subtitle&&<small>{subtitle}</small>}</span><span className="folio-rules">{children}</span><span className="folio-footer">{footer}</span></>;
 return onClick?<button className={`folio-card ${selected?'selected':''}`} style={style} onClick={onClick} disabled={disabled}>{body}</button>:<article className="folio-card" style={style}>{body}</article>;
}
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
/** Short, localized descriptions of the executable creature rules; source text stays in the data. */
export const creatureRules:Record<Creature['rule'],string>={
 murloc:'Poslije rerolla: izgubi 1 zdravlje za svaku crvenu ili plavu jedinicu.',
 gnoll:'Poslije rerolla: izgubi 1 energiju za svaku crvenu ili plavu jedinicu.',
 ghoul:'Reroll vrijednost je 0. Nezavisna ponovna bacanja iz sposobnosti ostaju dostupna.',
 crusader:'Na kraju razrješenja ukloni 1 pogodak iz polja štete za svakog preživjelog Crusadera.',
 naga:'Poslije rerolla: izgubi 1 zdravlje za svaku crvenu ili plavu kockicu s rezultatom 1 ili 2.',
 spider:'Poslije rerolla: dobiješ 1 Stun za svaku kockicu s rezultatom 1 ili 2. Iscrpljivanje ne daje žetone.',
 worgen:'Na kraju razrješenja ukloni 2 pogotka iz polja štete za svakog preživjelog Worgena.',
 wildkin:'Poslije rerolla: za svaku jedinicu ukloni jednu opremljenu moć. Karte se vraćaju u knjigu moći.',
 ogre:'Poslije rerolla: izgubi 2 zdravlja za svaku crvenu ili plavu kockicu s rezultatom 1 ili 2.',
 wraith:'Poslije rerolla: dobiješ 1 Curse za svaku jedinicu. Iscrpljivanje ne daje žetone.',
 doomguard:'Poslije rerolla: svaka crvena ili plava kockica s rezultatom 1 ili 2 košta 1 zdravlje i uklanja se iz zajedničke zalihe do kraja borbe.',
 drake:'Samo zelene osmice daju oklop. Ostale vrijednosti i dodatni efekti ne daju žetone oklopa.',
 infernal:'Poslije rerolla: svaka crvena ili plava jedinica košta 2 zdravlja i 2 energije. Na kraju razrješenja grupa uklanja 3 pogotka iz polja štete.',
 none:'Nema posebne sposobnosti.',
};
export function CreatureGlyph({type,name,className=''}:{type:string;name?:string;className?:string}) {
 if (type in creatureIcons) return <PaintedArt index={creatureIcons[type]} atlas="bestiary" name={name??type} className={`creature-glyph ${className}`}/>;
 return <svg viewBox="0 0 100 100" className={`creature-glyph ${className}`} role="img" aria-label={name??type}><circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="40"/>{(glyphPaths[type]??glyphPaths.doomguard).map((d,i)=><path key={i} d={d} className={i===0?'glyph-body':''}/>)}</svg>;
}
export function CreatureCard({creature:c}:{creature:Creature}) {
 return <CardFrame kind="STVORENJE" title={c.name} subtitle="Bestijarij Lordaerona" art={<CreatureGlyph type={c.rule}/>} accent={['ghoul','wraith','doomguard'].includes(c.rule)?'arcane':'nature'} footer={<span>Prijetnja / napad / zdravlje</span>}><span className="folio-effect"><b>KONTAKT S NEPRIJATELJEM</b>{creatureRules[c.rule]}</span><span className="folio-stat-row">{(['green','blue','red'] as const).filter(color=>c.stock[color]>0).map(color=><span key={color} className={color}><i/>{c.stats[color].threat}+ / {c.stats[color].attack} / {c.stats[color].health}</span>)}</span></CardFrame>;
}
export function QuestCard({quest:q,onClick}:{quest:Quest;onClick?:()=>void}) {
 return <CardFrame kind="QUEST" title={q.name} subtitle={`${q.faction==='horde'?'Horda':'Alijansa'} · ${q.tier}`} rank={q.level} accent={q.faction} art={<CreatureGlyph type={q.spawns.find(s=>s.color!=='blue')?.creature??'murloc'}/>} onClick={onClick} footer={<span>{rewardText(q.reward)}</span>}><span className="folio-effect"><b>CILJ</b>{q.spawns.filter(s=>s.color!=='blue').map(s=>`${s.count} × ${p.creatures.find(c=>c.id===s.creature)?.name} (${s.color}) · ${p.regions.find(r=>r.id===s.region)?.name}`).join(' / ')}</span><span className="folio-effect"><b>NEZAVISNA STVORENJA</b>{q.spawns.filter(s=>s.color==='blue').map(s=>`${s.count} × ${p.creatures.find(c=>c.id===s.creature)?.name} · ${p.regions.find(r=>r.id===s.region)?.name}`).join(' / ')||'Bez plavih stvorenja.'}</span></CardFrame>;
}
export function EventCardView({event:e}:{event:EventCard}) {
 return <CardFrame kind="DOGAĐAJ" title={e.name} subtitle={e.overlord?'Kel’Thuzad':e.bonus?'Bonus događaj':'Lordaeron'} rank={e.fate} accent="arcane" art={<PaintedArt index={e.boss?13:14} atlas="bestiary"/>} footer={<><span>Sudbina {e.fate}</span><span>{e.bonus?'Povuci još jedan':'Ostaje do razrješenja'}</span></>}><span className="folio-effect">{e.boss&&<b>{e.boss.stats.threat}+ / {e.boss.stats.attack} / {e.boss.stats.health}</b>}{eventText(e)}</span></CardFrame>;
}
export function OverlordCard({overlord:o,count=6}:{overlord:Overlord;count?:4|6}) {
 const s=o.stats[count];return <CardFrame kind="OVERLORD" title={o.name} subtitle={`${count} likova · ${p.regions.find(r=>r.id===o.region)?.name}`} accent="arcane" rank="V" art={<BossPortrait id={o.id}/>} footer={<span>Porazi ga za pobjedu svoje frakcije</span>}><span className="overlord-values"><b>{s.threat}+<small>PRIJETNJA</small></b><b>{s.attack}<small>NAPAD</small></b><b>{s.health}<small>ZDRAVLJE</small></b></span><span className="folio-effect">{overlordText(o)}</span></CardFrame>;
}
export function BossPortrait({id}:{id:string}){return <span className="boss-portrait" role="img" aria-label={p.overlords.find(o=>o.id===id)?.name??id} style={{backgroundPosition:`${['kazzak','nefarian','kelthuzad'].indexOf(id)*50}% 50%`}}/>;}
export function AbilityCard({card:c,children,footer,onClick,disabled,selected}:{card:Card;children:ReactNode;footer?:string;onClick?:()=>void;disabled?:boolean;selected?:boolean}) {
 return <CardFrame kind={c.kind==='talent'?'TALENT':c.kind==='power'?'MOĆ':c.type==='bag'?'POTROŠNI PREDMET':'OPREMA'} title={c.name.replace(/ · probn[oi]( quest)?/g,'')} subtitle={c.classId??c.type} rank={c.level} accent={c.type==='instant'||c.type==='ranged'?'energy':c.type==='active'?'nature':'gold'} art={<AbilityArt icon={cardIllustration(c)}/>} onClick={onClick} disabled={disabled} selected={selected} footer={<><span><Icon name="bolt" size={13}/>{c.energy}</span><span>{footer??`${c.price} zlata`}</span></>}>{children}</CardFrame>;
}
