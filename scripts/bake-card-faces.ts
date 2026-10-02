import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { allRasterCardText, rasterCardDescription, type RasterCardText } from '../src/campaign/raster-card-text';
import fullCards from '../src/data/full-cards.json';

/** Run with npx tsx scripts/bake-card-faces.ts. All visible text is baked here,
 * never painted by React/CSS. The input frame and scene art are imagegen assets. */
const VERSION='raster-v9.1';
const WIDTH=768, STANDARD_HEIGHT=1152, FONT_SIZE=28, LINE=36, LABEL_SIZE=21, LABEL_LINE=29;
const TEXT_X=72, TEXT_WIDTH=624, TOP=486, TITLE=112, FOOTER=98, BODY_TOP=TOP+TITLE;
const bodyFont=process.env.CARD_BODY_FONT??'C:/Windows/Fonts/arial.ttf';
const boldFont=process.env.CARD_BOLD_FONT??'C:/Windows/Fonts/arialbd.ttf';
const titleFont=process.env.CARD_TITLE_FONT??'C:/Windows/Fonts/georgiab.ttf';
const framePath='public/assets/card-faces/frame-v9.webp';
const output='public/assets/card-faces/v9';
const hash=(input:string|Buffer)=>createHash('sha256').update(input).digest('hex');
const fonts=await Promise.all([bodyFont,boldFont,titleFont].map(p=>readFile(p)));

