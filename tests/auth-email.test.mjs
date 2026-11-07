import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderAuthEmail} from '../src/auth-email.js';

test('auth email templates keep action links, expiry and readable plain text together',()=>{
 const link='https://ygmhelper.xyz/verify#token='+'a'.repeat(64);
 for(const kind of ['verify','reset','changed']){
  const mail=renderAuthEmail(kind,link,30);assert(mail.html.includes('role="presentation"'));assert(mail.text.includes(link));assert(mail.html.includes(link));assert(mail.text.includes('support@ygmhelper.xyz'));
  assert(!mail.html.includes('<script'));assert(!mail.html.includes('http://'));
  if(kind!=='changed'){assert(mail.text.includes('30분'));assert(mail.html.includes('30분'));}
 }
 assert(renderAuthEmail('verify','https://example.com/?x="<unsafe>',30).html.includes('&quot;&lt;unsafe&gt;'));
 assert.throws(()=>renderAuthEmail('unsupported',link,30));
});
