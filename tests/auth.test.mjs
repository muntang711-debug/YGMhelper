import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {authHandler,memberSession} from '../src/auth.js';
import worker from '../src/worker.js';
const schema=await fs.readFile(new URL('../migrations/0002_members.sql',import.meta.url),'utf8');
const password='a-long-local-test-password';
function setup(t){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');db.exec(schema);t.after(()=>db.close());
 const DB={prepare(sql){const args=[];const statement={bind(...a){args.push(...a);return statement;},async first(){return db.prepare(sql).get(...args)||null;},async run(){const v=db.prepare(sql).run(...args);return {meta:{changes:v.changes}};}};return statement;},async batch(stmts){db.exec('BEGIN');try{const r=await Promise.all(stmts.map(s=>s.run()));db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}};
 const used=new Set();let bots=0;
 t.mock.method(globalThis,'fetch',async(url,opts)=>{
  if(String(url).includes('siteverify')){bots++;const p=new URLSearchParams(opts.body),token=p.get('response');if(used.has(token))return Response.json({success:false});used.add(token);return Response.json({success:true,hostname:'localhost',action:token.startsWith('login')?'login':'signup'});}
  throw Error('unexpected upstream');
 });
 const env={DB,MEMBERSHIP_ENABLED:'true',REGISTRATION_OPEN:'true',TURNSTILE_SECRET:'fixture',TURNSTILE_HOSTNAMES:'localhost',NEIS_API_KEY:'fixture'};
 return {db,env,get bots(){return bots;}};
}
function req(action,body={},extra={}){return new Request('https://localhost/api/auth/'+action,{method:'POST',headers:{Origin:'https://localhost','Content-Type':'application/json',...extra},body:JSON.stringify(body)});}
const signup=(token='signup-1')=>({username:'student_1',password,age14:true,privacy:true,consentVersion:'2026-11-04-draft',turnstile:token});
test('signup hashes passwords and sessions, logout invalidates session with CSRF protection',async t=>{
 const {db,env}=setup(t);const r=await authHandler(req('signup',signup()),env);assert.equal(r.status,200);const b=await r.json(),cookie=r.headers.get('Set-Cookie');assert.match(cookie,/HttpOnly; Secure; SameSite=Strict/);
 const token=cookie.split(';')[0];const member=db.prepare('SELECT * FROM members').get(),session=db.prepare('SELECT * FROM member_sessions').get();assert.notEqual(member.password_hash,password);assert.equal(member.password_hash.length,64);assert(!token.includes(session.token_hash));assert.equal((await memberSession(new Request('https://localhost',{headers:{Cookie:token}}),env)).username,'student_1');
 assert.equal((await authHandler(req('logout',{}, {Cookie:token}),env)).status,403);
 assert.equal((await authHandler(req('logout',{}, {Cookie:token,'X-CSRF-Token':b.csrf}),env)).status,200);
 assert.equal(await memberSession(new Request('https://localhost',{headers:{Cookie:token}}),env),null);
});
test('signup rejects absent consent, cross-origin posts and reused bot tokens',async t=>{
 const {env}=setup(t);assert.equal((await authHandler(req('signup',signup(),{Origin:'https://elsewhere.invalid'}),env)).status,403);
 assert.equal((await authHandler(req('signup',{...signup(),age14:false}),env)).status,400);
 assert.equal((await authHandler(req('signup',signup()),env)).status,403);
 assert.equal((await authHandler(req('signup',{...signup('signup-2'),privacy:false}),env)).status,400);
 assert.equal((await authHandler(req('signup',{...signup('signup-3'),password:'short'}),env)).status,400);
});
test('login errors are generic; account deletion requires password and removes all sessions',async t=>{
 const {db,env}=setup(t);await authHandler(req('signup',signup()),env);
 const wrong=await authHandler(req('login',{username:'student_1',password:'not-the-right-password',turnstile:'login-1'}),env);
 const unknown=await authHandler(req('login',{username:'unknown_1',password:'not-the-right-password',turnstile:'login-2'}),env);
 assert.equal(wrong.status,401);assert.equal(unknown.status,401);assert.deepEqual(await wrong.json(),await unknown.json());
 const r=await authHandler(req('login',{username:'STUDENT_1',password,turnstile:'login-3'}),env);assert.equal(r.status,200);const b=await r.json(),cookie=r.headers.get('Set-Cookie').split(';')[0],headers={Cookie:cookie,'X-CSRF-Token':b.csrf};
 assert.equal((await authHandler(req('delete',{password:'incorrect-password'},headers),env)).status,403);
 assert.equal((await authHandler(req('delete',{password},headers),env)).status,200);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM members').get().n,0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM member_sessions').get().n,0);
});
test('sessions expire and account rate limiting happens before expensive hashing',async t=>{
 const ctx=setup(t);const {db,env}=ctx;const r=await authHandler(req('signup',signup()),env);const cookie=r.headers.get('Set-Cookie').split(';')[0];db.exec('UPDATE member_sessions SET expires_at=0');assert.equal(await memberSession(new Request('https://localhost',{headers:{Cookie:cookie}}),env),null);
 for(let i=0;i<10;i++)await authHandler(req('login',{username:'target',password,turnstile:'login-limit-'+i}),env);
 const before=ctx.bots;assert.equal((await authHandler(req('login',{username:'target',password,turnstile:'login-final'}),env)).status,429);assert.equal(ctx.bots,before);
});
test('guest timetable sends only NEIS first periods; Comcigan and teacher names never leave the server',async t=>{
 const {env}=setup(t);const {dateParam,selectableRange}=await import('../public/js/common.js');const date=dateParam(selectableRange().minDate);let calls=[];
 t.mock.method(globalThis,'fetch',async url=>{calls.push(String(url));assert.equal(new URL(url).pathname,'/hub/misTimetable');return Response.json({misTimetable:[{head:[{RESULT:{CODE:'INFO-000'}}]},{row:[{ALL_TI_YMD:date,GRADE:'1',CLASS_NM:'1',PERIO:'1',ITRT_CNTNT:'국어'},{ALL_TI_YMD:date,GRADE:'1',CLASS_NM:'1',PERIO:'2',ITRT_CNTNT:'수학'}]}]});});
 t.mock.method(console,'log',()=>{});const r=await worker.fetch(new Request('https://localhost/api/timetable?date='+date+'&grade=1&class=1&view=week'),env);const b=await r.json();assert.equal(r.status,200);assert.equal(b.preview,true);assert.equal(b.days[0].items.length,1);assert.equal(b.days[0].items[0].subject,'국어');assert.equal(b.days[0].items[0].teacher,undefined);assert.equal(calls.length,1);
});
