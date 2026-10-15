"""Terrain packs for Terrain3D scenes (production rule 23), built from free open data.

A job lists the packs it needs under "assets": {"terrain": [{name, west, east, south, north, ...}]}.
Each pack is public/terrain/<name>/ with:
  height.png   Terrarium-encoded heights on a regular lon/lat grid (AWS Terrain Tiles: SRTM, GMTED, ETOPO)
  texture.jpg  true-colour imagery on the same grid:
               Sentinel-2 cloudless 2016 by EOX (CC BY 4.0), or NASA Blue Marble (public domain) for the
               wide packs; if imagery can't be fetched, a shaded-relief colouring of the heights is used
  meta.json    the bounds
Optional pack fields: hz (height tile zoom), tz (imagery zoom), hw (height grid width px),
tw (texture width px), imagery ("s2" | "bluemarble").
Also writes public/terrain/globe.jpg (Blue Marble) when a scene uses "globe": true.
usage: python scripts/build_terrain.py jobs/<id>.json [--force]
"""
import concurrent.futures as cf
import io
import json
import math
import os
import sys
import time
import urllib.request

import numpy as np
from PIL import Image

UA = {"User-Agent": "upsc-explainer-engine/1.0 (github.com/kumarujjwalonline/upsc-explainer-engine)"}
HEIGHT_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
S2_URLS = [
    "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg",
    "https://a.s2maps-tiles.eu/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg",
]
GIBS = ("https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1"
        "&LAYERS=BlueMarble_NextGeneration&STYLES=&SRS=EPSG:4326&BBOX={w},{s},{e},{n}&WIDTH={W}&HEIGHT={H}&FORMAT=image/jpeg")
KX, KY = 111.32, 110.57


