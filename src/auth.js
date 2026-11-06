import {pbkdf2Async} from '@noble/hashes/pbkdf2.js';
import {sha256} from '@noble/hashes/sha2.js';
import {readBounded, SECURITY_HEADERS} from './http.js';

const encoder = new TextEncoder();
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const digest = value => hex(sha256(encoder.encode(value)));
const cookieName = '__Host-ygm_session';
const consentVersion = '2026-11-06-email-beta';
const reply = (body,status=200,extra={}) => Response.json(body,{status,headers:{...SECURITY_HEADERS,'Cache-Control':'no-store',...extra}});
const fail = (error,status=400,field) => reply({ok:false,error,...field?{field}:{}},status);
const cookie = token => `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${token?86400:0}`;
const validPassword = value => typeof value==='string' && Array.from(value).length>=1 && Array.from(value).length<=128 && encoder.encode(value).length<=512;
const validNewPassword = value => validPassword(value) && Array.from(value).length>=10 && Array.from(value).length<=64;
const validEmail = value => typeof value==='string' && value.length<=254 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(value);
const validToken = value => typeof value==='string' && /^[a-f0-9]{64}$/.test(value);
export const passwordHash = async (password,salt) => hex(await pbkdf2Async(sha256,password,salt,{c:600000,dkLen:32}));
function equal(a,b) { if(typeof a!=='string'||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0; }
async function limit(env,key,max,period=900000) {
 const now=Date.now(),bucket=Math.floor(now/period);
 const row=await env.DB.prepare('INSERT INTO auth_attempts (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(digest(key+':'+bucket),now+period).first();
 return row.count<=max;
}
export async function memberSession(request,env) {
 env={...env,DB:env.AUTH_DB||env.DB};if(env.MEMBERSHIP_ENABLED!=='true')return null;
 const token=request.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 if(!validToken(token))return null;
 const now=Date.now();
 const session=await env.DB.prepare('SELECT s.token_hash,s.csrf,s.last_seen,m.id,m.username FROM member_sessions s JOIN members m ON m.id=s.member_id WHERE s.token_hash=? AND s.expires_at>? AND s.last_seen>? AND m.email_verified=1').bind(digest(token),now,now-7200000).first();
 if(session&&now-session.last_seen>60000)await env.DB.prepare('UPDATE member_sessions SET last_seen=? WHERE token_hash=?').bind(now,session.token_hash).run();return session;
}
async function verifyBot(body,request,env,action) {
 if(typeof body.turnstile!=='string'||!body.turnstile||body.turnstile.length>2048||!env.TURNSTILE_SECRET)return false;
 const host=new URL(request.url).hostname;if(!String(env.TURNSTILE_HOSTNAMES||'').split(',').includes(host))return false;
 try{const res=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',signal:AbortSignal.timeout(10000),body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:body.turnstile,...request.headers.get('CF-Connecting-IP')?{remoteip:request.headers.get('CF-Connecting-IP')}:{}})});const v=await res.json();return res.ok&&v.success===true&&v.hostname===host&&v.action===action;}catch{return false;}
}
async function authMail(env,member,kind) {
 if(!env.EMAIL?.send)throw Error('EMAIL_UNAVAILABLE');
 if(!await limit(env,'mail-global',100,86400000))throw Error('EMAIL_LIMIT');
 const now=Date.now(),ttl=kind==='verify'?1800000:900000;
 const previous=await env.DB.prepare('SELECT issued_at FROM auth_tokens WHERE member_id=? AND kind=?').bind(member.id,kind).first();
 if(previous&&now-previous.issued_at<60000)return;
 const token=random(),hash=digest(token);
 await env.DB.prepare('INSERT INTO auth_tokens (token_hash,member_id,kind,expires_at,issued_at) VALUES (?,?,?,?,?) ON CONFLICT(member_id,kind) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at,issued_at=excluded.issued_at').bind(hash,member.id,kind,now+ttl,now).run();
 const origin=env.AUTH_ORIGIN||'https://ygmhelper.xyz';
 const link=`${origin}/${kind==='verify'?'verify':'reset'}#token=${token}`;
 const title=kind==='verify'?'이메일 인증':'비밀번호 재설정';
 const text=`YGMhelper ${title}\n\n아래 링크에서 ${title}을 진행해 주세요.\n${link}\n\n이 링크는 ${ttl/60000}분 동안 한 번만 사용할 수 있습니다. 직접 요청하지 않았다면 이 메일을 무시해 주세요.\n문의: help@ygmhelper.xyz`;
 try{await env.EMAIL.send({from:{email:'noreply@ygmhelper.xyz',name:'YGMhelper'},to:member.email,replyTo:'help@ygmhelper.xyz',subject:`YGMhelper ${title}`,text,html:`<h2>${title}</h2><p>아래 링크에서 진행해 주세요.</p><p><a href="${link}">${title}</a></p><p>${ttl/60000}분 동안 한 번만 사용할 수 있습니다. 직접 요청하지 않았다면 무시해 주세요.</p><p>문의: help@ygmhelper.xyz</p>`});}catch{await env.DB.prepare('DELETE FROM auth_tokens WHERE token_hash=?').bind(hash).run();throw Error('EMAIL_FAILED');}
}
function defer(ctx,promise) {if(ctx?.waitUntil){ctx.waitUntil(promise.catch(()=>console.error(JSON.stringify({event:'auth_mail_error'}))));return Promise.resolve();}return promise;}
export async function authHandler(request,env,ctx) {
 env={...env,DB:env.AUTH_DB||env.DB};const url=new URL(request.url),action=url.pathname.split('/').pop();
 if(env.MEMBERSHIP_ENABLED!=='true')return fail('회원 기능을 준비 중입니다.',503);
 if(action==='config'&&request.method==='GET')return reply({ok:true,sitekey:env.TURNSTILE_SITEKEY||'',consentVersion,registrationOpen:env.REGISTRATION_OPEN==='true',passwordAuthAvailable:env.PASSWORD_AUTH_AVAILABLE!=='false'});
 if(action==='session'&&request.method==='GET'){const s=await memberSession(request,env);return reply({ok:true,user:s?{username:s.username}:null,csrf:s?.csrf||null});}
 if(!['signup','login','logout','delete','verify','forgot','reset','resend'].includes(action))return fail('경로를 찾을 수 없습니다.',404);
 if(request.method!=='POST')return fail('지원하지 않는 요청 방식입니다.',405);
 if(request.headers.get('Origin')!==url.origin||request.headers.get('Sec-Fetch-Site')==='cross-site')return fail('허용되지 않은 요청 출처입니다.',403);
 if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json')return fail('JSON 요청이 필요합니다.',415);
 let body;try{body=JSON.parse(new TextDecoder().decode(await readBounded(request,4096,{request:true})));}catch{return fail('요청을 확인해 주세요.');}
 if(!body||typeof body!=='object'||Array.isArray(body))return fail('요청을 확인해 주세요.');
 const ip=request.headers.get('CF-Connecting-IP')||'local';
 if(!await limit(env,'ip:'+ip,20))return fail('요청이 많습니다. 잠시 후 다시 시도해 주세요.',429);
 if(action!=='logout'&&env.PASSWORD_AUTH_AVAILABLE==='false')return fail('회원 기능을 점검 중입니다. 잠시 후 다시 이용해 주세요.',503);
 if(action==='logout'||action==='delete') {
  const session=await memberSession(request,env);if(!session||!equal(request.headers.get('X-CSRF-Token'),session.csrf))return fail('다시 로그인해 주세요.',403);
  if(action==='delete'){
   if(!validPassword(body.password))return fail('비밀번호를 입력해 주세요.',400,'password');
   const row=await env.DB.prepare('SELECT password_hash,salt FROM members WHERE id=?').bind(session.id).first();
   if(!equal(await passwordHash(body.password,row.salt),row.password_hash))return fail('비밀번호가 일치하지 않습니다.',403,'password');
   await env.DB.batch([env.DB.prepare('DELETE FROM auth_tokens WHERE member_id=?').bind(session.id),env.DB.prepare('DELETE FROM member_sessions WHERE member_id=?').bind(session.id),env.DB.prepare('DELETE FROM members WHERE id=?').bind(session.id)]);
  }else await env.DB.prepare('DELETE FROM member_sessions WHERE token_hash=?').bind(session.token_hash).run();
  return reply({ok:true},200,{'Set-Cookie':cookie('')});
 }
 if(action==='verify'){
  if(!validToken(body.token))return fail('인증 링크가 올바르지 않습니다.');const hash=digest(body.token),now=Date.now();
  const row=await env.DB.prepare("UPDATE members SET email_verified=1 WHERE email_verified=0 AND id=(SELECT member_id FROM auth_tokens WHERE token_hash=? AND kind='verify' AND expires_at>?) RETURNING id").bind(hash,now).first();
  if(!row)return fail('만료되었거나 이미 사용한 인증 링크입니다. 다시 인증 메일을 요청해 주세요.');
  await env.DB.prepare("DELETE FROM auth_tokens WHERE member_id=? AND kind='verify'").bind(row.id).run();return reply({ok:true,verified:true});
 }
 if(action==='reset'){
  if(!validToken(body.token))return fail('재설정 링크가 올바르지 않습니다.');
  if(!validNewPassword(body.password))return fail('비밀번호를 10자 이상 입력해 주세요.',400,'password');
  const now=Date.now(),row=await env.DB.prepare("DELETE FROM auth_tokens WHERE token_hash=? AND kind='reset' AND expires_at>? RETURNING member_id").bind(digest(body.token),now).first();
  if(!row)return fail('만료되었거나 이미 사용한 링크입니다. 다시 비밀번호 찾기를 진행해 주세요.');
  const salt=random(),hash=await passwordHash(body.password,salt);
  const member=await env.DB.prepare('SELECT email FROM members WHERE id=?').bind(row.member_id).first();
  await env.DB.batch([env.DB.prepare('UPDATE members SET password_hash=?,salt=? WHERE id=? AND email_verified=1').bind(hash,salt,row.member_id),env.DB.prepare('DELETE FROM member_sessions WHERE member_id=?').bind(row.member_id),env.DB.prepare('DELETE FROM auth_tokens WHERE member_id=?').bind(row.member_id)]);
  if(member?.email&&env.EMAIL?.send)await defer(ctx,env.EMAIL.send({from:{email:'noreply@ygmhelper.xyz',name:'YGMhelper'},to:member.email,replyTo:'help@ygmhelper.xyz',subject:'YGMhelper 비밀번호 변경 알림',text:'비밀번호가 변경되었으며 기존 로그인은 모두 해제되었습니다. 직접 변경하지 않았다면 비밀번호 찾기를 진행하고 help@ygmhelper.xyz로 문의해 주세요.',html:'<p>비밀번호가 변경되었으며 기존 로그인은 모두 해제되었습니다.</p><p>직접 변경하지 않았다면 비밀번호 찾기를 진행하고 help@ygmhelper.xyz로 문의해 주세요.</p>'}).catch(()=>console.error(JSON.stringify({event:'auth_notification_error'}))));
  return reply({ok:true,reset:true},200,{'Set-Cookie':cookie('')});
 }
 if(action==='forgot'||action==='resend'){
  const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
  if(!validEmail(email))return fail('이메일 주소를 확인해 주세요.',400,'email');
  if(!await limit(env,'mail-ip:'+ip,5)||!await limit(env,'mail-email:'+email,3))return fail('메일 요청이 많습니다. 잠시 후 다시 시도해 주세요.',429);
  if(!await verifyBot(body,request,env,action))return fail('로봇 확인을 다시 진행해 주세요.',403);
  if(!env.EMAIL?.send)return fail('메일을 보낼 수 없습니다. 잠시 후 다시 시도해 주세요.',503);
  const task=(async()=>{const row=await env.DB.prepare('SELECT id,email,email_verified FROM members WHERE email=?').bind(email).first();if(row&&(action==='forgot'?row.email_verified===1:row.email_verified===0))await authMail(env,row,action==='forgot'?'reset':'verify');})();
  await defer(ctx,task);return reply({ok:true,sent:true});
 }
 const username=typeof body.username==='string'?body.username.trim().toLowerCase():'';
 if(!/^[a-z0-9_]{4,24}$/.test(username))return fail('아이디는 영문, 숫자, 밑줄 4~24자로 입력해 주세요.',400,'username');
 if(!validPassword(body.password))return fail('비밀번호를 입력해 주세요.',400,'password');
 if(action==='signup'&&!validNewPassword(body.password))return fail('비밀번호를 10자 이상 입력해 주세요.',400,'password');
 const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
 if(action==='signup'&&!validEmail(email))return fail('이메일 주소를 확인해 주세요.',400,'email');
 if(!await limit(env,'account:'+username,10))return fail('잠시 후 다시 시도해 주세요.',429);
 if(!await verifyBot(body,request,env,action))return fail('로봇 확인을 다시 진행해 주세요.',403);
 let row;
 if(action==='signup'){
  if(env.REGISTRATION_OPEN!=='true')return fail('회원가입을 준비 중입니다.',503);
  if(body.age14!==true||body.privacy!==true||body.betaReset!==true||body.consentVersion!==consentVersion)return fail('필수 동의 항목을 확인해 주세요.');
  if(!env.EMAIL?.send)return fail('메일을 보낼 수 없습니다. 잠시 후 다시 시도해 주세요.',503);
  if(!await limit(env,'signup:'+ip,5)||!await limit(env,'mail-email:'+email,3))return fail('요청이 많습니다. 잠시 후 다시 시도해 주세요.',429);
  const existing=await env.DB.prepare('SELECT id FROM members WHERE username=? OR email=?').bind(username,email).first();if(existing)return fail('이미 사용 중인 아이디 또는 이메일입니다. 미인증 계정은 인증 메일을 다시 요청해 주세요.',409);
  const id=crypto.randomUUID(),salt=random(),hash=await passwordHash(body.password,salt);
  const inserted=await env.DB.prepare('INSERT OR IGNORE INTO members (id,username,email,email_verified,password_hash,salt,consent_version,created_at) VALUES (?,?,?,0,?,?,?,?)').bind(id,username,email,hash,salt,consentVersion,Date.now()).run();
  if(!inserted.meta.changes)return fail('이미 사용 중인 아이디 또는 이메일입니다.',409);
  try{await authMail(env,{id,email},'verify');}catch{await env.DB.prepare('DELETE FROM auth_tokens WHERE member_id=?').bind(id).run();await env.DB.prepare('DELETE FROM members WHERE id=?').bind(id).run();return fail('인증 메일을 보내지 못했습니다. 잠시 후 다시 가입해 주세요.',503);}
  return reply({ok:true,verificationRequired:true});
 }
 row=await env.DB.prepare('SELECT id,username,password_hash,salt,email_verified FROM members WHERE username=?').bind(username).first();
 const hash=await passwordHash(body.password,row?.salt||'0'.repeat(64));
 if(!row||!equal(hash,row.password_hash))return fail('아이디 또는 비밀번호가 일치하지 않습니다.',401);
 if(row.email_verified!==1)return fail('이메일 인증을 완료해 주세요. 인증 메일을 다시 받을 수 있습니다.',403);
 const token=random(),csrf=random(),now=Date.now();
 const old=request.headers.get('Cookie')?.match(/(?:^|;\s*)__Host-ygm_session=([a-f0-9]{64})(?:;|$)/)?.[1];
 await env.DB.batch([env.DB.prepare('DELETE FROM member_sessions WHERE expires_at<=? OR last_seen<=?').bind(now,now-7200000),env.DB.prepare('DELETE FROM auth_attempts WHERE expires_at<=?').bind(now),env.DB.prepare('DELETE FROM member_sessions WHERE token_hash=?').bind(old?digest(old):''),env.DB.prepare('INSERT INTO member_sessions (token_hash,member_id,csrf,expires_at,last_seen) VALUES (?,?,?,?,?)').bind(digest(token),row.id,csrf,now+86400000,now)]);
 return reply({ok:true,user:{username:row.username},csrf},200,{'Set-Cookie':cookie(token)});
}
