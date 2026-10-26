// Translate Quiz presentation without re-rendering its stateful simulations.
// The English quiz.* catalog is the source-text lookup; both locales share keys.
// Keep English catalog values in sync when editing cyber-quiz.js source copy.
(()=>{
  'use strict';
  if(!window.I18n || !window.ThinkSecureLocales?.en) return;
  const normalize=value=>value.replace(/\s+/g,' ').trim();
  const keys=new Map(Object.entries(window.ThinkSecureLocales.en)
    .filter(([key])=>key.startsWith('quiz.') && key!=='quiz.progress')
    .map(([key,value])=>[normalize(value),key]));
  const textRecords=new WeakMap();
  const attrRecords=new WeakMap();
  const attrs=['aria-label','title','placeholder','alt'];
  function translated(source){
    const text=normalize(source);
    const progress=text.match(/^Scenario (\d+) of (\d+)$/);
    const key=keys.get(text);
    if(!progress && !key)return source;
    const value=progress?I18n.t('quiz.progress',{current:progress[1],total:progress[2]}):I18n.t(key);
    // Preserve surrounding whitespace and exact original English on return.
    if(I18n.getLanguage()==='en')return source;
    return source.slice(0,source.search(/\S/))+value+(source.match(/\s*$/)?.[0]||'');
  }
  function updateText(node){
    if(!node.parentElement || node.parentElement.closest('script,style,[data-i18n],[data-language-select]'))return;
    let record=textRecords.get(node);
    if(!record || node.data!==record.last)record={source:node.data,last:node.data};
    const value=translated(record.source);
    record.last=value;textRecords.set(node,record);
    if(node.data!==value)node.data=value;
  }
  function updateAttributes(el){
    let records=attrRecords.get(el);if(!records){records={};attrRecords.set(el,records);}
    for(const attr of attrs){
      if(!el.hasAttribute(attr)||el.hasAttribute('data-i18n-'+attr))continue;
      const current=el.getAttribute(attr);
      let record=records[attr];
      if(!record||current!==record.last)record={source:current,last:current};
      const value=translated(record.source);record.last=value;records[attr]=record;
      if(current!==value)el.setAttribute(attr,value);
    }
  }
  // The start title carries an <em> accent word, so it is rendered whole rather than per text node.
  const title=document.querySelector('[data-quiz-title]');
  function renderTitle(){
    const value=I18n.t('quiz.ui.cyber_safety_challenge_title');
    if(title && title.innerHTML!==value)title.innerHTML=value;
  }
  function apply(){
    renderTitle();
    const walker=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT);
    let node;while(node=walker.nextNode())updateText(node);
    document.querySelectorAll('[aria-label],[title],[placeholder],[alt]').forEach(updateAttributes);
  }
  // Coalesced mutations cover newly opened messages, feedback and modal content.
  // No IDs, form values, links, answer data, score or device DOM are replaced.
  const observer=new MutationObserver(apply);
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attrs});
  window.addEventListener('languagechange',apply);
  apply();
})();
