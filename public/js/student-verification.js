const form=document.querySelector('#student-form');
const cards=document.querySelector('#meal-order');
const error=document.querySelector('#student-error');
const loading=document.querySelector('#student-loading');
const submit=form.querySelector('[type="submit"]');
let order=[1,2,3],csrf=null,busy=false,locked=false,dragged=null;
const arrow=direction=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${direction<0?'m14 6-6 6 6 6':'m10 6 6 6-6 6'}"/></svg>`;
function lockForm(){locked=true;form.querySelectorAll('input,button').forEach(el=>el.disabled=true);cards.querySelectorAll('.grade-card').forEach(el=>el.draggable=false);cards.querySelectorAll('.grade-grip').forEach(el=>{el.tabIndex=-1;el.setAttribute('aria-disabled','true');});}
function clearError(){error.hidden=true;form.querySelectorAll('.is-invalid').forEach(el=>el.classList.remove('is-invalid'));}
function render(){
 cards.innerHTML=order.map((grade,index)=>`<div class="grade-card" draggable="true" data-grade="${grade}"><div class="grade-grip" tabindex="0" role="button" aria-label="${grade}학년 카드 이동. 좌우 방향키로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01"/></svg><strong>${grade}학년</strong></div><div class="grade-moves"><button type="button" data-move="-1" aria-label="${grade}학년을 앞으로" ${index===0?'disabled':''}>${arrow(-1)}</button><button type="button" data-move="1" aria-label="${grade}학년을 뒤로" ${index===2?'disabled':''}>${arrow(1)}</button></div></div>`).join('');
}
function move(grade,index){
 if(busy||locked)return;
 const from=order.indexOf(grade);if(from<0||index<0||index>=order.length||from===index)return;
 order.splice(from,1);order.splice(index,0,grade);clearError();render();
 cards.querySelector(`[data-grade="${grade}"] .grade-grip`).focus({preventScroll:true});
}
cards.addEventListener('click',event=>{const button=event.target.closest('[data-move]');if(button){const grade=Number(button.closest('[data-grade]').dataset.grade);move(grade,order.indexOf(grade)+Number(button.dataset.move));}});
cards.addEventListener('keydown',event=>{if(!event.target.matches('.grade-grip')||!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const grade=Number(event.target.closest('[data-grade]').dataset.grade);move(grade,order.indexOf(grade)+(event.key==='ArrowLeft'?-1:1));});
cards.addEventListener('dragstart',event=>{if(busy||locked){event.preventDefault();return;}dragged=Number(event.target.closest('[data-grade]')?.dataset.grade);event.dataTransfer.setData('text/plain',String(dragged));event.dataTransfer.effectAllowed='move';});
cards.addEventListener('dragover',event=>{if(dragged){event.preventDefault();event.dataTransfer.dropEffect='move';}});
cards.addEventListener('drop',event=>{event.preventDefault();const target=event.target.closest('[data-grade]');if(target&&dragged)move(dragged,order.indexOf(Number(target.dataset.grade)));dragged=null;});
cards.addEventListener('dragend',()=>{dragged=null;});
let touch=null;
cards.addEventListener('pointerdown',event=>{
 if(event.pointerType==='mouse'||busy||locked||!event.target.closest('.grade-grip'))return;
 const grip=event.target.closest('.grade-grip');touch={id:event.pointerId,grade:Number(grip.closest('[data-grade]').dataset.grade),x:event.clientX};grip.setPointerCapture(event.pointerId);grip.closest('[data-grade]').classList.add('is-dragging');
});
cards.addEventListener('pointermove',event=>{
 if(!touch||event.pointerId!==touch.id)return;event.preventDefault();touch.x=event.clientX;
 const target=nearestCard(touch.x);cards.querySelectorAll('.grade-card').forEach(card=>card.classList.toggle('is-drop-target',card===target));
});
function nearestCard(x){return [...cards.children].reduce((best,card)=>{const r=card.getBoundingClientRect(),b=best.getBoundingClientRect();return Math.abs(x-r.left-r.width/2)<Math.abs(x-b.left-b.width/2)?card:best;},cards.firstElementChild);}
cards.addEventListener('pointerup',event=>{if(!touch||event.pointerId!==touch.id)return;const current=touch;touch=null;const target=nearestCard(event.clientX);move(current.grade,order.indexOf(Number(target.dataset.grade)));cards.querySelectorAll('.grade-card').forEach(card=>card.classList.remove('is-dragging','is-drop-target'));});
cards.addEventListener('pointercancel',()=>{touch=null;cards.querySelectorAll('.grade-card').forEach(card=>card.classList.remove('is-dragging','is-drop-target'));});
form.addEventListener('change',clearError);
function showError(message){error.textContent=message;error.hidden=false;for(const section of form.querySelectorAll('.quiz-question')){section.classList.remove('is-invalid');void section.offsetWidth;section.classList.add('is-invalid');}}
async function api(path,body){
 const r=await fetch('/api/auth/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...(csrf?{'X-CSRF-Token':csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await r.json();if(!r.ok||!data.ok){const e=new Error(data.error||'요청을 처리하지 못했습니다.');e.code=data.code;throw e;}return data;
}
form.addEventListener('submit',async event=>{
 event.preventDefault();if(busy||locked||!csrf)return;clearError();
 const fields=new FormData(form),building=fields.get('building'),floor=Number(fields.get('floor'));
 if(!building||!floor){showError('보건실의 건물과 층을 모두 선택해 주세요.');form.querySelector(!building?'[name="building"]':'[name="floor"]').focus();return;}
 busy=true;submit.disabled=true;submit.setAttribute('aria-busy','true');
 try{await api('student-verify',{mealOrder:order,building,floor});location.replace('/account.html');}
 catch(e){showError(e.message);if(e.code==='STUDENT_VERIFICATION_LOCKED')lockForm();}
 finally{busy=false;submit.disabled=locked;submit.removeAttribute('aria-busy');}
});
render();
try{const session=await api('session');if(!session.user)location.replace('/login.html');else if(session.user.studentVerified)location.replace('/account.html');else{csrf=session.csrf;submit.disabled=!csrf;loading.hidden=true;if(session.user.studentVerificationBlocked){lockForm();showError('추가 인증 시도가 차단되었습니다. 이 네트워크에서는 회원가입도 할 수 없습니다.');}} }
catch{loading.textContent='로그인 상태를 불러오지 못했습니다. 새로고침해 주세요.';}
