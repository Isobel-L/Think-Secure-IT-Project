// Test server only. Loopback, case-sensitive lookup, no writes, no directory listing.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json'};
function exactFile(root,pathname){
 let relative;try{relative=decodeURIComponent(pathname).replace(/^\/+/, '')||'index.html'}catch{return null}
 const segments=relative.split('/');
 if(segments.some(s=>s==='..'||s==='.'||s.includes('\\')||s.startsWith('.')))return null;
 if(!['index.html','pages','css','js','languages','Images','assets','robotimage'].includes(segments[0]))return null;
 let file=root;
 try{for(const seg of segments){if(!fs.readdirSync(file).includes(seg))return null;file=path.join(file,seg)}return fs.statSync(file).isFile()?file:null}catch{return null}
}
async function serve(root){
 const server=http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return}
  const file=exactFile(root,new URL(req.url,'http://localhost').pathname);
  if(!file){res.writeHead(404).end('Not found');return}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {server,url:'http://127.0.0.1:'+server.address().port};
}
module.exports={serve,exactFile};
