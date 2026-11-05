import { HttpError } from './http.js';

// Comcigan's hour-obfuscated-v2 wrapper stores UTF-16 text in XOR hex blocks.
// Decode the data only: never evaluate code returned by the upstream server.
export function decodeComciganPage(html) {
  if (!html.includes('/* hour-obfuscated-v2 */')) return html;
  const fail = () => new HttpError('COMCIGAN_ERROR', '컴시간 데이터 형식을 확인하지 못했습니다.');
  const match = html.match(/\}\)\((\[\[[\s\S]*?\]\]),\s*(\d{1,3})\s*\);/);
  if (!match || Number(match[2]) > 255) throw fail();
  let blocks;
  try { blocks = JSON.parse(match[1]); } catch { throw fail(); }
  if (!Array.isArray(blocks) || blocks.length > 10000) throw fail();
  const key = Number(match[2]);
  let output = '';
  for (const block of blocks) {
    if (!Array.isArray(block) || block.length !== 2 || ![0, 1].includes(block[0]) || typeof block[1] !== 'string') throw fail();
    const [literal, value] = block;
    if (literal) {
      output += value;
    } else {
      if (value.length % 4 || !/^[0-9a-f]*$/i.test(value)) throw fail();
      for (let offset = 0; offset < value.length; offset += 4) {
        output += String.fromCharCode(parseInt(value.slice(offset, offset + 4), 16) ^ ((key + (offset / 4) * 13) & 255));
      }
    }
    if (output.length > 1024 * 1024) throw fail();
  }
  return output;
}

export function comciganTransport(html) {
 const selector=html.match(/Math\.floor\([^;]*?\[0\]\/(\d+)\)\+(\d+)/);
 const key=html.match(/CryptoJS\.enc\.Hex\.parse\(['"]([a-f0-9]{64})['"]\)/i)?.[1];
 return {schoolDivisor:selector?Number(selector[1]):null,schoolOffset:selector?Number(selector[2]):3,encryptionKey:key||null};
}
export async function decodeComciganPayload(text, keyHex) {
 text=text.replace(/\0+$/g,'');
 if(!/^enc[12]:/.test(text))return text;
 const fail=()=>new HttpError('COMCIGAN_ERROR','컴시간 암호화 자료를 확인하지 못했습니다.');
 try {
  const parts=text.split(':');if(parts.length!==4||!/^[a-f0-9]{64}$/i.test(keyHex||''))throw fail();
  const bytes=value=>{
   if(parts[0]==='enc1'){if(value.length%2||!/^[a-f0-9]+$/i.test(value))throw fail();return Uint8Array.from(value.match(/../g),h=>parseInt(h,16));}
   const decoded=atob(value);if(btoa(decoded)!==value)throw fail();return Uint8Array.from(decoded,c=>c.charCodeAt(0));
  };
  const key=Uint8Array.from(keyHex.match(/../g),h=>parseInt(h,16)), iv=bytes(parts[1]),cipher=bytes(parts[2]),tag=bytes(parts[3]);
  if(iv.length!==16||!cipher.length||cipher.length%16||tag.length!==32)throw fail();
  const auth=await crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',key),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('HMAC',auth,tag,new TextEncoder().encode(parts.slice(0,3).join(':'))))throw fail();
  const aes=await crypto.subtle.importKey('raw',key,'AES-CBC',false,['decrypt']);
  return new TextDecoder('utf-8',{fatal:true}).decode(await crypto.subtle.decrypt({name:'AES-CBC',iv},aes,cipher)).replace(/\0+$/g,'');
 }catch{throw fail();}
}
