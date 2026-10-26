// The score and breach result are data; language changes only re-render that data.
const passwordForm=document.getElementById('passwordForm');
const passwordInput=document.getElementById('passwordInput');
const resultPanel=document.getElementById('resultPanel');
const togglePassword=document.getElementById('togglePassword');
const clearButton=document.getElementById('clearButton');
const robotImage=document.getElementById('robotImage');
const crackerTitle=document.getElementById('crackerTitle');
const crackerMessage=document.getElementById('crackerMessage');
let requestVersion=0;
let view={kind:'initial'};
const text=(key,params)=>I18n.t('password.'+key,params);
const htmlText=(key,params)=>escapeHtml(text(key,params));

passwordForm.addEventListener('submit',async event=>{
 event.preventDefault();
 const version=++requestVersion;
 const password=passwordInput.value;
 if(!password){view={kind:'empty',message:'emptyInput'};render();passwordInput.focus();return;}
 if(typeof zxcvbn!=='function'){view={kind:'empty',message:'loadingError'};render();return;}
 const result=zxcvbn(password);
 // Do not retain zxcvbn's password or matched tokens just to translate the view.
 view={kind:'result',strength:{score:result.score,guesses:result.guesses,guesses_log10:result.guesses_log10,feedback:result.feedback},length:password.length,breach:{status:'checking'}};
 render();
 try{
  const breach=await checkPwnedPassword(password);
  if(version!==requestVersion)return;
  view.breach=breach;render();
 }catch{
  if(version!==requestVersion)return;
  view.breach={status:'error'};render();
 }
});
togglePassword.addEventListener('click',()=>{
 passwordInput.type=passwordInput.type==='password'?'text':'password';
 renderToggle();
});
clearButton.addEventListener('click',()=>{
 ++requestVersion;passwordInput.value='';passwordInput.type='password';
 view={kind:'empty',message:'clearedMessage'};render();passwordInput.focus();
});
passwordInput.addEventListener('input',()=>{
 // Pending results belong to the submitted input, not newly edited text.
 ++requestVersion;view={kind:'initial'};render();
});
function renderToggle(){
 togglePassword.textContent=text(passwordInput.type==='password'?'show':'hide');
 togglePassword.setAttribute('aria-pressed',String(passwordInput.type==='text'));
}
function render(){
 renderToggle();
 if(view.kind!=='result'){
  robotImage.closest('.cracker-area').removeAttribute('data-score');
  robotImage.src='../robotimage/bot-thoughtful.png';robotImage.alt=text('bot.alt');
  crackerTitle.textContent=text(view.kind==='initial'?'bot.initialTitle':'bot.resetTitle');
  crackerMessage.textContent=text('bot.readyMessage');
  resultPanel.className='result-panel is-empty';
  resultPanel.innerHTML='<div class="empty-state"><h2>'+htmlText(view.kind==='initial'?'initial.title':'emptyTitle')+'</h2><p>'+htmlText(view.kind==='initial'?'initial.message':view.message)+'</p></div>';
  return;
 }
 const {strength,breach,length}=view;
 const score=strength.score;
 const label=text('strength.'+score);
 robotImage.closest('.cracker-area').dataset.score=String(score);
 robotImage.src='../robotimage/bot-'+['worried','concerned','thoughtful','happy','celebrating'][score]+'.png';
 robotImage.alt=text('bot.alt.'+score);crackerTitle.textContent=label;crackerMessage.textContent=text('bot.message.'+score);
 resultPanel.className='result-panel '+(score<=1?'risk-high':score===2?'risk-medium':'risk-low');
 const summary=score<=1?'weak':score===2?'fair':strength.guesses_log10>=12?'highGuesses':'stronger';
 const advice=[];
 if(strength.feedback?.warning)advice.push(translateZxcvbn(strength.feedback.warning));
 advice.push(...(strength.feedback?.suggestions||[]).filter(Boolean).map(translateZxcvbn));
 if(length<14)advice.push(text('advice.length'));
 advice.push(text('advice.unique'),text('advice.manager'));
 const basisOpen=resultPanel.querySelector('.strength-basis details')?.open;
 resultPanel.innerHTML=`
 <div class="result-header"><div><p class="score-label">${htmlText('strengthTitle')}</p><h2 class="strength-title">${escapeHtml(label)}</h2></div></div>
 <div class="meter" role="meter" aria-valuemin="0" aria-valuemax="4" aria-valuenow="${score}" aria-label="${htmlText('strengthAria',{label})}" aria-valuetext="${escapeHtml(label)}"><div class="meter-fill" style="width:${(score+1)*20}%"></div></div>
 <section class="feedback-section"><h3>${htmlText('meaningTitle')}</h3><p>${htmlText('summary.'+summary)}</p></section>
 ${renderStrengthBasis(strength)}
 <section class="feedback-section"><h3>${htmlText('breachTitle')}</h3>${renderBreachStatus(breach)}</section>
 <section class="feedback-section"><h3>${htmlText('adviceTitle')}</h3><ul>${[...new Set(advice)].slice(0,5).map(s=>'<li>'+escapeHtml(s)+'</li>').join('')}</ul></section>
 <section class="challenge-next"><h3>${score<4?'🛠️ '+htmlText('challenge.title'):'🏆 '+htmlText('complete.title')}</h3><p>${htmlText(score<4?'challenge.body':'complete.body')}</p>${score===4?'<p><a href="passphrase-maker.html" class="quiz-button">'+htmlText('complete.link')+'</a></p>':''}</section>`;
 if(basisOpen)resultPanel.querySelector('.strength-basis details').open=true;
}
function renderStrengthBasis(strength){
 // These are the exact guesses_to_score boundaries in the pinned zxcvbn 4.4.2
 // (including its +5 tolerance). The displayed grade always uses result.score.
 const bounds=[1005,1000005,100000005,10000000005];
 const number=n=>new Intl.NumberFormat(I18n.getLanguage()).format(n);
 const range=score=>score===0?`g < ${number(bounds[0])}`:score===4?`g ≥ ${number(bounds[3])}`:`${number(bounds[score-1])} ≤ g < ${number(bounds[score])}`;
 const guesses=new Intl.NumberFormat(I18n.getLanguage(),{notation:strength.guesses>=1e6?'scientific':'standard',maximumSignificantDigits:3}).format(strength.guesses);
 return `<section class="feedback-section strength-basis"><h3>${htmlText('basis.title')}</h3>
 <p>${htmlText('basis.estimate',{guesses})} <strong>${htmlText('strength.'+strength.score)}</strong>: ${htmlText('basis.grade'+strength.score)}</p>
 ${strength.feedback?.warning?'<p>'+escapeHtml(translateZxcvbn(strength.feedback.warning))+'</p>':''}
 <details><summary>${htmlText('basis.scale')}</summary><p>${htmlText('basis.method')}</p>
 <ol class="strength-scale">${[0,1,2,3,4].map(score=>`<li${score===strength.score?' class="is-current"':''}><strong>${htmlText('strength.'+score)}</strong><span class="strength-range">${escapeHtml(range(score))}</span><p>${htmlText('basis.grade'+score)}</p></li>`).join('')}</ol>
 <p>${htmlText('basis.boundaries')}</p><p>${htmlText('basis.limit')}</p>
 <h4>${htmlText('basis.references')}</h4><ul>
 <li><a href="https://www.usenix.org/conference/usenixsecurity16/technical-sessions/presentation/wheeler" target="_blank" rel="noopener noreferrer">Wheeler (2016), zxcvbn: Low-Budget Password Strength Estimation, USENIX Security.</a></li>
 <li><a href="https://github.com/dropbox/zxcvbn/blob/v4.4.2/src/time_estimates.coffee" target="_blank" rel="noopener noreferrer">zxcvbn 4.4.2 — guesses_to_score</a></li>
 <li><a href="https://pages.nist.gov/800-63-4/sp800-63b.html#passwordver" target="_blank" rel="noopener noreferrer">NIST SP 800-63B-4 (2025), §3.1.1.2</a>: ${htmlText('basis.nist')}</li>
 </ul></details></section>`;
}
function renderBreachStatus(breach){
 const key=breach.status==='checking'?'checking':breach.status==='error'?'error':breach.found?'found':'notFound';
 return '<div class="breach-status"><span class="status-dot"></span><p>'+htmlText('breach.'+key,{count:new Intl.NumberFormat(I18n.getLanguage()).format(breach.count||0)})+'</p></div>';
}
window.addEventListener('languagechange',render);
render();

