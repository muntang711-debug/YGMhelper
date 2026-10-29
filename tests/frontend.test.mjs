import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import * as helpers from '../public/js/common.js';

const html=await fs.readFile(new URL('../public/index.html',import.meta.url),'utf8');
const script=(await fs.readFile(new URL('../public/js/app.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/,'');
const flush=()=>new Promise(resolve=>setTimeout(resolve,20));
async function boot(t,fetchImpl,{deniedStorage=false,savedClass='1'}={}){
  const dom=new JSDOM(html,{url:'https://ygmhelper.xyz/',runScripts:'outside-only',pretendToBeVisual:true});
  t.after(()=>dom.window.close());const w=dom.window;
  Object.assign(w,helpers);
  w.matchMedia=query=>({matches:query.includes('prefers-reduced-motion'),addEventListener(){}});
  const calls=[];
  w.fetch=async(url,options={})=>{calls.push({url:String(url),options});return fetchImpl?fetchImpl(String(url),options):defaultResponse(String(url));};
  if(deniedStorage)Object.defineProperty(w,'localStorage',{get(){throw Error('SecurityError');}});
  else w.localStorage.setItem('ygmhelper-class',savedClass);
  w.eval(script);await flush();return {w,document:w.document,calls};
}
function defaultResponse(url){
  if(url.startsWith('/api/meal-rating'))return Response.json({ok:true,total:0,counts:{},myRating:null,average:null,canVote:true});
  if(url.startsWith('/api/meal?'))return Response.json({ok:true,date:new URL(url,'https://test').searchParams.get('date'),items:['비타민C100음료 (12)','우유 (선택)'],calories:'100 Kcal'});
  if(url.startsWith('/api/classes'))return Response.json({ok:true,classes:[1,2]});
  return Response.json({ok:true,classes:[1,2],items:[{period:1,subject:'국어',teacher:'교사*'}],available:true});
}
function clickDate(document,param){document.querySelector('.date-trigger').click();let button=document.querySelector(`[data-date="${param}"]:not(:disabled)`);if(!button){document.querySelector('[data-cal-nav="1"]').click();button=document.querySelector(`[data-date="${param}"]:not(:disabled)`);}assert(button,'selectable date exists');button.click();}

test('blocked storage still renders data and stable rating identity',async t=>{
  const {document,calls}=await boot(t,null,{deniedStorage:true});
  assert.equal(document.querySelector('.meal-name').textContent,'비타민C100음료');
  assert.equal(document.querySelector('.meal-allergen-button').textContent,'12');
  const initial=calls.find(c=>c.url.startsWith('/api/meal-rating')).options.headers['X-Meal-Voter'];
  document.querySelector('.meal-rating-option').click();await flush();
  const post=calls.find(c=>c.options.method==='POST');assert.equal(JSON.parse(post.options.body).voterId,initial);
});
test('empty invalid-class response does not loop',async t=>{
  const {calls,document}=await boot(t,url=>url.startsWith('/api/timetable')?Response.json({ok:true,classes:[],items:[],invalidClass:true}):defaultResponse(url),{savedClass:'99'});
  assert.equal(calls.filter(c=>c.url.startsWith('/api/timetable')).length,1);
  assert.match(document.querySelector('#timetable-card').textContent,/시간표가 없습니다/);
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
  document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
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
  let resolveOld;
  const {document,w}=await boot(t,url=>url.startsWith('/api/classes')&&url.includes('grade=1')?new Promise(resolve=>{resolveOld=resolve;}):defaultResponse(url));
  const saturday=new Date(helpers.selectableRange().minDate);saturday.setUTCDate(saturday.getUTCDate()+5);
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
  const nextMonday=new Date(helpers.selectableRange().minDate);nextMonday.setUTCDate(nextMonday.getUTCDate()+7);
  clickDate(document,helpers.dateParam(nextMonday));await flush();
  assert.match(document.querySelector('.meal-rating-title').textContent,/선택한 날/);
  assert([...document.querySelectorAll('.meal-rating-option')].every(b=>b.disabled));
  assert.match(document.querySelector('.meal-rating-status').textContent,/오늘 급식/);
});
