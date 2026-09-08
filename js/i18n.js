// Load locale scripts before this module. Only language preference is persisted.
(()=>{
 const locales=window.ThinkSecureLocales||{};
 const storageKey='thinksecure-language';
 let language='en';
 try {const saved=localStorage.getItem(storageKey);if(locales[saved])language=saved;}catch{}
 function t(key,params={}){
  const value=locales[language]?.[key]??locales.en?.[key];
  if(value===undefined){console.warn('Missing translation key:',key);return key;}
  return value.replace(/\{(\w+)\}/g,(token,name)=>Object.hasOwn(params,name)?String(params[name]):token);
 }
 function apply(root=document){
  root.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});
  for(const attr of ['placeholder','alt','title','aria-label'])root.querySelectorAll('[data-i18n-'+attr+']').forEach(el=>el.setAttribute(attr,t(el.getAttribute('data-i18n-'+attr))));
  document.documentElement.lang=language;
  root.querySelectorAll('[data-language-select]').forEach(el=>{el.value=language;});
 }
 function setLanguage(value){
  if(!locales[value]||value===language)return;
  language=value;try{localStorage.setItem(storageKey,language);}catch{}
  apply();window.dispatchEvent(new CustomEvent('languagechange',{detail:{language}}));
 }
 window.I18n={t,apply,setLanguage,getLanguage:()=>language};
 document.querySelectorAll('[data-language-select]').forEach(el=>el.addEventListener('change',()=>setLanguage(el.value)));
 apply();
})();
