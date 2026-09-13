// Password Checker pilot: fixed guidance only; never reads password input.
(()=>{
 const script=document.currentScript;
 const image=new URL('../robotimage/helper-front.png',script.src).href;
 const copy={
  en:{help:'Need a hand?',name:'Security Bot',subtitle:'Your Password Checker guide',close:'Close tips',section:'A SMALL SECURITY TIP',next:'Next tip →',count:'Tip {n} of 4',tips:[
   ['Start with a made-up password','Type a fictional example into the checker. Never enter a password you use for a real account.'],
   ['Read the feedback','Try your example, then read the strength result and suggestions. The estimate is a learning aid, not a guarantee of security.'],
   ['Change one thing at a time','Make your example longer or replace predictable patterns. Test it again and compare the feedback.'],
   ['Try a passphrase next','Ready for another approach? Open Passphrase Maker using the Next step button and explore combining unrelated words.']
  ]},
  'zh-CN':{help:'需要帮忙吗？',name:'Security Bot 安全小助手',subtitle:'陪你体验密码检测器',close:'关闭提示',section:'一个安全小提示',next:'下一条提示 →',count:'第 {n} 条，共 4 条',tips:[
   ['先用一个虚构密码试试','在输入框里填写一个虚构的示例密码。不要输入你正在用于真实账户的密码。'],
   ['看看检测结果在说什么','检测后，阅读密码强度和改进建议。这里的估算用于帮助学习，并不代表安全保证。'],
   ['每次改一点，再比较','试着增加示例密码的长度，或替换容易预测的规律。再次检测，看看反馈有什么变化。'],
   ['接下来试试密码短语','想换一种方法？点击「下一步」进入密码短语生成器，试试把几个互不相关的词组合起来。']
  ]}
 };
 copy.vi={"help":"Cần trợ giúp?","name":"Security Bot","subtitle":"Hướng dẫn kiểm tra mật khẩu","close":"Đóng mẹo","section":"MẸO AN TOÀN NHỎ","next":"Mẹo tiếp theo →","count":"Mẹo {n} / 4","tips":[["Thử bằng mật khẩu giả","Nhập một mật khẩu mẫu giả định vào công cụ. Không nhập mật khẩu bạn dùng cho tài khoản thật."],["Đọc phản hồi","Kiểm tra mật khẩu mẫu, rồi đọc kết quả độ mạnh và gợi ý. Đây là công cụ học tập, không phải bảo đảm an toàn."],["Mỗi lần thay đổi một chút","Tăng độ dài hoặc thay các mẫu dễ đoán trong mật khẩu mẫu. Kiểm tra lại và so sánh phản hồi."],["Tiếp theo, thử cụm mật khẩu","Bạn muốn thử cách khác? Nhấn nút Bước tiếp theo để mở trang tạo cụm mật khẩu và thử kết hợp các từ không liên quan."]]};
 const host=document.createElement('aside');host.className='security-helper';
 host.innerHTML=`<section class="helper-panel" id="security-helper-panel" aria-labelledby="helper-name" hidden><div class="helper-head"><span class="helper-avatar"><img alt="" src="${image}"></span><div><div class="helper-name" id="helper-name"></div><div class="helper-subtitle"></div></div><button class="helper-close" type="button">×</button></div><div class="helper-content"><div class="helper-kicker"></div><div aria-live="polite" aria-atomic="true"><h2 class="helper-title"></h2><p class="helper-copy"></p></div><div class="helper-footer"><span class="helper-count"></span><button class="helper-next" type="button"></button></div></div></section><button class="helper-launch" type="button" aria-expanded="false" aria-controls="security-helper-panel"><span class="helper-avatar"><img alt="" src="${image}"></span><span class="helper-label"></span></button>`;
 document.body.append(host);
 const el=s=>host.querySelector(s),panel=el('.helper-panel'),launch=el('.helper-launch');let index=0;
 function render(){const c=copy[window.I18n?.getLanguage()]||copy.en;for(const [selector,text] of Object.entries({'.helper-name':c.name,'.helper-subtitle':c.subtitle,'.helper-label':c.help,'.helper-kicker':c.section,'.helper-title':c.tips[index][0],'.helper-copy':c.tips[index][1],'.helper-count':c.count.replace('{n}',index+1),'.helper-next':c.next}))el(selector).textContent=text;el('.helper-close').setAttribute('aria-label',c.close);host.setAttribute('aria-label',c.name);}
 function toggle(open){panel.hidden=!open;launch.setAttribute('aria-expanded',String(open));if(open)el('.helper-close').focus();else launch.focus();}
 launch.addEventListener('click',()=>toggle(panel.hidden));el('.helper-close').addEventListener('click',()=>toggle(false));
 el('.helper-next').addEventListener('click',()=>{index=(index+1)%4;render();});
 host.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){toggle(false);e.stopPropagation();}});
 // Measure the existing Next step link, including wrapped translated labels.
 const next=document.querySelector('.next-step');
 function position(){const rect=next?.getBoundingClientRect();host.style.setProperty('--helper-bottom',rect&&rect.height?Math.max(16,innerHeight-rect.top+14)+'px':'24px');}
 if(next)new ResizeObserver(position).observe(next);
 window.addEventListener('resize',position);window.addEventListener('languagechange',()=>{render();position();});render();position();
})();

