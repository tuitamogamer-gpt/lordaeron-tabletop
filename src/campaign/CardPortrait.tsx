import type { Card } from '../rules/model';
import { rasterFace } from './RasterCard';

/** The same complete bitmap is used in the slot, library, and enlarged preview. */
export default function CardPortrait({card}:{card:Card}) {
 const face=rasterFace(card.id);
 return <img className="card-portrait-face" src={face.src} width={face.width} height={face.height} alt="" aria-hidden="true" loading="lazy" decoding="async"/>;
}
