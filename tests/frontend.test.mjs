import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import * as helpers from '../public/js/common.js';

const html=await fs.readFile(new URL('../public/index.html',import.meta.url),'utf8');
const script=(await fs.readFile(new URL('../public/js/app.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/,'');
const fixtureRange=()=>helpers.selectableRange(helpers.civilDate(2026,10,5));
const flush=()=>new Promise(resolve=>setTimeout(resolve,20));
async function boot(t,fetchImpl,{deniedStorage=false,savedClass='1',width=1024,today='2026-11-05T03:00:00Z'}={}){
  t.mock.timers.enable({apis:['Date'],now:new Date(today)});
  const dom=new JSDOM(html,{url:'https://ygmhelper.xyz/',runScripts:'outside-only',pretendToBeVisual:true});
  t.after(()=>dom.window.close());const w=dom.window;
  Object.assign(w,helpers);
  Object.defineProperty(w,'innerWidth',{value:width,configurable:true});
  w.matchMedia=query=>({matches:query.includes('prefers-reduced-motion'),addEventListener(){}});
  const calls=[];
  w.fetch=async(url,options={})=>{calls.push({url:String(url),options});return fetchImpl?fetchImpl(String(url),options):defaultResponse(String(url));};
  if(deniedStorage)Object.defineProperty(w,'localStorage',{get(){throw Error('SecurityError');}});
  else w.localStorage.setItem('ygmhelper-class',savedClass);
  w.eval(script);await flush();return {w,document:w.document,calls};
}
function defaultResponse(url){
  if(url.startsWith('/api/meal-rating'))return Response.json({ok:true,total:0,counts:{},myRating:null,average:null,canVote:true,csrf:"fixture-csrf"});
  if(url.startsWith('/api/meal?'))return Response.json({ok:true,date:new URL(url,'https://test').searchParams.get('date'),items:['비타민C100음료 (12)','우유 (선택)'],calories:'100 Kcal'});
  if(url.startsWith('/api/classes'))return Response.json({ok:true,classes:[1,2]});
  const days=Array.from({length:5},(_,i)=>{const d=new Date(fixtureRange().minDate);d.setUTCDate(d.getUTCDate()+i);return {date:helpers.dateParam(d),items:[{period:1,subject:'국어',teacher:'교사*'}]};});
  return Response.json({ok:true,classes:[1,2],items:days[0].items,days,available:true});
}
function clickDate(document,param){document.querySelector('.date-trigger').click();let button=document.querySelector(`[data-date="${param}"]:not(:disabled)`);if(!button){document.querySelector('[data-cal-nav="1"]').click();button=document.querySelector(`[data-date="${param}"]:not(:disabled)`);}assert(button,'selectable date exists');button.click();}

test('blocked storage still renders data and submits session CSRF without an anonymous identity',async t=>{
  const {document,calls}=await boot(t,null,{deniedStorage:true});
  assert.equal(document.querySelector('.meal-name').textContent,'비타민C100음료');
  assert.equal(document.querySelector('.meal-allergen-button').textContent,'12');
  assert.equal(calls.find(c=>c.url.startsWith('/api/meal-rating')).options.headers['X-Meal-Voter'],undefined);
  document.querySelector('.meal-rating-option').click();await flush();
  const post=calls.find(c=>c.options.method==='POST');assert.equal(JSON.parse(post.options.body).voterId,undefined);assert.equal(post.options.headers['X-CSRF-Token'],'fixture-csrf');
});
test('empty invalid-class response does not loop',async t=>{
  const {calls,document}=await boot(t,url=>url.startsWith('/api/timetable')?Response.json({ok:true,classes:[],items:[],invalidClass:true}):defaultResponse(url),{savedClass:'99'});
  assert.equal(calls.filter(c=>c.url.startsWith('/api/timetable')).length,1);
  assert.match(document.querySelector('#weekly-timetable').textContent,/시간표가 없습니다/);
});

test('guests see rating counts and a login link without being able to submit',async t=>{
 const {document,calls}=await boot(t,url=>url.startsWith('/api/meal-rating')?Response.json({ok:true,total:2,counts:{4:2},average:4,myRating:null,canVote:false,requiresLogin:true,csrf:null}):defaultResponse(url));
 assert.equal(document.querySelector('.rating-count').textContent,'2표');
 assert.equal(document.querySelector('.rating-login').hidden,false);
 for(const button of document.querySelectorAll('.meal-rating-option')){assert.equal(button.disabled,true);button.click();}
 await flush();assert.equal(calls.some(c=>c.options.method==='POST'),false);
});
test('invalid class switches to a valid class and retries only once',async t=>{
  const {calls}=await boot(t,url=>url.startsWith('/api/timetable')&&url.includes('class=99')?Response.json({ok:true,classes:[1,2],items:[],invalidClass:true}):defaultResponse(url),{savedClass:'99'});
  assert.equal(calls.filter(c=>c.url.startsWith('/api/timetable')).length,2);
  assert(calls.some(c=>c.url.includes('class=1')));
});
test('calendar keyboard focus, arrow movement, Escape and return focus',async t=>{
  const {document,w}=await boot(t);const trigger=document.querySelector('.date-trigger');trigger.click();
  assert(document.activeElement.matches('.calendar-day'));
  const before=document.activeElement.dataset.date;
  // Today may be Monday, the lower selectable bound; the next day is always valid.
  document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.notEqual(document.activeElement.dataset.date,before);
  document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(document.querySelector('.date-picker'),null);assert.equal(document.activeElement,trigger);
});
test('modal gets focus, traps Tab and returns focus on Escape',async t=>{
  const {document,w}=await boot(t);const origin=document.querySelector('.allergy-button');origin.click();
  assert.equal(document.activeElement,document.querySelector('.allergen-close'));
  assert.equal(document.querySelector('#app').inert,true);
  document.querySelector('.allergen-scroll').focus();document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
  assert.equal(document.activeElement,document.querySelector('.allergen-close'));
  document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(document.querySelector('.allergen-modal'),null);assert.equal(document.activeElement,origin);assert.equal(document.querySelector('#app').inert,false);
});
test('rating GET failure is visible and retry recovers',async t=>{
  let broken=true;
  const {document}=await boot(t,url=>url.startsWith('/api/meal-rating')&&broken?Response.json({ok:false,error:'집계 일시 오류'},{status:500}):defaultResponse(url));
  assert.equal(document.querySelector('.rating-count').textContent,'집계 실패');assert.equal(document.querySelector('.rating-retry').hidden,false);
  broken=false;document.querySelector('.rating-retry').click();await flush();
  assert.equal(document.querySelector('.rating-count').textContent,'0표');assert.equal(document.querySelector('.rating-retry').hidden,true);
});
test('rating POST failure preserves previous summary and shows recovery message',async t=>{
  const {document}=await boot(t,(url,options)=>options.method==='POST'?Response.json({ok:false,error:'평가 요청이 많습니다.'},{status:429}):defaultResponse(url));
  document.querySelector('.meal-rating-option').click();await flush();
  assert.equal(document.querySelector('.rating-count').textContent,'0표');assert.match(document.querySelector('.meal-rating-status').textContent,/요청이 많/);
  assert.equal(document.querySelector('.meal-rating-option').disabled,false);
});
test('late weekend class response cannot overwrite another grade cache',async t=>{
  let resolveOld;let initial=true;
  const {document,w}=await boot(t,url=>url.startsWith('/api/timetable')&&initial?(initial=false,Response.json({ok:false},{status:502})):url.startsWith('/api/classes')&&url.includes('grade=1')?new Promise(resolve=>{resolveOld=resolve;}):defaultResponse(url));
  const saturday=new Date(fixtureRange().minDate);saturday.setUTCDate(saturday.getUTCDate()+5);
  clickDate(document,helpers.dateParam(saturday));await flush();assert(resolveOld);
  document.querySelector('[data-select="grade"] .select-trigger').click();document.querySelector('[data-select="grade"] [data-value="2"]').click();await flush();
  resolveOld(Response.json({ok:true,classes:[1,2,3,4,5,6,7,8]}));await flush();
  const keys=Object.keys(w.localStorage).filter(k=>k.startsWith('ygmhelper-classes-v2-')&&k.endsWith('-2'));
  assert(keys.length);assert.deepEqual(JSON.parse(w.localStorage.getItem(keys[0])).values,[1,2]);
});
test('repeated viewport/tab triggers deduplicate fresh requests',async t=>{
  const {document,calls}=await boot(t);const before=calls.filter(c=>c.url.startsWith('/api/timetable')).length;
  document.querySelector('[data-view="timetable"]').click();document.querySelector('[data-view="timetable"]').click();await flush();
  assert.equal(calls.filter(c=>c.url.startsWith('/api/timetable')).length,before);
});

test('future meal panel allows viewing but disables voting',async t=>{
  const {document}=await boot(t);
  const nextMonday=new Date(fixtureRange().minDate);nextMonday.setUTCDate(nextMonday.getUTCDate()+7);
  clickDate(document,helpers.dateParam(nextMonday));await flush();
  assert.equal(document.querySelector('.meal-rating-title').textContent,'급식 맛 평가');
  assert([...document.querySelectorAll('.meal-rating-option')].every(b=>b.disabled));
  assert.match(document.querySelector('.meal-rating-status').textContent,/오늘 급식/);
});

test('mobile initial load waits to request hidden timetable until tab selection',async t=>{
  const {document,calls}=await boot(t,null,{width:390});
  assert.equal(calls.filter(c=>c.url.startsWith('/api/timetable')).length,0);
  document.querySelector('[data-view="timetable"]').click();await flush();
  assert.equal(calls.filter(c=>c.url.startsWith('/api/timetable')).length,1);
  assert.match(document.querySelector('#weekly-timetable').textContent,/국어/);
});

test('weekly table renders five dates, changed lessons, safe text and selected day',async t=>{
 const days=Array.from({length:5},(_,index)=>{const date=new Date(fixtureRange().minDate);date.setUTCDate(date.getUTCDate()+index);return {date:helpers.dateParam(date),items:[{period:1,subject:index===0?'<img src=x>':'국어',teacher:'김민수',changed:index===1}]};});
 const {document,calls}=await boot(t,url=>url.startsWith('/api/timetable')?Response.json({ok:true,classes:[1,2],items:days[0].items,days}):defaultResponse(url));
 assert(calls.some(c=>c.url.includes('view=week')));
 assert.equal(document.querySelector('#timetable-card'),null);
 assert.equal(document.querySelector('.period-card'),null);
 assert.equal(document.querySelectorAll('.weekly-table thead th').length,6);
 assert.equal(document.querySelectorAll('.weekly-table td').length,5);
 assert.equal(document.querySelector('.weekly-table img'),null);
 assert.match(document.querySelector('.weekly-table').textContent,/<img src=x>/);
 assert.equal(document.querySelectorAll('.weekly-table td.is-changed').length,1);
 assert.equal(document.querySelectorAll('.weekly-change').length,0);
 assert.equal(document.querySelector('.weekly-table td.is-changed').getAttribute('aria-label'),'변경된 수업');
 assert.match(document.querySelector('.weekly-table').textContent,/김민수/);
 assert.equal(document.querySelector('.weekly-hint'),null);
 document.querySelector('.date-trigger').click();document.querySelector('.calendar-day[tabindex="0"]').dispatchEvent(new document.defaultView.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 clickDate(document,days[1].date);await flush();
 assert.equal(document.querySelector('.weekly-table thead .is-selected').textContent,'화'+Number(days[1].date.slice(4,6))+'.'+Number(days[1].date.slice(6,8)));
});

test('weekly timetable error offers one retry and restores the table',async t=>{
 let broken=true;
 const {document}=await boot(t,url=>url.startsWith('/api/timetable')&&broken?Response.json({ok:false,error:'컴시간 시간표 응답을 해석하지 못했습니다.'},{status:502}):defaultResponse(url));
 assert.equal(document.querySelector('#weekly-timetable').textContent,'');
 assert.equal(document.querySelector('.weekly-section').hidden,true);
 assert.equal(document.querySelector('#timetable-status').textContent,'시간표를 불러오지 못했습니다.다시 시도');
 assert.equal(document.querySelectorAll('#view-timetable .load-retry').length,1);
 broken=false;document.querySelector('#timetable-status .load-retry').click();await flush();
 assert.equal(document.querySelector('#timetable-status').hidden,true);
 assert.equal(document.querySelector('.weekly-section').hidden,false);
 assert.match(document.querySelector('#weekly-timetable').textContent,/국어/);
});

test('refresh reloads the visible mobile timetable without requesting hidden meals',async t=>{
 const {document,calls}=await boot(t,null,{width:390});
 document.querySelector('[data-view="timetable"]').click();await flush();
 const before=calls.length;
 document.querySelector('#refresh-timetable').click();await flush();
 const added=calls.slice(before);
 assert.equal(added.filter(c=>c.url.startsWith('/api/timetable')).length,1);
 assert.equal(added.filter(c=>c.url.startsWith('/api/meal?')).length,0);
 assert.equal(document.querySelector('#refresh-timetable').disabled,false);
});

test('refresh stays busy until the request fails and then becomes usable again',async t=>{
 let resolve;let defer=false;
 const {document}=await boot(t,url=>defer&&url.startsWith('/api/meal?')?new Promise(r=>{resolve=r;}):defaultResponse(url));
 defer=true;const button=document.querySelector('#refresh-data');button.click();
 assert.equal(button.closest('.section-heading')?.parentElement.id,'view-meal');
 assert.equal(button.disabled,true);assert.equal(button.getAttribute('aria-busy'),'true');
 resolve(Response.json({ok:false,error:'failed'},{status:502}));await flush();
 assert.equal(button.disabled,false);assert.equal(button.hasAttribute('aria-busy'),false);
});

test('rating choices use SVG icons and NEIS lessons omit teacher placeholders',async t=>{
 const days=Array.from({length:5},(_,i)=>{const d=new Date(fixtureRange().minDate);d.setUTCDate(d.getUTCDate()+i);return {date:helpers.dateParam(d),source:'neis',items:[{period:1,subject:'국어',changed:false}]};});
 const {document}=await boot(t,url=>url.startsWith('/api/timetable')?Response.json({ok:true,classes:[1,2],days,items:days[0].items}):defaultResponse(url));
 assert.equal(document.querySelectorAll('.meal-rating-icon svg').length,5);
 assert.equal(document.querySelectorAll('.weekly-lesson span').length,0);
 assert.equal(document.querySelectorAll('td.is-changed').length,0);
});

test('changing a date within the loaded week only updates the selection',async t=>{
 const {document,calls}=await boot(t);
 const before=calls.filter(c=>c.url.startsWith('/api/timetable')).length;
 const monday=new Date(fixtureRange().minDate);monday.setUTCDate(monday.getUTCDate()+1);
 clickDate(document,helpers.dateParam(monday));await flush();
 assert.equal(calls.filter(c=>c.url.startsWith('/api/timetable')).length,before);
 assert.equal(document.querySelector('.weekly-table thead .is-selected').textContent,'화'+(monday.getUTCMonth()+1)+'.'+monday.getUTCDate());
 document.querySelector('#refresh-timetable').click();await flush();
 assert.equal(calls.filter(c=>c.url.startsWith('/api/timetable')).length,before+1);
});

test('guest preview renders NEIS table geometry with obscured lower rows and overlay signup links',async t=>{
 const days=Array.from({length:5},(_,i)=>{const d=new Date(fixtureRange().minDate);d.setUTCDate(d.getUTCDate()+i);return {date:helpers.dateParam(d),items:[{period:1,subject:'NEIS 미리보기'}]};});
 const {document}=await boot(t,url=>url.startsWith('/api/timetable')?Response.json({ok:true,preview:true,classes:[1,2],days,items:days[0].items}):defaultResponse(url));
 assert.equal(document.querySelectorAll('.weekly-table tbody tr').length,7);
 assert(document.querySelector('#weekly-timetable').classList.contains('is-preview'));
 assert.equal(document.querySelectorAll('.preview-obscured[aria-hidden="true"]').length,6);
 assert.equal(document.querySelector('.membership-gate a').getAttribute('href'),'/login.html');
 assert.equal(document.querySelectorAll('.weekly-table td').length,35);
 assert.equal(document.querySelector('.weekly-table').textContent.includes('교사'),false);
});

test('weekend meal does not request or render rating controls',async t=>{
 const {document,calls}=await boot(t,null,{today:'2026-11-07T03:00:00Z'});
 assert.equal(calls.filter(c=>c.url.startsWith('/api/meal?')).length,0);
 assert.equal(document.querySelector('.meal-rating-option'),null);
 assert(calls.some(c=>c.url.startsWith('/api/timetable')));
});

test('lesson locations have a custom map-pin icon and accessible label',async t=>{
 const days=Array.from({length:5},(_,i)=>{const d=new Date(fixtureRange().minDate);d.setUTCDate(d.getUTCDate()+i);return {date:helpers.dateParam(d),items:[{period:1,subject:'과학',location:'과학실'}]};});
 const {document}=await boot(t,url=>url.startsWith('/api/timetable')?Response.json({ok:true,classes:[1,2],days}):defaultResponse(url));
 assert.equal(document.querySelectorAll('.weekly-location svg').length,5);assert.equal(document.querySelector('.weekly-location').textContent,'과학실');
});
