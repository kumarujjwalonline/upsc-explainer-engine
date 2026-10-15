// Renders the long video (16:9), each Short (9:16) and the thumbnail from a job file.
// usage: node scripts/render.mjs out/job.final.json [what] [args]
//   what = all (default) | long | shorts | thumb | preview
//          | part <i> <n>   one of n parallel slices of the long video, silent (out/seg-<frame>.mp4)
//          | audio          the long video's sound track only (out/<id>-long.aac)
//          | short <id>     one Short
//   preview renders the long video at half resolution for a fast layout check.
// Parallel slices are joined by scripts/join_parts.sh.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';

const [jobPath = 'out/job.final.json', what = 'all', a1, a2] = process.argv.slice(2);
const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
fs.mkdirSync('out', {recursive: true});

// 3D scenes (body walkthrough, molecules, terrain fly-ins) need WebGL; GitHub runners have no GPU, so
// Chrome renders it in software through SwiftShader via ANGLE. That mode paints big SVGs (world maps)
// ~15x slower, so anything without 3D scenes uses plain SwiftShader.
const is3D = (s) => ['body', 'molecule', 'terrain'].includes((s.visual || {}).type);
const glFor = (scenes) => (scenes.some(is3D) ? 'swangle' : 'swiftshader');
// Optional local Chrome (e.g. a preinstalled headless shell) instead of Remotion's download.
const browserExecutable = process.env.REMOTION_CHROME || null;
const FPS = 30;
const frames = (s) => Math.max(15, Math.round((s.durationSec || 4) * FPS));

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public')});

const video = async (name, inputProps, {scale = 1, gl, frameRange, muted = false, codec = 'h264', ext = 'mp4'} = {}) => {
  const composition = await selectComposition({serveUrl, id: 'Explainer', inputProps, browserExecutable});
  const outputLocation = `out/${name}.${ext}`;
  console.log(`${name}: WebGL mode ${gl}${frameRange ? `, frames ${frameRange[0]}-${frameRange[1]}` : ''}`);
  let last = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec,
    ...(codec === 'h264' ? {crf: 20} : {}),
    scale,
    inputProps,
    outputLocation,
    ...(codec === 'h264' && !muted ? {audioCodec: 'aac'} : {}),
    muted,
    frameRange,
    chromiumOptions: {gl},
    browserExecutable,
    timeoutInMilliseconds: 240000,
    concurrency: Math.max(2, os.cpus().length),
    onProgress: ({progress}) => {
      const p = Math.floor(progress * 10);
      if (p !== last) {
        last = p;
        console.log(`${name}: ${p * 10}%`);
      }
    },
  });
  console.log(`Rendered ${outputLocation}`);
};

// Runs of neighbouring scenes that need the same WebGL mode, with their frame ranges.
const runs = () => {
  const out = [];
  let at = 0;
  for (const s of job.scenes) {
    const d = frames(s);
    const gl = glFor([s]);
    const r = out[out.length - 1];
    if (r && r.gl === gl) r.end = at + d - 1;
    else out.push({gl, start: at, end: at + d - 1});
    at += d;
  }
  return out;
};

// Slice the long video into n parts of about equal render cost (software 3D is several times slower per frame).
const parts = (n) => {
  const cost = (r) => (r.end - r.start + 1) * (r.gl === 'swangle' ? 5 : 1);
  const pieces = [];
  for (const r of runs()) {
    const step = 900; // long runs are cut so the parts can be balanced
    for (let s = r.start; s <= r.end; s += step) pieces.push({gl: r.gl, start: s, end: Math.min(r.end, s + step - 1)});
  }
  const total = pieces.reduce((a, p) => a + cost(p), 0);
  const out = Array.from({length: n}, () => []);
  let acc = 0;
  for (const p of pieces) {
    out[Math.min(n - 1, Math.floor((acc + cost(p) / 2) / (total / n)))].push(p);
    acc += cost(p);
  }
  return out;
};

const long = {job, format: '16:9'};
if (what === 'all' || what === 'long') await video(`${job.id}-long`, long, {gl: glFor(job.scenes)});
if (what === 'preview') await video(`${job.id}-preview`, long, {scale: 0.5, gl: glFor(job.scenes)});
if (what === 'part')
  for (const p of parts(Number(a2))[Number(a1)])
    await video(`seg-${String(p.start).padStart(6, '0')}`, long, {gl: p.gl, frameRange: [p.start, p.end], muted: true});
if (what === 'audio') await video(`${job.id}-long`, long, {gl: 'swiftshader', codec: 'aac', ext: 'aac'});
const short = async (s) => {
  const scenes = job.scenes.filter((x) => s.scenes.includes(x.id));
  await video(`${job.id}-${s.id}`, {job, format: '9:16', sceneIds: s.scenes, hook: s.hook}, {scale: what === 'preview' ? 0.5 : 1, gl: glFor(scenes)});
};
if (what === 'all' || what === 'shorts' || what === 'preview') for (const s of job.shorts || []) await short(s);
if (what === 'short') await short(job.shorts.find((s) => s.id === a1));
if (what === 'all' || what === 'thumb' || what === 'preview') {
  const composition = await selectComposition({serveUrl, id: 'Thumbnail', inputProps: {job}, browserExecutable});
  const thumbScene = job.scenes.filter((s) => s.id === (job.thumbnail || {}).scene);
  await renderStill({composition, serveUrl, output: `out/${job.id}-thumbnail.png`, inputProps: {job}, chromiumOptions: {gl: glFor(thumbScene)}, browserExecutable});
  console.log('Rendered thumbnail');
}
