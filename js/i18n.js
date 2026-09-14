// Load locale scripts before this module. Only language preference is persisted.
(()=>{
 const locales=window.ThinkSecureLocales||{};
 const storageKey='thinksecure-language';
 let language='en';
 try {const saved=localStorage.getItem(storageKey);if(locales[saved])language=saved;}catch{}
 // A URL language travels across file:// pages, whose storage may be separate.
 const requested=new URL(location.href).searchParams.get('lang');
 if(requested && Object.hasOwn(locales,requested)) language=requested;
 function remember(){
  try{localStorage.setItem(storageKey,language);}catch{}
  try{const url=new URL(location.href);url.searchParams.set('lang',language);history.replaceState(history.state,'',url.href);}catch{}
 }
 const script=document.currentScript;
 const projectRoot=new URL('../',script.src);
 function updateLink(link){
  const raw=link.getAttribute('href');
  if(!raw||raw.startsWith('#')||link.hasAttribute('download'))return;
  let url;try{url=new URL(raw,location.href);}catch{return;}
  if(url.protocol!==projectRoot.protocol||url.host!==projectRoot.host||!url.pathname.startsWith(projectRoot.pathname)||!url.pathname.endsWith('.html'))return;
  url.searchParams.set('lang',language);
  if(link.href!==url.href)link.setAttribute('href',url.href);
 }
 function updateLinks(){document.querySelectorAll('a[href]').forEach(updateLink);}
 function t(key,params={}){
  const value=locales[language]?.[key]??locales.en?.[key];
  if(value===undefined){console.warn('Missing translation key:',key);return key;}
  return value.replace(/\{(\w+)\}/g,(token,name)=>Object.hasOwn(params,name)?String(params[name]):token);
 }
 function apply(root=document){
  root.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});
  for(const attr of ['placeholder','alt','title','aria-label'])root.querySelectorAll('[data-i18n-'+attr+']').forEach(el=>el.setAttribute(attr,t(el.getAttribute('data-i18n-'+attr))));
  if(!document.documentElement.hasAttribute('data-i18n-preserve-lang'))document.documentElement.lang=language;
  root.querySelectorAll('[data-language-select]').forEach(el=>{el.value=language;});
  updateLinks();
 }
 function setLanguage(value){
  if(!locales[value]||value===language)return;
  language=value;remember();
  apply();window.dispatchEvent(new CustomEvent('languagechange',{detail:{language}}));
 }
 window.I18n={t,apply,setLanguage,getLanguage:()=>language};
 document.querySelectorAll('[data-language-select]').forEach(el=>el.addEventListener('change',()=>setLanguage(el.value)));
 remember();apply();
 // Covers dynamically rendered result links and normal/new-tab navigation.
 new MutationObserver(updateLinks).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['href']});
 document.addEventListener('click',event=>{const link=event.target.closest?.('a[href]');if(link)updateLink(link);},true);
})();
