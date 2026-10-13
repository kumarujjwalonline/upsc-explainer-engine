"""Step 2 of publishing a finished video: cut the Shorts and draw the thumbnail.

Usage: python3 scripts/publish_cut.py <video.mp4> <plan.json> <out_dir>
plan.json (written by Claude in n8n):
  {"shorts": [{"id": "short-1", "start": 12.5, "end": 71.0, "hook": "English, max 7 words"}],
   "thumbnail": {"time": 95.0, "text": "BIG ENGLISH TEXT", "subtext": "optional smaller line"}}
Shorts are 1080x1920: the 16:9 video centred over a blurred, darkened copy of itself,
with the hook banner on top for the first 3 seconds. The thumbnail is 1280x720.
"""
import json, os, subprocess, sys, textwrap
from PIL import Image, ImageDraw, ImageFilter, ImageFont

video, plan_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
plan = json.load(open(plan_path))
FONT = os.environ.get("FONT", "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf")
dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video]).decode().strip())

def esc(s):
    return s.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’")

for s in plan.get("shorts", []):
    start, end = max(0.0, float(s["start"])), min(dur, float(s["end"]))
    if end - start < 5:
        continue
    end = min(end, start + 179)  # YouTube Shorts must stay under 3 minutes
    hook = "\n".join(textwrap.wrap(esc(s.get("hook", "")).upper(), 20))
    vf = (
        "[0:v]split[a][b];"
        "[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:2,eq=brightness=-0.25[bg];"
        "[b]scale=1080:-2[fg];"
        "[bg][fg]overlay=(W-w)/2:(H-h)/2"
    )
    if hook:
        vf += (f",drawtext=fontfile={FONT}:text='{hook}':fontsize=72:expansion=none:fontcolor=white:line_spacing=12:"
               "box=1:boxcolor=0xF59E0B@0.95:boxborderw=28:x=(w-text_w)/2:y=260:enable='lt(t,3)'")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(start), "-to", str(end), "-i", video,
                    "-filter_complex", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                    "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", f"{out}/{s['id']}.mp4"], check=True)
    print("cut", s["id"], round(end - start, 1), "s")

t = plan.get("thumbnail") or {}
time = min(max(float(t.get("time", dur * 0.3)), 0), max(dur - 1, 0))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(time), "-i", video, "-frames:v", "1", "-vf", "scale=1280:720", f"{out}/frame.png"], check=True)
img = Image.open(f"{out}/frame.png").convert("RGB")
os.remove(f"{out}/frame.png")
# Deep navy panel on the left fading into the frame, so the text reads on any frame
# (channel colours: navy, white, orange).
fade = Image.new("L", (1280, 720))
fd = ImageDraw.Draw(fade)
for x in range(1280):
    fd.line([(x, 0), (x, 720)], fill=int(245 * min(1.0, max(0.0, (980 - x) / 500))))
img = Image.composite(Image.new("RGB", (1280, 720), (11, 22, 48)), img, fade)
d = ImageDraw.Draw(img)
text = (t.get("text") or "").upper()

def wrap(words, f, width):
    lines, cur = [], ""
    for w in words:
        nxt = (cur + " " + w).strip()
        if cur and d.textlength(nxt, font=f) > width:
            lines.append(cur)
            cur = w
        else:
            cur = nxt
    return lines + ([cur] if cur else [])

for size in range(124, 39, -4):
    f = ImageFont.truetype(FONT, size)
    lines = wrap(text.split(), f, 720)
    if len(lines) <= 3 and all(d.textlength(l, font=f) <= 720 for l in lines):
        break
y = 360 - (len(lines) * (size + 10)) // 2 - (30 if t.get("subtext") else 0)
for i, l in enumerate(lines):
    d.text((60, y), l, font=f, fill=(255, 196, 0) if i == len(lines) - 1 else "white", stroke_width=4, stroke_fill="black")
    y += size + 10
if t.get("subtext"):
    d.text((64, y + 16), t["subtext"], font=ImageFont.truetype(FONT, 44), fill="white", stroke_width=3, stroke_fill="black")
img.save(f"{out}/thumbnail.jpg", quality=92)
print("thumbnail at", time, "s")
