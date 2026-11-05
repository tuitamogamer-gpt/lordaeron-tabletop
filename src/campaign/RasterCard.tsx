import type { CSSProperties } from 'react';
import faces from '../data/raster-card-faces.json';
import { faqNote, pickFace, SCANS } from './scan-assets';

interface RasterFace { src:string; width:number; height:number; description:string; fingerprint:string }
export function rasterFace(id:string) {
 const face=(faces as Record<string,RasterFace>)[id];
 if(!face)throw new Error(`Missing complete card image: ${id}`);
 return pickFace(face,SCANS.cards[id]);
}

/** Printed information is baked into one bitmap, or is the real printed card when its scan was prepared. Live controls stay outside it. */
export default function RasterCard({id,title,onClick,disabled,selected=false,ability=false}:{id:string;title:string;onClick?:()=>void;disabled?:boolean;selected?:boolean;ability?:boolean}) {
 const face=rasterFace(id),note=face.scanned?faqNote(id):undefined;
 const cls=`folio-card full-image-card raster-card ${ability?'ability-layout':''} ${face.scanned?'scanned':''} ${selected?'selected':''}`;
 const style={'--card-ratio':`${face.width} / ${face.height}`} as CSSProperties;
 const image=<img className="full-card-face" src={face.src} width={face.width} height={face.height} alt={note?`${face.description} FAQ 1.4 correction: ${note}.`:face.description} loading="lazy" decoding="async"/>;
 const faq=note&&<span className="faq-note" aria-hidden="true"><b>FAQ 1.4</b><span>{note}</span></span>;
 return onClick?<button type="button" className={cls} style={style} onClick={onClick} disabled={disabled} aria-label={title} aria-pressed={selected}>{image}{faq}</button>:<article className={cls} style={style} aria-label={title}>{image}{faq}</article>;
}