def get(url, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            err = e
            time.sleep(1.5 * (i + 1))
    raise RuntimeError(f"{url}: {err}")


def merc(lon, lat, z):
    n = 256 * 2 ** z
    x = (lon + 180) / 360 * n
    y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
    return x, y


def mosaic(url, p, z, decode):
    """Stitch the mercator tiles covering the pack, then resample them onto the pack's lon/lat grid."""
    x0, y0 = merc(p["west"], p["north"], z)
    x1, y1 = merc(p["east"], p["south"], z)
    tx = range(int(x0 // 256), int(x1 // 256) + 1)
    ty = range(int(y0 // 256), int(y1 // 256) + 1)
    tiles = [(x, y) for y in ty for x in tx]
    print(f"  {len(tiles)} tiles at zoom {z}")
    get(url.format(z=z, x=tiles[0][0], y=tiles[0][1]), tries=2)  # fail fast if the server is unreachable
    with cf.ThreadPoolExecutor(8) as ex:
        data = dict(zip(tiles, ex.map(lambda t: get(url.format(z=z, x=t[0], y=t[1])), tiles)))
    first = decode(data[tiles[0]])
    ch = first.shape[2] if first.ndim == 3 else 1
    M = np.zeros((len(ty) * 256, len(tx) * 256, ch), np.float32)
    for (x, y), b in data.items():
        a = decode(b).astype(np.float32)
        M[(y - ty[0]) * 256:(y - ty[0] + 1) * 256, (x - tx[0]) * 256:(x - tx[0] + 1) * 256] = a.reshape(256, 256, ch)
    return M, tx[0] * 256, ty[0] * 256


def resample(M, ox, oy, p, z, W, H):
    lon = p["west"] + (p["east"] - p["west"]) * (np.arange(W) + 0.5) / W
    lat = p["north"] - (p["north"] - p["south"]) * (np.arange(H) + 0.5) / H
    n = 256 * 2 ** z
    X = (lon + 180) / 360 * n - ox - 0.5
    lr = np.radians(lat)
    Y = (1 - np.log(np.tan(lr) + 1 / np.cos(lr)) / np.pi) / 2 * n - oy - 0.5
    X, Y = np.meshgrid(X, Y)
    x0 = np.clip(np.floor(X).astype(int), 0, M.shape[1] - 2)
    y0 = np.clip(np.floor(Y).astype(int), 0, M.shape[0] - 2)
    ax = np.clip(X - x0, 0, 1)[..., None]
    ay = np.clip(Y - y0, 0, 1)[..., None]
    return (M[y0, x0] * (1 - ax) + M[y0, x0 + 1] * ax) * (1 - ay) + (M[y0 + 1, x0] * (1 - ax) + M[y0 + 1, x0 + 1] * ax) * ay


def png_rgb(b):
    return np.asarray(Image.open(io.BytesIO(b)).convert("RGB"))


def grid_h(p, W):
    lat0 = (p["north"] + p["south"]) / 2
    return max(2, round(W * (p["north"] - p["south"]) * KY / ((p["east"] - p["west"]) * math.cos(math.radians(lat0)) * KX)))


def auto_zoom(p, px_per_deg):
    return max(1, min(15, round(math.log2(px_per_deg * 360 / 256))))


def relief(h):
    """Shaded-relief colouring used only when no imagery could be fetched."""
    gy, gx = np.gradient(h)
    shade = np.clip(0.75 + (gx - gy) / 400, 0.35, 1.15)[..., None]
    stops = [(-1, (40, 70, 110)), (0, (126, 140, 92)), (300, (150, 150, 100)), (1500, (140, 120, 90)), (3500, (170, 160, 150)), (5000, (245, 245, 250))]
    xs = [s for s, _ in stops]
    col = np.stack([np.interp(h, xs, [c[i] for _, c in stops]) for i in range(3)], -1)
    return np.clip(col * shade, 0, 255).astype(np.uint8)


def build(p, force):
    d = os.path.join("public", "terrain", p["name"])
    if os.path.exists(os.path.join(d, "meta.json")) and not force:
        print(f"{p['name']}: already built")
        return
    os.makedirs(d, exist_ok=True)
    span = p["east"] - p["west"]
    hw = p.get("hw", 1024)
    hh = grid_h(p, hw)
    hz = p.get("hz", auto_zoom(p, hw / span))
    print(f"{p['name']}: heights {hw}x{hh}")
    M, ox, oy = mosaic(HEIGHT_URL, p, hz, png_rgb)
    M = M[..., 0] * 256 + M[..., 1] + M[..., 2] / 256 - 32768
    h = resample(M[..., None], ox, oy, p, hz, hw, hh)[..., 0]
    v = np.clip(h + 32768, 0, 65535.99)
    r = np.floor(v / 256)
    g = np.floor(v - r * 256)
    b = np.floor((v - r * 256 - g) * 256)
    Image.fromarray(np.stack([r, g, b], -1).astype(np.uint8)).save(os.path.join(d, "height.png"))

    tw = p.get("tw", 4096)
    th = grid_h(p, tw)
    tex, source = None, None
    if os.environ.get("NO_IMAGERY"):  # layout checks where imagery servers are unreachable
        pass
    elif p.get("imagery", "s2") == "s2":
        tz = p.get("tz", auto_zoom(p, tw / span))
        for url in S2_URLS:
            try:
                print(f"{p['name']}: imagery {tw}x{th} from Sentinel-2 cloudless")
                M, ox, oy = mosaic(url, p, tz, png_rgb)
                tex = resample(M, ox, oy, p, tz, tw, th)
                source = "Sentinel-2 cloudless 2016 by EOX IT Services GmbH (CC BY 4.0), contains modified Copernicus Sentinel data"
                break
            except Exception as e:  # noqa: BLE001
                print(f"  failed: {e}")
    if tex is None and not os.environ.get("NO_IMAGERY"):
        try:
            print(f"{p['name']}: imagery {tw}x{th} from NASA Blue Marble")
            W, H = min(tw, 8192), min(th, 8192)
            tex = png_rgb(get(GIBS.format(w=p["west"], s=p["south"], e=p["east"], n=p["north"], W=W, H=H)))
            source = "NASA Blue Marble Next Generation (public domain)"
        except Exception as e:  # noqa: BLE001
            print(f"  failed: {e}")
    if tex is None:
        hi = np.asarray(Image.fromarray(h.astype(np.float32)).resize((tw, th), Image.BILINEAR))
        tex = relief(hi)
        source = "shaded relief from AWS Terrain Tiles"
    Image.fromarray(np.clip(tex, 0, 255).astype(np.uint8)).save(os.path.join(d, "texture.jpg"), quality=86)
    meta = {k: p[k] for k in ("west", "east", "south", "north")}
    meta.update(minH=float(h.min()), maxH=float(h.max()), imagery=source)
    json.dump(meta, open(os.path.join(d, "meta.json"), "w"), indent=1)
    print(f"{p['name']}: done ({source})")


def main():
    job = json.load(open(sys.argv[1], encoding="utf-8"))
    force = "--force" in sys.argv
    for p in (job.get("assets") or {}).get("terrain", []):
        build(p, force)
    g = os.path.join("public", "terrain", "globe.jpg")
    if any((s.get("visual") or {}).get("globe") for s in job["scenes"]) and (force or not os.path.exists(g)):
        print("globe: NASA Blue Marble")
        open(g, "wb").write(get(GIBS.format(w=-180, s=-90, e=180, n=90, W=8192, H=4096)))


if __name__ == "__main__":
    main()
