import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {adminHandler} from '../src/admin.js';
import {totpCode,matchingTotpStep} from '../src/totp.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
const seed='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // RFC 6238 public test vector, never a deployed credential.
const schemas=await Promise.all(['0001_members.sql','0002_email_auth.sql','0003_session_preferences.sql','0004_student_verification.sql','0005_student_quiz_limits.sql','0006_admin.sql'].map(name=>fs.readFile(new URL('../auth-migrations/'+name,import.meta.url),'utf8')));
function setup(t){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');schemas.forEach(sql=>db.exec(sql));t.after(()=>db.close());
 const AUTH_DB={prepare(sql){let args=[];const statement={bind(...values){args=values;return statement;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}};}};return statement;},async batch(statements){db.exec('BEGIN');try{const results=await Promise.all(statements.map(s=>s.run()));db.exec('COMMIT');return results;}catch(error){db.exec('ROLLBACK');throw error;}}};
 return {db,env:{AUTH_DB,ADMIN_ACCESS_KEYS:JSON.stringify(['a'.repeat(64),'b'.repeat(64)]),ADMIN_TOTP_SECRET:seed}};
}
function request(action,body,headers={}){return new Request('https://localhost/api/admin/'+action,{method:body===undefined?'GET':'POST',headers:{Origin:'https://localhost','Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});}
async function login(c,key='a'.repeat(64)){const r=await adminHandler(request('login',{method:'key',key}),c.env);assert.equal(r.status,200);const data=await r.json();return {Cookie:r.headers.get('Set-Cookie').split(';')[0],'X-CSRF-Token':data.csrf};}

test('admin data and mutations require a separate administrator session, origin and CSRF',async t=>{
 const c=setup(t);
 for(const path of ['members','ip-blocks','audit'])assert.equal((await adminHandler(request(path),c.env)).status,401);
 assert.equal((await adminHandler(request('member',{id:'member',action:'reset-attempts'},{Cookie:'__Host-ygm_session='+'a'.repeat(64)}),c.env)).status,401);
 assert.equal((await adminHandler(request('login',{key:'a'.repeat(64)},{Origin:'https://other.example'}),c.env)).status,403);
 const headers=await login(c);
 assert.match(headers.Cookie,/^__Host-ygm_admin=/);
 assert.equal((await adminHandler(request('unblock-ip',{ipHash:'c'.repeat(64)},{...headers,'X-CSRF-Token':''}),c.env)).status,403);
 const publicSession=await (await adminHandler(request('session'),c.env)).json();assert.equal(publicSession.authenticated,false);assert.equal(publicSession.csrf,null);assert(!JSON.stringify(publicSession).includes(seed));
});
test('one-time administrator keys cannot be replayed, including concurrent logins',async t=>{
 const c=setup(t);const responses=await Promise.all([adminHandler(request('login',{key:'a'.repeat(64)}),c.env),adminHandler(request('login',{key:'a'.repeat(64)}),c.env)]);
 assert.deepEqual(responses.map(r=>r.status).sort(),[200,401]);assert.equal(c.db.prepare('SELECT COUNT(*) AS n FROM admin_used_keys').get().n,1);
 assert.equal(c.db.prepare('SELECT key_hash FROM admin_used_keys').get().key_hash,hash('a'.repeat(64)));
 const success=responses.find(r=>r.status===200);assert.match(success.headers.get('Set-Cookie'),/HttpOnly; Secure; SameSite=Strict/);
 assert.equal((await adminHandler(request('login',{key:'wrong'}),c.env)).status,401);
});
test('administrator sessions expire, logout clears them, and used keys stay consumed',async t=>{
 const c=setup(t),headers=await login(c);assert.equal((await adminHandler(request('logout',{},headers),c.env)).status,200);
 assert.equal((await adminHandler(request('members',undefined,headers),c.env)).status,401);assert.equal((await adminHandler(request('login',{key:'a'.repeat(64)}),c.env)).status,401);
 const second=await login(c,'b'.repeat(64));c.db.exec('UPDATE admin_sessions SET last_seen=last_seen-900001');assert.equal((await adminHandler(request('members',undefined,second),c.env)).status,401);
});
test('key retrieval requires a control-plane ticket, consumes it once and returns different unused keys',async t=>{
 const c=setup(t),ticket='c'.repeat(64);
 assert.equal((await adminHandler(request('issue-key',{ticket}),c.env)).status,403);
 c.db.prepare('INSERT INTO admin_key_tickets (token_hash,expires_at) VALUES (?,?)').run(hash(ticket),Date.now()+60000);
 const issued=await adminHandler(request('issue-key',{ticket}),c.env);assert.equal(issued.status,200);assert.equal((await issued.json()).key,'a'.repeat(64));assert.equal(issued.headers.get('Cache-Control'),'no-store');
 assert.equal((await adminHandler(request('issue-key',{ticket}),c.env)).status,403);
 const next='d'.repeat(64);c.db.prepare('INSERT INTO admin_key_tickets (token_hash,expires_at) VALUES (?,?)').run(hash(next),Date.now()+60000);
 assert.equal((await (await adminHandler(request('issue-key',{ticket:next}),c.env)).json()).key,'b'.repeat(64));
});
test('administrator can inspect safe member fields, restore attempts, revoke access and unblock networks',async t=>{
 const c=setup(t),headers=await login(c),now=Date.now(),ipHash='f'.repeat(64);
 c.db.prepare('INSERT INTO members (id,username,email,email_verified,password_hash,salt,consent_version,created_at,student_quiz_attempts) VALUES (?,?,?,?,?,?,?,?,?)').run('member','student','student@example.com',1,'secret-password-hash','secret-salt','test',now,5);
 c.db.prepare('INSERT INTO student_quiz_ip_blocks (ip_hash,blocked_at,member_id) VALUES (?,?,?)').run(ipHash,now,'member');
 const list=await (await adminHandler(request('members',undefined,headers),c.env)).json();assert.equal(list.members[0].email,'student@example.com');assert(!JSON.stringify(list).includes('secret-password'));assert(!JSON.stringify(list).includes('secret-salt'));
 assert.equal((await adminHandler(request('member',{id:'member',action:'reset-attempts'},headers),c.env)).status,200);assert.equal(c.db.prepare('SELECT student_quiz_attempts FROM members').get().student_quiz_attempts,0);assert.equal(c.db.prepare('SELECT COUNT(*) AS n FROM student_quiz_ip_blocks').get().n,0);
 await adminHandler(request('member',{id:'member',action:'verify-student'},headers),c.env);assert(c.db.prepare('SELECT student_verified_at FROM members').get().student_verified_at>0);
 await adminHandler(request('member',{id:'member',action:'revoke-student'},headers),c.env);assert.equal(c.db.prepare('SELECT student_verified_at FROM members').get().student_verified_at,null);
 c.db.prepare('INSERT INTO student_quiz_ip_blocks (ip_hash,blocked_at) VALUES (?,?)').run(ipHash,now);await adminHandler(request('unblock-ip',{ipHash},headers),c.env);assert.equal(c.db.prepare('SELECT COUNT(*) AS n FROM student_quiz_ip_blocks').get().n,0);
 const audit=await (await adminHandler(request('audit',undefined,headers),c.env)).json();assert(audit.events.some(e=>e.action==='unblock-ip'));
});
test('TOTP matches the official RFC test vectors and rejects malformed codes',async()=>{
 for(const [seconds,expected] of [[59,'94287082'],[1111111109,'07081804'],[1111111111,'14050471'],[1234567890,'89005924'],[2000000000,'69279037'],[20000000000,'65353130']])assert.equal(await totpCode(seed,Math.floor(seconds/30),8),expected);
 assert.equal(await matchingTotpStep(seed,'not-code'),null);
});
test('OTP enrollment requires an admin, confirms an app code, hides the seed after enrollment and prevents replay',async t=>{
 t.mock.timers.enable({apis:['Date'],now:1800000000000});const c=setup(t),headers=await login(c);
 assert.equal((await adminHandler(request('otp-setup',{}),c.env)).status,401);
 const enrollment=await (await adminHandler(request('otp-setup',{},headers),c.env)).json();assert.equal(enrollment.secret,seed);assert(enrollment.qr.startsWith('<svg'));assert(!enrollment.qr.includes('<script'));
 const code=await totpCode(seed,Math.floor(Date.now()/30000));assert.equal((await adminHandler(request('otp-confirm',{code},headers),c.env)).status,200);
 assert.equal((await adminHandler(request('otp-setup',{},headers),c.env)).status,409);
 assert.equal((await adminHandler(request('login',{method:'otp',code}),c.env)).status,401);
 t.mock.timers.tick(30000);const next=await totpCode(seed,Math.floor(Date.now()/30000));assert.equal((await adminHandler(request('login',{method:'otp',code:next}),c.env)).status,200);assert.equal((await adminHandler(request('login',{method:'otp',code:next}),c.env)).status,401);
});
