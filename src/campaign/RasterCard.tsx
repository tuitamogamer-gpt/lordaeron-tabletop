import type { CSSProperties } from 'react';
import faces from '../data/raster-card-faces.json';

interface RasterFace { src:string; width:number; height:number; description:string; fingerprint:string }
export function rasterFace(id:string):RasterFace {
 const face=(faces as Record<string,RasterFace>)[id];
 if(!face)throw new Error(`Missing complete card image: ${id}`);
 return face;
}

/** Printed information is baked into one bitmap. Live controls stay outside it. */
export default function RasterCard({id,title,onClick,disabled,selected=false,ability=false}:{id:string;title:string;onClick?:()=>void;disabled?:boolean;selected?:boolean;ability?:boolean}) {
 const face=rasterFace(id);
 const cls=`folio-card full-image-card raster-card ${ability?'ability-layout':''} ${selected?'selected':''}`;
 const style={'--card-ratio':`${face.width} / ${face.height}`} as CSSProperties;
 const image=<img className="full-card-face" src={face.src} width={face.width} height={face.height} alt={face.description} loading="lazy" decoding="async"/>;
 return onClick?<button type="button" className={cls} style={style} onClick={onClick} disabled={disabled} aria-label={title} aria-pressed={selected}>{image}</button>:<article className={cls} style={style} aria-label={title}>{image}</article>;
}
