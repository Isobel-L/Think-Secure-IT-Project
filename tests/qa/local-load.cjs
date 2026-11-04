// Bounded HTTP load only. This does not run browser JS or call HIBP.
const {serve}=require('./server.cjs'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'../..');
const users=Number(process.env.QA_USERS||10),seconds=Number(process.env.QA_SECONDS||5);
if(!Number.isInteger(users)||users<1||users>500||!Number.isFinite(seconds)||seconds<1||seconds>1200)throw Error('QA_USERS must be 1..500; QA_SECONDS 1..1200');
(async()=>{let local;try{
 if(!process.env.QA_LOAD_URL)local=await serve(root);
 const base=new URL(process.env.QA_LOAD_URL||local.url);
 if(!['http:','https:'].includes(base.protocol)||base.username||base.password)throw Error('Invalid target');
 const isLocal=['127.0.0.1','localhost','[::1]'].includes(base.hostname);
 if(!isLocal&&process.env.QA_ALLOW_REMOTE_LOAD!=='1')throw Error('Remote load disabled. Use only an approved staging URL with QA_ALLOW_REMOTE_LOAD=1.');
 const routes=['index.html','pages/password-checker.html','css/site-header.css','js/password-checker.js'];
 const times=[],errors=[],start=Date.now(),end=start+seconds*1000;let bytes=0;
 await Promise.all(Array.from({length:users},async(_,i)=>{let n=i;while(Date.now()<end){const target=new URL(routes[n++%routes.length],base.href.endsWith('/')?base.href:base.href+'/');const t=performance.now();try{const r=await fetch(target,{redirect:'error',signal:AbortSignal.timeout(10000)});const b=await r.arrayBuffer();bytes+=b.byteLength;if(!r.ok)errors.push(r.status)}catch(e){errors.push(e.name)}times.push(performance.now()-t);await new Promise(r=>setTimeout(r,250))}}));
 times.sort((a,b)=>a-b);const percentile=p=>times[Math.min(times.length-1,Math.floor(times.length*p))];
 const report={target:base.origin,date:new Date().toISOString(),users,seconds,requests:times.length,errors:errors.length,errorSamples:errors.slice(0,10),bytes,p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),requestsPerSecond:times.length/((Date.now()-start)/1000),scope:'Four static routes; 250ms pacing per worker. Not full page sessions, not CDN capacity evidence, no third-party calls.'};
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});fs.writeFileSync(path.join(root,'test-results','load-latest.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
 }finally{if(local)await new Promise(r=>local.server.close(r))}})().catch(e=>{console.error(e);process.exitCode=1});
