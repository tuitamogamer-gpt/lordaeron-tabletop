import { BASE_PACK as p } from '../data/base';
import { card, character } from '../rules/common';
import type { Command } from '../rules/model';
import CardPortrait from './CardPortrait';
import { BossPortrait } from './design-system';
import { regionName } from './event-text';
import { decisionPrompt, type MapDecision, type MapSource } from './map-decision';
import { HeroPortrait } from './parts';
import { rasterFace } from './RasterCard';

const faceOf = (id?: string) => { if (!id) return undefined; try { return rasterFace(id); } catch { return undefined; } };

/** The piece being moved, as it looks on the board. */
function Piece({ decision, source, overlord }: { decision: MapDecision; source?: MapSource; overlord: string }) {
 if (source) return <span className="decision-piece creature"><img src={`/assets/tokens/plastic/${source.creature}-blue.webp`} alt="" draggable={false} /><b>{source.count} × {source.name}</b></span>;
 if (!decision.piece) return null;
 return <span className="decision-piece">{decision.kind === 'nefarian' ? <BossPortrait id={overlord} /> : <HeroPortrait id={decision.hero} small />}<b>{decision.piece.name}</b></span>;
}

/**
 * The foot of the map while a decision is made on it (map-decision.ts): the Event card, what it asks, the piece in hand,
 * where it would go and what stands there, and the button that sends the choice. Nothing is sent before that button.
 */
export function MapDecisionBar({ decision, source, target, arrival, overlord, onSource, onClear, onSend }: {
 decision: MapDecision; source?: MapSource; /** The region picked as the destination. */target?: { region: string; command: Command };
 /** What stands in the picked region, a line each. */arrival: string[]; overlord: string;
 onSource: (key: string) => void; onClear: () => void; onSend: (c: Command) => void;
}) {
 const face = faceOf(decision.event), who = character(p, decision.hero).name;
 const step = decision.sources ? (!source ? 1 : !target ? 2 : 3) : !target ? 1 : 2;
 const steps = decision.sources ? ['Pick a group', 'Pick a region', 'Confirm'] : ['Pick a region', 'Confirm'];
 const origin = source?.region ?? decision.from;
 // Other groups standing with the one in hand: a region is one click, the group is chosen here.
 const beside = source ? (decision.sources ?? []).filter(s => s.region === source.region && s.key !== source.key) : [];
 return <section className={`map-decision-bar kind-${decision.kind}`} role="group" aria-label={`Decision on the map: ${decision.title}`}>
  {face && <img className="map-decision-card" src={face.src} width={face.width} height={face.height} alt={`${decision.title} event card`} tabIndex={0} draggable={false} />}
  <div className="map-decision-text">
   <span className="eyebrow">{who}{decision.progress ? ` · ${decision.progress}` : ''}</span>
   <h3>{decision.title}</h3>
   <p>{decision.rule}</p>
  </div>
  <div className="map-decision-choice">
   <ol className="map-decision-steps" aria-label="Steps of this decision">{steps.map((label, i) => <li key={label} className={i + 1 === step ? 'current' : i + 1 < step ? 'done' : ''} aria-current={i + 1 === step ? 'step' : undefined}><b>{i + 1}</b>{label}</li>)}</ol>
   <p className="map-decision-prompt" role="status">{decisionPrompt(decision, source, target?.region)}</p>
   {(source || decision.piece) && <div className="map-decision-move">
    <Piece decision={decision} source={source} overlord={overlord} />
    {origin && <span className="decision-place">{regionName(origin)}</span>}
    <span className="decision-arrow" aria-hidden="true">→</span>
    <span className={`decision-place ${target ? 'picked' : 'open'}`}>{target ? regionName(target.region) : 'pick on the map'}</span>
    {beside.map(s => <button key={s.key} type="button" className="quiet-button decision-beside" onClick={() => onSource(s.key)}><img src={`/assets/tokens/plastic/${s.creature}-blue.webp`} alt="" draggable={false} />Take {s.count} × {s.name} instead</button>)}
   </div>}
   {target && target.region !== origin && <p className="map-decision-arrival">{arrival.length ? <>In {regionName(target.region)}: {arrival.join(' · ')}</> : `Nothing else stands in ${regionName(target.region)}.`}</p>}
  </div>
  <div className="map-decision-actions">
   {decision.extras.map((extra, i) => <button key={i} type="button" className="quiet-button decision-extra" onClick={() => onSend(extra.command)}><span className="decision-extra-card"><CardPortrait card={card(p, extra.card)} /></span>{extra.label}</button>)}
   {decision.skip && <button type="button" className="quiet-button" onClick={() => onSend(decision.skip!.command)}>{decision.skip.label}</button>}
   {source && (decision.sources?.length ?? 0) > 1 && <button type="button" className="quiet-button" onClick={onClear}>Pick another group</button>}
   <button type="button" className="gold-button" disabled={!target} onClick={() => target && onSend(target.command)}>{decision.verb}</button>
  </div>
 </section>;
}
