// No production traffic: every non-local request is intercepted by default.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),cp=require('node:child_process');
const {serve,exactFile}=require('./server.cjs');
const playwright=require(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'../..');
const output=path.join(root,'test-results',new Date().toISOString().replace(/[:.]/g,'-'));
const langs=['en','zh-CN','zh-TW','vi','fr','de'];
const pages=['index.html','pages/menu.html','pages/password-checker.html','pages/passphrase-maker.html','pages/sticker-generator.html','pages/cyber-quiz.html'];
const results=[];fs.mkdirSync(output,{recursive:true});
const dictionaries={};for(const lang of langs){const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'languages',lang+'.js'),'utf8'),context);dictionaries[lang]=context.window.ThinkSecureLocales[lang]}
let browser,site;
async function test(id,title,fn){if(process.env.QA_FILTER&&!id.includes(process.env.QA_FILTER))return;const started=Date.now();try{const evidence=await fn();results.push({id,title,status:'PASS',ms:Date.now()-started,evidence})}catch(e){results.push({id,title,status:'FAIL',ms:Date.now()-started,error:e.stack})}console.log(results.at(-1).status,id,title)}
async function page(options={}){
 const context=await browser.newContext({viewport:options.viewport||{width:1440,height:1000},reducedMotion:options.motion||'reduce',acceptDownloads:true});
 const p=await context.newPage(),errors=[],missing=[],requests=[];
 p.setDefaultTimeout(7000);p.setDefaultNavigationTimeout(15000);
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().startsWith(site.url)&&r.status()>=400)missing.push(r.status()+' '+r.url())});
 if(options.init)await context.addInitScript(options.init);
 await context.route('**/*',async r=>{
  const req=r.request(),u=req.url();requests.push({url:u,method:req.method(),body:req.postData(),headers:req.headers()});
  if(u.startsWith(site.url)||u.startsWith('data:')||u.startsWith('blob:'))return r.continue();
  if(u.includes('api.pwnedpasswords.com/')){
   if(options.breach)return options.breach(r);
   return r.fulfill({body:'0'.repeat(35)+':0',headers:{'access-control-allow-origin':'*'}});
  }
  if(u.includes('zxcvbn')){
   if(options.noLibrary)return r.abort();
   return r.fulfill({path:process.env.QA_ZXCVBN_FILE||require.resolve('zxcvbn/dist/zxcvbn.js'),contentType:'text/javascript'});
  }
  if(u.includes('fonts.googleapis.com'))return r.fulfill({body:'',contentType:'text/css'});
  return r.abort();
 });
 return {p,errors,missing,requests,close:()=>context.close()};
}
async function withPage(options,fn){const q=await page(options);try{return await fn(q)}finally{await q.close()}}
const goto=(p,url)=>p.goto(site.url+'/'+url);
const submit=async(p,value)=>{await p.locator('#passwordInput').fill(value);await p.locator('.attack-button').click()};
const breachDone=p=>p.waitForFunction(()=>typeof view!=='undefined'&&view.breach?.status!=='checking'&&view.kind==='result');
const collapse=p=>p.waitForFunction(()=>document.querySelector('.security-helper').dataset.state==='launcher');
async function build(p){await goto(p,'pages/passphrase-maker.html?lang=zh-CN');await p.locator('#begin-button').click();for(let i=0;i<4;i++)await p.locator('.word-button').first().click();await p.locator('#phrase-result:not(.hidden)').waitFor()}
(async()=>{try{
 const hosting=await serve(root);site=hosting;
 browser=await playwright.chromium.launch({headless:true,...(process.env.QA_BROWSER_CHANNEL?{channel:process.env.QA_BROWSER_CHANNEL}:{})});
 await test('STATIC-01','Local HTML links/resources exist with exact filename case',()=>{
  const failures=[];for(const file of pages){const html=fs.readFileSync(path.join(root,file),'utf8');for(const m of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)){const raw=m[1];if(raw.startsWith('#')||/^(https?:|data:|mailto:|javascript:)/.test(raw))continue;const u=new URL(raw,site.url+'/'+file);if(!exactFile(root,u.pathname))failures.push(file+' -> '+raw)}}
  assert.deepEqual(failures,[]);return {pages:pages.length};
 });
 await test('I18N-01','All six dictionaries have matching keys and placeholders',()=>{
  const fail=[];for(const lang of langs){for(const [key,value] of Object.entries(dictionaries.en)){const other=dictionaries[lang][key];if(typeof other!=='string'||!other.trim())fail.push(lang+':missing:'+key);else if(JSON.stringify((value.match(/\{\w+\}/g)||[]).sort())!==JSON.stringify((other.match(/\{\w+\}/g)||[]).sort()))fail.push(lang+':placeholders:'+key)}}assert.deepEqual(fail,[]);
 });
 for(const file of pages) await test('PAGE-'+file,'Page health and six-language switching: '+file,()=>withPage({},async({p,errors,missing})=>{
  await goto(p,file+'?lang=en&skip');await p.waitForTimeout(250);
  for(const lang of langs){await p.locator('[data-language-select]').selectOption(lang);assert.equal(await p.locator('html').getAttribute('lang'),lang);const bad=await p.locator('[data-i18n]').evaluateAll(es=>es.filter(e=>e.textContent===e.dataset.i18n).map(e=>e.dataset.i18n));assert.deepEqual(bad,[])}
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 }));
 await test('PW-01','Five fixed strength levels use real zxcvbn and match the displayed meter',()=>withPage({},async({p,errors})=>{
  await goto(p,'pages/password-checker.html');
  const samples=['password','password123456','Tr0ub4dor&3','correcthorsebatterystaple','Orchid-River-49-Lantern!','abc123!','P@ssword2024!','catsanddogs','ilovecats2024','summer2024!!','mangoGreen83'];
  const levels=await p.evaluate(values=>{const o={};for(const v of values)o[zxcvbn(v).score]??=v;return o},samples);assert.equal(Object.keys(levels).length,5,'Must cover all five levels');
  for(const [score,value] of Object.entries(levels)){await submit(p,value);await breachDone(p);assert.equal(await p.locator('.meter').getAttribute('aria-valuenow'),score);await p.waitForFunction(s=>scoreMascot.stateName==='score_'+s,score)}
  assert.deepEqual(errors,[]);return levels;
 }));
 await test('PW-02','Empty input, Unicode, show/hide, clear and XSS text remain safe',()=>withPage({},async({p,errors})=>{
  await goto(p,'pages/password-checker.html');await p.locator('.attack-button').click();assert.equal(await p.locator('.meter').count(),0);
  const attack='<img src=x onerror="window.qaInjected=1">你好🔐';await submit(p,attack);await breachDone(p);assert.equal(await p.evaluate(()=>window.qaInjected),undefined);
  await p.locator('#togglePassword').click();assert.equal(await p.locator('#passwordInput').getAttribute('type'),'text');
  await p.locator('#clearButton').click();assert.equal(await p.locator('#passwordInput').inputValue(),'');assert.equal(await p.locator('#passwordInput').getAttribute('type'),'password');assert.equal(await p.locator('.meter').count(),0);assert.deepEqual(errors,[]);
 }));
 await test('PRIV-01','Network sends only five SHA1 characters, padding enabled, no password stored',()=>withPage({},async({p,requests})=>{
  const password='QA-only-Secret-82!';await goto(p,'pages/password-checker.html');await submit(p,password);await breachDone(p);
  const hash=crypto.createHash('sha1').update(password).digest('hex').toUpperCase(),api=requests.filter(r=>r.url.includes('api.pwnedpasswords'));
  assert.equal(api.length,1);assert.equal(api[0].url,'https://api.pwnedpasswords.com/range/'+hash.slice(0,5));assert.equal(api[0].body,null);assert.equal(api[0].headers['add-padding'],'true');
  assert(!JSON.stringify(requests).includes(password));assert(!JSON.stringify(requests).includes(hash));
  const store=await p.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));assert(!store.includes(password));
 }));
 await test('PW-03','Known breach suffix match displays positive count',()=>withPage({breach:r=>r.fulfill({body:crypto.createHash('sha1').update('password').digest('hex').toUpperCase().slice(5)+':42',headers:{'access-control-allow-origin':'*'}})},async({p})=>{
  await goto(p,'pages/password-checker.html');await submit(p,'password');await breachDone(p);assert.deepEqual(await p.evaluate(()=>({found:view.breach.found,count:view.breach.count})),{found:true,count:42});
 }));
 for(const status of [429,503])await test('FAIL-'+status,'Breach HTTP '+status+' shows unavailable, retains score',()=>withPage({breach:r=>r.fulfill({status,body:'Unavailable',headers:{'access-control-allow-origin':'*'}})},async({p})=>{
  await goto(p,'pages/password-checker.html');await submit(p,'example-only');await breachDone(p);assert.equal(await p.evaluate(()=>view.breach.status),'error');assert.equal(await p.locator('.meter').count(),1);
 }));
 await test('FAIL-CDN','Blocked scoring library gives useful error without crashing',()=>withPage({noLibrary:true},async({p,errors})=>{
  await goto(p,'pages/password-checker.html');await submit(p,'example-only');assert.equal(await p.locator('.meter').count(),0);assert.equal(await p.evaluate(()=>view.message),'loadingError');assert.deepEqual(errors,[]);
 }));
 await test('RACE-01','Late breach response cannot restore cleared results',()=>withPage({breach:async r=>{await new Promise(resolve=>setTimeout(resolve,500));await r.fulfill({body:'0'.repeat(35)+':0',headers:{'access-control-allow-origin':'*'}})}},async({p})=>{
  await goto(p,'pages/password-checker.html');await submit(p,'example-only');await p.locator('#clearButton').click();await p.waitForTimeout(800);assert.equal(await p.locator('.meter').count(),0);assert.equal(await p.locator('#passwordInput').inputValue(),'');
 }));
 await test('FAIL-TIMEOUT','Breach request has a finite timeout within 12 seconds',()=>withPage({breach:()=>new Promise(()=>{})},async({p})=>{
  await goto(p,'pages/password-checker.html');await submit(p,'example-only');await p.waitForFunction(()=>view.breach?.status==='error',null,{timeout:12000});
 }));
 await test('BOUND-01','Password input has a finite input bound to prevent unbounded synchronous scoring',()=>withPage({},async({p})=>{
  await goto(p,'pages/password-checker.html');const max=await p.locator('#passwordInput').evaluate(e=>e.maxLength);assert(max>0&&max<=1024,'No finite input maxlength; synchronous zxcvbn accepts arbitrary pasted input');
 }));
 await test('FLOW-01','Four words -> translated checker -> Keychain PNG download',()=>withPage({},async({p,errors,missing})=>{
  await build(p);const phrase=(await p.locator('#passphrase-text').textContent()).trim();assert(phrase.length>0);
  await p.locator('#phrase-result a[href*="password-checker"]').click();await p.locator('.meter').waitFor();assert.equal(await p.locator('#passwordInput').inputValue(),phrase);assert.equal(await p.locator('html').getAttribute('lang'),'zh-CN');
  await p.locator('nav a[href*="sticker-generator"]').first().click();await p.locator('#studio:not(.hidden)').waitFor();await p.waitForFunction(()=>document.querySelector('#download-button').href.startsWith('data:image/png'));
  const download=await Promise.all([p.waitForEvent('download'),p.locator('#download-button').click()]);const target=path.join(output,'keychain.png');await download[0].saveAs(target);const bytes=fs.readFileSync(target);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert(bytes.length>1000);assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);return {downloadBytes:bytes.length};
 }));
 for(const file of ['pages/passphrase-maker.html','pages/password-checker.html?check=passphrase','pages/sticker-generator.html'])await test('STORAGE-'+file,'Storage denied has a safe fallback: '+file,()=>withPage({init:()=>{for(const key of ['getItem','setItem','removeItem'])Storage.prototype[key]=()=>{throw new DOMException('Storage blocked','SecurityError')}}},async({p,errors})=>{
  await goto(p,file);if(file.includes('passphrase-maker')){await p.locator('#begin-button').click();for(let i=0;i<4;i++)await p.locator('.word-button').first().click()}
  assert.deepEqual(errors,[]);
 }));
 await test('STORAGE-INVALID','Malformed saved passphrase does not crash Keychain Studio',()=>withPage({init:()=>sessionStorage.setItem('thinksecure-passphrase','{"phrase":"test","words":"invalid"}')},async({p,errors})=>{await goto(p,'pages/sticker-generator.html');await p.waitForTimeout(250);assert.deepEqual(errors,[]);assert(await p.locator('#no-phrase').isVisible())}));
 for(const file of pages.slice(2))await test('BOT-'+file,'Guidance keyboard opening, Pop In/Out, focus return and reduced motion: '+file,()=>withPage({motion:'no-preference'},async({p,errors})=>{
  await goto(p,file);await p.waitForFunction(()=>window.guidanceMascot);await p.locator('.helper-launch').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>guidanceMascot.stateName==='pop_in');
  await p.locator('.helper-invite').click();await p.locator('.helper-next').click();await p.keyboard.press('Escape');await collapse(p);assert(await p.locator('.helper-launch').evaluate(e=>e===document.activeElement));
  await p.emulateMedia({reducedMotion:'reduce'});await p.locator('.helper-launch').click();await p.locator('.helper-dismiss').click();await collapse(p);assert.deepEqual(errors,[]);
 }));
 for(const allCorrect of [true,false])await test('QUIZ-'+(allCorrect?'RIGHT':'WRONG'),'Five scenarios produce exact '+(allCorrect?'5/5':'0/5')+' and restart',()=>withPage({init:()=>{let seed=20261101;Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296)}},async({p,errors})=>{
  await goto(p,'pages/cyber-quiz.html');await p.locator('#start-quiz-button').click();assert(await p.locator('#quiz-start').isVisible());
  for(const id of ['age-range','gender']){const value=await p.locator('#'+id+' option').evaluateAll(es=>es.find(e=>e.value&&!e.disabled).value);await p.locator('#'+id).selectOption(value)}
  await p.locator('#start-quiz-button').click();if(await p.locator('#ts-tutorial-skip').isVisible())await p.locator('#ts-tutorial-skip').click();
  for(let n=0;n<5;n++){
   // Decision unlock uses an explicit inspection control, as a visitor would.
   if(!(await p.locator('#answer-buttons button').first().isVisible())){const inspect=p.locator('.ts-inspect').first();await inspect.click()}
   if(await p.locator('#close-simulation').isVisible())await p.locator('#close-simulation').click();
   const index=await p.evaluate(correct=>{const q=selectedQuestions[currentQuestionIndex];return q.answers.findIndex(a=>correct?a.id===q.correctAnswer:a.id!==q.correctAnswer)},allCorrect);
   await p.locator('#answer-buttons button').nth(index).click();await p.locator('.ts-visual-feedback').waitFor();await p.locator('#next-question-button').click();
  }
  await p.locator('#quiz-complete:not(.hidden)').waitFor();const score=Number(await p.locator('#score-value').textContent());assert.equal(score,allCorrect?5:0);await p.locator('#restart-button').click();assert(await p.locator('#quiz-start').isVisible());assert.deepEqual(errors,[]);
 }));
 await test('FAIL-MALFORMED','Malformed HTTP 200 breach response must not claim no breach',()=>withPage({breach:r=>r.fulfill({body:'<html>Temporary service error</html>',headers:{'access-control-allow-origin':'*'}})},async({p})=>{
  await goto(p,'pages/password-checker.html');await submit(p,'example-only');await breachDone(p);assert.equal(await p.evaluate(()=>view.breach.status),'error');
 }));
 await test('A11Y-AXE','Automated WCAG 2 A/AA and 2.1 A/AA checks on all six initial pages',()=>withPage({},async({p})=>{
  const findings=[];for(const file of pages){await goto(p,file+'?lang=en&skip');await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const scan=await p.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>({id:v.id,nodes:v.nodes.length}))}});findings.push({file,...scan});}
  fs.writeFileSync(path.join(output,'accessibility.json'),JSON.stringify(findings,null,2));assert.equal(findings.reduce((n,f)=>n+f.violations.length,0),0,'See accessibility.json; manual review still required');
 }));
 await test('LAYOUT-01','Six pages at phone/tablet/desktop widths have no horizontal overflow',()=>withPage({},async({p})=>{
  const fail=[];for(const width of [320,390,768,1440]){await p.setViewportSize({width,height:900});for(const file of pages){await goto(p,file+'?lang=de&skip');await p.waitForTimeout(100);if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))fail.push({file,width});}}
  assert.deepEqual(fail,[]);
 }));
 await test('A11Y-01','Visible inputs have labels and meaningful images have alt attributes',()=>withPage({},async({p})=>{
  const fail=[];for(const file of pages){await goto(p,file+'?skip');const bad=await p.evaluate(()=>[...document.querySelectorAll('input:not([type=hidden]),select,textarea,img')].filter(e=>e.getClientRects().length&&!e.closest('[hidden]')).filter(e=>e.tagName==='IMG'?!e.hasAttribute('alt'):!e.labels?.length&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')).map(e=>e.outerHTML.slice(0,180)));if(bad.length)fail.push({file,bad})}assert.deepEqual(fail,[]);
 }));
 }finally{
  if(browser)await browser.close();if(site)await new Promise(r=>site.server.close(r));
  let commit='unknown';try{commit=cp.execFileSync('git',['-c','safe.directory='+root,'-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim()}catch{}
  const report={timestamp:new Date().toISOString(),commit,browser:process.env.QA_BROWSER_CHANNEL||'chromium',limitations:['Local HTTP server, not deployment','HIBP and fonts mocked; real scoring library','Only installed Chromium/Edge tested','No real concurrency certification, screen reader or penetration audit'],passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,results};
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2));
  fs.writeFileSync(path.join(output,'summary.md'),'# ThinkSecure automated QA\n\n'+JSON.stringify({commit,passed:report.passed,failed:report.failed,browser:report.browser})+'\n\n'+results.map(r=>'- '+r.status+' **'+r.id+'** '+r.title+(r.error?'\n\n```\n'+r.error+'\n```':'')).join('\n'));
  console.log('REPORT',output);process.exitCode=report.failed?1:0;
 }
})().catch(e=>{console.error(e);process.exitCode=1});
