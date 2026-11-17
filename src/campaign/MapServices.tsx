import type { Service, ServiceKind } from './map-services';

/**
 * The marks of the board's key, drawn around their own centre in board units (map-services.ts gives their boxes): a shield with
 * a keep for a town, a winged disc for a flight path, a headstone for a graveyard. A town and a flight path carry their
 * faction's colour, red for the Horde and blue for the Alliance as on the heroes' counters and the quest tokens; one that is
 * open to both is half red and half blue. The colours are in map.css.
 */
const TOWN = 'M-11,-13.5 H11 V2 C11,8.5 5.5,12 0,14 C-5.5,12 -11,8.5 -11,2 Z', TOWN_RIGHT = 'M0,-13.5 H11 V2 C11,8.5 5.5,12 0,14 Z';
const KEEP = 'M-6.5,6 V-7 H-4 V-4.2 H-1.3 V-7 H1.3 V-4.2 H4 V-7 H6.5 V6 H2.1 V2.6 A2.1,2.1 0 0 0 -2.1,2.6 V6 Z';
const WING = 'M-8,-4 C-13,-11 -19,-11.5 -23,-9 C-19.5,-8.5 -18.5,-7 -21,-5 C-17.5,-5 -16.5,-3.2 -19,-1.2 C-15.5,-1.5 -14.5,.5 -16.5,2.4 C-13,2 -10.5,3 -8,4 Z';
const DISC = 9.2, DISC_RIGHT = `M0,${-DISC} A${DISC},${DISC} 0 0 1 0,${DISC} Z`, ARROW = 'M0,-5.6 L4.9,3.9 L0,1.7 L-4.9,3.9 Z';
const STONE = 'M-8.5,11 V-3 A8.5,8.5 0 0 1 8.5,-3 V11 Z', CROSS = 'M-1.3,-7 H1.3 V-3.6 H4.6 V-1 H1.3 V6.5 H-1.3 V-1 H-4.6 V-3.6 H-1.3 Z';

export function ServiceBadge({ kind, side }: Service) {
 const tone = kind === 'graveyard' ? 'neutral' : side ?? 'neutral', both = tone === 'both';
 if (kind === 'town') return <g className={`service-badge town ${tone}`}>
  <path className="service-under" d={TOWN}/><path className="service-plate" d={TOWN}/>{both&&<path className="service-plate second" d={TOWN_RIGHT}/>}
  <path className="service-rim" d={TOWN}/><path className="service-glyph" d={KEEP}/>
 </g>;
 if (kind === 'flight') return <g className={`service-badge flight ${tone}`}>
  <path className="service-under" d={WING}/><path className="service-under" d={WING} transform="scale(-1,1)"/><circle className="service-under" r={DISC}/>
  <path className="service-plate service-wing" d={WING}/><path className={`service-plate service-wing ${both?'second':''}`} d={WING} transform="scale(-1,1)"/>
  <path className="service-rim" d={WING}/><path className="service-rim" d={WING} transform="scale(-1,1)"/>
  <circle className="service-plate" r={DISC}/>{both&&<path className="service-plate second" d={DISC_RIGHT}/>}
  <circle className="service-rim" r={DISC}/><path className="service-glyph" d={ARROW}/>
 </g>;
 return <g className="service-badge graveyard neutral"><path className="service-under" d={STONE}/><path className="service-plate" d={STONE}/><path className="service-rim" d={STONE}/><path className="service-glyph" d={CROSS}/></g>;
}

const VIEW: Record<ServiceKind, [number, number, number, number]> = { town: [-13.5, -16, 27, 32.5], flight: [-25.5, -13.5, 51, 27], graveyard: [-11, -13.5, 22, 27] };
/** The same mark as a small picture among text: in the map's legend and in a region's line. */
export function ServiceIcon({ kind, side, height = 15 }: Service & { height?: number }) {
 const [x, y, w, h] = VIEW[kind];
 return <svg className={`service-icon ${kind}`} viewBox={`${x} ${y} ${w} ${h}`} width={Math.round(height * w / h * 10) / 10} height={height} aria-hidden="true" focusable="false"><ServiceBadge kind={kind} side={side}/></svg>;
}
