import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import Map from '../src/campaign/Map';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { view } from '../src/rules/view';
const state=createGame(p,DEFAULT_SETUP);
const html=renderToStaticMarkup(React.createElement(Map,{state:view(state),selected:'stillwater',heroId:state.heroes[0].id,legal:legalActions(p,state),focused:true,onToggleFocus:()=>{},onSelect:()=>{},onMove:()=>{}}));
let svg=html.slice(html.indexOf('<svg viewBox='),html.lastIndexOf('</svg>')+6);
// Map icons outside the board are not part of this standalone SVG artifact.
let depth=0,end=0;
for(const match of svg.matchAll(/<svg\b|<\/svg>/g)){depth+=match[0]==='</svg>'?-1:1;if(depth===0){end=match.index!+match[0].length;break;}}
svg=svg.slice(0,end);
svg=svg.replace('<svg ', '<svg xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" width="2070" height="1380" ');
const css=(readFileSync('src/campaign/map.css','utf8')+readFileSync('src/campaign/command-table.css','utf8')).replaceAll('var(--serif)','Georgia').replaceAll('var(--sans)','Arial');
svg=svg.replace('<svg ', '<svg class="strong-borders" ');
svg=svg.replace('><defs>',`><style>${css}</style><defs>`);
for(const url of new Set([...svg.matchAll(/href="(\/assets\/[^" ]+)"/g)].map(m=>m[1]))){
 const png=await sharp(readFileSync('public'+url)).png().toBuffer();
 svg=svg.replaceAll(`href="${url}"`,`xlink:href="data:image/png;base64,${png.toString('base64')}"`);
}
mkdirSync('screenshots',{recursive:true});
writeFileSync('screenshots/02-map-regions.png',new Resvg(svg,{font:{defaultFontFamily:'Georgia',serifFamily:'Georgia',sansSerifFamily:'Arial'}}).render().asPng());
writeFileSync('.local-data/map-preview.svg',svg);
console.log('Rendered screenshots/02-map-regions.png (2070 × 1380)');
