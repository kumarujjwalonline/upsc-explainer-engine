"""Builds the soundtrack of a video exactly as the Explainer composition places it: each scene's
voice clip and SFX start on the scene's first frame (scene frames = round(durationSec * 30)).
usage: python scripts/mix_audio.py <job.json> <target> <out.m4a>   (target = long | short id)"""
import json
import subprocess
import sys

job = json.load(open(sys.argv[1], encoding="utf-8"))
target, out = sys.argv[2], sys.argv[3]
FPS = 30
ids = None if target == "long" else next(s for s in job["shorts"] if s["id"] == target)["scenes"]
scenes = [s for s in job["scenes"] if ids is None or s["id"] in ids]
inputs, parts, at = [], [], 0
for s in scenes:
    frames = max(15, round((s.get("durationSec") or 4) * FPS))
    ms = round(at * 1000 / FPS)
    for src, vol in ((s.get("audio"), 1.0), (f"sfx/{s['sfx']}.wav" if s.get("sfx") else None, 0.55)):
        if not src:
            continue
        inputs += ["-i", f"public/{src}"]
        i = len(inputs) // 2 - 1
        parts.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo,volume={vol},adelay={ms}|{ms}[a{i}]")
    at += frames
total = at / FPS
mix = ";".join(parts) + ";" + "".join(f"[a{i}]" for i in range(len(inputs) // 2)) + f"amix=inputs={len(inputs) // 2}:normalize=0:dropout_transition=0,apad,atrim=0:{total:.3f}[out]"
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", mix, "-map", "[out]", "-c:a", "aac", "-b:a", "192k", out], check=True)
print(out, f"{total:.2f} s")
