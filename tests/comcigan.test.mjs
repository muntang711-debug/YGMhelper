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

test('transport reads rotating school selector and public encryption key without executing code',async()=>{
 const {comciganTransport}=await import('../src/comcigan.js');
 const key='12'.repeat(32);const data=comciganTransport("var r=Math.floor(학교[0]/6347)+2;CryptoJS.enc.Hex.parse('"+key+"')");
 assert.equal(Math.floor(19041/data.schoolDivisor)+data.schoolOffset,5);assert.equal(data.encryptionKey,key);
 assert.equal(comciganTransport('legacy').schoolOffset,3);
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
 tag[0]^=1;await assert.rejects(()=>decodeComciganPayload(prefix+':'+base64(tag),hex),e=>e.code==='COMCIGAN_ERROR');
 await assert.rejects(()=>decodeComciganPayload(prefix+':invalid',hex));
 assert.equal(await decodeComciganPayload('{}',null),'{}');
});
