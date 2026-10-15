"""Build a Terrain3D pack (meta.json, height.png Terrarium-encoded, texture.jpg) from free data:
Terrarium elevation tiles (AWS open data, SRTM et al., includes bathymetry) and, optionally, a
Copernicus Sentinel-2 L2A true-colour COG (AWS open data). Without Sentinel the texture is a
relief render of the elevation itself (hypsometric tint + hillshade, ocean below 0 m).
usage: make_pack.py name west east south north zoom out_dir [--tci url1,url2] [--texw 4096]"""
import sys, os, io, math, json, argparse, urllib.request, numpy as np
from PIL import Image
from concurrent.futures import ThreadPoolExecutor
ap = argparse.ArgumentParser()
ap.add_argument('name'); ap.add_argument('w', type=float); ap.add_argument('e', type=float); ap.add_argument('s', type=float); ap.add_argument('n', type=float)
ap.add_argument('z', type=int); ap.add_argument('out'); ap.add_argument('--tci', default=''); ap.add_argument('--texw', type=int, default=4096)
ap.add_argument('--hw', type=int, default=0)
A = ap.parse_args()
CACHE = os.path.join(os.path.dirname(__file__), '..', 'tilecache')

def tile(z, x, y):
    p = f'{CACHE}/t{z}_{x}_{y}.png'
    if not os.path.exists(p):
        for k in range(4):
            try:
                b = urllib.request.urlopen(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png', timeout=30).read(); break
            except Exception as ex:
                if k == 3: raise
        open(p, 'wb').write(b)
    a = np.asarray(Image.open(p).convert('RGB')).astype(np.float64)
    return a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768

def mx(lon, z): return (lon + 180) / 360 * 2 ** z * 256
def my(lat, z):
    r = np.radians(lat); return (1 - np.log(np.tan(r) + 1 / np.cos(r)) / math.pi) / 2 * 2 ** z * 256

def elevation(W, E, S, N, z, cols, rows):
    x0, x1 = int(mx(W, z) // 256), int(mx(E, z) // 256); y0, y1 = int(my(N, z) // 256), int(my(S, z) // 256)
    x1 = min(x1, 2 ** z - 1); y1 = min(y1, 2 ** z - 1)
    jobs = [(z, x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]
    with ThreadPoolExecutor(16) as ex: ts = list(ex.map(lambda a: tile(*a), jobs))
    big = np.zeros(((y1 - y0 + 1) * 256, (x1 - x0 + 1) * 256))
    for (zz, x, y), t in zip(jobs, ts): big[(y - y0) * 256:(y - y0 + 1) * 256, (x - x0) * 256:(x - x0 + 1) * 256] = t
    lons = W + (E - W) * np.arange(cols) / (cols - 1); lats = N - (N - S) * np.arange(rows) / (rows - 1)
    px = mx(lons, z) - x0 * 256; py = my(lats, z) - y0 * 256
    X, Y = np.meshgrid(px, py)
    xa = np.clip(np.floor(X).astype(int), 0, big.shape[1] - 2); ya = np.clip(np.floor(Y).astype(int), 0, big.shape[0] - 2)
    fx, fy = X - xa, Y - ya
    return (big[ya, xa] * (1 - fx) + big[ya, xa + 1] * fx) * (1 - fy) + (big[ya + 1, xa] * (1 - fx) + big[ya + 1, xa + 1] * fx) * fy

W, E, S, N = A.w, A.e, A.s, A.n
cosl = math.cos(math.radians((S + N) / 2))
aspect = (N - S) / ((E - W) * cosl)
hw = A.hw or min(1600, int((mx(E, A.z) - mx(W, A.z))))
hh = max(2, int(round(hw * aspect)))
H = elevation(W, E, S, N, A.z, hw, hh)
os.makedirs(f'{A.out}/{A.name}', exist_ok=True)
v = np.clip(H + 32768, 0, 65535.99)
r = np.floor(v / 256); g = np.floor(v - r * 256); b = np.floor((v - r * 256 - g) * 256)
Image.fromarray(np.dstack([r, g, b]).astype(np.uint8)).save(f'{A.out}/{A.name}/height.png', optimize=True)

tw = A.texw; th = int(round(tw * aspect))
if A.tci:
    import rasterio
    from rasterio.warp import reproject, Resampling
    from rasterio.transform import from_bounds
    dst = np.zeros((3, th, tw), np.uint8)
    for url in A.tci.split(','):
        with rasterio.open(url) as src:
            tmp = np.zeros((3, th, tw), np.uint8)
            reproject(source=rasterio.band(src, [1, 2, 3]), destination=tmp, src_transform=src.transform, src_crs=src.crs,
                      dst_transform=from_bounds(W, S, E, N, tw, th), dst_crs='EPSG:4326', resampling=Resampling.average, src_nodata=0, dst_nodata=0)
            m = (dst.sum(0) == 0) & (tmp.sum(0) > 0); dst[:, m] = tmp[:, m]
    img = dst.transpose(1, 2, 0).astype(np.float64)
    # gentle contrast/brightness lift (TCI is dark), keep it natural
    img = np.clip(255 * ((img / 255) ** 0.8) * 1.12, 0, 255)
    Image.fromarray(img.astype(np.uint8)).save(f'{A.out}/{A.name}/texture.jpg', quality=88)
else:
    zt = min(A.z + 2, 12)
    Ht = elevation(W, E, S, N, zt, tw, th)
    # hillshade
    px_km = (E - W) * 111.32 * cosl / tw
    gy, gx = np.gradient(Ht, px_km * 1000)
    slope = np.arctan(np.hypot(gx, gy) * 1.6); asp = np.arctan2(-gx, gy)
    az, alt = math.radians(315), math.radians(45)
    hs = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - asp)
    hs = np.clip(hs, 0, 1)
    stops = [(-8000, (8, 22, 48)), (-200, (16, 46, 84)), (-1, (28, 70, 110)), (0, (112, 128, 78)), (150, (134, 140, 88)), (400, (156, 148, 100)),
             (900, (160, 140, 102)), (1800, (138, 112, 86)), (3200, (120, 104, 96)), (4800, (150, 138, 128)), (5600, (214, 214, 220)), (6400, (245, 246, 250))]
    hv = [s[0] for s in stops]; col = np.zeros(Ht.shape + (3,))
    for c in range(3): col[..., c] = np.interp(Ht, hv, [s[1][c] for s in stops])
    land = Ht > 0
    shade = np.where(land, 0.55 + 0.75 * hs, 1.0)[..., None]
    img = np.clip(col * shade, 0, 255)
    Image.fromarray(img.astype(np.uint8)).save(f'{A.out}/{A.name}/texture.jpg', quality=88)
json.dump({'west': W, 'east': E, 'south': S, 'north': N, 'minH': float(H.min()), 'maxH': float(H.max())}, open(f'{A.out}/{A.name}/meta.json', 'w'))
print(A.name, 'height', hw, 'x', hh, 'tex', tw, 'x', th, 'h range', round(H.min()), round(H.max()))
