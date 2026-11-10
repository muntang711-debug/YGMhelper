import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const html=await fs.readFile(new URL('../public/student-verification.html',import.meta.url),'utf8');
const script=await fs.readFile(new URL('../public/js/student-verification.js',import.meta.url),'utf8');
async function boot(t,{locked=false,alreadyBlocked=false}={}){
 const dom=new JSDOM(html,{url:'https://ygmhelper.xyz/student-verification.html',runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window,calls=[];
 w.fetch=async(url,options)=>{calls.push({url,options});return url.endsWith('/session')?Response.json({ok:true,user:{username:'student',studentVerified:false,studentVerificationBlocked:alreadyBlocked},csrf:'fixture'}):Response.json({ok:false,error:'두 문제의 답을 다시 확인해 주세요.',...(locked?{code:'STUDENT_VERIFICATION_LOCKED'}:{})},{status:locked?429:400});};
 await w.eval('(async()=>{'+script+'})()');return {w,d:w.document,calls};
}
test('school quiz uses reorderable cards, custom choices, CSRF and inline errors',async t=>{
 const {w,d,calls}=await boot(t);
 assert.equal(d.querySelector('[type="submit"]').disabled,false);
 assert.equal(d.querySelectorAll('[name="building"]').length,3);assert.equal(d.querySelectorAll('[name="floor"]').length,5);
 d.querySelector('[data-grade="1"] .grade-grip').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
 assert.deepEqual([...d.querySelectorAll('[data-grade]')].map(el=>Number(el.dataset.grade)),[2,1,3]);
 d.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(calls.length,1);assert.match(d.querySelector('#student-error').textContent,/모두 선택/);
 d.querySelector('[name="building"][value="east"]').click();d.querySelector('[name="floor"][value="4"]').click();
 d.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,0));
 const post=calls.find(c=>c.options.method==='POST');assert(post);assert.equal(post.options.headers['X-CSRF-Token'],'fixture');assert.deepEqual(JSON.parse(post.options.body),{mealOrder:[2,1,3],building:'east',floor:4});
 assert.equal(d.querySelector('#student-error').hidden,false);assert.equal(d.querySelector('[type="submit"]').disabled,false);
});
test('school quiz cards can be arranged with the keyboard without native validation popups',async t=>{
 const {w,d}=await boot(t);d.querySelector('[data-grade="2"] .grade-grip').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));
 assert.equal(d.querySelector('[data-grade]').dataset.grade,'2');assert.equal(d.activeElement.closest('[data-grade]').dataset.grade,'2');assert.equal(d.querySelector('form').noValidate,true);
});
test('grade names are separated by arrows and can be swapped by tapping without native drag ghosts',async t=>{
 const {w,d}=await boot(t);assert.equal(d.querySelectorAll('.order-arrow').length,2);assert.equal(d.querySelector('[draggable="true"]'),null);
 d.querySelector('[data-grade="1"] button').click();d.querySelector('[data-grade="2"] button').click();
 assert.deepEqual([...d.querySelectorAll('[data-grade]')].map(el=>Number(el.dataset.grade)),[2,1,3]);
 const event=new w.Event('dragstart',{bubbles:true,cancelable:true});d.querySelector('[data-grade]').dispatchEvent(event);assert.equal(event.defaultPrevented,true);
});
test('pointer dragging reorders inside the row while its container retains capture',async t=>{
 const {w,d}=await boot(t),row=d.querySelector('#meal-order');row.getBoundingClientRect=()=>({left:0,width:300});
 let captured=false;row.setPointerCapture=()=>{captured=true;};row.hasPointerCapture=()=>captured;row.releasePointerCapture=()=>{captured=false;};
 const event=(type,x)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,button:0,clientX:x,clientY:10});return e;};
 d.querySelector('[data-grade="1"] button').dispatchEvent(event('pointerdown',50));row.dispatchEvent(event('pointermove',250));
 assert.equal(captured,true);assert.deepEqual([...row.querySelectorAll('[data-grade]')].map(el=>Number(el.dataset.grade)),[2,3,1]);
 row.dispatchEvent(event('pointerup',250));assert.equal(captured,false);assert.equal(row.querySelector('[draggable="true"]'),null);
});
test('exhausted student verification stays disabled after the response and on a new page load',async t=>{
 const {w,d,calls}=await boot(t,{locked:true});d.querySelector('[name="building"][value="east"]').click();d.querySelector('[name="floor"][value="4"]').click();
 d.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,0));
 assert.equal(d.querySelector('[type="submit"]').disabled,true);assert([...d.querySelectorAll('input')].every(el=>el.disabled));
 d.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,0));assert.equal(calls.filter(c=>c.options.method==='POST').length,1);
 const reloaded=await boot(t,{alreadyBlocked:true});assert.equal(reloaded.d.querySelector('[type="submit"]').disabled,true);assert.equal(reloaded.d.querySelector('#student-error').hidden,false);
});
