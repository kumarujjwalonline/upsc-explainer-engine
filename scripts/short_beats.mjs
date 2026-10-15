// Renders rule-31 Shorts (ShortBeats composition) from <job>.shorts.json.
// usage: node scripts/short_beats.mjs jobs/<id>.shorts.json <video in public/> [short-id,...] [--stills 1.0,5.5]
import fs from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
const args = process.argv.slice(2);
const stillsIdx = args.indexOf('--stills');
const stills = stillsIdx >= 0 ? args.splice(stillsIdx, 2)[1].split(',').map(Number) : null;
const [specPath, video, only] = args;
const shorts = JSON.parse(fs.readFileSync(specPath, 'utf8')).filter((s) => !only || only.split(',').includes(s.id));
const base = path.basename(specPath).replace('.shorts.json', '');
const browserExecutable = process.env.REMOTION_CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const chromiumOptions = {gl: process.env.GL || 'swiftshader'};
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public')});
fs.mkdirSync('out/shorts', {recursive: true});
for (const short of shorts) {
  const inputProps = {video, short};
  const composition = await selectComposition({serveUrl, id: 'ShortBeats', inputProps, chromiumOptions, browserExecutable});
  if (stills) {
    for (const t of stills) {
      await renderStill({composition, serveUrl, inputProps, frame: Math.min(composition.durationInFrames - 1, Math.round(t * 30)), output: `out/shorts/${short.id}_${t}.png`, chromiumOptions, browserExecutable});
    }
    console.log('stills', short.id);
    continue;
  }
  const out = `out/shorts/${base}-${short.id}.mp4`;
  const t0 = Date.now();
  await renderMedia({composition, serveUrl, codec: 'h264', outputLocation: out, inputProps, chromiumOptions, browserExecutable, crf: 20, concurrency: Number(process.env.CONC || 4), timeoutInMilliseconds: 240000,
    onProgress: ({progress}) => { if (Math.round(progress * 100) % 10 === 0) process.stdout.write(`\r${short.id} ${Math.round(progress * 100)}%`); }});
  console.log(`\n${short.id} done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
