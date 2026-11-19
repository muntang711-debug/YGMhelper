import {createHash} from 'node:crypto';
import {cp, mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {brotliCompressSync, constants, gzipSync} from 'node:zlib';
import {build} from 'esbuild';

const project = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(project, 'public');
const output = path.join(project, '.generated', 'assets');
const bundles = path.join(output, 'bundles');

await rm(output, {recursive: true, force: true});
await cp(source, output, {recursive: true, filter: file => !file.endsWith('.jsx')});
await mkdir(bundles, {recursive: true});

const {metafile} = await build({
  absWorkingDir: project,
  entryPoints: ['public/js/app.js'],
  outdir: bundles,
  entryNames: 'app-[hash]',
  chunkNames: 'chunk-[hash]',
  bundle: true,
  splitting: true,
  format: 'esm',
  minify: true,
  legalComments: 'linked',
  target: ['es2022'],
  define: {'process.env.NODE_ENV': '"production"'},
  metafile: true
});
const references = new Map();
for (const [file, info] of Object.entries(metafile.outputs)) {
  if (info.entryPoint === 'public/js/app.js') references.set('/js/app.js', '/bundles/' + path.basename(file));
}
if (!references.has('/js/app.js')) throw new Error('Main browser bundle is missing.');
for (const file of await readdir(path.join(source, 'css'))) {
  if (!file.endsWith('.css')) continue;
  const bytes = await readFile(path.join(source, 'css', file));
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  const name = file.replace(/\.css$/, `-${hash}.css`);
  await writeFile(path.join(bundles, name), bytes);
  references.set('/css/' + file, '/bundles/' + name);
}

function sizes(bytes) {
  const br = brotliCompressSync(bytes, {params: {[constants.BROTLI_PARAM_QUALITY]: 4}}).length;
  return {br, gzip: gzipSync(bytes, {level: 6}).length};
}

for (const file of await readdir(source)) {
  if (!file.endsWith('.html')) continue;
  const html = (await readFile(path.join(source, file), 'utf8')).replace(
    /\b(?:href|src)="(\/(?:css|js)\/[^"?]+)(?:\?[^"#]*)?"/g,
    (match, url) => references.has(url) ? match.replace(/"[^"]*"/, `"${references.get(url)}"`) : match
  );
  const bytes = Buffer.from(html);
  const {br, gzip} = sizes(bytes);
  if (br > 14000 || gzip > 14000) throw new Error(`${file} exceeds the 14,000-byte compressed HTML budget (br ${br}, gzip ${gzip}).`);
  await writeFile(path.join(output, file), bytes);
  if (file === 'index.html') console.log(`Home HTML: ${br} B Brotli, ${gzip} B gzip (limit 14,000 B)`);
}

for (const file of await readdir(bundles)) {
  if (!file.endsWith('.js')) continue;
  const {br, gzip} = sizes(await readFile(path.join(bundles, file)));
  console.log(`${file}: ${br} B Brotli, ${gzip} B gzip`);
}