async function checkPwnedPassword(password) {

    // ======================================
    // Convert password to SHA-1 locally
    // ======================================

    const hash =
        await sha1(password);


    // First 5 characters
    const prefix =
        hash.slice(0, 5);


    // Remaining hash
    const suffix =
        hash.slice(5);


    // ======================================
    // Send ONLY the first five hash
    // characters to HIBP
    // ======================================

    const response =
        await fetch(
            `https://api.pwnedpasswords.com/range/${prefix}`,
            {
                headers: {
                    "Add-Padding": "true"
                }
            }
        );


    // ======================================
    // Check API response
    // ======================================

    if (!response.ok) {

        throw new Error(
            "HIBP request failed"
        );
    }


    // ======================================
    // Read API response
    // ======================================

    const text =
        await response.text();


    // ======================================
    // Find our hash suffix locally
    // ======================================

    const match =
        text
            .split("\n")

            .map(
                (line) =>
                    line
                        .trim()
                        .split(":")
            )

            .find(
                ([returnedSuffix, count]) =>

                    returnedSuffix === suffix
                    &&
                    Number(count) > 0
            );


    // ======================================
    // Return result
    // ======================================

    return {

        status: "complete",

        found:
            Boolean(match),

        count:
            match
                ? Number(match[1])
                : 0
    };
}


// ==========================================
// SHA-1 Hash
// ==========================================

async function sha1(value) {

    const encoder =
        new TextEncoder();


    const data =
        encoder.encode(value);


    const digest =
        await crypto.subtle.digest(
            "SHA-1",
            data
        );


    return [
        ...new Uint8Array(digest)
    ]

        .map(
            (byte) =>
                byte
                    .toString(16)
                    .padStart(2, "0")
        )

        .join("")

        .toUpperCase();
}


// ==========================================
// Escape HTML
// Prevent text from being interpreted
// as HTML
// ==========================================

function escapeHtml(value) {

    return String(value)
        .replace(
            /[&<>"']/g,

            (char) => {

                const entities = {

                    "&": "&amp;",

                    "<": "&lt;",

                    ">": "&gt;",

                    '"': "&quot;",

                    "'": "&#039;"
                };


                return entities[char];
            }
        );
}
