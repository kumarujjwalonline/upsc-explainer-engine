// Renders one slice of a video, muted, so a long render can be split across many GitHub runners.
// usage: node scripts/render_chunk.mjs <job.json> <target> <k> <n>
//   target = long | <short id>; slice k of n (0-based). Output: out/chunks/<target>-<k>.mp4
// scripts/mix_audio.py builds the sound separately and scripts/merge_chunks.sh joins everything.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';

const [jobPath, target, kS, nS] = process.argv.slice(2);
const k = Number(kS);
const n = Number(nS);
const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
const short = (job.shorts || []).find((s) => s.id === target);
const inputProps = target === 'long' ? {job, format: '16:9'} : {job, format: '9:16', sceneIds: short.scenes, hook: short.hook};
fs.mkdirSync('out/chunks', {recursive: true});
const browserExecutable = process.env.REMOTION_CHROME || null;
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public')});
const composition = await selectComposition({serveUrl, id: 'Explainer', inputProps, browserExecutable});
const F = composition.durationInFrames;
const a = Math.floor((k * F) / n);
const b = Math.floor(((k + 1) * F) / n) - 1;
let last = -1;
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  crf: 20,
  muted: true,
  frameRange: [a, b],
  inputProps,
  outputLocation: `out/chunks/${target}-${String(k).padStart(2, '0')}.mp4`,
  chromiumOptions: {gl: 'swangle'},
  browserExecutable,
  timeoutInMilliseconds: 240000,
  concurrency: Math.max(2, os.cpus().length),
  onProgress: ({progress}) => {
    const p = Math.floor(progress * 10);
    if (p !== last) {
      last = p;
      console.log(`${target} ${k}/${n} frames ${a}-${b}: ${p * 10}%`);
    }
  },
});
console.log(`done ${target} ${k}`);
