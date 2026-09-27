import { AbilityCard, CardFrame, triggerLabels } from './design-system';
import { effectText, conditionText, staticCardText } from './rules-text';
import { Icon } from '../components';
import { BASE_PACK as p } from '../data/base';
import { card, character } from '../rules/common';
import type { Card } from '../rules/model';
import RulesText from './RulesText';
export const pretty=(s:string)=>s.replace(/ · probn[oi]( quest)?/g,'');
export const factionLabel=(f:string)=>f==='horde'?"Horde":f==='alliance'?"Alliance":"Draw";
export const phaseLabel:Record<string,string>={actions:"Party actions",management:"Equipment management",'final-management':"Final PvP preparation",combat:"Combat",reward:"Rewards and new quest",event:"Event",finished:"Campaign end",attacker:"Attack order",pool:"Prepare dice",penalty:'Stun / Curse','after-pool':"After rolling",reroll:"Rerolls",'after-reroll':"Creature effect",'after-tokens':"After hits",tokens:"Place hits",defense:"Defense",wounds:"Assign wounds",resolution:"Resolution",'round-end':"Round end",over:"Combat outcome"};
export function HeroPortrait({id,small=false}:{id:string;small?:boolean}){const c=character(p,id);return <span className={`portrait campaign-portrait ${small?'small':''}`} role="img" aria-label={c.name} style={{backgroundImage:`url(/assets/portraits/${id}.webp)`,backgroundSize:'cover',backgroundPosition:'center 35%'}}/>;}
export function CharacterCard({id}:{id:string}) {const c=character(p,id);return <CardFrame kind="HERO" title={c.name} subtitle={`${c.race} · ${c.classId} · ${factionLabel(c.faction)}`} accent={c.faction} art={<HeroPortrait id={id}/>} footer={<span>Character capacities · levels 1–5</span>}><span className="character-cap-grid">{c.capacities.map((v,i)=><span key={i}><b>{i+1}</b><span><Icon name="heart" size={12}/>{v.health}</span><span><Icon name="bolt" size={12}/>{v.energy}</span></span>)}</span>{c.racial&&<span className="folio-effect"><b>{card(p,c.racial).name}</b><RulesText>{cardText(card(p,c.racial))}</RulesText></span>}<span className="folio-effect"><b>STARTING EQUIPMENT</b>{c.slots.flatMap(s=>s.printed?[card(p,s.printed).name]:[]).join(' · ')}</span></CardFrame>;}
export {effectText} from './rules-text';
export const cardText=(c:Card)=>[...c.abilities.map(a=>a.effects.map(effectText).join(' · ')),...staticCardText(c)].join(' / ');
export function GameCard({card,disabled=false,onClick,selected=false,footer}:{card:Card;disabled?:boolean;onClick?:()=>void;selected?:boolean;footer?:string}){
 return <AbilityCard card={card} disabled={disabled} onClick={onClick} selected={selected} footer={footer}>{card.abilities.filter((a,i,all)=>!a.usageGroup||all.findIndex(v=>v.usageGroup===a.usageGroup)===i).map(a=><span className="folio-effect" key={a.id}><b>{triggerLabels[a.timing]??a.timing}</b>{a.condition&&<em><RulesText>{conditionText(a.condition)}</RulesText>. </em>}{a.cost!==undefined&&<em>{a.cost} energy. </em>}{a.freeIf&&<em>Free if <RulesText>{conditionText(a.freeIf)}</RulesText>. </em>}<RulesText>{a.effects.map(effectText).join(' · ')}</RulesText>{a.usageGroup&&<small>Power strength: {card.abilities.filter(v=>v.usageGroup===a.usageGroup).length} options</small>}</span>)}{staticCardText(card).map(text=><span className="folio-effect" key={text}><RulesText>{text}</RulesText></span>)}</AbilityCard>;
}
