import {sha256} from '@noble/hashes/sha2.js';
import {readBounded,SECURITY_HEADERS} from './http.js';
import {sessionCsrfValid} from './auth.js';
import {decodeBase32,matchingTotpStep} from './totp.js';
import QRCode from 'qrcode/lib/core/qrcode.js';
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const hash=value=>hex(sha256(new TextEncoder().encode(value)));
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const validToken=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const reply=(body,status=200,headers={})=>Response.json(body,{status,headers:{...SECURITY_HEADERS,'Cache-Control':'no-store',...headers}});
const fail=(error,status=400)=>reply({ok:false,error},status);
const cookie=token=>`__Host-ygm_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict${token?'':'; Max-Age=0'}`;
function keyPool(env){try{const keys=JSON.parse(env.ADMIN_ACCESS_KEYS);return Array.isArray(keys)&&keys.length>0&&keys.length<=100&&keys.every(validToken)?keys:[];}catch{return [];}}
async function throttled(request,db){
 const now=Date.now(),key=hash('admin-login:'+(request.headers.get('CF-Connecting-IP')||'local')+':'+Math.floor(now/900000));
 const row=await db.prepare('INSERT INTO auth_attempts (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now+900000).first();return row.count>5;
}
async function otpThrottled(db){const now=Date.now(),key=hash('admin-otp-global:'+Math.floor(now/30000));const row=await db.prepare('INSERT INTO auth_attempts (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now+60000).first();return row.count>10;}
async function sessionOf(request,db){
 const token=request.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('__Host-ygm_admin='))?.slice('__Host-ygm_admin='.length);
 if(!validToken(token))return null;const now=Date.now();
 const session=await db.prepare('SELECT token_hash,csrf,last_seen FROM admin_sessions WHERE token_hash=? AND expires_at>? AND last_seen>?').bind(hash(token),now,now-900000).first();
 if(session&&now-session.last_seen>60000)await db.prepare('UPDATE admin_sessions SET last_seen=? WHERE token_hash=?').bind(now,session.token_hash).run();return session;
}
const audit=(db,action,target)=>db.prepare('INSERT INTO admin_audit (action,target,created_at) VALUES (?,?,?)').bind(action,target,Date.now());
async function otpEnabled(env,db){const state=await db.prepare('SELECT secret_hash,enabled FROM admin_totp_state WHERE id=1').first();return state?.enabled===1&&typeof env.ADMIN_TOTP_SECRET==='string'&&state.secret_hash===hash(env.ADMIN_TOTP_SECRET);}
async function createAdminSession(db,method){
 const token=random(),csrf=random(),now=Date.now();
 await db.batch([db.prepare('INSERT INTO admin_sessions (token_hash,csrf,expires_at,last_seen) VALUES (?,?,?,?)').bind(hash(token),csrf,now+3600000,now),audit(db,'login',method)]);
 return reply({ok:true,csrf},200,{'Set-Cookie':cookie(token)});
}
function qrSvg(uri){
 const qr=QRCode.create(uri,{errorCorrectionLevel:'M'}),size=qr.modules.size;let path='';
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(qr.modules.get(y,x))path+=`M${x+4} ${y+4}h1v1h-1z`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size+8} ${size+8}" role="img" aria-label="OTP 등록 QR 코드"><rect width="100%" height="100%" fill="white"/><path d="${path}" fill="black"/></svg>`;
}
export async function adminHandler(request,env){
 const db=env.AUTH_DB;if(!db)return fail('관리자 저장소를 준비 중입니다.',503);
 const url=new URL(request.url),action=url.pathname.slice('/api/admin/'.length);
 if(!['session','login','issue-key','logout','members','member','ip-blocks','unblock-ip','audit','otp-setup','otp-confirm'].includes(action))return fail('경로를 찾을 수 없습니다.',404);
 if(action==='session'&&request.method==='GET'){const s=await sessionOf(request,db);return reply({ok:true,authenticated:!!s,csrf:s?.csrf||null,otpEnabled:await otpEnabled(env,db)});}
 if(request.method==='GET'){
  if(!await sessionOf(request,db))return fail('관리자 로그인이 필요합니다.',401);
  const cursor=url.searchParams.get('cursor')||'';if(!/^[a-zA-Z0-9_-]{0,64}$/.test(cursor))return fail('페이지 정보가 올바르지 않습니다.');
  if(action==='members'){
   const r=await db.prepare('SELECT id,username,email,email_verified,created_at,student_verified_at,student_quiz_attempts FROM members WHERE id>? ORDER BY id LIMIT 51').bind(cursor).all();
   const rows=r.results||[];return reply({ok:true,members:rows.slice(0,50),nextCursor:rows.length>50?rows[49].id:null});
  }
  if(action==='ip-blocks'){
   const r=await db.prepare('SELECT b.ip_hash,b.blocked_at,m.username FROM student_quiz_ip_blocks b LEFT JOIN members m ON m.id=b.member_id WHERE b.ip_hash>? ORDER BY b.ip_hash LIMIT 51').bind(cursor).all();
   const rows=r.results||[];return reply({ok:true,blocks:rows.slice(0,50),nextCursor:rows.length>50?rows[49].ip_hash:null});
  }
  if(action==='audit'){const r=await db.prepare('SELECT action,target,created_at FROM admin_audit ORDER BY id DESC LIMIT 50').all();return reply({ok:true,events:r.results||[]});}
  return fail('지원하지 않는 요청 방식입니다.',405);
 }
 if(request.method!=='POST')return fail('지원하지 않는 요청 방식입니다.',405);
 if(request.headers.get('Origin')!==url.origin||request.headers.get('Sec-Fetch-Site')==='cross-site')return fail('허용되지 않은 요청 출처입니다.',403);
 if(request.headers.get('Content-Type')?.split(';')[0].trim()!=='application/json')return fail('JSON 요청이 필요합니다.',415);
 let body;try{body=JSON.parse(new TextDecoder().decode(await readBounded(request,2048,{request:true})));}catch{return fail('요청을 확인해 주세요.');}
 if(!body||typeof body!=='object'||Array.isArray(body))return fail('요청을 확인해 주세요.');
 if(action==='issue-key'){
  // Tickets are created only through the authenticated Cloudflare control plane.
  // The browser cannot mint them. Consume each 60-second ticket before returning a key.
  if(!validToken(body.ticket)||await throttled(request,db))return fail('키 발급 권한을 확인하지 못했습니다.',403);
  const ticket=await db.prepare('DELETE FROM admin_key_tickets WHERE token_hash=? AND expires_at>? RETURNING token_hash').bind(hash(body.ticket),Date.now()).first();
  if(!ticket)return fail('키 발급 권한을 확인하지 못했습니다.',403);
  for(const key of keyPool(env)){
   const keyHash=hash(key);
   const row=await db.prepare('INSERT OR IGNORE INTO admin_issued_keys (key_hash,issued_at) SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM admin_used_keys WHERE key_hash=?) RETURNING key_hash').bind(keyHash,Date.now(),keyHash).first();
   if(row){await audit(db,'issue-key',keyHash.slice(0,12)).run();return reply({ok:true,key});}
  }
  return fail('준비된 미사용 키가 없습니다.',503);
 }
 if(action==='login'){
  if(await throttled(request,db))return fail('로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요.',429);
  if(body.method==='otp'){
   if(await otpThrottled(db))return fail('OTP 요청이 많습니다. 잠시 후 다시 시도해 주세요.',429);
   if(!await otpEnabled(env,db))return fail('먼저 일회용 키로 로그인해 OTP를 등록해 주세요.',403);
   const step=await matchingTotpStep(env.ADMIN_TOTP_SECRET,body.code);if(step===null)return fail('OTP 번호를 확인해 주세요.',401);
   const accepted=await db.prepare('UPDATE admin_totp_state SET last_step=? WHERE id=1 AND enabled=1 AND secret_hash=? AND last_step<? RETURNING id').bind(step,hash(env.ADMIN_TOTP_SECRET),step).first();
   if(!accepted)return fail('이미 사용된 OTP입니다. 다음 번호로 다시 시도해 주세요.',401);
   return createAdminSession(db,'otp');
  }
  if(body.method&&body.method!=='key')return fail('로그인 방식을 확인해 주세요.');
  const keys=keyPool(env);if(!keys.length)return fail('관리자 키를 준비 중입니다.',503);
  if(!validToken(body.key))return fail('유효하지 않거나 이미 사용된 키입니다.',401);
  const keyHash=hash(body.key);let matched=0;
  for(const key of keys){const expected=hash(key);let diff=0;for(let i=0;i<64;i++)diff|=expected.charCodeAt(i)^keyHash.charCodeAt(i);matched|=Number(diff===0);}
  if(!matched)return fail('유효하지 않거나 이미 사용된 키입니다.',401);
  const used=await db.prepare('INSERT OR IGNORE INTO admin_used_keys (key_hash,used_at) VALUES (?,?) RETURNING key_hash').bind(keyHash,Date.now()).first();
  if(!used)return fail('유효하지 않거나 이미 사용된 키입니다.',401);
  return createAdminSession(db,'key:'+keyHash.slice(0,12));
 }
 const session=await sessionOf(request,db);if(!session)return fail('관리자 로그인이 필요합니다.',401);
 if(!sessionCsrfValid(request,session))return fail('페이지를 새로고침한 후 다시 시도해 주세요.',403);
 if(action==='otp-setup'){
  if(await otpEnabled(env,db))return fail('OTP가 이미 등록되어 있습니다.',409);
  try{decodeBase32(env.ADMIN_TOTP_SECRET);}catch{return fail('OTP 설정을 준비 중입니다.',503);}
  const uri='otpauth://totp/YGMhelper:admin?secret='+env.ADMIN_TOTP_SECRET+'&issuer=YGMhelper&algorithm=SHA1&digits=6&period=30';
  return reply({ok:true,secret:env.ADMIN_TOTP_SECRET,qr:qrSvg(uri)});
 }
 if(action==='otp-confirm'){
  if(await throttled(request,db))return fail('시도가 많습니다. 잠시 후 다시 시도해 주세요.',429);
  if(await otpEnabled(env,db))return fail('OTP가 이미 등록되어 있습니다.',409);
  let step;try{step=await matchingTotpStep(env.ADMIN_TOTP_SECRET,body.code);}catch{return fail('OTP 설정을 준비 중입니다.',503);}
  if(step===null)return fail('인증 앱의 OTP 번호를 확인해 주세요.');
  const row=await db.prepare('INSERT INTO admin_totp_state (id,secret_hash,enabled,last_step) VALUES (1,?,1,?) ON CONFLICT(id) DO UPDATE SET secret_hash=excluded.secret_hash,enabled=1,last_step=excluded.last_step WHERE admin_totp_state.enabled=0 OR admin_totp_state.secret_hash!=excluded.secret_hash RETURNING id').bind(hash(env.ADMIN_TOTP_SECRET),step).first();
  if(!row)return fail('OTP가 이미 등록되어 있습니다.',409);
  await audit(db,'otp-enabled','admin').run();return reply({ok:true});
 }
 if(action==='logout'){await db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(session.token_hash).run();return reply({ok:true},200,{'Set-Cookie':cookie('')});}
 if(action==='member'){
  if(typeof body.id!=='string'||body.id.length>64||!['reset-attempts','verify-student','revoke-student','revoke-sessions'].includes(body.action))return fail('작업 정보를 확인해 주세요.');
  const member=await db.prepare('SELECT id FROM members WHERE id=?').bind(body.id).first();if(!member)return fail('회원을 찾을 수 없습니다.',404);
  const statements=[];
  if(body.action==='reset-attempts')statements.push(db.prepare('UPDATE members SET student_quiz_attempts=0 WHERE id=?').bind(body.id),db.prepare('DELETE FROM student_quiz_ip_blocks WHERE member_id=?').bind(body.id));
  if(body.action==='verify-student')statements.push(db.prepare('UPDATE members SET student_verified_at=? WHERE id=? AND email_verified=1').bind(Date.now(),body.id));
  if(body.action==='revoke-student')statements.push(db.prepare('UPDATE members SET student_verified_at=NULL WHERE id=?').bind(body.id));
  if(body.action==='revoke-sessions')statements.push(db.prepare('DELETE FROM member_sessions WHERE member_id=?').bind(body.id));
  statements.push(audit(db,body.action,body.id));await db.batch(statements);return reply({ok:true});
 }
 if(action==='unblock-ip'){
  if(!validToken(body.ipHash))return fail('차단 정보를 확인해 주세요.');
  await db.batch([db.prepare('DELETE FROM student_quiz_ip_blocks WHERE ip_hash=?').bind(body.ipHash),audit(db,'unblock-ip',body.ipHash)]);return reply({ok:true});
 }
 return fail('경로를 찾을 수 없습니다.',404);
}
