import {readFile,readdir,access} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'../dist');
async function walk(p){for(const d of await readdir(p,{withFileTypes:true})){const f=join(p,d.name);if(d.isDirectory())await walk(f);else if(f.endsWith('.js'))execFileSync(process.execPath,['--check',f]);}}
await walk(root);
const html=await readFile(join(root,'index.html'),'utf8');for(const m of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)"/g))await access(resolve(root,m[1]));
const manifest=JSON.parse(await readFile(join(root,'manifest.webmanifest'),'utf8'));for(const i of manifest.icons)await access(resolve(root,i.src));
for(const asset of ['assets/title.webp','assets/sprites.png','game/app.js','game/engine.js','game/catalog.js','game/renderer.js','game/audio.js'])await access(join(root,asset));
console.log('Static build validated: JavaScript syntax, entrypoint references, manifest icons, and game assets.');
