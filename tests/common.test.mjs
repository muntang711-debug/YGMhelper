import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {parseMealText, validDate, dateParam, kstToday, selectableRange, createSafeStorage, createRequestTracker} from '../public/js/common.js';

test('allergen grammar preserves menu numbers and non-allergen annotations',()=>{
  assert.deepEqual(parseMealText('비타민C100음료 (12)'),{label:'비타민C100음료',allergens:[12]});
  assert.deepEqual(parseMealText('밥 (5.6.13.)'),{label:'밥',allergens:[5,6,13]});
  assert.deepEqual(parseMealText('우유 (선택)'),{label:'우유 (선택)',allergens:[]});
  assert.deepEqual(parseMealText('밥 (0.20)'),{label:'밥 (0.20)',allergens:[]});
  assert.deepEqual(parseMealText('밥 [5.5.6]'),{label:'밥',allergens:[5,6]});
});
test('date grammar covers leap years, invalid months, days and bounds',()=>{
  for(const d of ['20240229','20000229','20261029'])assert(validDate(d));
  for(const d of ['20260229','20260230','20261301','20260001','00000101','2026-10-29','20260100',null])assert(!validDate(d));
});
test('KST Monday boundary is the same across device timezones',()=>{
  const script=`import {kstToday,dateParam,selectableRange} from './public/js/common.js'; const day=kstToday(new Date('2026-10-25T15:30:00Z')); console.log(JSON.stringify([dateParam(day),dateParam(selectableRange(day).minDate)]));`;
  for(const TZ of ['Asia/Seoul','UTC','Pacific/Honolulu','America/Los_Angeles']){
    const actual=execFileSync(process.execPath,['--input-type=module','-e',script],{cwd:new URL('..',import.meta.url),env:{...process.env,TZ},encoding:'utf8'}).trim();
    assert.equal(actual,'["20261026","20261026"]');
  }
});
test('safe storage survives denied reads and quota errors without changing identity',()=>{
  const storage=createSafeStorage(()=>{throw Error('SecurityError');});
  assert.equal(storage.getItem('id'),null);storage.setItem('id','stable');assert.equal(storage.getItem('id'),'stable');
  const quota=createSafeStorage(()=>({getItem(){return null;},setItem(){throw Error('QuotaExceededError');}}));quota.setItem('id','same');assert.equal(quota.getItem('id'),'same');
});
test('request tracker cancels stale responses and deduplicates pending work',()=>{
  const tracker=createRequestTracker();const old=tracker.begin('classes','grade1');assert.equal(tracker.begin('classes','grade1'),null);
  const next=tracker.begin('classes','grade2');assert(old.signal.aborted);assert(!old.current());assert(next.current());
  old.finish(true);assert(next.current());next.finish(true);assert.equal(tracker.begin('classes','grade2',10000),null);
  tracker.cancel('classes');assert(!next.current());
});
test('selected date interval is exactly Monday through next Sunday',()=>{
  const range=selectableRange(kstToday(new Date('2026-10-29T12:00:00Z')));
  assert.equal(dateParam(range.minDate),'20261026');assert.equal(dateParam(range.maxDate),'20261108');
});