/** TrueType advance widths make wrapping deterministic without a DOM or canvas. */
function fontMeasure(font:Buffer){
 const tables=new Map<string,number>();
 for(let i=0;i<font.readUInt16BE(4);i++){const pos=12+i*16;tables.set(font.toString('ascii',pos,pos+4),font.readUInt32BE(pos+8));}
 const units=font.readUInt16BE(tables.get('head')!+18),metrics=font.readUInt16BE(tables.get('hhea')!+34),hmtx=tables.get('hmtx')!,cmap=tables.get('cmap')!;
 let mapping=0;
 for(let i=0;i<font.readUInt16BE(cmap+2);i++){const pos=cmap+4+i*8,sub=cmap+font.readUInt32BE(pos+4);if(font.readUInt16BE(sub)===4){mapping=sub;if(font.readUInt16BE(pos)===3)break;}}
 if(!mapping)throw new Error('Expected a Unicode TrueType cmap format 4');
 const segments=font.readUInt16BE(mapping+6)/2,end=mapping+14,start=end+segments*2+2,delta=start+segments*2,offset=delta+segments*2;
 function glyph(code:number){for(let i=0;i<segments;i++)if(code<=font.readUInt16BE(end+i*2)){if(code<font.readUInt16BE(start+i*2))return 0;const adjustment=font.readInt16BE(delta+i*2),range=font.readUInt16BE(offset+i*2);if(!range)return(code+adjustment)&65535;const value=font.readUInt16BE(offset+i*2+range+(code-font.readUInt16BE(start+i*2))*2);return value?(value+adjustment)&65535:0;}return 0;}
 return (text:string,size:number)=>Array.from(text).reduce((sum,ch)=>sum+font.readUInt16BE(hmtx+Math.min(glyph(ch.codePointAt(0)!),metrics-1)*4),0)*size/units*1.025;
}
const regularWidth=fontMeasure(fonts[0]),boldWidth=fontMeasure(fonts[1]),titleWidth=fontMeasure(fonts[2]);
function wrap(text:string,width:number,size:number,measure=regularWidth):string[]{
 const lines:string[]=[];let line='';
 for(const word of text.split(/\s+/).filter(Boolean)){
  if(measure(word,size)>width)throw new Error(`Unbreakable text exceeds card width: ${word}`);
  const next=line?`${line} ${word}`:word;
  if(line&&measure(next,size)>width){lines.push(line);line=word;}else line=next;
 }
 if(line)lines.push(line);return lines;
}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
type Line={text:string;x:number;y:number;size:number;bold:boolean;family:'Arial'|'Georgia';fill:string;anchor:'start'|'middle';width:number};
function layout(c:RasterCardText){
 const lines:Line[]=[];
 const add=(text:string,x:number,y:number,size:number,bold=false,fill='#302419',anchor:'start'|'middle'='start',family:'Arial'|'Georgia'='Arial')=>{
  const measure=family==='Georgia'?titleWidth:bold?boldWidth:regularWidth;
  lines.push({text,x,y,size,bold,family,fill,anchor,width:measure(text,size)});
 };
 const header=`${c.kind} · ${c.rank}`;
 let headerSize=25;while(boldWidth(header,headerSize)>500)headerSize--;
 add(header,WIDTH/2,51,headerSize,true,'#f8e5b2','middle');
 let titleSize=37,titleLines=wrap(c.title,620,titleSize,titleWidth);
 while(titleLines.length>2){titleSize--;titleLines=wrap(c.title,620,titleSize,titleWidth);}
 const titleStart=TOP+(titleLines.length===1?46:34);
 titleLines.forEach((s,i)=>add(s,WIDTH/2,titleStart+i*39,titleSize,true,'#f9e7be','middle','Georgia'));
 let subtitleSize=22;while(regularWidth(c.subtitle,subtitleSize)>622)subtitleSize--;
 add(c.subtitle,WIDTH/2,TOP+97,subtitleSize,false,'#ecd5a5','middle');
 let y=BODY_TOP+44;
 for(const section of c.sections){
  if(section.label){for(const label of wrap(section.label.toUpperCase(),TEXT_WIDTH,LABEL_SIZE,boldWidth)){add(label,TEXT_X,y,LABEL_SIZE,true,'#825e28');y+=LABEL_LINE;}}
  for(const line of wrap(section.text,TEXT_WIDTH,FONT_SIZE)){add(line,TEXT_X,y,FONT_SIZE);y+=LINE;}
  y+=14;
 }
 const lastBodyBaseline=y-LINE-14;
 const height=Math.max(STANDARD_HEIGHT,Math.ceil((y+18+FOOTER)/8)*8);
 const footerLines=wrap(c.footer,500,24);
 if(footerLines.length>2)throw new Error(`Footer needs ${footerLines.length} lines: ${c.id}`);
 footerLines.forEach((s,i)=>add(s,WIDTH/2,height-FOOTER+(footerLines.length===1?56:40)+i*31,24,false,'#f8e5b2','middle'));
 for(const line of lines){const left=line.anchor==='middle'?line.x-line.width/2:line.x;if(left<50||left+line.width>718)throw new Error(`Text overflows horizontal safe area: ${c.id}: ${line.text}`);}
 if(lastBodyBaseline+9>=height-FOOTER)throw new Error(`Body text clips footer: ${c.id}`);
 return {lines,height,lastBodyBaseline,bodyBottom:height-FOOTER,bodyFontSize:FONT_SIZE};
}
await mkdir(output,{recursive:true});
const frame=await readFile(framePath);
const sourceFingerprint=hash(Buffer.concat([Buffer.from(VERSION),frame,...fonts,await readFile('scripts/bake-card-faces.ts')]));
const frame768=await sharp(frame).resize(WIDTH,1536,{fit:'fill'}).png().toBuffer();
// Each slice retains imagegen's hand-painted edges. Only the vellum panel grows.
const topSlice=await sharp(frame768).extract({left:0,top:0,width:WIDTH,height:648}).resize(WIDTH,TOP,{fit:'fill'}).png().toBuffer();
const titleSlice=await sharp(frame768).extract({left:0,top:648,width:WIDTH,height:113}).resize(WIDTH,TITLE,{fit:'fill'}).png().toBuffer();
const rulesSlice=await sharp(frame768).extract({left:0,top:761,width:WIDTH,height:646}).png().toBuffer();
const footerSlice=await sharp(frame768).extract({left:0,top:1407,width:WIDTH,height:129}).resize(WIDTH,FOOTER,{fit:'fill'}).png().toBuffer();
const faces:Record<string,{src:string;width:number;height:number;description:string;fingerprint:string}>={};
const metadata:Record<string,unknown>={};
const all=allRasterCardText(),old:Record<string,string>=fullCards;
const selected=process.argv.find(v=>v.startsWith('--only='))?.slice(7);
const fontOptions={fontFiles:[bodyFont,boldFont,titleFont].map(p=>resolve(p)),loadSystemFonts:false,defaultFontFamily:'Arial'};
// Publish paths immediately so the application can compile while images bake.
for(const c of all){const positioned=layout(c);faces[c.id]={src:`/assets/card-faces/v9/${c.id}.webp`,width:WIDTH,height:positioned.height,description:rasterCardDescription(c),fingerprint:hash(JSON.stringify(c))};}
if(!selected)await writeFile('src/data/raster-card-faces.json',JSON.stringify(faces,null,2)+'\n');
sharp.concurrency(1);
let completed=0;
async function bake(c:RasterCardText){
 const positioned=layout(c);
 const portrait=c.art.startsWith('portrait:');
 const artPath=portrait?`public/assets/portraits/${c.art.slice(9)}.webp`:`public${old[c.art]}`;
 const artSource=await readFile(artPath);
 const fingerprint=hash(JSON.stringify(c));
 const description=rasterCardDescription(c),src=`/assets/card-faces/v9/${c.id}.webp`;
 faces[c.id]={src,width:WIDTH,height:positioned.height,description,fingerprint};
 metadata[c.id]={fingerprint,sourceFingerprint,artFingerprint:hash(artSource),category:c.category,text:c,layout:{height:positioned.height,bodyFontSize:FONT_SIZE,lastBodyBaseline:positioned.lastBodyBaseline,bodyBottom:positioned.bodyBottom,lines:positioned.lines}};
 if(selected&&!c.id.includes(selected))return;
 const scene=portrait?await sharp(artSource).png().toBuffer():await sharp(artSource).extract({left:22,top:60,width:340,height:294}).png().toBuffer();
 const artWidth=672,artHeight=400;
 const backdrop=await sharp(scene).resize(artWidth,artHeight,{fit:'cover'}).blur(15).modulate({brightness:0.55,saturation:0.7}).png().toBuffer();
 const foreground=await sharp(scene).resize(artWidth,artHeight,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
 const art=await sharp(backdrop).composite([{input:foreground,left:0,top:0}]).png().toBuffer();
 const body=await sharp(rulesSlice).resize(WIDTH,positioned.height-BODY_TOP-FOOTER,{fit:'fill'}).png().toBuffer();
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${positioned.height}">${positioned.lines.map(l=>`<text x="${l.x}" y="${l.y}" font-family="${l.family}" font-size="${l.size}" font-weight="${l.bold?700:400}" fill="${l.fill}" text-anchor="${l.anchor}">${escape(l.text)}</text>`).join('')}</svg>`;
 const textImage=new Resvg(svg,{font:fontOptions}).render().asPng();
 await sharp({create:{width:WIDTH,height:positioned.height,channels:4,background:'#17120b'}}).composite([{input:topSlice,top:0,left:0},{input:art,top:79,left:48},{input:titleSlice,top:TOP,left:0},{input:body,top:BODY_TOP,left:0},{input:footerSlice,top:positioned.height-FOOTER,left:0},{input:textImage,top:0,left:0}]).webp({quality:94,effort:4}).toFile(`public${src}`);
 completed++;
 if(completed%50===0)console.log(`Baked ${completed}/${all.length} faces`);
}
// Bounded workers keep the build quick without flooding CPU or memory.
let next=0;
await Promise.all(Array.from({length:3},async()=>{while(next<all.length)await bake(all[next++]);}));
if(!selected){
 await writeFile('src/data/raster-card-faces.json',JSON.stringify(faces,null,2)+'\n');
 await writeFile('src/data/raster-card-metadata.json',JSON.stringify({version:VERSION,sourceFingerprint,cards:metadata},null,2)+'\n');
}
const tallest=Object.entries(faces).sort((a,b)=>b[1].height-a[1].height).slice(0,12).map(([id,v])=>({id,height:v.height,characters:v.description.length}));
console.log(JSON.stringify({completed,total:all.length,standard:all.filter(c=>layout(c).height===STANDARD_HEIGHT).length,tallest},null,2));
