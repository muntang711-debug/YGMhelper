import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {dateParam,kstToday,selectableRange} from '../public/js/common.js';

const base=process.argv[2]||'http://127.0.0.1:8787';
const output=process.argv[3]||'.test-results/smoke.json';
const today=dateParam(kstToday());
const range=selectableRange();const saturday=new Date(range.minDate);saturday.setUTCDate(saturday.getUTCDate()+5);
const monday=dateParam(range.minDate),weekend=dateParam(saturday);
const cases=[
  ['home','/',200],['css','/css/style.css?v=20261029-1',200],['module','/js/app.js?v=20261029-2',200],['common','/js/common.js',200],
  ['unknown-api','/api/missing',404],['missing-css','/css/missing.css',404],['invalid-date','/api/meal?date=20260230',400],
  ['invalid-grade','/api/timetable?date='+monday+'&grade=4&class=1',400],['weekend','/api/timetable?date='+weekend+'&grade=1&class=1',200],
  ['classes','/api/classes?date='+monday+'&grade=1',200],['timetable-1','/api/timetable?date='+monday+'&grade=1&class=1',200],
  ['timetable-2','/api/timetable?date='+monday+'&grade=2&class=1',200],['timetable-3','/api/timetable?date='+monday+'&grade=3&class=1',200],
  ['ratings','/api/meal-rating?date='+today,200],
  ['method','/api/timetable?date='+monday+'&grade=1&class=1',405,{method:'POST'}],
  ['future-rating','/api/meal-rating',403,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:'20990101',voterId:'11111111-1111-4111-8111-111111111111',rating:3})}],
  ['oversize-rating','/api/meal-rating',413,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({extra:'x'.repeat(3000)})}]
];
if(base.startsWith('https://'))cases.push(['meal','/api/meal?date='+today,200]);
const results=[];
for(const [id,route,expected,options={}]of cases){
  const started=performance.now();
  const r=await fetch(base+route,{...options,redirect:'manual',signal:AbortSignal.timeout(35000)});
  const text=await r.text();let body;try{body=JSON.parse(text);}catch{body=text.slice(0,180);}
  const result={id,status:r.status,expected,ms:Math.round(performance.now()-started),contentType:r.headers.get('Content-Type'),headers:Object.fromEntries(r.headers),body};
  results.push(result);console.log(id+': '+r.status+(r.status!==expected?' EXPECTED '+expected:''));
}
if(base==='https://ygmhelper.xyz'){
  const url='http://ygmhelper.xyz/api/meal?date='+today;
  const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(10000)});
  results.push({id:'http-redirect',status:r.status,expected:'redirect',location:r.headers.get('Location')});
  assert([301,302,307,308].includes(r.status));assert.equal(r.headers.get('Location'),'https://ygmhelper.xyz/api/meal?date='+today);
}
await fs.mkdir(new URL('../.test-results/',import.meta.url),{recursive:true});
await fs.writeFile(output,JSON.stringify({checkedAt:new Date().toISOString(),base,notes:'Only GET and rejected POST requests; no valid production votes submitted.',results},null,2));
for(const r of results){
  if(typeof r.expected==='number')assert.equal(r.status,r.expected,r.id+': '+JSON.stringify(r.body));
  if(r.id==='timetable-1')assert(r.body.available&&r.body.items.length,'current school timetable available');
  if(r.id==='home'||r.id==='ratings'||r.id==='unknown-api')assert.equal(r.headers['x-content-type-options'],'nosniff',r.id+' headers');
  if(r.id==='unknown-api')assert.equal(r.body.ok,false);
}
