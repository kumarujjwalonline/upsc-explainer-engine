#!/usr/bin/env python3
"""Sound track of the long video, built straight from the scene clips with ffmpeg.

Mirrors src/Explainer.tsx: each scene starts at the sum of the earlier scenes'
frames (round(durationSec*30), min 15); its clip plays from that point, its sfx at 0.55.
Rendering the track through Remotion walks every video frame, which takes hours for 3D jobs.

  python3 scripts/audio_track.py out/job.final.json out/<id>-long.aac
"""
import json, subprocess, sys

FPS = 30
job = json.load(open(sys.argv[1]))
out = sys.argv[2]
inputs, filters, at = [], [], 0
for s in job['scenes']:
    ms = round(at * 1000 / FPS)
    for src, vol in ((s.get('audio'), 1.0), (f"sfx/{s['sfx']}.wav" if s.get('sfx') else None, 0.55)):
        if not src:
            continue
        k = len(inputs) // 2
        inputs += ['-i', f'public/{src}']
        filters.append(f'[{k}:a]aresample=48000,aformat=channel_layouts=stereo,volume={vol},adelay={ms}|{ms}[a{k}]')
    at += max(15, round((s.get('durationSec') or 4) * FPS))
total = at / FPS
mix = ''.join(f'[a{k}]' for k in range(len(filters)))
graph = ';'.join(filters) + f';{mix}amix=inputs={len(filters)}:normalize=0:dropout_transition=0,apad,atrim=0:{total:.3f}[out]'
subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', graph, '-map', '[out]', '-c:a', 'aac', '-b:a', '192k', out], check=True)
print(f'{out}: {total:.2f} s, {len(filters)} sounds')
