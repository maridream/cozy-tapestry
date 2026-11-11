// Downloads the background-removal model + runtime used by the Cutout step into
// public/models/imgly/, so the site is self-contained (no third-party CDN at runtime).
//
//   node scripts/fetch-model.mjs
//
// Only the files the app actually uses are fetched (CPU/WASM path, quantized model).
// Every chunk is named by its SHA-256 hash and verified after download.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const VERSION = '1.7.0'; // must match @imgly/background-removal in package.json
const BASE = `https://staticimgly.com/@imgly/background-removal-data/${VERSION}/dist/`;
const OUT = new URL('../public/models/imgly/', import.meta.url);
const KEYS = [
  '/models/isnet_quint8',
  '/onnxruntime-web/ort-wasm-simd-threaded.wasm',
  '/onnxruntime-web/ort-wasm-simd-threaded.mjs',
];

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

const all = await (await fetch(BASE + 'resources.json')).json();
const picked = Object.fromEntries(KEYS.map((k) => [k, all[k]]));
await mkdir(OUT, { recursive: true });

let total = 0;
for (const [key, entry] of Object.entries(picked)) {
  if (!entry) throw new Error(`missing ${key} in resources.json`);
  for (const chunk of entry.chunks) {
    const file = new URL(chunk.name, OUT);
    if (existsSync(file) && sha256(await readFile(file)) === chunk.hash) continue;
    const buf = Buffer.from(await (await fetch(BASE + chunk.name)).arrayBuffer());
    if (sha256(buf) !== chunk.hash) throw new Error(`hash mismatch for ${key} chunk ${chunk.name}`);
    await writeFile(file, buf);
  }
  total += entry.size;
  console.log(`${key}: ${(entry.size / 1e6).toFixed(1)} MB in ${entry.chunks.length} chunk(s)`);
}
await writeFile(new URL('resources.json', OUT), JSON.stringify(picked, null, 2) + '\n');
console.log(`done — ${(total / 1e6).toFixed(1)} MB in ${OUT.pathname}`);
