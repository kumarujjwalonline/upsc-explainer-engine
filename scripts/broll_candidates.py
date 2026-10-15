"""B-roll candidates from Wikimedia Commons, for picking by eye before a render (runs on GitHub).

For each entry in jobs/<id>.assets.json -> "broll": [{"key": "cleanroom", "queries": ["semiconductor cleanroom"]}],
searches Commons for landscape videos and large photos with a free licence, and writes:
  out/broll-candidates.json  every candidate: key, n, kind, title, licence, author, size, duration, page
  out/broll-<key>.jpg        a numbered contact sheet of their thumbnails
A scene then names its pick by Commons file title in "broll": {"title": "File:...", ...};
scripts/fetch_footage.py downloads exactly that file at render time.
usage: python scripts/broll_candidates.py jobs/<id>.assets.json
"""
import io
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

from PIL import Image, ImageDraw, ImageFont

UA = {"User-Agent": "upsc-explainer-engine/1.0 (github.com/kumarujjwalonline/upsc-explainer-engine)"}
COMMONS = "https://commons.wikimedia.org/w/api.php"
BAD = re.compile(r"(bomb|army|disposal|logo|diagram|chart|graph|slides?|lecture|screencast|police|gun|war|military|attack|crash|accident|protest|riot|dead|death|kill|blood|surgery|election|campaign|svg)", re.I)


def get_json(url):
    for attempt in range(4):  # Commons rate-limits bursts (HTTP 429): back off and retry
        try:
            time.sleep(1.2)
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40))
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 3:
                raise
            time.sleep(10 * (attempt + 1))


def strip_html(s):
    return re.sub(r"<[^>]+>", "", s or "").strip()


def search(query, kind, limit=12):
    ft = "video" if kind == "video" else "bitmap"
    params = {
        "action": "query", "format": "json", "generator": "search", "gsrnamespace": 6,
        "gsrsearch": f"{query} filetype:{ft}", "gsrlimit": 30,
        "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata", "iiurlwidth": 480,
    }
    data = get_json(COMMONS + "?" + urllib.parse.urlencode(params))
    pages = sorted((data.get("query") or {}).get("pages", {}).values(), key=lambda p: p.get("index", 99))
    out = []
    for p in pages:
        title = p.get("title", "")
        info = (p.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata") or {}
        desc = strip_html((meta.get("ImageDescription") or {}).get("value"))[:300]
        lic = strip_html((meta.get("LicenseShortName") or {}).get("value"))
        w, h = info.get("width") or 0, info.get("height") or 0
        if BAD.search(title) or not lic or "fair use" in lic.lower() or not info.get("thumburl"):
            continue
        if kind == "video" and (w < 960 or h > w or float(info.get("duration") or 0) < 3):
            continue
        if kind == "photo" and (w < 1600 or h > w * 0.9):
            continue
        out.append({
            "kind": kind, "title": title, "licence": lic, "width": w, "height": h,
            "duration": info.get("duration"), "desc": desc,
            "author": strip_html((meta.get("Artist") or {}).get("value"))[:60],
            "thumb": info["thumburl"], "page": info.get("descriptionurl"),
        })
        if len(out) >= limit:
            break
    return out


def sheet(key, cands):
    cols, tw, th = 4, 480, 270
    rows = max(1, -(-len(cands) // cols))
    img = Image.new("RGB", (cols * tw, rows * (th + 34)), (16, 20, 30))
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 20)
    except OSError:
        font = ImageFont.load_default()
    for i, c in enumerate(cands):
        x, y = (i % cols) * tw, (i // cols) * (th + 34)
        try:
            time.sleep(0.5)
            raw = urllib.request.urlopen(urllib.request.Request(c["thumb"], headers=UA), timeout=40).read()
            t = Image.open(io.BytesIO(raw)).convert("RGB")
            t.thumbnail((tw - 8, th - 8))
            img.paste(t, (x + 4, y + 4))
        except Exception:  # noqa: BLE001
            pass
        label = f"{c['n']} {'VID' if c['kind'] == 'video' else 'IMG'} {c['title'][5:45]}"
        d.text((x + 6, y + th + 6), label, fill=(240, 240, 240), font=font)
    img.save(os.path.join("out", f"broll-{key}.jpg"), quality=82)


spec = json.load(open(sys.argv[1], encoding="utf-8"))
os.makedirs("out", exist_ok=True)
allc = []
for entry in spec.get("broll", []):
    seen, cands = set(), []
    for q in entry["queries"]:
        for kind in ("video", "photo"):
            try:
                found = search(q, kind)
            except Exception as e:  # noqa: BLE001
                print(entry["key"], q, kind, "search failed", e)
                continue
            for c in found:
                if c["title"] not in seen:
                    seen.add(c["title"])
                    cands.append(c)
    cands = [c for c in cands if c["kind"] == "video"][:8] + [c for c in cands if c["kind"] == "photo"][:8]
    for i, c in enumerate(cands):
        c["n"], c["key"] = i + 1, entry["key"]
    if cands:
        sheet(entry["key"], cands)
    print(entry["key"], len(cands), "candidates")
    allc += cands
json.dump(allc, open(os.path.join("out", "broll-candidates.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


# "inspect": whole videos to pick moments from: one frame every few seconds, with timestamps.
for k, title in enumerate(spec.get("inspect", [])):
    params = {"action": "query", "format": "json", "titles": title, "prop": "videoinfo", "viprop": "url|size|derivatives"}
    page = next(iter(get_json(COMMONS + "?" + urllib.parse.urlencode(params))["query"]["pages"].values()))
    info = page["videoinfo"][0]
    derivs = sorted((d for d in info.get("derivatives") or [] if 400 <= (d.get("width") or 0) <= 900), key=lambda d: d.get("width") or 0)
    url = derivs[0]["src"] if derivs else info["url"]
    raw = os.path.join("out", f"inspect-{k}.src")
    open(raw, "wb").write(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300).read())
    step = max(3, int(float(info.get("duration") or 60) // 60))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-vf",
                    f"fps=1/{step},scale=384:-2,drawtext=text='%{{pts\\:hms}}':x=6:y=6:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6,tile=6x10",
                    "-frames:v", "1", "-q:v", "4", os.path.join("out", f"broll-inspect-{k}.jpg")], check=False)
    print("inspect", title, "every", step, "s")
