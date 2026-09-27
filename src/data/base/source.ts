import index from './scan-index.json' with { type:'json' };
import type { Source } from '../../rules/model.js';
export const FAQ_URL='https://www.fantasyflightgames.com/ffg_content/WoWBG/WoW_FAQ__v1_4.pdf';
/** Call only for a transcription checked against the image, never an unreviewed OCR result. */
export function scanSource(path:string, correction?:string):Source {
 const file=(index as Record<string,{id:string;sha256:string}>)[path];
 if(!file)throw new Error(`Missing scan source: ${path}`);
 return {url:`https://drive.google.com/file/d/${file.id}/view`,reference:path+(correction?` · FAQ 1.4: ${correction}`:''),status:'verified'};
}
export const slug=(name:string)=>name.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
