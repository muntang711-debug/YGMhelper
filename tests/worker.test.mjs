import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import iconv from 'iconv-lite';
import worker from '../src/worker.js';
import {dateParam, kstToday, selectableRange} from '../public/js/common.js';
import {readBounded, SECURITY_HEADERS} from '../src/http.js';

const schema=await fs.readFile(new URL('../migrations/0001_meal_ratings.sql',import.meta.url),'utf8');
const today=dateParam(kstToday());
const monday=dateParam(selectableRange().minDate);
const voter='abcdefab-cdef-4abc-8abc-abcdefabcdef';
const neis={mealServiceDietInfo:[{head:[{RESULT:{CODE:'INFO-000'}}]},{row:[{MMEAL_SC_CODE:'2',DDISH_NM:'밥 (5)<br/>우유 (2)',CAL_INFO:'800 Kcal'}]}]};
function limiter(limit){const counts=new Map();return {async limit({key}){const n=(counts.get(key)||0)+1;counts.set(key,n);return {success:n<=limit};}};}
function environment(t){
  const db=new DatabaseSync(':memory:');db.exec(schema);db.exec(schema); // Existing production baseline must be safe.
  t.after(()=>db.close());
  return {sqlite:db,NEIS_API_KEY:'test-placeholder',RATING_IP_LIMITER:limiter(120),RATING_VOTER_LIMITER:limiter(5),
    DB:{prepare(sql){return {bind(...args){return {async all(){return {results:db.prepare(sql).all(...args)};},async first(){return db.prepare(sql).get(...args)||null;},async run(){return db.prepare(sql).run(...args);}};}};}},
    ASSETS:{async fetch(){return new Response('not found',{status:404});}}};
}
function request(route,body,headers={}){return new Request('https://ygmhelper.xyz'+route,body===undefined?{headers}:{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...headers},body:JSON.stringify(body)});}
function vote(overrides={}){return {date:today,voterId:voter,rating:4,...overrides};}
function quiet(t){t.mock.method(console,'log',()=>{});t.mock.method(console,'warn',()=>{});t.mock.method(console,'error',()=>{});}
function mockMeal(t,payload=neis){t.mock.method(globalThis,'fetch',async()=>Response.json(payload));}
function comciData(){
  const matrix=()=>[null,...[1,2,3].map(()=>[null,...[1,2,3].map(()=>[null,...[1,2,3,4,5].map(()=>[2,1001,2002])])])];
  return {학급수:[0,2,2,3],가상학급수:[0,0,0,0],자료101:['','교사A','교사B'],자료102:['','국어','수학'],자료103:'fixture',자료104:matrix(),자료105:matrix()};
}
function mockComci(t,data){
  const calls=[];
  const html="./36179?991l sc_data('123_ Q성명(자료.자료101 자료.자료102[sb] =H시간표.자료103 일일자료=Q자료(자료.자료104 원자료=Q자료(자료.자료105";
  const hex=Array.from({length:html.length},(_,i)=>(html.charCodeAt(i)^((100+i*13)&255)).toString(16).padStart(4,'0')).join('');
  const token='a1'.repeat(32);
  const wrapped=`<script>window.__HourRequestToken="${token}";</script>/* hour-obfuscated-v2 */(function(a,k){})([[0,"${hex}"]],100);`;
  t.mock.method(globalThis,'fetch',async (url,options)=>{if(new URL(String(url)).pathname==='/hub/SchoolSchedule')return Response.json({RESULT:{CODE:'INFO-200'}});calls.push(String(url));if(new URL(String(url)).pathname==='/st')return new Response(iconv.encode(wrapped,'euc-kr'));assert.equal(options.headers['X-Hour-Token'],token);assert.equal(options.cf.cacheTtl,0);return String(url).includes('991l')?Response.json({학교검색:[[0,'서울','용곡중학교',12345]]}):Response.json(data);});
  return calls;
}

