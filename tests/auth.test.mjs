import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {authHandler,memberSession,passwordHash,memberRatingKey} from '../src/auth.js';
import worker from '../src/worker.js';
import {createHash} from 'node:crypto';
const schema=(await fs.readFile(new URL('../auth-migrations/0001_members.sql',import.meta.url),'utf8'))+(await fs.readFile(new URL('../auth-migrations/0002_email_auth.sql',import.meta.url),'utf8'));
const sessionSchema=await fs.readFile(new URL('../auth-migrations/0003_session_preferences.sql',import.meta.url),'utf8');
const awaitStudentSchema=await fs.readFile(new URL('../auth-migrations/0004_student_verification.sql',import.meta.url),'utf8');
const quizLimitsSchema=await fs.readFile(new URL('../auth-migrations/0005_student_quiz_limits.sql',import.meta.url),'utf8');
const password='a-long-local-test-password';
function setup(t){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');db.exec(schema);db.exec(sessionSchema);db.exec(awaitStudentSchema);db.exec(quizLimitsSchema);t.after(()=>db.close());
 const DB={prepare(sql){const args=[];const s={bind(...a){args.push(...a);return s;},async first(){return db.prepare(sql).get(...args)||null;},async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}};}};return s;},async batch(stmts){db.exec('BEGIN');try{const r=await Promise.all(stmts.map(s=>s.run()));db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}};
 const used=new Set(),mails=[];let bots=0;
 t.mock.method(globalThis,'fetch',async(url,opts)=>{if(!String(url).includes('siteverify'))throw Error('unexpected upstream');bots++;const token=new URLSearchParams(opts.body).get('response');if(used.has(token))return Response.json({success:false});used.add(token);return Response.json({success:true,hostname:'localhost',action:token.split(':')[0]});});
 const env={DB,MEMBERSHIP_ENABLED:'true',REGISTRATION_OPEN:'true',TURNSTILE_SECRET:'fixture',TURNSTILE_HOSTNAMES:'localhost',NEIS_API_KEY:'fixture',AUTH_ORIGIN:'https://localhost',EMAIL:{async send(m){mails.push(m);return {messageId:'fixture'};}}};
 return {db,env,mails,get bots(){return bots;}};
}
function req(action,body={},extra={}){return new Request('https://localhost/api/auth/'+action,{method:'POST',headers:{Origin:'https://localhost','Content-Type':'application/json',...extra},body:JSON.stringify(body)});}
const signup=(token='signup:1')=>({username:'student_1',email:'student@example.com',password,age14:true,privacy:true,betaReset:true,consentVersion:'2026-11-06-email-beta',turnstile:token});
const tokenOf=mail=>mail.text.match(/#token=([a-f0-9]{64})/)[1];
async function register(ctx){assert.equal((await authHandler(req('signup',signup()),ctx.env)).status,200);assert.equal((await authHandler(req('verify',{token:tokenOf(ctx.mails[0])}),ctx.env)).status,200);return authHandler(req('login',{username:'student_1',password,turnstile:'login:first'}),ctx.env);}

test('signup requires email proof, stores token hashes only, and verification cannot be replayed',async t=>{
 const c=setup(t);const r=await authHandler(req('signup',signup()),c.env);assert.equal(r.status,200);assert.match(r.headers.get('Set-Cookie'),/^__Host-ygm_verify=/);assert.equal((await r.json()).verificationRequired,true);
 const member=c.db.prepare('SELECT * FROM members').get();assert.notEqual(member.password_hash,password);assert.equal(member.email_verified,0);
 assert.equal((await authHandler(req('login',{username:'student_1',password,turnstile:'login:unverified'}),c.env)).status,403);
 const token=tokenOf(c.mails[0]);assert.notEqual(c.db.prepare('SELECT token_hash FROM auth_tokens').get().token_hash,token);assert(!c.mails[0].text.includes(password));
 assert.equal((await authHandler(req('verify',{token}),c.env)).status,200);assert.equal((await authHandler(req('verify',{token}),c.env)).status,400);
 const login=await authHandler(req('login',{username:'student_1',password,turnstile:'login:verified'}),c.env);assert.equal(login.status,200);assert.match(login.headers.get('Set-Cookie'),/HttpOnly; Secure; SameSite=Strict/);
});
test('expired verification and reset links fail closed',async t=>{
 const c=setup(t);await authHandler(req('signup',signup()),c.env);const token=tokenOf(c.mails[0]);c.db.exec('UPDATE auth_tokens SET expires_at=0');assert.equal((await authHandler(req('verify',{token}),c.env)).status,400);assert.equal(c.db.prepare('SELECT email_verified FROM members').get().email_verified,0);
 c.db.exec('UPDATE members SET email_verified=1');await authHandler(req('forgot',{email:'student@example.com',turnstile:'forgot:expired'}),c.env);
 const resetToken=tokenOf(c.mails[1]);c.db.exec('UPDATE auth_tokens SET expires_at=0');
 assert.equal((await authHandler(req('reset',{token:resetToken,password:'another-long-password'}),c.env)).status,400);
});
test('consent, email, origin and reused CAPTCHA are checked',async t=>{
 const c=setup(t);assert.equal((await authHandler(req('signup',signup(),{Origin:'https://evil.invalid'}),c.env)).status,403);
 assert.equal((await authHandler(req('signup',{...signup(),email:'bad'}),c.env)).status,400);
 assert.equal((await authHandler(req('signup',{...signup(),age14:false}),c.env)).status,400);
 assert.equal((await authHandler(req('signup',signup()),c.env)).status,403);
 assert.equal((await authHandler(req('signup',{...signup('signup:2'),privacy:false}),c.env)).status,400);
 assert.equal((await authHandler(req('signup',{...signup('signup:3'),password:'short'}),c.env)).status,400);
});
test('password reset is single-use, invalidates all sessions, and never auto logs in',async t=>{
 const c=setup(t);const login=await register(c);const cookie=login.headers.get('Set-Cookie').split(';')[0];assert(await memberSession(new Request('https://localhost',{headers:{Cookie:cookie}}),c.env));
 assert.equal((await authHandler(req('forgot',{email:'student@example.com',turnstile:'forgot:1'}),c.env)).status,200);const token=tokenOf(c.mails[1]);
 const next='a-new-secure-password';const reset=await authHandler(req('reset',{token,password:next}),c.env);assert.equal(reset.status,200);assert.match(reset.headers.get('Set-Cookie'),/Max-Age=0/);assert.equal(c.db.prepare('SELECT COUNT(*) n FROM member_sessions').get().n,0);
 assert.equal((await authHandler(req('reset',{token,password:next}),c.env)).status,400);
 assert.equal((await authHandler(req('login',{username:'student_1',password,turnstile:'login:old'}),c.env)).status,401);
 assert.equal((await authHandler(req('login',{username:'student_1',password:next,turnstile:'login:new'}),c.env)).status,200);
});
test('forgot hides account existence and does not send to unknown addresses',async t=>{
 const c=setup(t);await register(c);const existing=await authHandler(req('forgot',{email:'student@example.com',turnstile:'forgot:existing'}),c.env);const unknown=await authHandler(req('forgot',{email:'unknown@example.com',turnstile:'forgot:unknown'}),c.env);
 assert.deepEqual(await existing.json(),await unknown.json());assert.equal(c.mails.length,2);
});
test('mail failure rolls signup back and unverified accounts can resend',async t=>{
 const c=setup(t);c.env.EMAIL.send=async()=>{throw Error('fixture');};assert.equal((await authHandler(req('signup',signup()),c.env)).status,503);assert.equal(c.db.prepare('SELECT COUNT(*) n FROM members').get().n,0);
 c.env.EMAIL.send=async m=>{c.mails.push(m);};assert.equal((await authHandler(req('signup',signup('signup:again')),c.env)).status,200);
 c.db.exec('UPDATE auth_tokens SET issued_at=0');assert.equal((await authHandler(req('resend',{email:'student@example.com',turnstile:'resend:1'}),c.env)).status,200);assert.equal(c.mails.length,2);
 assert.equal((await authHandler(req('verify',{token:tokenOf(c.mails[0])}),c.env)).status,400);assert.equal((await authHandler(req('verify',{token:tokenOf(c.mails[1])}),c.env)).status,200);
});
test('logout and deletion enforce CSRF; deletion removes email tokens too',async t=>{
 const c=setup(t);const r=await register(c),b=await r.json(),cookie=r.headers.get('Set-Cookie').split(';')[0];assert.equal((await authHandler(req('logout',{}, {Cookie:cookie}),c.env)).status,403);
 c.env.AUTH_DB=c.env.DB;c.db.exec(await fs.readFile(new URL('../migrations/0001_meal_ratings.sql',import.meta.url),'utf8'));
 const ratingKey=memberRatingKey(c.db.prepare('SELECT id FROM members').get().id);
 for(const key of [ratingKey,'other-member'])c.db.prepare('INSERT INTO meal_ratings (date,voter_key,rating) VALUES (?,?,?)').run('20261109',key,4);
 assert.equal((await authHandler(req('delete',{password:'incorrect-password'},{Cookie:cookie,'X-CSRF-Token':b.csrf}),c.env)).status,403);
 assert.equal(c.db.prepare('SELECT COUNT(*) n FROM meal_ratings').get().n,2);
 assert.equal((await authHandler(req('delete',{password},{Cookie:cookie,'X-CSRF-Token':b.csrf}),c.env)).status,200);assert.equal(c.db.prepare('SELECT COUNT(*) n FROM members').get().n,0);
 assert.deepEqual(c.db.prepare('SELECT voter_key FROM meal_ratings').all().map(x=>x.voter_key),['other-member']);
});
test('10–64 password bounds are enforced before hashing and email delivery',async t=>{
 const c=setup(t);for(const length of [9,65])assert.equal((await authHandler(req('signup',{...signup(),password:'a'.repeat(length)}),c.env)).status,400);
 assert.equal(c.bots,0);assert.equal(c.mails.length,0);
 assert.equal((await authHandler(req('signup',{...signup('signup:ten'),password:'a'.repeat(10)}),c.env)).status,200);
 assert.equal((await authHandler(req('signup',{...signup('signup:sixtyfour'),username:'student_2',email:'two@example.com',password:'b'.repeat(64)}),c.env)).status,200);
});
test('session expiry and account rate limits are enforced',async t=>{
 const c=setup(t),r=await register(c),cookie=r.headers.get('Set-Cookie').split(';')[0];c.db.exec('UPDATE member_sessions SET expires_at=0');assert.equal(await memberSession(new Request('https://localhost',{headers:{Cookie:cookie}}),c.env),null);
 for(let i=0;i<10;i++)await authHandler(req('login',{username:'target',password,turnstile:'login:limit'+i}),c.env);
 const before=c.bots;assert.equal((await authHandler(req('login',{username:'target',password,turnstile:'login:last'}),c.env)).status,429);assert.equal(c.bots,before);
});
test('guest preview contains full public NEIS week but no Comcigan or teacher names',async t=>{
 const {env}=setup(t);const {dateParam,selectableRange}=await import('../public/js/common.js');const date=dateParam(selectableRange().minDate);let calls=[];
 t.mock.method(globalThis,'fetch',async url=>{calls.push(String(url));assert.equal(new URL(url).pathname,'/hub/misTimetable');return Response.json({misTimetable:[{head:[{RESULT:{CODE:'INFO-000'}}]},{row:[{ALL_TI_YMD:date,GRADE:'1',CLASS_NM:'1',PERIO:'1',ITRT_CNTNT:'국어'},{ALL_TI_YMD:date,GRADE:'1',CLASS_NM:'1',PERIO:'2',ITRT_CNTNT:'수학'}]}]});});
 t.mock.method(console,'log',()=>{});const r=await worker.fetch(new Request('https://localhost/api/timetable?date='+date+'&grade=1&class=1&view=week'),env);const b=await r.json();assert.equal(r.status,200);assert.equal(b.preview,true);assert.equal(b.days[0].items.length,2);assert.equal(b.days[0].items[0].subject,'국어');assert.equal(b.days[0].items[0].teacher,undefined);assert.equal(calls.length,1);
});

function quizSession(c){
 const token='d'.repeat(64),csrf='e'.repeat(64),now=Date.now();
 c.db.prepare('INSERT INTO members (id,username,password_hash,salt,consent_version,created_at,email,email_verified) VALUES (?,?,?,?,?,?,?,?)').run('quiz-member','quiz_student','unused','unused','test',now,'quiz@example.com',1);
 c.db.prepare('INSERT INTO member_sessions (token_hash,member_id,csrf,expires_at,last_seen) VALUES (?,?,?,?,?)').run(createHash('sha256').update(token).digest('hex'),'quiz-member',csrf,now+3600000,now);
 c.env.STUDENT_QUIZ_ANSWERS=JSON.stringify({mealOrder:[2,1,3],building:'east',floor:4});
 return {Cookie:'__Host-ygm_session='+token,'X-CSRF-Token':csrf};
}
const quizAnswer=()=>({mealOrder:[2,1,3],building:'east',floor:4});
test('student verification requires a session, CSRF, configured secret and both correct answers',async t=>{
 const c=setup(t),headers=quizSession(c);
 assert.equal((await authHandler(req('student-verify',quizAnswer()),c.env)).status,401);
 assert.equal((await authHandler(req('student-verify',quizAnswer(),{...headers,'X-CSRF-Token':'wrong'}),c.env)).status,403);
 const secret=c.env.STUDENT_QUIZ_ANSWERS;delete c.env.STUDENT_QUIZ_ANSWERS;
 assert.equal((await authHandler(req('student-verify',quizAnswer(),headers),c.env)).status,503);c.env.STUDENT_QUIZ_ANSWERS=secret;
 assert.equal((await authHandler(req('student-verify',{...quizAnswer(),mealOrder:[2,2,3]},headers),c.env)).status,400);
 const first=await authHandler(req('student-verify',{...quizAnswer(),mealOrder:[1,2,3],studentVerified:true},headers),c.env);
 const second=await authHandler(req('student-verify',{...quizAnswer(),floor:5},headers),c.env);
 assert.equal(first.status,400);assert.deepEqual(await first.json(),await second.json());
 assert.equal(c.db.prepare('SELECT student_verified_at FROM members').get().student_verified_at,null);
 const result=await authHandler(req('student-verify',quizAnswer(),headers),c.env);assert.equal(result.status,200);
 assert(c.db.prepare('SELECT student_verified_at FROM members').get().student_verified_at>0);
 const session=await authHandler(new Request('https://localhost/api/auth/session',{headers}),c.env);assert.equal((await session.json()).user.studentVerified,true);
 assert.equal((await authHandler(req('student-verify',{},headers),c.env)).status,200);
});
test('student quiz attempts cannot be bypassed by changing session or returning the right answer after the limit',async t=>{
 const c=setup(t),headers=quizSession(c);
 for(let i=0;i<4;i++)assert.equal((await authHandler(req('student-verify',{...quizAnswer(),floor:5},headers),c.env)).status,400);
 assert.equal((await authHandler(req('student-verify',{...quizAnswer(),floor:5},headers),c.env)).status,429);
 c.db.prepare('INSERT INTO member_sessions (token_hash,member_id,csrf,expires_at,last_seen) VALUES (?,?,?,?,?)').run(createHash('sha256').update('f'.repeat(64)).digest('hex'),'quiz-member','e'.repeat(64),Date.now()+3600000,Date.now());
 assert.equal((await authHandler(req('student-verify',quizAnswer(),{...headers,Cookie:'__Host-ygm_session='+'f'.repeat(64)}),c.env)).status,429);
 assert.equal(c.db.prepare('SELECT student_verified_at FROM members').get().student_verified_at,null);
 assert.equal(c.db.prepare('SELECT student_quiz_attempts FROM members').get().student_quiz_attempts,5);
 assert.equal(c.db.prepare('SELECT COUNT(*) AS n FROM student_quiz_ip_blocks').get().n,1);
 const botCalls=c.bots;
 assert.equal((await authHandler(req('signup',signup()),c.env)).status,403);assert.equal(c.bots,botCalls);
 assert.equal((await authHandler(req('signup',{}, {'CF-Connecting-IP':'192.0.2.99'}),c.env)).status,400);
 const session=await authHandler(new Request('https://localhost/api/auth/session',{headers}),c.env);assert.equal((await session.json()).user.studentVerified,false);
});

test('a correct fifth answer succeeds without blocking the network',async t=>{
 const c=setup(t),headers=quizSession(c);
 for(let i=0;i<4;i++)await authHandler(req('student-verify',{...quizAnswer(),floor:5},headers),c.env);
 assert.equal((await authHandler(req('student-verify',quizAnswer(),headers),c.env)).status,200);
 assert.equal(c.db.prepare('SELECT student_quiz_attempts FROM members').get().student_quiz_attempts,5);
 assert.equal(c.db.prepare('SELECT COUNT(*) AS n FROM student_quiz_ip_blocks').get().n,0);
});
test('parallel quiz guesses stop at five and the network block also applies to another existing account',async t=>{
 const c=setup(t),headers=quizSession(c);
 await Promise.all(Array.from({length:12},()=>authHandler(req('student-verify',{...quizAnswer(),floor:5},headers),c.env)));
 assert.equal(c.db.prepare('SELECT student_quiz_attempts FROM members').get().student_quiz_attempts,5);
 const token='8'.repeat(64),now=Date.now();
 c.db.prepare('INSERT INTO members (id,username,password_hash,salt,consent_version,created_at,email,email_verified) VALUES (?,?,?,?,?,?,?,?)').run('other-member','other_student','unused','unused','test',now,'other@example.com',1);
 c.db.prepare('INSERT INTO member_sessions (token_hash,member_id,csrf,expires_at,last_seen) VALUES (?,?,?,?,?)').run(createHash('sha256').update(token).digest('hex'),'other-member','e'.repeat(64),now+3600000,now);
 const otherHeaders={...headers,Cookie:'__Host-ygm_session='+token};
 assert.equal((await authHandler(req('student-verify',quizAnswer(),otherHeaders),c.env)).status,429);
 const s=await (await authHandler(new Request('https://localhost/api/auth/session',{headers:otherHeaders}),c.env)).json();assert.equal(s.user.studentVerificationBlocked,true);
 assert.equal(c.db.prepare("SELECT student_quiz_attempts FROM members WHERE id='other-member'").get().student_quiz_attempts,0);
});


test('verification auto signs in only the browser that started signup',async t=>{
 const c=setup(t);const signupResponse=await authHandler(req('signup',signup()),c.env);const browser=signupResponse.headers.get('Set-Cookie').split(';')[0];
 const r=await authHandler(req('verify',{token:tokenOf(c.mails[0])},{Cookie:browser}),c.env);const b=await r.json();assert.equal(b.autoLogin,true);
 const sessionCookie=r.headers.getSetCookie().find(v=>v.startsWith('__Host-ygm_session='));assert(sessionCookie);assert(!sessionCookie.includes('Max-Age='));
 assert.equal((await memberSession(new Request('https://localhost',{headers:{Cookie:sessionCookie.split(';')[0]}}),c.env)).username,'student_1');
 assert.equal((await authHandler(req('verify',{token:tokenOf(c.mails[0])},{Cookie:browser}),c.env)).status,400);
});
test('a different browser verifies email but never receives an automatic session',async t=>{
 const c=setup(t);await authHandler(req('signup',signup()),c.env);const r=await authHandler(req('verify',{token:tokenOf(c.mails[0])},{Cookie:'__Host-ygm_verify='+'f'.repeat(64)}),c.env);
 assert.equal((await r.json()).autoLogin,false);assert(!r.headers.get('Set-Cookie').includes('__Host-ygm_session'));
 assert.equal(c.db.prepare('SELECT count(*) n FROM member_sessions').get().n,0);
});
test('remember choice controls cookie and server lifetime without extending default sessions',async t=>{
 const c=setup(t);const normal=await register(c);assert(!normal.headers.get('Set-Cookie').includes('Max-Age='));
 const r=await authHandler(req('login',{username:'student_1',password,turnstile:'login:remember',remember:true}),c.env);assert.match(r.headers.get('Set-Cookie'),/Max-Age=2592000/);
 const cookie=r.headers.get('Set-Cookie').split(';')[0];c.db.exec('UPDATE member_sessions SET last_seen=last_seen-10800000');
 assert(await memberSession(new Request('https://localhost',{headers:{Cookie:cookie}}),c.env));
 assert.equal(await memberSession(new Request('https://localhost',{headers:{Cookie:normal.headers.get('Set-Cookie').split(';')[0]}}),c.env),null);
 c.db.exec('UPDATE member_sessions SET expires_at=0');assert.equal(await memberSession(new Request('https://localhost',{headers:{Cookie:cookie}}),c.env),null);
});
