"""Real photographs from Wikimedia Commons for "image" scenes (production rule: real, licensed images).

A job lists the photos it needs under "assets": {"images": {"<key>": ["File:Exact name.jpg" | "search words", ...]}}.
Candidates are tried in order; only free licences that allow commercial use are accepted
(public domain, CC0, CC BY, CC BY-SA), at least 1200 px wide. Each photo is saved as
public/jobs/<id>/img/<key>.jpg (1920 px wide) and its author and licence go into
public/jobs/<id>/img/credits.json, which the job's on-screen credit lines are built from.
usage: python scripts/fetch_images.py jobs/<id>.json [--force]
"""
import io
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

from PIL import Image

UA = {"User-Agent": "upsc-explainer-engine/1.0 (github.com/kumarujjwalonline/upsc-explainer-engine)"}
API = "https://commons.wikimedia.org/w/api.php"
OK = re.compile(r"^(public domain|pd|cc0|cc[- ]by(-sa)?( \d\.\d)?( [a-z]+)?|cc[- ]by(-sa)?[- ]\d\.\d)", re.I)


def get(url):
    for i in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            err = e
            time.sleep(5 * (i + 1))
    raise RuntimeError(f"{url}: {err}")


def api(**q):
    q.update(format="json", formatversion=2)
    return json.loads(get(API + "?" + urllib.parse.urlencode(q)))


# 1920 is one of the standard thumbnail widths Commons serves from cache (others get rate-limited)
INFO = dict(prop="imageinfo", iiprop="url|size|extmetadata|mime", iiurlwidth=1920)


def pages(cand):
    if cand.startswith("File:"):
        return api(action="query", titles=cand, **INFO)["query"].get("pages", [])
    r = api(action="query", generator="search", gsrsearch=cand + " filetype:bitmap", gsrnamespace=6, gsrlimit=12, **INFO)
    return sorted(r.get("query", {}).get("pages", []), key=lambda p: p.get("index", 99))


def clean(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html or "")).strip()


def pick(cands):
    for c in cands:
        for p in pages(c):
            ii = (p.get("imageinfo") or [None])[0]
            if not ii or ii.get("mime") not in ("image/jpeg", "image/png") or ii.get("width", 0) < 1200:
                continue
            m = ii.get("extmetadata", {})
            lic = clean(m.get("LicenseShortName", {}).get("value"))
            if not OK.match(lic) or re.search(r"\bnc\b|\bnd\b|non-?commercial|fair use", lic, re.I):
                continue
            author = clean(m.get("Artist", {}).get("value")) or "Unknown author"
            if len(author) > 60:
                author = author[:57] + "…"
            return {"file": p["title"], "query": c, "url": ii["thumburl"], "page": ii["descriptionurl"],
                    "author": author, "license": lic, "credit": f"{author} · {lic} · Wikimedia Commons"}
    return None


def main():
    job = json.load(open(sys.argv[1], encoding="utf-8"))
    force = "--force" in sys.argv
    d = os.path.join("public", "jobs", job["id"], "img")
    os.makedirs(d, exist_ok=True)
    cp = os.path.join(d, "credits.json")
    credits = json.load(open(cp)) if os.path.exists(cp) else {}
    for key, cands in ((job.get("assets") or {}).get("images") or {}).items():
        if key in credits and not force and os.path.exists(os.path.join(d, key + ".jpg")):
            continue
        try:
            got = pick(cands)
        except Exception as e:  # noqa: BLE001
            print(f"{key}: lookup failed: {e}")
            continue
        if not got:
            print(f"{key}: no free photo found for {cands}")
            continue
        try:
            im = Image.open(io.BytesIO(get(got["url"]))).convert("RGB")
        except Exception as e:  # noqa: BLE001
            print(f"{key}: download failed: {e}")
            time.sleep(10)
            continue
        im.save(os.path.join(d, key + ".jpg"), quality=88)
        got["size"] = im.size
        credits[key] = got
        print(f"{key}: {got['file']} ({got['license']}, {im.size[0]}x{im.size[1]})")
        time.sleep(2)
    json.dump(credits, open(cp, "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
