import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {createSafeStorage} from '../public/js/common.js';

const script=(await fs.readFile(new URL('../public/js/auth.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/,'');
test('auth steps have a single page shell and never duplicate the login form',async()=>{
 for(const page of ['login','signup','account','forgot','reset','verify','resend','check-email','reset-email','password-changed','email-verified']){
  const html=await fs.readFile(new URL(`../public/${page}.html`,import.meta.url),'utf8');const dom=new JSDOM(html);const d=dom.window.document;
  assert.equal(d.querySelectorAll('header').length,1,page);assert.equal(d.querySelectorAll('main').length,1,page);assert.equal(d.querySelectorAll('h1').length,1,page);
  assert.equal(d.querySelectorAll('form').length,['check-email','reset-email','password-changed','email-verified'].includes(page)?0:1,page);
  dom.window.close();
 }
});
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
 assert.equal(w.document.activeElement.id,'email');
 assert(w.document.querySelector('.auth-field').classList.contains('auth-shake'));
 const input=w.document.querySelector('#username');input.value='valid_user';input.dispatchEvent(new w.Event('input'));
 assert.equal(input.hasAttribute('aria-invalid'),false);assert.equal(w.document.querySelector('#username-error'),null);
});

test('signup separates contact autofill from account credentials and places username before password',async()=>{
 const html=await fs.readFile(new URL('../public/signup.html',import.meta.url),'utf8');const dom=new JSDOM(html),d=dom.window.document;
 const fields=[...d.querySelectorAll('input:not([type=checkbox])')];assert.deepEqual(fields.map(f=>f.name),['email','username','password','confirm']);
 assert.equal(d.querySelector('#email').autocomplete,'section-contact email');assert.equal(d.querySelector('#username').autocomplete,'section-account username');
 assert.equal(d.querySelector('#password').autocomplete,'section-account new-password');
 assert.equal(d.querySelector('label[for=username]').textContent,'아이디');assert.equal(d.querySelector('#username').closest('.auth-field').querySelector('fieldset').getAttribute('aria-hidden'),'true');
 dom.window.close();
});

test('password visibility buttons preserve values and never submit the form',async t=>{
 const html=await fs.readFile(new URL('../public/login.html',import.meta.url),'utf8');const dom=new JSDOM(html,{url:'https://ygmhelper.xyz/login',runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window;
 w.fetch=()=>new Promise(()=>{});w.eval(script);const input=w.document.querySelector('#password'),toggle=w.document.querySelector('.password-toggle');
 let submissions=0;w.document.querySelector('form').addEventListener('submit',()=>submissions++);input.value='visibility-test-value';
 toggle.click();assert.equal(input.type,'text');assert.equal(input.value,'visibility-test-value');assert.equal(toggle.getAttribute('aria-pressed'),'true');assert.match(toggle.getAttribute('aria-label'),/숨기기/);
 toggle.click();assert.equal(input.type,'password');assert.equal(input.value,'visibility-test-value');assert.equal(toggle.getAttribute('aria-pressed'),'false');assert.equal(submissions,0);
});

test('submitting a visible password restores its password type before the API request',async t=>{
 const html=await fs.readFile(new URL('../public/login.html',import.meta.url),'utf8');const dom=new JSDOM(html,{url:'https://ygmhelper.xyz/login',runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window,calls=[];
 w.fetch=async(url,options)=>{calls.push({url,options,passwordType:w.document.querySelector('#password').type});return url.endsWith('/config')?Response.json({ok:true,passwordAuthAvailable:true,sitekey:'fixture'}):Response.json({ok:false,error:'fixture login rejected'},{status:401});};
 w.turnstile={render(selector,options){options.callback();return 1;},getResponse(){return 'fixture';},reset(){}};
 w.eval(script);await new Promise(r=>setTimeout(r,0));w.document.querySelector('script[src*=challenges]').dispatchEvent(new w.Event('load'));
 w.document.querySelector('#username').value='test_user';w.document.querySelector('#password').value='a-long-test-password';w.document.querySelector('.password-toggle').click();
 w.document.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,0));
 assert.equal(calls[1].passwordType,'password');assert.equal(JSON.parse(calls[1].options.body).password,'a-long-test-password');
});

test('recovery token is removed from the URL and is not sent on page load',async t=>{
 const html=await fs.readFile(new URL('../public/reset.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'https://ygmhelper.xyz/reset#token='+'a'.repeat(64),runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window,calls=[];
 w.fetch=async(url,options)=>{calls.push({url,options});return Response.json({ok:true,passwordAuthAvailable:true});};
 w.eval(script);await new Promise(r=>setTimeout(r,0));assert.equal(w.location.hash,'');assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/auth/config');
});

test('email verification consumes its fragment once by POST after loading configuration',async t=>{
 const html=await fs.readFile(new URL('../public/verify.html',import.meta.url),'utf8');
 const token='b'.repeat(64),dom=new JSDOM(html,{url:'https://ygmhelper.xyz/verify#token='+token,runScripts:'outside-only'});
 t.after(()=>dom.window.close());const w=dom.window,calls=[];
 w.fetch=async(url,options)=>{calls.push({url,options});return url.endsWith('/config')?Response.json({ok:true,passwordAuthAvailable:true}):Response.json({ok:false,error:'test link expired'},{status:400});};
 w.eval(script);await new Promise(r=>setTimeout(r,10));assert.equal(w.location.hash,'');assert.equal(calls.length,2);
 assert.equal(calls[1].url,'/api/auth/verify');assert.equal(calls[1].options.method,'POST');assert.equal(JSON.parse(calls[1].options.body).token,token);
});
