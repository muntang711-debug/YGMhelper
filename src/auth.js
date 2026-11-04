import {pbkdf2Async} from '@noble/hashes/pbkdf2.js';
import {sha256} from '@noble/hashes/sha2.js';
import {readBounded, SECURITY_HEADERS} from './http.js';

const encoder = new TextEncoder();
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const digest = value => hex(sha256(encoder.encode(value)));
const cookieName = '__Host-ygm_session';
const consentVersion = '2026-11-04-draft';
const reply = (body, status = 200, extra = {}) => Response.json(body, {status, headers: {...SECURITY_HEADERS, 'Cache-Control': 'no-store', ...extra}});
const fail = (message, status = 400) => reply({ok:false, error:message}, status);
const cookie = token => `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${token ? 86400 : 0}`;
const validPassword = value => typeof value === 'string' && Array.from(value).length >= 15 && Array.from(value).length <= 128 && encoder.encode(value).length <= 512;
export const passwordHash = async (password, salt) => hex(await pbkdf2Async(sha256, password, salt, {c:600000, dkLen:32}));
function equal(a,b) { if(typeof a !== 'string' || a.length !== b.length)return false; let diff=0; for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i); return diff===0; }

export async function memberSession(request, env) {
  if(env.MEMBERSHIP_ENABLED !== 'true')return null;
  const token = request.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  if(!token || !/^[a-f0-9]{64}$/.test(token))return null;
  const now=Date.now();
  const session=await env.DB.prepare('SELECT s.token_hash, s.csrf, s.last_seen, m.id, m.username FROM member_sessions s JOIN members m ON m.id = s.member_id WHERE s.token_hash = ? AND s.expires_at > ? AND s.last_seen > ?').bind(digest(token),now,now-7200000).first();
  if(session && now-session.last_seen>60000)await env.DB.prepare('UPDATE member_sessions SET last_seen=? WHERE token_hash=?').bind(now,session.token_hash).run();
  return session;
}
async function limit(env,key,max) {
  const now=Date.now(), bucket=Math.floor(now/900000);
  const row=await env.DB.prepare('INSERT INTO auth_attempts (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(digest(key+':'+bucket),now+900000).first();
  return row.count<=max;
}
async function verifyBot(body, request, env, action) {
  const token=body.turnstile;
  if(typeof token!=='string'||!token||token.length>2048||!env.TURNSTILE_SECRET)return false;
  const hosts=String(env.TURNSTILE_HOSTNAMES||'').split(',').filter(Boolean);
  const host=new URL(request.url).hostname;
  if(!hosts.includes(host))return false;
  try {
    const res=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {method:'POST',signal:AbortSignal.timeout(10000),body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:token,...request.headers.get('CF-Connecting-IP')?{remoteip:request.headers.get('CF-Connecting-IP')}:{}})});
    const value=await res.json();
    return res.ok && value.success===true && value.action===action && value.hostname===host;
  }catch{return false;}
}
export async function authHandler(request,env) {
  const url=new URL(request.url), action=url.pathname.split('/').pop();
  if(env.MEMBERSHIP_ENABLED!=='true')return fail('회원 기능을 준비 중입니다.',503);
  if(action==='config'&&request.method==='GET')return reply({ok:true,sitekey:env.TURNSTILE_SITEKEY||'',consentVersion,registrationOpen:env.REGISTRATION_OPEN==='true'});
  if(action==='session'&&request.method==='GET') {
    const session=await memberSession(request,env);
    if(session)await env.DB.prepare('UPDATE member_sessions SET last_seen=? WHERE token_hash=?').bind(Date.now(),session.token_hash).run();
    return reply({ok:true,user:session?{username:session.username}:null,csrf:session?.csrf||null});
  }
  if(!['signup','login','logout','delete'].includes(action))return fail('경로를 찾을 수 없습니다.',404);
  if(request.method!=='POST')return fail('지원하지 않는 요청 방식입니다.',405);
  if(request.headers.get('Origin')!==url.origin || request.headers.get('Sec-Fetch-Site')==='cross-site')return fail('허용되지 않은 요청 출처입니다.',403);
  if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json')return fail('JSON 요청이 필요합니다.',415);
  let body;try{body=JSON.parse(new TextDecoder().decode(await readBounded(request,4096,{request:true})));}catch{return fail('요청을 확인해 주세요.');}
  if(!body||typeof body!=='object'||Array.isArray(body))return fail('요청을 확인해 주세요.');
  const ip=request.headers.get('CF-Connecting-IP')||'local';
  if(!await limit(env,'ip:'+ip,20))return fail('요청이 많습니다. 잠시 후 다시 시도해 주세요.',429);
  if(action==='logout'||action==='delete') {
    const session=await memberSession(request,env);
    if(!session||!equal(request.headers.get('X-CSRF-Token'),session.csrf))return fail('다시 로그인해 주세요.',403);
    if(action==='delete') {
      if(typeof body.password!=='string'||encoder.encode(body.password).length>512)return fail('비밀번호를 확인해 주세요.');
      const row=await env.DB.prepare('SELECT password_hash,salt FROM members WHERE id=?').bind(session.id).first();
      if(!equal(await passwordHash(body.password,row.salt),row.password_hash))return fail('비밀번호를 확인해 주세요.',403);
      await env.DB.batch([env.DB.prepare('DELETE FROM member_sessions WHERE member_id=?').bind(session.id),env.DB.prepare('DELETE FROM members WHERE id=?').bind(session.id)]);
    }else await env.DB.prepare('DELETE FROM member_sessions WHERE token_hash=?').bind(session.token_hash).run();
    return reply({ok:true},200,{'Set-Cookie':cookie('')});
  }
  const username=typeof body.username==='string'?body.username.trim().toLowerCase():'';
  if(!/^[a-z0-9_]{4,24}$/.test(username)||!validPassword(body.password))return fail('아이디 또는 비밀번호를 확인해 주세요.');
  if(!await limit(env,'account:'+username,10))return fail('잠시 후 다시 시도해 주세요.',429);
  if(!await verifyBot(body,request,env,action))return fail('로봇 확인을 다시 진행해 주세요.',403);
  let row;
  if(action==='signup') {
    if(env.REGISTRATION_OPEN!=='true')return fail('회원가입을 준비 중입니다.',503);
    if(body.age14!==true||body.privacy!==true||body.consentVersion!==consentVersion)return fail('필수 동의 항목을 확인해 주세요.');
    if(!await limit(env,'signup:'+ip,5))return fail('잠시 후 다시 시도해 주세요.',429);
    const salt=random(), id=crypto.randomUUID(), hash=await passwordHash(body.password,salt);
    const inserted=await env.DB.prepare('INSERT OR IGNORE INTO members (id,username,password_hash,salt,consent_version,created_at) VALUES (?,?,?,?,?,?)').bind(id,username,hash,salt,consentVersion,Date.now()).run();
    if(!inserted.meta.changes)return fail('사용할 수 없는 아이디입니다.',409);
    row={id,username};
  }else {
    row=await env.DB.prepare('SELECT id,username,password_hash,salt FROM members WHERE username=?').bind(username).first();
    const hash=await passwordHash(body.password,row?.salt||'0'.repeat(64));
    if(!row||!equal(hash,row.password_hash))return fail('아이디 또는 비밀번호가 일치하지 않습니다.',401);
  }
  const token=random(),csrf=random(),now=Date.now();
  const old=request.headers.get('Cookie')?.match(/(?:^|;\s*)__Host-ygm_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  await env.DB.batch([
    env.DB.prepare('DELETE FROM member_sessions WHERE expires_at<=? OR last_seen<=?').bind(now,now-7200000),
    env.DB.prepare('DELETE FROM auth_attempts WHERE expires_at<=?').bind(now),
    env.DB.prepare('DELETE FROM member_sessions WHERE token_hash=?').bind(old?digest(old):''),
    env.DB.prepare('INSERT INTO member_sessions (token_hash,member_id,csrf,expires_at,last_seen) VALUES (?,?,?,?,?)').bind(digest(token),row.id,csrf,now+86400000,now)
  ]);
  return reply({ok:true,user:{username:row.username},csrf},200,{'Set-Cookie':cookie(token)});
}
