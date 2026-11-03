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
