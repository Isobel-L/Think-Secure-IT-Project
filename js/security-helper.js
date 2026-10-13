// Shared guidance: launcher -> robot invitation -> one contextual tip at a time.
(()=>{
 const script=document.currentScript;
 const copy=window.ThinkSecureGuidance?.[script.dataset.guidance];
 if(!copy || document.querySelector('.security-helper'))return;
 const avatar=new URL(script.dataset.avatar || '../robotimage/helper-front.png',script.src).href;
 const paths=script.dataset.figure?[script.dataset.figure]:['wave','guide','think'].map(p=>'../robotimage/assistant-'+p+'.png');
 const assets=paths.map(path=>{const img=new Image();img.src=new URL(path,script.src).href;return img;});
 const ready=Promise.allSettled(assets.map(img=>img.decode()));
 const host=document.createElement('aside');host.className='security-helper';host.dataset.state='launcher';
 host.innerHTML=`<div class="helper-speech helper-invitation" id="security-helper-invitation" hidden><button class="helper-invite" type="button" aria-controls="security-helper-panel" aria-expanded="false"></button></div><div class="helper-speech helper-details" hidden><section class="helper-panel" id="security-helper-panel" aria-labelledby="helper-name"><div class="helper-head"><div><div class="helper-name" id="helper-name"></div><div class="helper-subtitle"></div></div><button class="helper-close" type="button">×</button></div><div class="helper-content"><div class="helper-kicker"></div><div aria-live="polite" aria-atomic="true"><h2 class="helper-title"></h2><p class="helper-copy"></p></div><div class="helper-actions"></div><div class="helper-footer"><span class="helper-count"></span><button class="helper-next" type="button"></button></div></div></section></div><div class="helper-character"><button class="helper-launch" type="button" aria-expanded="false" aria-controls="security-helper-panel"><span class="helper-avatar"><img alt="" src="${avatar}"></span><span class="helper-label"></span><span class="helper-figure" aria-hidden="true"><img alt="" draggable="false"></span></button><button class="helper-dismiss" type="button" hidden>×</button></div>`;
 document.body.append(host);
 const el=s=>host.querySelector(s),speech=el('.helper-details'),launch=el('.helper-launch'),dismiss=el('.helper-dismiss');
 let state='launcher',index=0,lastImage=null,request=0,stage='default',inviteIndex=0;
 const invite=el('.helper-invite'),invitation=el('.helper-invitation');
 const bags=new Map(),lastTips=new Map();
 const locale=()=>copy[window.I18n?.getLanguage()]||copy.en;
 const content=()=>locale().stages?.[stage]||locale();
 function chooseInvite(){const n=content().invites.length;inviteIndex=n>1?(inviteIndex+1+Math.floor(Math.random()*(n-1)))%n:0;}
 function chooseTip(){
  const total=content().tips.length;let bag=bags.get(stage)||[];
  if(!bag.length){
   bag=Array.from({length:total},(_,i)=>i);
   for(let i=total-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
   if(total>1&&bag[total-1]===lastTips.get(stage))[bag[0],bag[total-1]]=[bag[total-1],bag[0]];
  }
  index=bag.pop();bags.set(stage,bag);lastTips.set(stage,index);
 }
 function detectStage(){
  if(!copy.en.stages)return 'default';
  const visible=id=>{const e=document.getElementById(id);return e&&!e.hidden&&!e.classList.contains('hidden');};
  return visible('phrase-result')?'result':visible('phrase-picker')?'picker':'intro';
 }
 function syncStage(){
  const detected=detectStage();if(detected===stage)return;
  stage=detected;host.dataset.stage=stage;index=0;chooseInvite();
  // Update a summoned bot, but never summon a dismissed one or steal page focus.
  const assistantHadFocus=host.contains(document.activeElement);
  if(state==='speech')setState('robot',assistantHadFocus);else render();
 }
 const stageObserver=new MutationObserver(syncStage);
 for(const id of ['phrase-intro','phrase-picker','phrase-result']){const section=document.getElementById(id);if(section)stageObserver.observe(section,{attributes:true,attributeFilter:['class','hidden']});}

 function render(){
  const c=locale(),group=content(),tip=group.tips[index];
  for(const [selector,text] of Object.entries({'.helper-name':c.name,'.helper-subtitle':c.subtitle,'.helper-label':c.help,'.helper-kicker':c.section,'.helper-title':tip[0],'.helper-copy':tip[1],'.helper-count':c.count.replace('{n}',index+1).replace('{total}',group.tips.length),'.helper-next':c.next}))el(selector).textContent=text;
  invite.textContent=group.invites[inviteIndex%group.invites.length];
  const actions=el('.helper-actions');actions.replaceChildren();
  // Delegate to the page's existing actions so its handoff logic remains intact.
  if(stage==='result'&&tip[2]){
   const key='passphrase.'+tip[2],target=document.querySelector('#phrase-result [data-i18n="'+key+'"]');
   if(target){const button=document.createElement('button');button.type='button';button.className='helper-action';button.textContent=I18n.t(key);button.addEventListener('click',()=>target.click());actions.append(button);}
  }
  el('.helper-close').setAttribute('aria-label',c.dismiss);dismiss.setAttribute('aria-label',c.dismiss);
  launch.setAttribute('aria-label',state==='launcher'?c.help:c.name+' — '+c.help);host.setAttribute('aria-label',c.name);
 }
 function setState(next,focus=true){
  state=next;host.dataset.state=state;speech.hidden=state!=='speech';invitation.hidden=state!=='robot';dismiss.hidden=state!=='robot';
  launch.setAttribute('aria-expanded',String(state!=='launcher'));launch.setAttribute('aria-controls',state==='speech'?'security-helper-panel':'security-helper-invitation');invite.setAttribute('aria-expanded',String(state==='speech'));render();
  if(focus)(state==='speech'?el('.helper-close'):state==='robot'?invite:launch).focus({preventScroll:true});
 }
 async function showRobot(){
  if(launch.getAttribute('aria-busy')==='true')return;
  const version=++request;launch.setAttribute('aria-busy','true');
  await ready;
  if(version!==request)return;
  launch.removeAttribute('aria-busy');if(host.hidden)return;
  const loaded=assets.filter(img=>img.complete&&img.naturalWidth>0);
  const choices=loaded.length>1?loaded.filter(img=>img.src!==lastImage):loaded;
  const chosen=choices[Math.floor(Math.random()*choices.length)];
  // If all full-body art fails, retain a usable character using the avatar.
  lastImage=chosen?.src||avatar;el('.helper-figure img').src=lastImage;chooseInvite();setState('robot');
 }
 launch.addEventListener('click',()=>{if(state==='launcher')showRobot();else {chooseInvite();setState('robot');}});
 invite.addEventListener('click',()=>{chooseTip();setState('speech');});
 function closeAssistant(){++request;launch.removeAttribute('aria-busy');setState('launcher');}
 el('.helper-close').addEventListener('click',closeAssistant);
 dismiss.addEventListener('click',closeAssistant);
 el('.helper-next').addEventListener('click',()=>{chooseTip();render();});
 host.addEventListener('keydown',e=>{if(e.key==='Escape'&&state!=='launcher'){closeAssistant();e.stopPropagation();}});
 const next=document.querySelector('.next-step');
 function position(){
  const rect=next?.getBoundingClientRect();
  const reserve=rect?.height && getComputedStyle(next).position==='fixed';
  const bottom=reserve?Math.max(16,innerHeight-rect.top+14):24;
  host.style.setProperty('--helper-bottom',Math.min(bottom,Math.max(24,innerHeight-160))+'px');
 }
 if(next)new ResizeObserver(position).observe(next);
 const blocker=script.dataset.blocker&&document.querySelector(script.dataset.blocker);
 if(blocker){
  const sync=()=>{host.hidden=getComputedStyle(blocker).display!=='none'&&!blocker.hidden;};
  new MutationObserver(sync).observe(blocker,{attributes:true,attributeFilter:['class','hidden','style']});sync();
 }
 window.addEventListener('resize',position);window.addEventListener('languagechange',()=>{render();position();});stage=detectStage();host.dataset.stage=stage;render();position();
})();
