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
  const html="./36179?991l sc_data('123_ Q성명(자료.자료101 자료.자료102[sb] =H시간표.자료103 일일자료=Q자료(자료.자료104 원자료=Q자료(자료.자료105";
  t.mock.method(globalThis,'fetch',async url=>String(url).endsWith('/st')?new Response(iconv.encode(html,'euc-kr')):String(url).includes('991l')?Response.json({학교검색:[[0,'서울','용곡중학교',12345]]}):Response.json(data));
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