test('all APIs reject impossible dates without calling upstream',async t=>{
  quiet(t);const env=environment(t);let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw Error('unexpected');});
  for(const path of ['/api/meal?date=20260230','/api/classes?date=20261301&grade=1','/api/timetable?date=20260010&grade=1&class=1','/api/meal-rating?date=20260230'])assert.equal((await worker.fetch(request(path),env)).status,400);
  assert.equal(calls,0);
});
test('meal JSON and security headers',async t=>{
  quiet(t);mockMeal(t);const r=await worker.fetch(request('/api/meal?date='+today),environment(t));
  assert.equal(r.status,200);assert.deepEqual((await r.json()).items,['밥 (5)','우유 (2)']);
  for(const [k,v]of Object.entries(SECURITY_HEADERS))assert.equal(r.headers.get(k),v);
  assert(r.headers.get('X-Request-Id'));
});
test('unknown paths are 404 and read APIs reject write methods',async t=>{
  quiet(t);const env=environment(t);
  assert.equal((await worker.fetch(request('/api/unknown'),env)).status,404);
  assert.equal((await worker.fetch(request('/missing.css'),env)).status,404);
  for(const path of ['/api/meal','/api/classes','/api/timetable']){
    const r=await worker.fetch(request(path,{}),env);assert.equal(r.status,405);assert.equal(r.headers.get('Allow'),'GET, HEAD');
  }
});
test('HTTPS and canonical redirects preserve method-compatible status and query',async t=>{
  quiet(t);const env=environment(t);
  const r=await worker.fetch(new Request('http://ygmhelper.xyz/api/meal?date='+today),env);
  assert.equal(r.status,308);assert.equal(r.headers.get('Location'),'https://ygmhelper.xyz/api/meal?date='+today);
  const www=await worker.fetch(new Request('https://www.ygmhelper.xyz/a?b=c'),env);assert.equal(www.headers.get('Location'),'https://ygmhelper.xyz/a?b=c');
});
test('rating baseline, normalized UUID upsert, and personal summary',async t=>{
  quiet(t);mockMeal(t);const env=environment(t);
  assert.equal((await worker.fetch(request('/api/meal-rating?date='+today),env)).status,200);
  for(const [voterId,rating]of [[voter,4],[voter.toUpperCase(),2]])assert.equal((await worker.fetch(request('/api/meal-rating',vote({voterId,rating})),env)).status,200);
  assert.equal(env.sqlite.prepare('SELECT COUNT(*) AS n FROM meal_ratings').get().n,1);
  const r=await worker.fetch(request('/api/meal-rating?date='+today,undefined,{'X-Meal-Voter':voter.toUpperCase()}),env);
  const body=await r.json();assert.equal(body.myRating,2);assert.equal(body.total,1);assert.equal(body.average,2);
});
test('future and missing meals cannot be rated',async t=>{
  quiet(t);const env=environment(t);mockMeal(t,{RESULT:{CODE:'INFO-200'}});
  assert.equal((await worker.fetch(request('/api/meal-rating',vote({date:'20990101'})),env)).status,403);
  assert.equal((await worker.fetch(request('/api/meal-rating',vote()),env)).status,422);
  assert.equal(env.sqlite.prepare('SELECT COUNT(*) AS n FROM meal_ratings').get().n,0);
});
test('rating limits are enforced before writes',async t=>{
  quiet(t);mockMeal(t);const env=environment(t);
  for(let i=0;i<5;i++)assert.equal((await worker.fetch(request('/api/meal-rating',vote()),env)).status,200);
  const r=await worker.fetch(request('/api/meal-rating',vote()),env);assert.equal(r.status,429);assert.equal(r.headers.get('Retry-After'),'60');
  env.RATING_IP_LIMITER={async limit(){return {success:false};}};
  assert.equal((await worker.fetch(request('/api/meal-rating',vote({voterId:'11111111-1111-4111-8111-111111111111'})),env)).status,429);
  assert.equal(env.sqlite.prepare('SELECT COUNT(*) AS n FROM meal_ratings').get().n,1);
});
test('oversized, invalid media, cross-origin and invalid rating requests',async t=>{
  quiet(t);const env=environment(t);
  assert.equal((await worker.fetch(request('/api/meal-rating',vote({extra:'x'.repeat(3000)})),env)).status,413);
  assert.equal((await worker.fetch(request('/api/meal-rating',vote(),{'Content-Type':'text/plain'}),env)).status,415);
  assert.equal((await worker.fetch(request('/api/meal-rating',vote(),{Origin:'https://example.com'}),env)).status,403);
  for(const rating of [0,6,'3',2.5])assert.equal((await worker.fetch(request('/api/meal-rating',vote({rating})),env)).status,400);
});
test('HEAD has no body; database exception stays private and logs no raw identifiers',async t=>{
  quiet(t);const env=environment(t);const errors=[];t.mock.method(console,'error',x=>errors.push(x));
  const h=await worker.fetch(new Request('https://ygmhelper.xyz/api/meal-rating?date='+today,{method:'HEAD'}),env);assert.equal(h.status,200);assert.equal(await h.text(),'');
  env.DB.prepare=()=>{throw Error('private SQL with '+voter);};
  const r=await worker.fetch(request('/api/meal-rating?date='+today+'&voter='+voter),env);
  assert.equal(r.status,500);assert(!JSON.stringify(await r.json()).includes('private SQL'));assert(!errors.join('').includes(voter));
});
test('bounded reader rejects declared and streamed oversize bodies',async()=>{
  await assert.rejects(()=>readBounded(new Response('x',{headers:{'Content-Length':'999'}}),4),e=>e.status===502);
  await assert.rejects(()=>readBounded(new Response('12345'),4,{request:true}),e=>e.status===413);
});
test('bounded reader stops a stalled response',async()=>{
  const stream=new ReadableStream({start(){},cancel(){}});
  await assert.rejects(()=>readBounded(new Response(stream),100,{timeoutMs:10}),e=>e.status===504);
});
test('Comcigan EUC-KR discovery and decoded lessons',async t=>{
  quiet(t);mockComci(t,comciData());const r=await worker.fetch(request('/api/timetable?date='+monday+'&grade=1&class=1'),environment(t));
  assert.equal(r.status,200);const data=await r.json();assert.equal(data.school,'용곡중학교');assert.deepEqual(data.items.map(i=>i.subject),['국어','수학']);
});
test('malformed Comcigan lookup and excessive class/period counts reject',async t=>{
  quiet(t);const env=environment(t);
  for(const mutate of [d=>delete d.자료101,d=>d.학급수[1]=100000,d=>d.자료104[1][1][1][0]=100000]){
    const d=comciData();mutate(d);mockComci(t,d);
    const r=await worker.fetch(request('/api/timetable?date='+monday+'&grade=1&class=1'),env);assert.equal(r.status,502);
  }
});

