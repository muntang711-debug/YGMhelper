// RFC 6238, six digits, SHA-1, 30-second steps; compatible with authenticator apps.
export function decodeBase32(secret){
 if(typeof secret!=='string'||!/^[A-Z2-7]{32,64}$/.test(secret))throw Error('TOTP_CONFIG');
 let bits=0,value=0;const bytes=[];
 for(const char of secret){value=(value<<5)|'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char);bits+=5;if(bits>=8){bytes.push((value>>>(bits-8))&255);bits-=8;}}
 if(bits&&(value&((1<<bits)-1)))throw Error('TOTP_CONFIG');return new Uint8Array(bytes);
}
export async function totpCode(secret,step,digits=6){
 const counter=new Uint8Array(8);new DataView(counter.buffer).setBigUint64(0,BigInt(step));
 const key=await crypto.subtle.importKey('raw',decodeBase32(secret),{name:'HMAC',hash:'SHA-1'},false,['sign']);
 const signature=new Uint8Array(await crypto.subtle.sign('HMAC',key,counter));const offset=signature[signature.length-1]&15;
 const value=((signature[offset]&127)*0x1000000)+(signature[offset+1]<<16)+(signature[offset+2]<<8)+signature[offset+3];
 return String(value%10**digits).padStart(digits,'0');
}
export async function matchingTotpStep(secret,code,now=Date.now()){
 if(typeof code!=='string'||!/^\d{6}$/.test(code))return null;
 const current=Math.floor(now/30000);let matched=null;
 for(const offset of [0,-1,1]){const step=current+offset;if(step<0)continue;const expected=await totpCode(secret,step);let diff=0;for(let i=0;i<6;i++)diff|=expected.charCodeAt(i)^code.charCodeAt(i);if(diff===0&&matched===null)matched=step;}
 return matched;
}
