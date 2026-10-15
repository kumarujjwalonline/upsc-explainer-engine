// Quick layout check: renders still frames of chosen scenes.
// usage: node scripts/stills.mjs job.json outdir S01:2.5,S30:8 [9:16]
//   S22+:15 renders 15 s into S22 within the whole video (so cross-scene overlays like timeline bars show)
import fs from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
const [jobPath, outDir, list, format = '16:9'] = process.argv.slice(2);
const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
fs.mkdirSync(outDir, {recursive: true});
const browserExecutable = process.env.REMOTION_CHROME || (fs.existsSync('/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell') ? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' : null);
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public')});
for (const item of list.split(',')) {
  if (item.includes('@')) {
    // short1@12.5 renders 12.5 s into that Short, with its hook and beats
    const [sid, ss] = item.split('@');
    const sh = job.shorts.find((x) => x.id === sid);
    const inputProps = {job, format: '9:16', sceneIds: sh.scenes, hook: sh.hook, shortId: sh.id};
    const composition = await selectComposition({serveUrl, id: 'Explainer', inputProps, chromiumOptions: {gl: 'swangle'}, browserExecutable});
    const frame = Math.min(composition.durationInFrames - 1, Math.round(parseFloat(ss) * 30));
    await renderStill({composition, serveUrl, output: `${outDir}/${sid}_${ss}.png`, inputProps, frame, chromiumOptions: {gl: 'swangle'}, browserExecutable, timeoutInMilliseconds: 240000});
    console.log(sid, ss);
    continue;
  }
  const [rawId, sec] = item.split(':');
  const whole = rawId.endsWith('+');
  const id = rawId.replace('+', '');
  const inputProps = whole ? {job, format} : {job, format, sceneIds: [id]};
  const composition = await selectComposition({serveUrl, id: 'Explainer', inputProps, chromiumOptions: {gl: 'swangle'}, browserExecutable});
  let off = 0;
  if (whole) for (const s of job.scenes) {
    if (s.id === id) break;
    off += Math.max(15, Math.round((s.durationSec || 4) * 30));
  }
  const frame = Math.min(composition.durationInFrames - 1, off + Math.round(parseFloat(sec) * 30));
  const t0 = Date.now();
  await renderStill({composition, serveUrl, output: `${outDir}/${id}_${sec}.png`, inputProps, frame, chromiumOptions: {gl: 'swangle'}, browserExecutable, timeoutInMilliseconds: 240000});
  console.log(id, sec, ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
