/** Rebuild the public provenance index from downloaded files; never ships scan bytes or OCR. */
import { readFile, writeFile } from 'node:fs/promises';
const manifest=JSON.parse(await readFile(new URL('../docs/sources/base-scans-manifest.json',import.meta.url),'utf8'));
const files=manifest.files;
if(!Array.isArray(files)||files.length!==560)throw new Error('Expected the complete 560-file base archive');
const index=Object.fromEntries(files.map(f=>[f.path,{id:f.id,sha256:f.sha256}]));
await writeFile(new URL('../src/data/base/scan-index.json',import.meta.url),JSON.stringify(index,null,2)+'\n');
console.log(`Indexed ${files.length} scan sources.`);
