import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodeComciganPage} from '../src/comcigan.js';

const encode = (text, key) => Array.from({length:text.length}, (_, i) =>
  (text.charCodeAt(i) ^ ((key + i * 13) & 255)).toString(16).padStart(4, '0')).join('');
const wrap = (blocks, key=100) => `/* hour-obfuscated-v2 */(function(a,k){} )(${JSON.stringify(blocks)},${key});`.replace('{} )','{})');

test('Comcigan wrapper decodes Korean and resets XOR position for each block', () => {
  const page = wrap([[0,encode('용곡중학교 자료154',100)],[1,' literal '],[0,encode('시간표',100)]]);
  assert.equal(decodeComciganPage(page), '용곡중학교 자료154 literal 시간표');
});
test('plain Comcigan pages remain supported', () => {
  const page = "sc_data('123_ ./36179?991l";
  assert.equal(decodeComciganPage(page), page);
});
test('request token is read only from a bounded literal assignment', async () => {
  const {comciganTransport}=await import('../src/comcigan.js');
  const token='a1'.repeat(32);
  assert.equal(comciganTransport(`<script>window.__HourRequestToken="${token}";</script>`).requestToken,token);
  for(const source of ['legacy', 'window.__HourRequestToken=getToken()', 'window.__HourRequestToken="short"', `window.__HourRequestToken="${'a'.repeat(257)}"`, `window.__HourRequestToken="${token}\r\nInjected"`]) {
    assert.equal(comciganTransport(source).requestToken,null);
  }
});
test('malformed Comcigan wrappers fail closed', () => {
  for (const page of [
    '/* hour-obfuscated-v2 */ broken', wrap([[0,'bad']]), wrap([[0,'zzzz']]),
    wrap([[2,'value']]), wrap([[0,42]]), wrap([[0,'0000']],256)
  ]) assert.throws(() => decodeComciganPage(page), e => e.code === 'COMCIGAN_ERROR');
});
test('decoded JavaScript is returned only as data and is never executed', () => {
  const code = 'throw new Error("upstream code must never execute")';
  assert.equal(decodeComciganPage(wrap([[0,encode(code,100)]])), code);
});

test('nested AJAX wrappers decode independently while preserving surrounding source',()=>{
 const inner=wrap([[0,encode('function QAjaxSchool(){}',93)]],93).replace('hour-obfuscated-v2','hour-ajax-obfuscated-v1');
 const second=wrap([[1,'throw new Error("never run")']],42).replace('hour-obfuscated-v2','hour-ajax-obfuscated-v1');
 const text=inner+'\nplain source\n'+second;
 assert.equal(decodeComciganPage(wrap([[0,encode(text,78)]],78)),'function QAjaxSchool(){}\nplain source\nthrow new Error("never run")');
 assert.throws(()=>decodeComciganPage('/* hour-ajax-obfuscated-v1 */ broken'));
});

test('enc5 packed transport extracts only literal key pieces and index concatenation',async()=>{
 const {comciganTransport}=await import('../src/comcigan.js');
 const source="function QAjaxSchool(sc,success){return $.ajax({url:'./952563?'+encodeURIComponent(btoa('21326l'+encodeURIComponent(sc)+'_enc5'))});}function QAjaxTimetable(){return btoa(s7+'_'+r+'_enc5');}CryptoJS.enc.Hex.parse((function(a){return a[2]+a[1]+a[3]+a[0];})(['aaaaaaaaaaaaaaaa','bbbbbbbbbbbbbbbb','cccccccccccccccc','dddddddddddddddd']));";
 const t=comciganTransport(source);assert.equal(t.encryptionKey,'c'.repeat(16)+'b'.repeat(16)+'d'.repeat(16)+'a'.repeat(16));assert.equal(t.endpoint,'952563');assert.equal(t.searchPrefix,'21326');assert.equal(t.payloadSuffix,'_enc5');assert.equal(t.schoolSearchSuffix,'_enc5');assert.equal(t.packedSchoolSearch,true);
 assert.equal(comciganTransport(source.replace('return a[2]+','return evil()+')).encryptionKey,null);
});

test('transport reads rotating school selector and public encryption key without executing code',async()=>{
 const {comciganTransport}=await import('../src/comcigan.js');
 const key='12'.repeat(32);const data=comciganTransport("var r=Math.floor(학교[0]/6347)+2;CryptoJS.enc.Hex.parse('"+key+"')");
 assert.equal(Math.floor(19041/data.schoolDivisor)+data.schoolOffset,5);assert.equal(data.encryptionKey,key);
 assert.equal(comciganTransport('legacy').schoolOffset,3);
 assert.equal(comciganTransport('legacy').schoolSearchSuffix,'');
 assert.equal(comciganTransport("function school_ra(sc){$.ajax({ url:'./837738?101593l'+sc+'_enc2', dataType:'text' });}").schoolSearchSuffix,'_enc2');
});
test('enc2 payload authenticates before AES decoding and rejects tampering',async()=>{
 const {decodeComciganPayload}=await import('../src/comcigan.js');
 const key=crypto.getRandomValues(new Uint8Array(32)),iv=crypto.getRandomValues(new Uint8Array(16));
 const aes=await crypto.subtle.importKey('raw',key,'AES-CBC',false,['encrypt']);
 const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-CBC',iv},aes,new TextEncoder().encode('{"학교":"용곡중학교"}')));
 const base64=b=>btoa(String.fromCharCode(...b));const prefix='enc2:'+base64(iv)+':'+base64(cipher);
 const hmac=await crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const tag=new Uint8Array(await crypto.subtle.sign('HMAC',hmac,new TextEncoder().encode(prefix)));
 const hex=Array.from(key,b=>b.toString(16).padStart(2,'0')).join('');
 assert.equal(await decodeComciganPayload(prefix+':'+base64(tag),hex),'{"학교":"용곡중학교"}');
 const enc5=prefix.replace('enc2:','enc5:');const tag5=new Uint8Array(await crypto.subtle.sign('HMAC',hmac,new TextEncoder().encode(enc5)));
 assert.equal(await decodeComciganPayload(enc5+':'+base64(tag5),hex),'{"학교":"용곡중학교"}');
 await assert.rejects(()=>decodeComciganPayload(enc5+':'+base64(tag),hex));
 await assert.rejects(()=>decodeComciganPayload('enc99:a:b:c',hex));
 tag[0]^=1;await assert.rejects(()=>decodeComciganPayload(prefix+':'+base64(tag),hex),e=>e.code==='COMCIGAN_ERROR');
 await assert.rejects(()=>decodeComciganPayload(prefix+':invalid',hex));
 assert.equal(await decodeComciganPayload('{}',null),'{}');
});
