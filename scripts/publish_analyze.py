"""Step 1 of publishing a finished video: transcribe it and make a frame sheet.

Usage: python3 scripts/publish_analyze.py <video.mp4> <out_dir>
Writes transcript.json (segments with start/end seconds and text, plus duration)
and frames.jpg (a numbered 4x3 sheet of frames Claude picks the thumbnail from).
"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

video, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)

dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video]).decode().strip())
w, h = map(int, subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", video]).decode().strip().split("x")[:2])

subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-vn", "-ac", "1", "-ar", "16000", f"{out}/audio.wav"], check=True)
from faster_whisper import WhisperModel
model = WhisperModel(os.environ.get("WHISPER", "large-v3-turbo"), device="cpu", compute_type="int8")
segs, _ = model.transcribe(f"{out}/audio.wav", language=os.environ.get("LANG_HINT", "hi"), vad_filter=True, beam_size=1)
segments = [{"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()} for s in segs]
os.remove(f"{out}/audio.wav")

# 12 frames spread over the video (skipping the first and last 3%), numbered for Claude.
n, cols = 12, 4
times = [round(dur * (0.03 + 0.94 * i / (n - 1)), 2) for i in range(n)]
tw, th = 480, int(480 * h / w)
sheet = Image.new("RGB", (cols * tw, (n // cols) * th), "black")
font = ImageFont.truetype(os.environ.get("FONT", "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"), 36)
for i, t in enumerate(times):
    p = f"{out}/f{i}.jpg"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", video, "-frames:v", "1", "-vf", f"scale={tw}:{th}", p], check=True)
    im = Image.open(p)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 70, 50], fill="black")
    d.text((10, 2), str(i + 1), font=font, fill="yellow")
    sheet.paste(im, ((i % cols) * tw, (i // cols) * th))
    os.remove(p)
sheet.save(f"{out}/frames.jpg", quality=85)

json.dump({"duration": round(dur, 2), "width": w, "height": h, "frames": [{"n": i + 1, "time": t} for i, t in enumerate(times)], "segments": segments}, open(f"{out}/transcript.json", "w"), ensure_ascii=False)
print(f"{len(segments)} segments, {dur:.0f} s")
