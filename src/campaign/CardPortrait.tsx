import { useLayoutEffect, useRef, useState } from 'react';
import type { Card } from '../rules/model';
import faces from '../data/ability-card-faces.json';
import fullCards from '../data/full-cards.json';
import { cardEnergyText } from './card-energy';
import { triggerLabels } from './design-system';
import { conditionText, effectText, staticCardText } from './rules-text';
import RulesText from './RulesText';

/** A whole card, including all four frame edges. SVG scales the face uniformly. */
export default function CardPortrait({card:c}:{card:Card}) {
 const rules=useRef<HTMLDivElement>(null),[font,setFont]=useState(20);
 const groups=c.abilities.filter((a,i,all)=>!a.usageGroup||all.findIndex(v=>v.usageGroup===a.usageGroup)===i);
 useLayoutEffect(()=>{
  const fit=()=>{
   const node=rules.current;if(!node)return;
   // Measure in the card coordinate system, before the SVG scales.
   let size=20;node.style.fontSize=`${size}px`;
   while(node.scrollHeight>280&&size>10){size-=.5;node.style.fontSize=`${size}px`;}
   setFont(size);
  };
  fit();
  let active=true;
  document.fonts?.ready.then(()=>{if(active)fit();});
  return()=>{active=false;};
 },[c.id]);
 const kind=c.kind==='racial'?'Racial':c.kind==='talent'?'Talent':c.kind==='power'?'Power':c.type==='bag'?'Consumable':'Equipment';
 return <svg className="card-portrait-face" viewBox="0 0 384 750" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
  <image href={faces[c.id as keyof typeof faces]} x="0" y="0" width="384" height="750" preserveAspectRatio="none"/>
  <svg x="0" y="0" width="384" height="52" viewBox="0 0 384 52" preserveAspectRatio="none"><image href={faces[c.id as keyof typeof faces]} width="384" height="640"/></svg>
  <svg x="0" y="52" width="384" height="275" viewBox="0 52 384 165" preserveAspectRatio="none"><image href={faces[c.id as keyof typeof faces]} width="384" height="640"/></svg>
  <svg x="0" y="327" width="384" height="423" viewBox="0 217 384 423" preserveAspectRatio="none"><image href={faces[c.id as keyof typeof faces]} width="384" height="640"/></svg>
  <rect x="22" y="53" width="340" height="270" fill="#17251d"/>
  <svg x="22" y="53" width="340" height="270" viewBox="22 60 340 294" preserveAspectRatio="xMidYMid meet"><image href={fullCards[c.id as keyof typeof fullCards]} width="384" height="576"/></svg>
  <foreignObject x="28" y="9" width="328" height="34"><div className="portrait-card-heading"><span>{kind}</span><b>LVL {c.level}</b></div></foreignObject>
  <foreignObject x="28" y="329" width="328" height="46"><div className={`portrait-card-title ${c.name.length>24?'long-title':''}`}>{c.name}</div></foreignObject>
  <foreignObject x="34" y="391" width="316" height="283"><div ref={rules} className="portrait-card-rules" style={{fontSize:font}}>
   {groups.map(a=>{const strengths=a.usageGroup?c.abilities.filter(v=>v.usageGroup===a.usageGroup):[a];return <div className="portrait-rule" key={a.id}>
    <b>{triggerLabels[a.timing]??a.timing}{a.automatic?' · passive':''}</b>
    <span>{a.cost!==undefined&&<strong>{a.cost} energy · </strong>}{a.startOnly&&'At the start of this step. '}{a.condition&&<>If <RulesText>{conditionText(a.condition)}</RulesText>: </>}{a.requires&&<>After using {triggerLabels[c.abilities.find(v=>v.id===a.requires)?.timing??'']??a.requires}. </>}{a.freeIf&&<>Free if <RulesText>{conditionText(a.freeIf)}</RulesText>. </>}<RulesText>{a.effects.map(effectText).join(' · ')}</RulesText></span>
    {strengths.length>1&&<em>{strengths.length} strength options · hover for all</em>}
   </div>;})}
   {staticCardText(c).map(text=><div className="portrait-rule" key={text}><RulesText>{text}</RulesText></div>)}
  </div></foreignObject>
  <foreignObject x="31" y="698" width="322" height="34"><div className="portrait-card-footer"><span>{cardEnergyText(c)}</span><span>{c.printed?'Starting':c.kind==='talent'?'Permanent':`${c.price} gold`}</span></div></foreignObject>
 </svg>;
}
