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
