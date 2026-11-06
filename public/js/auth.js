let config,widget,csrf,turnstileReady=false;
const form=document.querySelector('form'), status=document.querySelector('#form-status');
const action=form?.dataset.action;
const message=text=>{if(status)status.textContent=text;};
async function api(path,body){const r=await fetch('/api/auth/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...(csrf?{'X-CSRF-Token':csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});const b=await r.json();if(!r.ok||!b.ok)throw Error(b.error||'요청을 처리하지 못했습니다.');return b;}
 form?.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('[type=submit]');if(button.disabled||!config)return;
 const fields=new FormData(form);if(action==='signup'&&fields.get('password')!==fields.get('confirm')){message('비밀번호 확인이 일치하지 않습니다.');return;}
 if(action!=='delete'&&!turnstileReady){message('로봇 확인을 완료해 주세요.');return;}
 button.disabled=true;button.setAttribute('aria-busy','true');message('처리 중입니다.');
 try{await api(action,{username:fields.get('username'),password:fields.get('password'),age14:fields.has('age14'),privacy:fields.has('privacy'),betaReset:fields.has('betaReset'),consentVersion:config.consentVersion,turnstile:action==='delete'?'':window.turnstile.getResponse(widget)});form.reset();location.replace('/');}
 catch(e){message(e.message);}finally{button.removeAttribute('aria-busy');if(action!=='delete'){turnstileReady=false;window.turnstile.reset(widget);}else button.disabled=false;}
 });
async function main(){
 config=await api('config');
 if(config.passwordAuthAvailable===false){message('현재는 화면 검토용 베타입니다. 안전한 인증 처리를 준비하는 동안 가입과 로그인을 잠시 닫았습니다.');return;}
 if(document.querySelector('#logout')){
  const session=await api('session');if(!session.user){location.replace('/login.html');return;}csrf=session.csrf;form.querySelector('[type=submit]').disabled=false;
  document.querySelector('#account-user').textContent=session.user.username+'님';
  document.querySelector('#logout').addEventListener('click',async()=>{try{await api('logout',{});location.replace('/');}catch(e){message(e.message);}});
 }else{
  if(action==='signup'&&!config.registrationOpen){message('회원가입을 준비 중입니다.');return;}
  if(!config.sitekey){message('로봇 확인 설정을 준비 중입니다.');return;}
  const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.addEventListener('load',()=>{widget=window.turnstile.render('#robot-check',{sitekey:config.sitekey,action,theme:'auto',callback:()=>{turnstileReady=true;form.querySelector('[type=submit]').disabled=false;},'expired-callback':()=>{turnstileReady=false;form.querySelector('[type=submit]').disabled=true;},'error-callback':()=>{turnstileReady=false;form.querySelector('[type=submit]').disabled=true;message('로봇 확인을 불러오지 못했습니다. 새로고침해 주세요.');}});});
  script.addEventListener('error',()=>message('로봇 확인을 불러오지 못했습니다.'));document.head.append(script);
 }

}
main().catch(e=>message(e.message));
