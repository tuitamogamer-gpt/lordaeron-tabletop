import { useState } from 'react';
import { CONTENT_COVERAGE, BASE_PACK as p } from '../data/base';
import { Icon } from '../components';
import { SCANS } from './scan-assets';

/**
 * The quick guide: how this table plays, eight cards of a few lines each. It used to be six cards stretched over the page with
 * three lines apiece, and its "Victory" card still described the one ending every campaign used to have.
 */
const GUIDE: { icon: string; title: string; text: string; points: string[]; keys?: string; setup?: boolean }[] = [
 { icon: 'users', title: 'Setup before your first turn', setup: true, text: 'Choose the table, the characters, the Overlord and how the campaign ends. The last step shows the starting quests before you begin.',
  points: ['Four or six characters, the same number in each faction.', 'Every class is chosen once across both factions.', 'AI can play any character you do not.'] },
 { icon: 'compass', title: 'Two actions per character', keys: 'Keys 1–5 choose an action · T trades · H asks for a hint',
  text: 'In its faction’s turn each character takes two actions, in any order: Travel, Rest, Train, Town or Challenge. Pass gives an action up.',
  points: ['Rest restores points equal to twice your level, split between health and energy; three times in a friendly town.', 'Train and Town spend gold on powers and items.', 'When everyone has acted, each character confirms equipment.'] },
 { icon: 'map', title: 'Travel through Lordaeron', keys: 'F opens the map · Esc returns',
  text: 'Move up to two regions across coloured shared borders. Black edges are impassable.',
  points: ['A friendly flight path costs one step.', 'Entering a region with a blue creature ends the journey.', 'Beside a blue creature the next action must be a Challenge.'] },
 { icon: 'swords', title: 'Combat, step by step', text: 'Choose who attacks, use powers, roll, reroll, then place the hits. A die scores a hit when it meets the opponent’s threat.',
  points: ['Blue dice are ranged hits: they wound first.', 'Red dice are melee hits: they block, then strike.', 'Green dice are armor: they cancel the opponent’s hits.'] },
 { icon: 'scroll', title: 'Quests and rewards', text: 'A quest is done when its green or red creatures are defeated. Its reward is shared by the party that finished it.',
  points: ['Experience and gold are divided among the party.', 'Each item drawn goes to any character who came through the fight.', 'A new quest is drawn in its place.'] },
 { icon: 'coins', title: 'Trading between allies', text: 'Allies standing in the same region hand each other items and gold. It is free and takes no action.',
  points: ['Open once a character of the faction has acted this turn.', 'Only what is in the bag changes hands; a bag holds three items.', 'Soulbound items stay with their owner.'] },
 { icon: 'trophy', title: 'How a campaign ends', text: 'The faction that defeats the Overlord wins at once. What happens if he outlasts turn 30 is chosen at setup.',
  points: ['Final battle: both factions meet in one last PvP battle.', 'Defeat the Overlord: the track begins another lap.', 'Deadly PvP optionally changes how PvP damage is dealt.'] },
 { icon: 'shield', title: 'AI and local play', text: 'Bots follow the same rules and legal actions as you. Your characters act first in your faction’s turn.',
  points: ['They cannot see deck order, future rolls or hidden Kazzak clues.', 'Open panels pause automatic turns.', 'The game saves in this browser after every move.'] },
];
export default function RulesGuide({onSetup,onDesign}:{onSetup:()=>void;onDesign:()=>void}) {
 const [section,setSection]=useState<'guide'|'content'|'printed'>('guide'),sheets=([['rules','Rules reference','The printed quick-reference: turn order, combat sequence and key rules.'],['monsters','Creature reference','Combat statistics, rewards and special abilities of every creature.']] as const).filter(([id])=>SCANS.reference[id]);
 return <section className="coverage-page rules-flow"><div className="rules-heading"><div><span className="eyebrow">BASE GAME 2005 + FAQ 1.4</span><h2>Rules for your table</h2></div><nav className="flow-tabs" aria-label="Rules sections"><button aria-pressed={section==='guide'} onClick={()=>setSection('guide')}>Quick guide</button><button aria-pressed={section==='content'} onClick={()=>setSection('content')}>Content & sources</button>{sheets.length>0&&<button aria-pressed={section==='printed'} onClick={()=>setSection('printed')}>Printed sheets</button>}</nav></div>
 {section==='printed'?<div className="printed-sheets">{sheets.map(([id,title,text])=><figure key={id}><figcaption><strong>{title}</strong><span>{text}</span><a href={SCANS.reference[id].src} target="_blank" rel="noreferrer">Open full size <Icon name="arrow" size={14}/></a></figcaption><img src={SCANS.reference[id].src} width={SCANS.reference[id].width} height={SCANS.reference[id].height} alt={`${title}, as printed in the box`} loading="lazy" decoding="async"/></figure>)}</div>:section==='guide'?<div className="rules-grid">{GUIDE.map(card=><article key={card.title}><header><Icon name={card.icon}/><h3>{card.title}</h3></header><p>{card.text}</p><ul>{card.points.map(point=><li key={point}>{point}</li>)}</ul>{card.keys&&<small>{card.keys}</small>}{card.setup&&<button className="quiet-button" onClick={onSetup}>Open setup guide <Icon name="arrow" size={14}/></button>}</article>)}</div>:<div className="rules-reference"><table><thead><tr><th>Content</th><th>Count</th><th>Verified from scans</th></tr></thead><tbody>{CONTENT_COVERAGE.map(c=><tr key={c.name}><td>{c.name}</td><td>{c.expected}</td><td>{c.note}</td></tr>)}</tbody></table><aside><Icon name="book" size={28}/><h3>From the original table</h3><p>{p.regions.length} bordered regions across seven zones. Quest tokens track remaining objectives, with faction colors.</p><p>Grey quests start the campaign. Replacements come from the green, yellow or red deck after resolving a quest.</p><div className="sources-list"><a href="https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/wowrules.pdf" target="_blank" rel="noreferrer">Official rulebook <Icon name="arrow" size={14}/></a><a href="https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/WoW_FAQ__v1_4.pdf" target="_blank" rel="noreferrer">FAQ / errata <Icon name="arrow" size={14}/></a><button className="quiet-button" onClick={onDesign}>Design system</button></div></aside></div>}
 </section>;
}
