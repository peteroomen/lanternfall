import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import vm from 'node:vm';
const root=resolve(import.meta.dirname,'../dist');

test('service worker installs every required file and serves a seeded run offline',async()=>{
  const listeners={},buckets=new Map(),base='https://lanternfall.example/';let offline=false,claimed=false;
  const url=value=>new URL(typeof value==='string'?value:value.url,base).href;
  const network=async value=>{if(offline)throw Error('offline');const path=new URL(url(value)).pathname;const data=await readFile(resolve(root,'.'+path+(path.endsWith('/')?'index.html':'')));return new Response(data);};
  const caches={
    async open(name){if(!buckets.has(name))buckets.set(name,new Map());const bucket=buckets.get(name);return {
      async addAll(paths){const responses=await Promise.all(paths.map(network));paths.forEach((p,i)=>bucket.set(url(p),responses[i]));},
      async put(request,response){bucket.set(url(request),response);},
      async match(request){return bucket.get(url(request))?.clone();},
    };},
    async keys(){return [...buckets.keys()];},async delete(name){return buckets.delete(name);},
    async match(request){for(const bucket of buckets.values())if(bucket.has(url(request)))return bucket.get(url(request)).clone();},
  };
  vm.runInNewContext(await readFile(resolve(root,'sw.js'),'utf8'),{URL,Response,caches,fetch:network,self:{location:{origin:new URL(base).origin},clients:{async claim(){claimed=true;}},addEventListener(name,fn){listeners[name]=fn;}}});
  let pending;listeners.install({waitUntil(p){pending=p;}});await pending;
  assert.ok((await caches.match('./game/engine.js')));assert.ok((await caches.match('./assets/icon-512.png')));
  buckets.set('lanternfall-obsolete',new Map());buckets.set('another-app',new Map());listeners.activate({waitUntil(p){pending=p;}});await pending;
  assert.equal(claimed,true);assert.equal(buckets.has('lanternfall-obsolete'),false);assert.equal(buckets.has('another-app'),true);
  offline=true;
  listeners.fetch({request:{url:base+'?seed=37',method:'GET',mode:'navigate'},respondWith(p){pending=p;}});
  assert.match(await(await pending).text(),/<title>Lanternfall/);
  listeners.fetch({request:{url:base+'game/engine.js',method:'GET',mode:'cors'},respondWith(p){pending=p;}});
  assert.match(await(await pending).text(),/export function newGame/);
  let intercepted=false;listeners.fetch({request:{url:'https://other.example/',method:'GET'},respondWith(){intercepted=true;}});assert.equal(intercepted,false);
});

test('all module imports and stylesheet assets exist and PNG install icons have correct dimensions',async()=>{
  for(const name of ['app','engine','catalog','renderer','audio']){
    const file=resolve(root,`game/${name}.js`),source=await readFile(file,'utf8');
    for(const m of source.matchAll(/from\s*['"](\.\.?\/[^'"]+)['"]/g))await access(resolve(root,'game',m[1]));
  }
  const css=await readFile(resolve(root,'style.css'),'utf8');for(const m of css.matchAll(/url\(['"]?(\.\/[^)'"]+)['"]?\)/g))await access(resolve(root,m[1]));
  for(const size of [192,512]){const png=await readFile(resolve(root,`assets/icon-${size}.png`));assert.equal(png.toString('ascii',1,4),'PNG');assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);}
});
