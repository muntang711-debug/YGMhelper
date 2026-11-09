const $=selector=>document.querySelector(selector);
let csrf=null,method='key',section='members',cursor='',nextCursor=null,busy=false,otpEnabled=false;
function status(message='',error=false,login=false){const el=$(login?'#admin-login-status':'#admin-status');el.textContent=message;el.classList.toggle('is-error',error);}
async function api(path,body){
 const response=await fetch('/api/admin/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...(csrf?{'X-CSRF-Token':csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json();if(!response.ok||!data.ok){if(response.status===401&&csrf){csrf=null;showLogin();}throw new Error(data.error||'요청을 처리하지 못했습니다.');}return data;
}
function clearEnrollment(){$('#otp-qr').replaceChildren();$('#otp-seed').value='';$('#otp-confirm-code').value='';$('#otp-enrollment').hidden=true;}
function chooseMethod(value){method=value;$('#admin-key-field').hidden=method!=='key';$('#admin-otp-field').hidden=method!=='otp';document.querySelectorAll('[data-method]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.method===method)));$('#admin-key').value='';$('#admin-otp').value='';status('',false,true);}
function showLogin(){$('#admin-login').hidden=false;$('#admin-workspace').hidden=true;$('#admin-logout').hidden=true;clearEnrollment();}
async function showWorkspace(){$('#admin-login').hidden=true;$('#admin-workspace').hidden=false;$('#admin-logout').hidden=false;$('#admin-key').value='';$('#admin-otp').value='';await load();}
document.querySelectorAll('[data-method]').forEach(button=>button.addEventListener('click',()=>{if(!busy)chooseMethod(button.dataset.method);}));
$('#admin-login-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;status('',false,true);const input=$(method==='key'?'#admin-key':'#admin-otp');input.closest('.auth-field').classList.remove('is-invalid');
 const value=input.value.trim();if(!(method==='key'?/^[a-f0-9]{64}$/:/^\d{6}$/).test(value)){input.closest('.auth-field').classList.add('is-invalid');status(method==='key'?'일회용 키를 확인해 주세요.':'OTP 6자리를 입력해 주세요.',true,true);input.focus();return;}
 busy=true;const button=event.target.querySelector('[type="submit"]');button.disabled=true;button.setAttribute('aria-busy','true');
 try{const data=await api('login',method==='key'?{method,key:value}:{method,code:value});csrf=data.csrf;busy=false;await showWorkspace();}
 catch(error){input.closest('.auth-field').classList.add('is-invalid');status(error.message,true,true);}
 finally{input.value='';busy=false;button.disabled=false;button.removeAttribute('aria-busy');}
});
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function time(value){return new Intl.DateTimeFormat('ko-KR',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date(Number(value)));}
function table(headers){const wrap=node('div',undefined,'admin-table-wrap'),table=node('table'),head=node('thead'),row=node('tr');headers.forEach(text=>{const th=node('th',text);th.scope='col';row.append(th);});head.append(row);table.append(head);const body=node('tbody');table.append(body);wrap.append(table);$('#admin-list').replaceChildren(wrap);return body;}
function button(label,task){const el=node('button',label);el.type='button';el.addEventListener('click',()=>{void perform(el,task);});return el;}
async function perform(button,task){
 if(busy)return;busy=true;button.disabled=true;status('처리하고 있습니다.');
 try{await task();busy=false;await load();status('처리했습니다.');}catch(error){status(error.message,true);}finally{busy=false;if(button.isConnected)button.disabled=false;}
}
function renderMembers(data){
 const body=table(['아이디 / 이메일','가입일','이메일 인증','학생 인증','인증 시도','관리']);
 for(const member of data.members){const row=node('tr'),identity=node('td');identity.append(node('strong',member.username),node('span',member.email||'', 'admin-email'));row.append(identity,node('td',time(member.created_at)),node('td',member.email_verified?'완료':'미인증'),node('td',member.student_verified_at?'완료':'미인증'),node('td',`${member.student_quiz_attempts} / 5`));const actions=node('td',undefined,'admin-row-actions');
  for(const [label,action] of [['시도 초기화','reset-attempts'],[member.student_verified_at?'학생 인증 해제':'학생 인증 처리',member.student_verified_at?'revoke-student':'verify-student'],['세션 종료','revoke-sessions']])actions.append(button(label,()=>api('member',{id:member.id,action})));
  row.append(actions);body.append(row);
 }
 if(!data.members.length){const row=node('tr'),cell=node('td','회원이 없습니다.');cell.colSpan=6;row.append(cell);body.append(row);}
}
function renderBlocks(data){
 const body=table(['차단 식별자','관련 회원','차단 시각','관리']);
 for(const block of data.blocks){const row=node('tr'),actions=node('td');actions.append(button('차단 해제',()=>api('unblock-ip',{ipHash:block.ip_hash})));row.append(node('td',block.ip_hash.slice(0,12)),node('td',block.username||'기록 없음'),node('td',time(block.blocked_at)),actions);body.append(row);}
 const note=node('p','IP 원문은 저장하지 않습니다. 회원의 인증 기회도 복구하려면 회원 탭에서 시도를 초기화해 주세요.','admin-note');$('#admin-list').append(note);
 if(!data.blocks.length){const row=node('tr'),cell=node('td','차단된 IP가 없습니다.');cell.colSpan=4;row.append(cell);body.append(row);}
}
const actionNames={'issue-key':'일회용 키 전달',login:'관리자 로그인','reset-attempts':'인증 시도 초기화','verify-student':'학생 인증 처리','revoke-student':'학생 인증 해제','revoke-sessions':'회원 세션 종료','unblock-ip':'IP 차단 해제','otp-enabled':'OTP 등록'};
function renderAudit(data){const body=table(['작업','대상','시각']);for(const item of data.events){const row=node('tr');row.append(node('td',actionNames[item.action]||item.action),node('td',item.target),node('td',time(item.created_at)));body.append(row);}}
async function load(){
 if(busy||!csrf)return;busy=true;status('불러오고 있습니다.');clearEnrollment();$('#admin-list').replaceChildren();$('#admin-otp-setup').hidden=section!=='otp';$('.admin-pagination').hidden=section==='otp';
 try{if(section==='otp'){const data=await api('session');otpEnabled=data.otpEnabled;$('#admin-otp-state').textContent=otpEnabled?'OTP가 등록되어 있습니다.':'인증 앱에 QR 코드를 등록한 뒤 6자리 번호로 확인해 주세요.';$('#otp-reveal').hidden=otpEnabled;}
 else{const data=await api(section+(cursor?'?cursor='+encodeURIComponent(cursor):''));nextCursor=data.nextCursor;$('#admin-next').hidden=!nextCursor;if(section==='members')renderMembers(data);else if(section==='ip-blocks')renderBlocks(data);else renderAudit(data);}status('');}
 catch(error){status(error.message,true);}finally{busy=false;}
}
document.querySelectorAll('[data-section]').forEach(button=>button.addEventListener('click',()=>{if(busy)return;section=button.dataset.section;cursor='';document.querySelectorAll('[data-section]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));void load();}));
$('#admin-refresh').addEventListener('click',()=>{cursor='';void load();});$('#admin-next').addEventListener('click',()=>{if(nextCursor&&!busy){cursor=nextCursor;void load();}});
$('#admin-logout').addEventListener('click',async()=>{if(busy)return;try{await api('logout',{});csrf=null;showLogin();}catch(error){status(error.message,true);}});
$('#otp-reveal').addEventListener('click',async()=>{if(busy)return;busy=true;try{const data=await api('otp-setup',{});$('#otp-qr').innerHTML=data.qr;$('#otp-seed').value=data.secret;$('#otp-enrollment').hidden=false;status('');}catch(error){status(error.message,true);}finally{busy=false;}});
$('#otp-confirm-form').addEventListener('submit',async event=>{event.preventDefault();if(busy)return;const code=$('#otp-confirm-code').value.trim();if(!/^\d{6}$/.test(code)){status('OTP 6자리를 입력해 주세요.',true);return;}busy=true;try{await api('otp-confirm',{code});busy=false;await load();status('OTP를 등록했습니다.');}catch(error){status(error.message,true);}finally{busy=false;$('#otp-confirm-code').value='';}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearEnrollment();});
try{const data=await api('session');csrf=data.csrf;otpEnabled=data.otpEnabled;$('#admin-loading').hidden=true;if(data.authenticated)await showWorkspace();else{chooseMethod(otpEnabled?'otp':'key');showLogin();}}
catch{$('#admin-loading').textContent='관리자 인증 상태를 불러오지 못했습니다. 새로고침해 주세요.';}