test('weekly timetable shares one snapshot and maps weekday and weekend selections',async t=>{
  quiet(t);const calls=mockComci(t,comciData());const env=environment(t);
  for(const offset of [0,1,5,6]){
    calls.length=0;const date=new Date(selectableRange().minDate);date.setUTCDate(date.getUTCDate()+offset);
    const r=await worker.fetch(request('/api/timetable?date='+dateParam(date)+'&grade=1&class=1&view=week'),env);
    assert.equal(r.status,200);const data=await r.json();
    assert.equal(data.days.length,5);assert.equal(data.weekStart,monday);
    assert.equal(data.days[0].date,monday);assert.equal(data.days[4].items.length,2);
    assert.equal(data.items.length,offset<5?2:0);
    assert.equal(calls.filter(url=>new URL(url).pathname!=='/st'&&!url.includes('991l')).length,1);
  }
});

test('rotated Comcigan endpoint is rediscovered once after invalid JSON',async t=>{
 quiet(t);let payloads=0,refreshes=0;
 const html="./36179?991l sc_data('123_ Q성명(자료.자료101 자료.자료102[sb] =H시간표.자료103 일일자료=Q자료(자료.자료104 원자료=Q자료(자료.자료105";
 t.mock.method(globalThis,'fetch',async url=>{
  const u=new URL(String(url));
  if(u.pathname==='/hub/SchoolSchedule')return Response.json({RESULT:{CODE:'INFO-200'}});
  if(u.pathname==='/st'){if(u.searchParams.has('refresh'))refreshes++;return new Response(iconv.encode(html,'euc-kr'));}
  if(u.search.includes('991l'))return Response.json({학교검색:[[0,'서울','용곡중학교',12345]]});
  payloads++;return payloads===1?new Response('expired endpoint'):Response.json(comciData());
 });
 const r=await worker.fetch(request('/api/timetable?date='+monday+'&grade=1&class=1&view=week'),environment(t));
 assert.equal(r.status,200);assert.equal((await r.json()).days.length,5);assert.equal(payloads,2);assert.equal(refreshes,1);
});

test('empty daily days and lessons never inherit the original timetable',async t=>{
 quiet(t);const d=comciData();
 d.자료104[1][1][1]=[0];d.자료104[1][1][2]=[2,0,2002];delete d.자료104[1][1][3];
 mockComci(t,d);const env=environment(t);
 const r=await worker.fetch(request('/api/timetable?date='+monday+'&grade=1&class=1&view=week'),env);
 const body=await r.json();assert.equal(r.status,200);
 assert.deepEqual(body.days[0].items,[]);assert.deepEqual(body.days[2].items,[]);
 assert.deepEqual(body.days[1].items.map(i=>i.period),[2]);
 assert.equal(body.days[3].items.length,2);
});

