const BASE="https://open.neis.go.kr/hub";
const SCHOOL_NAME="용곡중학교";
const OFFICE_CODE="B10";
const SCHOOL_KIND_CODE="03";
const ADDRESS_HINT="용마산로22길 76";
let cachedSchool=null;
let cachedUntil=0;

export function response(body,status=200,cacheSeconds=0){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=UTF-8","Cache-Control":cacheSeconds?"public, max-age="+cacheSeconds+", stale-while-revalidate=600":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"strict-origin-when-cross-origin"}})}

export function validDate(value){if(!/^\d{8}$/.test(value))return false;const y=Number(value.slice(0,4)),m=Number(value.slice(4,6)),d=Number(value.slice(6,8)),x=new Date(Date.UTC(y,m-1,d));return y>=2000&&y<=2100&&m>=1&&m<=12&&d>=1&&x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d}

export async function requestNeis(dataset,params,env){if(!env?.NEIS_API_KEY)throw Error("NEIS_API_KEY is not configured");const url=new URL(BASE+"/"+dataset);url.searchParams.set("KEY",env.NEIS_API_KEY);url.searchParams.set("Type","json");url.searchParams.set("pIndex","1");url.searchParams.set("pSize","100");Object.entries(params).forEach(([key,value])=>{if(value!==undefined&&value!==null&&value!=="")url.searchParams.set(key,String(value))});const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);try{const res=await fetch(url,{headers:{Accept:"application/json"},signal:controller.signal});if(!res.ok)throw Error("NEIS HTTP "+res.status);return JSON.parse(await res.text())}finally{clearTimeout(timeout)}}

export function getRows(dataset,data){return data?.[dataset]?.[1]?.row||[]}
export function getResult(dataset,data){return data?.[dataset]?.[0]?.head?.find(item=>item?.RESULT)?.RESULT}

export async function getTargetSchool(env){if(cachedSchool&&cachedUntil>Date.now())return cachedSchool;const data=await requestNeis("schoolInfo",{ATPT_OFCDC_SC_CODE:OFFICE_CODE,SCHUL_KND_SC_CODE:SCHOOL_KIND_CODE,SCHUL_NM:SCHOOL_NAME},env),rows=getRows("schoolInfo",data);const school=rows.find(row=>row.SCHUL_NM===SCHOOL_NAME&&String(row.ORG_RDNMA||"").includes(ADDRESS_HINT))||rows.find(row=>row.SCHUL_NM===SCHOOL_NAME);if(!school)throw Error("Target school not found");cachedSchool={officeCode:school.ATPT_OFCDC_SC_CODE,schoolCode:school.SD_SCHUL_CODE};cachedUntil=Date.now()+600000;return cachedSchool}

export function parseMenu(value){return String(value||"").split(/<br\s*\/?>/i).map(v=>v.replace(/\s+/g," ").trim()).filter(Boolean).map(raw=>{let name=raw,allergens=[];const match=raw.match(/(?:\(|\s)(\d+(?:\.\d+){1,18})\.?\)?$/);if(match){allergens=match[1].replace(/\.$/,"").split(".").map(Number).filter((n,i,a)=>n>=1&&n<=19&&a.indexOf(n)===i);name=raw.slice(0,match.index).trim()}return{name,allergens}})}
