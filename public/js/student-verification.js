const form=document.querySelector('#student-form');
const cards=document.querySelector('#meal-order');
const error=document.querySelector('#student-error');
const loading=document.querySelector('#student-loading');
const submit=form.querySelector('[type="submit"]');
let order=[1,2,3],csrf=null,busy=false,locked=false,selected=null,pointer=null,suppressClick=false;
function lockForm(){locked=true;form.querySelectorAll('input,button').forEach(el=>el.disabled=true);}
function clearError(){error.hidden=true;form.querySelectorAll('.is-invalid').forEach(el=>el.classList.remove('is-invalid'));}
function render(){
 const before=new Map([...cards.querySelectorAll('[data-grade]')].map(el=>[Number(el.dataset.grade),el.getBoundingClientRect().left]));
 cards.innerHTML=order.map((grade,index)=>'<div class="grade-card" data-grade="'+grade+'"><button type="button" class="grade-grip" aria-label="'+grade+'학년 카드 이동. 좌우 방향키로 이동" aria-pressed="'+(selected===grade)+'" '+(locked?'disabled':'')+'>'+grade+'학년</button></div>'+(index<2?'<svg class="order-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>':'')).join('');
 if(!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)for(const el of cards.querySelectorAll('[data-grade]')){const from=before.get(Number(el.dataset.grade));if(from!==undefined&&el.animate)el.animate([{transform:'translateX('+(from-el.getBoundingClientRect().left)+'px)'},{transform:'translateX(0)'}],{duration:180,easing:'ease-out'});}
}
function move(grade,index){if(busy||locked)return;const from=order.indexOf(grade);if(from<0||index<0||index>=3||from===index)return;order.splice(from,1);order.splice(index,0,grade);selected=null;clearError();render();}
function focusGrade(grade){cards.querySelector('[data-grade="'+grade+'"] .grade-grip').focus({preventScroll:true});}
function nearestIndex(x){const r=cards.getBoundingClientRect(),width=cards.querySelector('[data-grade]').offsetWidth||r.width/3;return Math.max(0,Math.min(2,Math.round((x-r.left-width/2)/((r.width-width)/2))));}
 cards.addEventListener('dragstart',event=>event.preventDefault());
 cards.addEventListener('click',event=>{if(busy||locked||suppressClick)return;const card=event.target.closest('[data-grade]');if(!card)return;const grade=Number(card.dataset.grade);if(selected===null){selected=grade;render();}else{const first=order.indexOf(selected),second=order.indexOf(grade);[order[first],order[second]]=[order[second],order[first]];selected=null;clearError();render();}focusGrade(grade);});
 cards.addEventListener('keydown',event=>{if(!event.target.matches('.grade-grip')||!['ArrowLeft','ArrowRight','Escape'].includes(event.key))return;event.preventDefault();const grade=Number(event.target.closest('[data-grade]').dataset.grade);if(event.key==='Escape'){selected=null;render();}else move(grade,order.indexOf(grade)+(event.key==='ArrowLeft'?-1:1));focusGrade(grade);});
 cards.addEventListener('pointerdown',event=>{const card=event.target.closest('[data-grade]');if(!card||busy||locked||event.button>0)return;pointer={id:event.pointerId,grade:Number(card.dataset.grade),x:event.clientX,y:event.clientY,dragging:false};});
 cards.addEventListener('pointermove',event=>{if(!pointer||pointer.id!==event.pointerId)return;const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;if(!pointer.dragging){if(Math.abs(dx)<8||Math.abs(dx)<Math.abs(dy))return;pointer.dragging=true;cards.setPointerCapture(event.pointerId);}event.preventDefault();move(pointer.grade,nearestIndex(event.clientX));});
 function endPointer(event){if(!pointer||pointer.id!==event.pointerId)return;const current=pointer;pointer=null;if(current.dragging){suppressClick=true;setTimeout(()=>{suppressClick=false;},0);if(cards.hasPointerCapture(event.pointerId))cards.releasePointerCapture(event.pointerId);focusGrade(current.grade);}}
 cards.addEventListener('pointerup',endPointer);cards.addEventListener('pointercancel',endPointer);
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
