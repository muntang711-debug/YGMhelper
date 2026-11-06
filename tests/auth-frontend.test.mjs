import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {createSafeStorage} from '../public/js/common.js';

const script=(await fs.readFile(new URL('../public/js/auth.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/,'');
for(const page of ['login','signup','account']){
 test(`${page}: pending or failed configuration never submits a password in a URL`,async t=>{
  const html=await fs.readFile(new URL(`../public/${page}.html`,import.meta.url),'utf8');
  const dom=new JSDOM(html,{url:`https://ygmhelper.xyz/${page}.html`,runScripts:'outside-only'});
  t.after(()=>dom.window.close());const w=dom.window;
  w.createSafeStorage=createSafeStorage;w.matchMedia=()=>({matches:false});
  let rejectConfig;w.fetch=()=>new Promise((_,reject)=>{rejectConfig=reject;});
  w.eval(script);const form=w.document.querySelector('form');
  assert.equal(form.method,'post');assert.match(form.action,/\/api\/auth\//);
  assert.equal(form.querySelector('[type=submit]').disabled,true);
  const event=new w.Event('submit',{cancelable:true});form.dispatchEvent(event);assert.equal(event.defaultPrevented,true);
  rejectConfig(new Error('offline'));await new Promise(r=>setTimeout(r,0));
  const failed=new w.Event('submit',{cancelable:true});form.dispatchEvent(failed);assert.equal(failed.defaultPrevented,true);
  assert.equal(w.location.search,'');
 });
}

test('custom validation marks fields and suppresses browser validation popups',async t=>{
 const html=await fs.readFile(new URL('../public/signup.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'https://ygmhelper.xyz/signup',runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window;
 w.fetch=async()=>Response.json({ok:true,passwordAuthAvailable:true,registrationOpen:true,sitekey:''});
 w.HTMLFormElement.prototype.reportValidity=()=>{throw Error('native popup must not run');};
 w.eval(script);await new Promise(r=>setTimeout(r,0));
 const form=w.document.querySelector('form');assert.equal(form.noValidate,true);
 form.dispatchEvent(new w.Event('submit',{cancelable:true}));
 assert.equal(w.document.querySelector('#username').getAttribute('aria-invalid'),'true');
 assert.match(w.document.querySelector('#username-error').textContent,/아이디/);
 assert.equal(w.document.activeElement.id,'username');
 assert(w.document.querySelector('.auth-field').classList.contains('auth-shake'));
 const input=w.document.querySelector('#username');input.value='valid_user';input.dispatchEvent(new w.Event('input'));
 assert.equal(input.hasAttribute('aria-invalid'),false);assert.equal(w.document.querySelector('#username-error'),null);
});

test('recovery token is removed from the URL and is not sent on page load',async t=>{
 const html=await fs.readFile(new URL('../public/reset.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'https://ygmhelper.xyz/reset#token='+'a'.repeat(64),runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window,calls=[];
 w.fetch=async(url,options)=>{calls.push({url,options});return Response.json({ok:true,passwordAuthAvailable:true});};
 w.eval(script);await new Promise(r=>setTimeout(r,0));assert.equal(w.location.hash,'');assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/auth/config');
});
