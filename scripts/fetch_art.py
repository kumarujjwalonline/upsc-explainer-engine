"""Download generated illustrations (scene.art.url) to public/<scene.art.src> on the GitHub runner.

The Claude container can't reach the image host, so make_job writes the url and this step fetches it.
Usage: python3 scripts/fetch_art.py jobs/<id>.json
"""
import io
import json
import os
import sys
import urllib.request

from PIL import Image

job = json.load(open(sys.argv[1]))
for s in job['scenes']:
    art = s.get('art')
    if not art or not art.get('url'):
        continue
    out = os.path.join('public', art['src'])
    if os.path.exists(out):
        continue
    os.makedirs(os.path.dirname(out), exist_ok=True)
    try:
        req = urllib.request.Request(art['url'], headers={'User-Agent': 'Mozilla/5.0 explainer-bot'})
        data = urllib.request.urlopen(req, timeout=60).read()
        im = Image.open(io.BytesIO(data)).convert('RGB')
        im.thumbnail((1100, 1650))
        im.save(out, quality=90)
        print('art', s['id'], im.size, out)
    except Exception as e:  # a missing illustration must not stop the render
        print('art FAILED', s['id'], e)
