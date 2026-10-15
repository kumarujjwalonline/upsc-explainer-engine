"""B-roll candidates from Wikimedia Commons (production rules 19 and 30), fetched on GitHub.

Reads jobs/<id>.media.json: {"queries": [{"id": "pangong", "q": "Pangong Tso", "kind": "image"|"video", "n": 4}]}
or exact files: {"id": "simla", "file": "File:Simla Convention.jpg"}.
For each query it saves up to n freely licensed candidates (images 1920 px wide JPEG, videos the
first 14 s as silent 1280 px H.264) to out/media/<id>-<k>.jpg|mp4 and writes out/media/report.json
with title, author, licence and page, so Claude can look at them and pick. Non-free files are skipped.
usage: python scripts/fetch_media.py jobs/<id>.media.json
"""
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

UA = {"User-Agent": "upsc-explainer-engine/1.0 (github.com/kumarujjwalonline/upsc-explainer-engine)"}
API = "https://commons.wikimedia.org/w/api.php"
GORE = re.compile(r"(corpse|dead body|blood|gore|execution|beheading)", re.I)
spec = json.load(open(sys.argv[1], encoding="utf-8"))
out = os.path.join("out", "media")
os.makedirs(out, exist_ok=True)
report = []


def fetch(url, timeout=60):
    """GET with polite pacing and backoff on 429 (Commons rate-limits bursts from CI runners)."""
    for wait in (0, 10, 30, 60, 120):
        time.sleep(wait + 1.5)
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read()
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
    raise RuntimeError("rate limited")


def get(params):
    return json.loads(fetch(API + "?" + urllib.parse.urlencode({"format": "json", **params})))


def clean(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s or "")).strip()


def pages_for(item, kind):
    prop = "videoinfo" if kind == "video" else "imageinfo"
    common = {"prop": prop, "iiprop": "url|size|mime|extmetadata", "iiurlwidth": 1920,
              "viprop": "url|size|mime|extmetadata|derivatives"}
    if item.get("file"):
        data = get({"action": "query", "titles": item["file"], **common})
    else:
        ft = "filetype:video" if kind == "video" else "filetype:bitmap"
        data = get({"action": "query", "generator": "search", "gsrnamespace": 6, "gsrsearch": f"{item['q']} {ft}",
                    "gsrlimit": 30, **common})
    pages = sorted((data.get("query") or {}).get("pages", {}).values(), key=lambda p: p.get("index", 0))
    return [(p, (p.get(prop) or [{}])[0]) for p in pages]


for item in spec["queries"]:
    kind = item.get("kind", "image")
    n = item.get("n", 4)
    got = 0
    try:
        pages = pages_for(item, kind)
    except Exception as e:  # noqa: BLE001
        report.append({"id": item["id"], "error": str(e)[:200]})
        continue
    for p, info in pages:
        if got >= n:
            break
        meta = info.get("extmetadata") or {}
        lic = clean((meta.get("LicenseShortName") or {}).get("value"))
        desc = clean((meta.get("ImageDescription") or {}).get("value"))[:400]
        title = p.get("title", "")
        if not lic or "fair use" in lic.lower() or "non-free" in lic.lower() or GORE.search(title + " " + desc):
            continue
        w, h = info.get("width") or 0, info.get("height") or 0
        if not item.get("file") and (w < (640 if kind == 'video' else 900) or h > w * 1.25):
            continue
        dest = os.path.join(out, f"{item['id']}-{got + 1}.{'mp4' if kind == 'video' else 'jpg'}")
        try:
            if kind == "video":
                if float(info.get("duration") or 0) < 3:
                    continue
                if not [x for x in info.get("derivatives") or [] if 640 <= (x.get("width") or 0) <= 1920] and (info.get("size") or 0) > 150e6:
                    continue  # no transcode and a huge original: too slow to fetch
                d = [x for x in info.get("derivatives") or [] if 640 <= (x.get("width") or 0) <= 1920]
                d.sort(key=lambda x: abs((x.get("width") or 0) - 1280))
                src = d[0]["src"] if d else info.get("url")
                raw = dest + ".src"
                with open(raw, "wb") as f:
                    f.write(fetch(src, 180))
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-t", "14", "-an", "-vf", "scale=1280:-2,fps=30",
                                "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-pix_fmt", "yuv420p", dest], check=True, timeout=300)
                os.remove(raw)
            else:
                src = info.get("thumburl") or info.get("url")
                raw = dest + ".src"
                with open(raw, "wb") as f:
                    f.write(fetch(src, 120))
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-vf", "scale='min(1920,iw)':-2", "-q:v", "3", dest],
                               check=True, timeout=120)
                os.remove(raw)
        except Exception as e:  # noqa: BLE001
            print(item["id"], "skip", title, e)
            continue
        got += 1
        artist = clean((meta.get("Artist") or {}).get("value"))[:80] or "Unknown"
        date = clean((meta.get("DateTimeOriginal") or {}).get("value"))[:40]
        report.append({"id": item["id"], "file": os.path.basename(dest), "title": title, "author": artist, "licence": lic,
                       "date": date, "desc": desc, "page": info.get("descriptionurl"), "w": w, "h": h})
        print(item["id"], "->", dest, "|", title, "|", lic)
    if got == 0:
        report.append({"id": item["id"], "found": 0})
    json.dump(report, open(os.path.join(out, "report.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(report, open(os.path.join(out, "report.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
