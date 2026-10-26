// A consistent mobile route between activities. Desktop keeps its existing CTAs.
(()=>{
 const page=location.pathname.split('/').pop();
 const routes={
  'cyber-quiz.html':['password-checker.html','common.passwordChecker'],
  'password-checker.html':['passphrase-maker.html','common.passphraseMaker'],
  'passphrase-maker.html':['sticker-generator.html','common.stickerStudio'],
  'sticker-generator.html':['../index.html','common.home']
 };
 const route=routes[page];if(!route)return;
 document.body.classList.add('has-mobile-actions');
 const link=document.createElement('a');
 link.className='mobile-next';link.href=route[0];
 link.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
 function label(){link.setAttribute('aria-label',I18n.t('common.next')+': '+I18n.t(route[1]));}
 document.body.append(link);label();I18n.apply();
 window.addEventListener('languagechange',label);
 // Keep floating navigation behind blocking activity dialogs.
 const blockers=[...document.querySelectorAll('#simulation-modal, #kc-timeup')];
 function sync(){link.hidden=blockers.some(el=>!el.hidden&&getComputedStyle(el).display!=='none');}
 for(const blocker of blockers)new MutationObserver(sync).observe(blocker,{attributes:true,attributeFilter:['class','hidden','style','open']});
 sync();
})();
