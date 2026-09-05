import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(import.meta.dirname,'../dist');
const args=process.argv.slice(2),port=Number(args[args.indexOf('--port')+1])||Number(process.env.PORT)||4173;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
http.createServer(async(req,res)=>{try{const p=decodeURIComponent(new URL(req.url,'http://local').pathname),file=resolve(root,'.'+p+(p.endsWith('/')?'index.html':''));if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end();return;}if(!(await stat(file)).isFile())throw Error();res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(await readFile(file));}catch{res.writeHead(404,{'Content-Type':'text/plain'}).end('Not found');}}).listen(port,'0.0.0.0',()=>console.log(`Lanternfall ready on port ${port}`));
