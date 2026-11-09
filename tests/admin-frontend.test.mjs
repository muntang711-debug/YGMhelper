import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const html=await fs.readFile(new URL('../public/admin.html',import.meta.url),'utf8');
const script=await fs.readFile(new URL('../public/js/admin.js',import.meta.url),'utf8');
async function boot(t,{authenticated=false,otpEnabled=false}={}){
 const dom=new JSDOM(html,{url:'https://ygmhelper.xyz/admin.html',runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window,calls=[];
 w.fetch=async(url,options)=>{calls.push({url,options});if(url.endsWith('/session'))return Response.json({ok:true,authenticated,otpEnabled,csrf:authenticated?'fixture':null});if(url.endsWith('/login'))return Response.json({ok:true,csrf:'fixture'});if(url.includes('/members'))return Response.json({ok:true,members:[{id:'member',username:'<script>unsafe</script>',email:'student@example.com',email_verified:1,student_verified_at:null,student_quiz_attempts:5,created_at:Date.now()}],nextCursor:null});if(url.includes('/ip-blocks'))return Response.json({ok:true,blocks:[{ip_hash:'f'.repeat(64),blocked_at:Date.now(),username:'student'}]});return Response.json({ok:true});};
 await w.eval('(async()=>{'+script+'})()');return {w,d:w.document,calls};
}
test('admin login switches between OTP and keys and never sends credentials in a URL',async t=>{
 const {w,d,calls}=await boot(t,{otpEnabled:true});assert.equal(d.querySelector('#admin-otp-field').hidden,false);
 d.querySelector('[data-method="key"]').click();d.querySelector('#admin-key').value='a'.repeat(64);d.querySelector('#admin-login-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,0));
 const post=calls.find(c=>c.url.endsWith('/login'));assert.equal(post.url,'/api/admin/login');assert.equal(JSON.parse(post.options.body).key,'a'.repeat(64));assert.equal(post.options.credentials,'same-origin');assert.equal(d.querySelector('#admin-key').value,'');assert.equal(d.querySelector('#admin-workspace').hidden,false);
 assert.equal(d.querySelector('#admin-list script'),null);assert.match(d.querySelector('#admin-list').textContent,/<script>unsafe/);
});
test('admin actions carry CSRF and network controls remain inside the protected workspace',async t=>{
 const {d,calls}=await boot(t,{authenticated:true});
 [...d.querySelectorAll('#admin-list button')].find(b=>b.textContent==='시도 초기화').click();await new Promise(r=>setTimeout(r,0));
 const action=calls.find(c=>c.url.endsWith('/member'));assert.equal(action.options.headers['X-CSRF-Token'],'fixture');assert.equal(JSON.parse(action.options.body).action,'reset-attempts');
 d.querySelector('[data-section="ip-blocks"]').click();await new Promise(r=>setTimeout(r,0));[...d.querySelectorAll('#admin-list button')].find(b=>b.textContent==='차단 해제').click();await new Promise(r=>setTimeout(r,0));assert(calls.some(c=>c.url.endsWith('/unblock-ip')));
});
test('public and member pages contain no route to the administrator page',async()=>{
 for(const page of ['index','account']){const html=await fs.readFile(new URL('../public/'+page+'.html',import.meta.url),'utf8');const dom=new JSDOM(html);assert.equal(dom.window.document.querySelector('a[href*="admin"]'),null);dom.window.close();}
});
