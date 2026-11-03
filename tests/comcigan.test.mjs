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
