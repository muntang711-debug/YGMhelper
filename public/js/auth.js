let config,widget,csrf,turnstileReady=false,busy=false,finished=false;
const form=document.querySelector('form'),status=document.querySelector('#form-status'),action=form?.dataset.action;
const button=form?.querySelector('[type=submit]');
const usesBot=['signup','login','forgot','resend'].includes(action);
document.querySelectorAll('.password-toggle').forEach(toggle=>{
 const input=document.getElementById(toggle.getAttribute('aria-controls'));
 const label=toggle.closest('.auth-field').querySelector('label').textContent;
 const setVisible=visible=>{input.type=visible?'text':'password';toggle.setAttribute('aria-pressed',String(visible));toggle.setAttribute('aria-label',label+(visible?' 숨기기':' 표시'));};
 toggle.addEventListener('pointerdown',event=>event.preventDefault());
 toggle.addEventListener('click',()=>setVisible(input.type==='password'));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)setVisible(false);});
});
let linkToken=new URLSearchParams(location.hash.slice(1)).get('token')||'';
if(['verify','reset'].includes(action)&&location.hash)history.replaceState(null,'',location.pathname);
const message=(text,tone='')=>{if(status){status.textContent=text;status.className=tone?'is-'+tone:'';}};
const enable=()=>{if(button)button.disabled=busy||finished||!config||config.passwordAuthAvailable===false;};
function clearError(input){
 const wrapper=input.closest('.auth-field,.check-label');wrapper?.classList.remove('is-invalid','auth-shake');input.removeAttribute('aria-invalid');
 const error=document.getElementById(input.id+'-error');error?.remove();input.removeAttribute('aria-describedby');
}
function fieldError(input,text){
 clearError(input);if(!input.id)input.id='consent-'+input.name;
 const wrapper=input.closest('.auth-field,.check-label');wrapper.classList.add('is-invalid');input.setAttribute('aria-invalid','true');
 const error=document.createElement('p');error.className='field-error';error.id=input.id+'-error';error.textContent=text;wrapper.after(error);input.setAttribute('aria-describedby',error.id);
 wrapper.classList.remove('auth-shake');void wrapper.offsetWidth;wrapper.classList.add('auth-shake');
}
function validate(){
 let first;
 for(const input of form.querySelectorAll('input:not([type=hidden])')){
  clearError(input);let error='';const value=input.value;
  if(input.type==='checkbox'&&input.required&&!input.checked)error='필수 항목에 동의해 주세요.';
  else if(input.type!=='checkbox'){
   if(!value.trim())error=input.name==='email'?'이메일을 입력해 주세요.':input.name==='username'?'아이디를 입력해 주세요.':input.name==='confirm'?'비밀번호를 다시 입력해 주세요.':'비밀번호를 입력해 주세요.';
   else if(input.name==='username'&&!/^[A-Za-z0-9_]{4,24}$/.test(value))error='영문, 숫자, 밑줄 4~24자로 입력해 주세요.';
   else if(input.name==='email'&&(input.validity.typeMismatch||value.length>254))error='이메일 주소를 확인해 주세요.';
   else if(input.name==='password'&&['signup','reset'].includes(action)&&Array.from(value).length<10)error='비밀번호를 10자 이상 입력해 주세요.';
   else if(input.name==='password'&&['signup','reset'].includes(action)&&Array.from(value).length>64)error='비밀번호가 너무 깁니다.';
   else if(input.name==='confirm'&&value!==form.elements.namedItem('password').value)error='비밀번호가 일치하지 않습니다.';
  }
  if(error){fieldError(input,error);first ||= input;}
 }
 if(first){first.focus();message('입력한 내용을 확인해 주세요.','error');return false;}return true;
}
async function api(path,body){
 const r=await fetch('/api/auth/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...(csrf?{'X-CSRF-Token':csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const b=await r.json();if(!r.ok||!b.ok){const error=Error(b.error||'요청을 처리하지 못했습니다.');error.field=b.field;error.code=b.code;throw error;}return b;
}
form?.addEventListener('submit',async event=>{
 event.preventDefault();if(busy||finished)return;
 if(!validate())return;
 if(!config||config.passwordAuthAvailable===false){message('회원 기능을 준비 중입니다. 잠시 후 다시 시도해 주세요.','error');return;}
 if(usesBot&&!turnstileReady){message('로봇 확인을 완료해 주세요.','error');return;}
 document.querySelectorAll('.password-toggle[aria-pressed="true"]').forEach(toggle=>toggle.click());
 const fields=new FormData(form);busy=true;enable();button.setAttribute('aria-busy','true');message('처리 중입니다.');
 try{
  const data=await api(action,{username:fields.get('username'),email:fields.get('email'),password:fields.get('password'),age14:fields.has('age14'),privacy:fields.has('privacy'),betaReset:fields.has('betaReset'),consentVersion:config.consentVersion,token:linkToken,remember:fields.has('remember'),turnstile:usesBot?window.turnstile.getResponse(widget):''});
  finished=true;linkToken='';
  if(data.verificationRequired||action==='resend')location.replace('/check-email');
  else if(action==='forgot')location.replace('/reset-email');
  else if(data.verified)location.replace(data.autoLogin?'/':'/email-verified');
  else if(data.reset){form.reset();location.replace('/password-changed');}
  else{form.reset();location.replace('/');}
 }catch(e){if(e.code==='EMAIL_UNVERIFIED'){location.replace('/check-email');return;}if(e.field&&form.elements.namedItem(e.field)){const input=form.elements.namedItem(e.field);fieldError(input,e.message);input.focus();}message(e.message,'error');}
 finally{busy=false;button.removeAttribute('aria-busy');if(usesBot){turnstileReady=false;window.turnstile.reset(widget);}enable();}
});
form?.querySelectorAll('input').forEach(input=>{if(!input.id)input.id='consent-'+input.name;input.addEventListener('input',()=>clearError(input));input.addEventListener('change',()=>clearError(input));});
async function main(){
 if(!form)return;
 config=await api('config');
 if(config.passwordAuthAvailable===false){message('회원 기능을 점검 중입니다. 잠시 후 다시 이용해 주세요.');return;}
 if(action==='signup'&&!config.registrationOpen){message('회원가입을 준비 중입니다.');return;}
 if(['verify','reset'].includes(action)&&!/^[a-f0-9]{64}$/.test(linkToken)){finished=true;message('올바른 링크가 없습니다. 메일에 있는 링크로 접속해 주세요.','error');return;}
 if(action==='delete'){
  const session=await api('session');if(!session.user){location.replace('/login.html');return;}csrf=session.csrf;
  document.querySelector('#account-user').textContent=session.user.username+'님';
  document.querySelector('#logout').addEventListener('click',async()=>{try{await api('logout',{});location.replace('/');}catch(e){message(e.message,'error');}});
 }else if(usesBot){
  if(!config.sitekey){message('로봇 확인 설정을 준비 중입니다.');return;}
  const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.addEventListener('load',()=>{widget=window.turnstile.render('#robot-check',{sitekey:config.sitekey,action,theme:document.documentElement.dataset.theme||'auto',callback:()=>{turnstileReady=true;enable();},'expired-callback':()=>{turnstileReady=false;enable();},'error-callback':()=>{turnstileReady=false;enable();message('로봇 확인을 불러오지 못했습니다. 새로고침해 주세요.','error');}});});
  script.addEventListener('error',()=>message('로봇 확인을 불러오지 못했습니다.','error'));document.head.append(script);
 }
 enable();
 if(action==='verify')form.requestSubmit();
}
main().catch(e=>message(e.message,'error'));