function neisPayload(service, rows) { return {[service]:[{head:[{RESULT:{CODE:'INFO-000'}}]},{row:rows}]}; }
function weekdayDate(offset) { const d=new Date(selectableRange().minDate); d.setUTCDate(d.getUTCDate()+offset); return dateParam(d); }
test('exam week uses NEIS only with no teachers or changed markers',async t=>{
 quiet(t);const calls=[];const dates=Array.from({length:5},(_,i)=>weekdayDate(i));
 t.mock.method(globalThis,'fetch',async value=>{const u=new URL(String(value));calls.push(u);
  if(u.pathname==='/hub/SchoolSchedule')return Response.json(neisPayload('SchoolSchedule',dates.map(AA_YMD=>({AA_YMD,EVENT_NM:'2학기 기말시험',ONE_GRADE_EVENT_YN:'Y'}))));
  if(u.pathname==='/hub/misTimetable')return Response.json(neisPayload('misTimetable',dates.map(ALL_TI_YMD=>({ALL_TI_YMD,GRADE:'1',CLASS_NM:'1',PERIO:'1',ITRT_CNTNT:'국어'}))));
  throw Error('Comcigan must not be requested');
 });
 const r=await worker.fetch(request('/api/timetable?date='+monday+'&grade=1&class=1&view=week'),environment(t));
 assert.equal(r.status,200);const b=await r.json();assert.equal(calls.length,2);
 assert.equal(calls[0].pathname,'/hub/SchoolSchedule');assert.equal(calls[0].searchParams.get('AA_TO_YMD'),weekdayDate(6));
 for(const d of b.days){assert.equal(d.source,'neis');assert.equal(d.items[0].subject,'국어');assert.equal(d.items[0].changed,false);assert.equal('teacher' in d.items[0],false);}
});
test('mixed week checks schedule first, ignores other grades, and preserves empty NEIS exam days',async t=>{
 quiet(t);mockComci(t,comciData());const comciFetch=globalThis.fetch;const paths=[];
 t.mock.method(globalThis,'fetch',async (value,options)=>{const u=new URL(String(value));paths.push(u.pathname);
  if(u.pathname==='/hub/SchoolSchedule')return Response.json(neisPayload('SchoolSchedule',[
   {AA_YMD:weekdayDate(1),EVENT_NM:'중간고사',ONE_GRADE_EVENT_YN:'Y'},
   {AA_YMD:weekdayDate(2),EVENT_NM:'기말시험',ONE_GRADE_EVENT_YN:'N',TW_GRADE_EVENT_YN:'Y'}]));
  if(u.pathname==='/hub/misTimetable')return Response.json({RESULT:{CODE:'INFO-200'}});
  return comciFetch(value,options);
 });
 const r=await worker.fetch(request('/api/timetable?date='+monday+'&grade=1&class=1&view=week'),environment(t));assert.equal(r.status,200);const b=await r.json();
 assert.equal(paths[0],'/hub/SchoolSchedule');assert.equal(paths[1],'/hub/misTimetable');
 assert.equal(paths.filter(p=>p==='/hub/SchoolSchedule').length,1);
 assert.equal(b.days[1].source,'neis');assert.deepEqual(b.days[1].items,[]);
 assert.equal(b.days[2].source,'comcigan');assert.equal(b.days[2].items.length,2);
});
test('schedule failure is surfaced instead of silently using the wrong timetable',async t=>{
 quiet(t);const paths=[];t.mock.method(globalThis,'fetch',async value=>{paths.push(new URL(String(value)).pathname);return Response.json({RESULT:{CODE:'ERROR-290'}});});
 const r=await worker.fetch(request('/api/timetable?date='+monday+'&grade=1&class=1&view=week'),environment(t));assert.equal(r.status,502);assert.deepEqual(paths,['/hub/SchoolSchedule']);
});

test('temporary names stay server-side and only match the correct school, term and masked teacher',async t=>{
 const {readTeacherNames,teacherDisplayName}=await import('../src/teacher-names.js');
 const secret=JSON.stringify({schoolCode:40807,year:2026,semester:2,teachers:{1:{masked:'교사*',full:'교사명'}}});
 const names=readTeacherNames(secret,'20261104',40807);
 assert.equal(teacherDisplayName('교사*',1,names),'교사명');
 assert.equal(teacherDisplayName('다른*',1,names),'다른*');
 assert.equal(teacherDisplayName('교사*',2,names),'교사*');
 assert.equal(readTeacherNames(secret,'20270302',40807),null);
 assert.equal(readTeacherNames(secret,'20261104',123),null);
 assert.equal(readTeacherNames('invalid','20261104',40807),null);
 assert.equal(teacherDisplayName('교사*',1,{1:{masked:'교사*',full:'엉뚱함'}}),'교사*');
});
