import React, {useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {continueRender, delayRender, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts, toneColor} from '../theme';
import type {LonLat, Tone} from '../types';

// Production rule 23: full-screen, Google Earth-style flights over real terrain.
// Terrain packs (public/terrain/<pack>/) hold a Terrarium-encoded height grid and a
// true-colour texture on the same lon/lat grid (Sentinel-2 / Natural Earth, free data).
// The camera is keyframed in seconds so map moments land on the spoken words.
// Lines, areas, pins and labels are projected with the same camera into an SVG layer,
// so they stay crisp. Borders come only from vectors.json (Natural Earth, India
// point-of-view edition = Survey of India outline); historical lines are labelled approximate.

export type TerrainCam = {t: number; lon: number; lat: number; dist: number; tilt?: number; heading?: number};

type Base = {t0?: number; out?: number; tone?: Tone; color?: string};
export type TerrainLayer =
  | (Base & {kind: 'line'; ref?: string; pts?: LonLat[]; dashed?: boolean; width?: number; dur?: number; label?: string; labelAt?: LonLat; flicker?: boolean; reverse?: boolean})
  | (Base & {kind: 'area'; ref?: string; ring?: LonLat[]; hatch?: boolean; label?: string; labelAt?: LonLat; opacity?: number})
  | (Base & {kind: 'zone'; at: LonLat; rx?: number; ry?: number; angle?: number; label?: string})
  | (Base & {kind: 'pin'; at: LonLat; label: string; sub?: string; side?: 'left' | 'right'})
  | (Base & {kind: 'label'; at: LonLat; text: string; size?: number; sub?: string})
  | (Base & {kind: 'units'; pts: LonLat[]; stagger?: number; icon?: 'soldier' | 'block'})
  | (Base & {kind: 'arrow'; from: LonLat; to: LonLat; label?: string; dur?: number})
  | (Base & {kind: 'stamp'; text: string; sub?: string; y?: number})
  // a real photograph of the place, in a card beside the map, with a leader line to its pin
  | (Base & {kind: 'photo'; src: string; credit?: string; caption?: string; at?: LonLat; side?: 'left' | 'right'; w?: number});

export type TerrainSpec = {
  packs: string[];
  exag?: number;
  cam: TerrainCam[];
  layers?: TerrainLayer[];
  india?: boolean; // Survey of India outline (default on)
  lac?: boolean; // the whole LAC as a dashed line (default off)
  night?: boolean;
  globe?: boolean;
  drift?: number; // slow orbit, degrees per second
  credit?: string; // data credit line (imagery, elevation, borders)
};

type Meta = {west: number; east: number; south: number; north: number; hw: number; hh: number; minH: number; maxH: number};
type Pack = {name: string; meta: Meta; h: Float32Array; tex: THREE.Texture};

const packCache = new Map<string, Promise<Pack>>();
let vectors: Record<string, any> | null = null;
let vectorsP: Promise<any> | null = null;
let globeTex: Promise<THREE.Texture> | null = null;

const loadTexture = (url: string) =>
  new Promise<THREE.Texture>((res, rej) =>
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        t.generateMipmaps = true;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        res(t);
      },
      undefined,
      rej,
    ),
  );

const decodeHeights = async (url: string) => {
  const blob = await (await fetch(url)).blob();
  const bmp = await createImageBitmap(blob, {colorSpaceConversion: 'none', premultiplyAlpha: 'none'});
  const c = new OffscreenCanvas(bmp.width, bmp.height);
  const g = c.getContext('2d', {willReadFrequently: true}) as OffscreenCanvasRenderingContext2D;
  g.drawImage(bmp, 0, 0);
  const d = g.getImageData(0, 0, bmp.width, bmp.height).data;
  const h = new Float32Array(bmp.width * bmp.height);
  for (let i = 0; i < h.length; i++) h[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
  return {h, w: bmp.width, hh: bmp.height};
};

const loadPack = (name: string) => {
  if (!packCache.has(name))
    packCache.set(
      name,
      (async () => {
        const meta: Meta = await (await fetch(staticFile(`terrain/${name}/meta.json`))).json();
        const [hd, tex] = await Promise.all([decodeHeights(staticFile(`terrain/${name}/height.png`)), loadTexture(staticFile(`terrain/${name}/texture.jpg`))]);
        return {name, meta: {...meta, hw: hd.w, hh: hd.hh}, h: hd.h, tex};
      })(),
    );
  return packCache.get(name)!;
};
const loadVectors = () => {
  if (!vectorsP) vectorsP = fetch(staticFile('terrain/vectors.json')).then((r) => r.json()).then((j) => (vectors = j));
  return vectorsP;
};

const useTerrainData = (names: string[], globe: boolean) => {
  const key = names.join(',') + (globe ? '+g' : '');
  const [data, setData] = useState<{packs: Pack[]; globe?: THREE.Texture} | null>(null);
  const [handle] = useState(() => delayRender('Loading terrain ' + key, {timeoutInMilliseconds: 180000}));
  useEffect(() => {
    let live = true;
    if (globe && !globeTex) globeTex = loadTexture(staticFile('terrain/globe.jpg'));
    Promise.all([Promise.all(names.map(loadPack)), loadVectors(), globe ? globeTex : Promise.resolve(undefined)])
      .then(([packs, , g]) => {
        if (live) setData({packs, globe: g || undefined});
        continueRender(handle);
      })
      .catch((e) => {
        console.error(e);
        continueRender(handle);
      });
    return () => {
      live = false;
    };
  }, [key]);
  return data;
};

// ---------- geometry helpers ----------
const KX = 111.32;
const KY = 110.57;
type Frame = {lon0: number; lat0: number; cos0: number};
const toLocal = (fr: Frame, lon: number, lat: number) => [(lon - fr.lon0) * fr.cos0 * KX, -(lat - fr.lat0) * KY] as const;

const sampleH = (p: Pack, lon: number, lat: number) => {
  const m = p.meta;
  if (lon < m.west || lon > m.east || lat < m.south || lat > m.north) return null;
  const fx = ((lon - m.west) / (m.east - m.west)) * (m.hw - 1);
  const fy = ((m.north - lat) / (m.north - m.south)) * (m.hh - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(m.hw - 1, x0 + 1);
  const y1 = Math.min(m.hh - 1, y0 + 1);
  const ax = fx - x0;
  const ay = fy - y0;
  const g = (x: number, y: number) => p.h[y * m.hw + x];
  return (g(x0, y0) * (1 - ax) + g(x1, y0) * ax) * (1 - ay) + (g(x0, y1) * (1 - ax) + g(x1, y1) * ax) * ay;
};
// Finest pack wins (packs are listed coarse → fine).
const heightAt = (packs: Pack[], lon: number, lat: number) => {
  for (let i = packs.length - 1; i >= 0; i--) {
    const v = sampleH(packs[i], lon, lat);
    if (v !== null) return Math.max(0, v);
  }
  return 0;
};

type Win = {west: number; east: number; south: number; north: number};
// Only the part of a pack the camera can see is meshed, at up to the height grid's own detail.
const buildGeometry = (p: Pack, fr: Frame, exag: number, win: Win, finer: Win[]) => {
  const pm = p.meta;
  const m = {west: Math.max(pm.west, win.west), east: Math.min(pm.east, win.east), south: Math.max(pm.south, win.south), north: Math.min(pm.north, win.north)};
  if (m.east <= m.west || m.north <= m.south) return null;
  const gridCols = ((m.east - m.west) / (pm.east - pm.west)) * pm.hw;
  const cols = Math.max(8, Math.round(Math.min(gridCols, 640)));
  const rows = Math.max(2, Math.round((cols * (m.north - m.south) * KY) / ((m.east - m.west) * fr.cos0 * KX)));
  const pos = new Float32Array((cols + 1) * (rows + 1) * 3);
  const uv = new Float32Array((cols + 1) * (rows + 1) * 2);
  let k = 0;
  let q = 0;
  for (let r = 0; r <= rows; r++) {
    const lat = m.north - ((m.north - m.south) * r) / rows;
    for (let c = 0; c <= cols; c++) {
      const lon = m.west + ((m.east - m.west) * c) / cols;
      const [x, z] = toLocal(fr, lon, lat);
      const h = Math.max(0, sampleH(p, lon, lat) ?? 0);
      // A coarse pack's smoothed valleys sit above the finer pack's real valley floors and
      // would poke through; sink it wherever a finer pack fully covers (outside its feathered rim).
      const under = finer.some((b) => {
        const ix = (b.east - b.west) * 0.07;
        const iy = (b.north - b.south) * 0.07;
        return lon > b.west + ix && lon < b.east - ix && lat > b.south + iy && lat < b.north - iy;
      });
      pos[k++] = x;
      pos[k++] = (h / 1000) * exag - (under ? 4 * exag : 0);
      pos[k++] = z;
      uv[q++] = (lon - pm.west) / (pm.east - pm.west);
      uv[q++] = (lat - pm.south) / (pm.north - pm.south);
    }
  }
  const idx: number[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const b = a + cols + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
};

const featherMap = (() => {
  let t: THREE.Texture | null = null;
  return () => {
    if (t) return t;
    const n = 256;
    const c = document.createElement('canvas');
    c.width = n;
    c.height = n;
    const g = c.getContext('2d')!;
    const img = g.createImageData(n, n);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const e = Math.min(x, y, n - 1 - x, n - 1 - y) / (n * 0.06);
        const v = Math.round(255 * Math.min(1, e * e * (3 - 2 * Math.min(1, e))));
        const i = (y * n + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    t = new THREE.CanvasTexture(c);
    return t;
  };
})();

// ---------- camera ----------
const ease = Easing.inOut(Easing.cubic);
const camAt = (keys: TerrainCam[], t: number) => {
  const ks = [...keys].sort((a, b) => a.t - b.t);
  if (t <= ks[0].t) return {...ks[0], tilt: ks[0].tilt ?? 40, heading: ks[0].heading ?? 0};
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i];
    const b = ks[i + 1];
    if (t <= b.t) {
      const k = ease((t - a.t) / Math.max(1e-6, b.t - a.t));
      const ha = a.heading ?? 0;
      let hb = b.heading ?? ha;
      while (hb - ha > 180) hb -= 360;
      while (hb - ha < -180) hb += 360;
      return {
        t,
        lon: a.lon + (b.lon - a.lon) * k,
        lat: a.lat + (b.lat - a.lat) * k,
        dist: Math.exp(Math.log(a.dist) + (Math.log(b.dist) - Math.log(a.dist)) * k),
        tilt: (a.tilt ?? 40) + ((b.tilt ?? a.tilt ?? 40) - (a.tilt ?? 40)) * k,
        heading: ha + (hb - ha) * k,
      };
    }
  }
  const l = ks[ks.length - 1];
  return {...l, tilt: l.tilt ?? 40, heading: l.heading ?? 0};
};

const makeCamera = (packs: Pack[], fr: Frame, exag: number, c: ReturnType<typeof camAt>, aspect: number) => {
  // Look-at height: average of a few samples so a pan never jitters over ridges.
  const r = c.dist * 0.08;
  let hs = 0;
  const offs = [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]];
  for (const [dx, dy] of offs) hs += heightAt(packs, c.lon + dx / (KX * fr.cos0), c.lat + dy / KY);
  const [tx, tz] = toLocal(fr, c.lon, c.lat);
  const ty = c.dist > 3500 ? 0 : ((hs / offs.length) / 1000) * exag;
  const T = (c.tilt * Math.PI) / 180;
  const H = (c.heading * Math.PI) / 180;
  const cam = new THREE.PerspectiveCamera(34, aspect, Math.max(0.05, c.dist * 0.02), c.dist * 12 + 30000);
  cam.position.set(tx - c.dist * Math.sin(T) * Math.sin(H), ty + c.dist * Math.cos(T), tz + c.dist * Math.sin(T) * Math.cos(H));
  cam.up.set(0, 1, 0);
  cam.lookAt(tx, ty, tz);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
  return cam;
};

const CameraRig: React.FC<{cam: THREE.PerspectiveCamera}> = ({cam}) => {
  const {camera, scene} = useThree();
  const p = camera as THREE.PerspectiveCamera;
  p.fov = cam.fov;
  p.aspect = cam.aspect;
  p.near = cam.near;
  p.far = cam.far;
  p.position.copy(cam.position);
  p.quaternion.copy(cam.quaternion);
  p.updateMatrixWorld(true);
  p.updateProjectionMatrix();
  void scene;
  return null;
};

const Fog: React.FC<{color: string; near: number; far: number}> = ({color, near, far}) => {
  const {scene} = useThree();
  // Reuse the same Fog object: swapping it makes three.js recompile every shader each frame.
  if (!(scene.fog instanceof THREE.Fog)) scene.fog = new THREE.Fog(color, near, far);
  const fog = scene.fog as THREE.Fog;
  fog.color.set(color);
  fog.near = near;
  fog.far = far;
  if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color(color);
  (scene.background as THREE.Color).set(color);
  return null;
};

// Draw exactly once per video frame. R3F's default loop redraws at 60 fps, which in
// software WebGL starves the renderer (20+ s per frame).
const DrawOnce: React.FC<{frame: number}> = ({frame}) => {
  const {advance} = useThree();
  useLayoutEffect(() => {
    advance(performance.now(), true);
  });
  void frame;
  return null;
};

// ---------- main ----------
const RE = 6371;

export const Terrain3D: React.FC<{spec: TerrainSpec; box: {x: number; y: number; w: number; h: number}}> = ({spec, box}) => {
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const t = f / fps;
  const exag = spec.exag ?? (Math.min(...spec.cam.map((k) => k.dist)) < 90 ? 1.6 : 2);
  const data = useTerrainData(spec.packs, !!spec.globe);
  const W = box.w;
  const Hh = box.h;
  const u = Math.min(W / 1480, Hh / 1080) * (W < Hh ? 1.45 : 1);

  const fr: Frame | null = useMemo(() => {
    if (!data) return null;
    const m = data.packs[0].meta;
    const lat0 = (m.north + m.south) / 2;
    return {lon0: (m.east + m.west) / 2, lat0, cos0: Math.cos((lat0 * Math.PI) / 180)};
  }, [data]);

  const win: Win = useMemo(() => {
    const maxD = Math.max(...spec.cam.map((k) => k.dist));
    const mk = Math.min(4000, maxD * 3.2 + 15);
    const lat0 = spec.cam.reduce((a, k) => a + k.lat, 0) / spec.cam.length;
    const dLon = mk / (KX * Math.cos((lat0 * Math.PI) / 180));
    const dLat = mk / KY;
    return {
      west: Math.min(...spec.cam.map((k) => k.lon)) - dLon,
      east: Math.max(...spec.cam.map((k) => k.lon)) + dLon,
      south: Math.min(...spec.cam.map((k) => k.lat)) - dLat,
      north: Math.max(...spec.cam.map((k) => k.lat)) + dLat,
    };
  }, [spec.cam]);
  const geoms = useMemo(() => (data && fr ? data.packs.map((p, i) => buildGeometry(p, fr, exag, win, data.packs.slice(i + 1).map((q) => q.meta))) : []), [data, fr, exag, win]);

  const globeMatrix = useMemo(() => {
    if (!fr) return null;
    const l = (fr.lon0 * Math.PI) / 180;
    const p = (fr.lat0 * Math.PI) / 180;
    const E = new THREE.Vector3(-Math.sin(l), 0, -Math.cos(l));
    const U = new THREE.Vector3(Math.cos(p) * Math.cos(l), Math.sin(p), -Math.cos(p) * Math.sin(l));
    const N = new THREE.Vector3(-Math.sin(p) * Math.cos(l), Math.cos(p), Math.sin(p) * Math.sin(l));
    const m = new THREE.Matrix4().set(E.x, E.y, E.z, 0, U.x, U.y, U.z, -RE, -N.x, -N.y, -N.z, 0, 0, 0, 0, 1);
    return m;
  }, [fr]);

  if (!data || !fr) return null;
  const c = camAt(spec.cam, t);
  c.heading += (spec.drift ?? 0.5) * t;
  const cam = makeCamera(data.packs, fr, exag, c, W / Hh);

  // Globe ↔ terrain cross-fade by altitude.
  const terrainO = spec.globe ? interpolate(c.dist, [2700, 4200], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  const globeO = spec.globe ? interpolate(c.dist, [2500, 3900], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
  const night = !!spec.night;
  const tint = night ? new THREE.Color(0.42, 0.5, 0.72) : new THREE.Color(1, 1, 1);
  const fogColor = night ? '#0A1424' : '#9FB4CC';

  // ----- SVG projection -----
  const v = new THREE.Vector3();
  const proj = (lon: number, lat: number, lift = 0.02): [number, number, boolean] => {
    const [x, z] = toLocal(fr, lon, lat);
    const y = c.dist > 3500 ? 0 : (heightAt(data.packs, lon, lat) / 1000) * exag + lift * Math.min(1, c.dist / 40);
    v.set(x, y, z).project(cam);
    return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * Hh, v.z < 1 && v.z > -1];
  };
  const densify = (pts: LonLat[]) => {
    const step = Math.max(0.004, c.dist / 3000);
    const out: LonLat[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    }
    out.push(pts[pts.length - 1]);
    return out;
  };
  const ref = (name?: string): LonLat[] | LonLat[][] | null => (name && vectors ? vectors[name] : null);
  const vis = (L: Base) => {
    const t0 = L.t0 ?? 0;
    const a = interpolate(t, [t0, t0 + 0.4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    const b = L.out !== undefined ? interpolate(t, [L.out, L.out + 0.4], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
    return a * b * (spec.globe ? terrainO : 1);
  };
  const col = (L: Base) => L.color || toneColor(L.tone || 'accent');
  const textStyle = (size: number, color = colors.text): React.CSSProperties => ({
    paintOrder: 'stroke',
    stroke: 'rgba(6,14,26,0.85)',
    strokeWidth: size * 0.16,
    strokeLinejoin: 'round',
    fill: color,
    fontFamily: fonts.display,
    fontWeight: 700,
    fontSize: size,
  });
  const pathOf = (pts: LonLat[], frac = 1) => {
    const P = densify(pts).map((p) => proj(p[0], p[1]));
    const n = Math.max(2, Math.round(P.length * frac));
    let d = '';
    let pen = false;
    for (let i = 0; i < Math.min(n, P.length); i++) {
      const [x, y, ok] = P[i];
      if (!ok) {
        pen = false;
        continue;
      }
      d += `${pen ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
      pen = true;
    }
    return {d, head: P[Math.min(n, P.length) - 1]};
  };

  const layers: TerrainLayer[] = [];
  if (spec.india !== false) layers.push({kind: 'area', ref: 'india', color: '#FFFFFF', opacity: 0, t0: -1});
  if (spec.lac) layers.push(...['lac_west', 'lac_middle', 'lac_sikkim', 'lac_east'].map((r) => ({kind: 'line' as const, ref: r, dashed: true, color: colors.yellow, t0: -1, width: 3})));
  layers.push(...(spec.layers || []));

  const els: React.ReactNode[] = [];
  const stamps: React.ReactNode[] = [];
  layers.forEach((L, i) => {
    const o = vis(L);
    if (o <= 0.001) return;
    const C = col(L);
    if (L.kind === 'line') {
      const pts = (L.pts || (ref(L.ref) as LonLat[]) || []).slice();
      if (L.reverse) pts.reverse();
      if (pts.length < 2) return;
      const dur = L.dur ?? 1.6;
      const frac = (L.t0 ?? 0) < 0 ? 1 : interpolate(t, [L.t0 ?? 0, (L.t0 ?? 0) + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad)});
      const {d, head} = pathOf(pts, frac);
      const w = (L.width ?? 4) * u;
      const fl = L.flicker ? 0.55 + 0.45 * Math.abs(Math.sin(t * 7.3)) * (0.6 + 0.4 * Math.sin(t * 2.1)) : 1;
      els.push(
        <g key={i} opacity={o * fl}>
          <path d={d} fill="none" stroke={C} strokeOpacity={0.28} strokeWidth={w * 3.2} strokeLinecap="round" strokeLinejoin="round" />
          <path d={d} fill="none" stroke={C} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={L.dashed ? `${w * 3.2} ${w * 2.2}` : undefined} />
          {L.label && frac > 0.95
            ? (() => {
                const at = L.labelAt ? proj(L.labelAt[0], L.labelAt[1]) : head;
                return (
                  <text x={at[0] + 14 * u} y={at[1] - 12 * u} style={textStyle(30 * u, C)}>
                    {L.label}
                  </text>
                );
              })()
            : null}
        </g>,
      );
    } else if (L.kind === 'area') {
      const r = L.ring ? [L.ring] : (ref(L.ref) as LonLat[][]) || [];
      const d = r.map((ring) => pathOf([...ring, ring[0]]).d).join(' ');
      if (L.ref === 'india') {
        els.push(
          <g key={i} opacity={o}>
            <path d={d} fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={7 * u} strokeLinejoin="round" />
            <path d={d} fill="none" stroke="#FFFFFF" strokeWidth={2.2 * u} strokeLinejoin="round" />
          </g>,
        );
        return;
      }
      const pid = `hatch${i}`;
      const grow = interpolate(t, [L.t0 ?? 0, (L.t0 ?? 0) + 0.8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
      els.push(
        <g key={i} opacity={o}>
          {L.hatch ? (
            <defs>
              <pattern id={pid} width={16 * u} height={16 * u} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width={16 * u} height={16 * u} fill={C} fillOpacity={0.18} />
                <line x1={0} y1={0} x2={0} y2={16 * u} stroke={C} strokeWidth={5 * u} strokeOpacity={0.75} />
              </pattern>
            </defs>
          ) : null}
          <path d={d} fill={L.hatch ? `url(#${pid})` : C} fillOpacity={L.hatch ? grow : (L.opacity ?? 0.3) * grow} stroke={C} strokeWidth={3 * u} strokeLinejoin="round" />
          {L.label && L.labelAt
            ? (() => {
                const p = proj(L.labelAt[0], L.labelAt[1]);
                return (
                  <text x={p[0]} y={p[1]} textAnchor="middle" style={textStyle(32 * u, '#FFFFFF')}>
                    {L.label}
                  </text>
                );
              })()
            : null}
        </g>,
      );
    } else if (L.kind === 'zone') {
      const rx = L.rx ?? 1.5;
      const ry = L.ry ?? rx;
      const an = ((L.angle ?? 0) * Math.PI) / 180;
      const ring: LonLat[] = [];
      for (let k = 0; k <= 48; k++) {
        const a = (k / 48) * Math.PI * 2;
        const ex = Math.cos(a) * rx;
        const ey = Math.sin(a) * ry;
        const x = ex * Math.cos(an) - ey * Math.sin(an);
        const y = ex * Math.sin(an) + ey * Math.cos(an);
        ring.push([L.at[0] + x / (KX * fr.cos0), L.at[1] + y / KY]);
      }
      const d = pathOf(ring).d;
      const p = proj(L.at[0], L.at[1]);
      const grow = interpolate(t, [L.t0 ?? 0, (L.t0 ?? 0) + 0.7], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
      const C2 = L.color || colors.yellow;
      els.push(
        <g key={i} opacity={o}>
          <path d={d} fill={C2} fillOpacity={0.32 * grow} stroke={C2} strokeWidth={3 * u} strokeDasharray={`${10 * u} ${7 * u}`} />
          {L.label ? (
            <text x={p[0]} y={p[1] - 16 * u} textAnchor="middle" style={textStyle(28 * u, '#FFFFFF')}>
              {L.label}
            </text>
          ) : null}
          <text x={p[0]} y={p[1] + 22 * u} textAnchor="middle" style={textStyle(19 * u, colors.yellow)}>
            APPROXIMATE
          </text>
        </g>,
      );
    } else if (L.kind === 'pin') {
      const [x, y, ok] = proj(L.at[0], L.at[1]);
      if (!ok) return;
      const e = spring({frame: f - (L.t0 ?? 0) * fps, fps, config: {damping: 11}});
      const ring = (((f - (L.t0 ?? 0) * fps) % 50) + 50) % 50 / 50;
      const left = L.side ? L.side === 'left' : x > W * 0.62;
      els.push(
        <g key={i} transform={`translate(${x} ${y})`} opacity={o}>
          <circle r={(12 + 36 * ring) * u} fill="none" stroke={C} strokeWidth={3 * u} opacity={1 - ring} />
          <line x1={0} y1={0} x2={0} y2={-46 * u * e} stroke={C} strokeWidth={3 * u} />
          <circle r={9 * u * e} fill={C} stroke="#0B1726" strokeWidth={3 * u} />
          <text x={left ? -12 * u : 12 * u} y={-50 * u} textAnchor={left ? 'end' : 'start'} style={textStyle(34 * u)} opacity={Math.min(1, e)}>
            {L.label}
          </text>
          {L.sub ? (
            <text x={left ? -12 * u : 12 * u} y={-18 * u} textAnchor={left ? 'end' : 'start'} style={{...textStyle(22 * u, colors.yellow), fontWeight: 600}} opacity={Math.min(1, e)}>
              {L.sub}
            </text>
          ) : null}
        </g>,
      );
    } else if (L.kind === 'label') {
      const [x, y, ok] = proj(L.at[0], L.at[1]);
      if (!ok) return;
      const s = (L.size ?? 30) * u;
      els.push(
        <g key={i} opacity={o}>
          <text x={x} y={y} textAnchor="middle" letterSpacing={2 * u} style={textStyle(s, L.color || (L.tone ? toneColor(L.tone) : '#FFFFFF'))}>
            {L.text}
          </text>
          {L.sub ? (
            <text x={x} y={y + s * 0.95} textAnchor="middle" style={{...textStyle(s * 0.62, colors.sub), fontWeight: 600}}>
              {L.sub}
            </text>
          ) : null}
        </g>,
      );
    } else if (L.kind === 'units') {
      L.pts.forEach((pt, k) => {
        const [x, y, ok] = proj(pt[0], pt[1]);
        if (!ok) return;
        const e = spring({frame: f - ((L.t0 ?? 0) + k * (L.stagger ?? 0.25)) * fps, fps, config: {damping: 12}});
        if (e <= 0.01) return;
        const s = 22 * u * e;
        els.push(
          <g key={`${i}-${k}`} transform={`translate(${x} ${y - s * 1.3})`} opacity={o}>
            <rect x={-s} y={-s} width={2 * s} height={2 * s} rx={5 * u} fill={C} stroke="#0B1726" strokeWidth={2.5 * u} />
            {L.icon === 'block' ? (
              <path d={`M${-s * 0.55} ${-s * 0.55} L${s * 0.55} ${s * 0.55} M${s * 0.55} ${-s * 0.55} L${-s * 0.55} ${s * 0.55}`} stroke="#0B1726" strokeWidth={4 * u} />
            ) : (
              <g fill="#0B1726">
                <circle cx={0} cy={-s * 0.38} r={s * 0.26} />
                <path d={`M${-s * 0.5} ${s * 0.62} Q${-s * 0.5} ${-s * 0.05} 0 ${-s * 0.05} Q${s * 0.5} ${-s * 0.05} ${s * 0.5} ${s * 0.62} Z`} />
              </g>
            )}
          </g>,
        );
      });
    } else if (L.kind === 'arrow') {
      const dur = L.dur ?? 1.2;
      const frac = interpolate(t, [L.t0 ?? 0, (L.t0 ?? 0) + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
      const a = proj(L.from[0], L.from[1], 0.4);
      const b0 = proj(L.to[0], L.to[1], 0.4);
      const b: [number, number] = [a[0] + (b0[0] - a[0]) * frac, a[1] + (b0[1] - a[1]) * frac];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const w = 6 * u;
      const hl = 26 * u;
      els.push(
        <g key={i} opacity={o}>
          <line x1={a[0]} y1={a[1]} x2={b[0] - Math.cos(ang) * hl * 0.6} y2={b[1] - Math.sin(ang) * hl * 0.6} stroke={C} strokeWidth={w} strokeLinecap="round" />
          <polygon
            points={`${b[0]},${b[1]} ${b[0] - Math.cos(ang - 0.45) * hl},${b[1] - Math.sin(ang - 0.45) * hl} ${b[0] - Math.cos(ang + 0.45) * hl},${b[1] - Math.sin(ang + 0.45) * hl}`}
            fill={C}
          />
          {L.label && frac > 0.9 ? (
            <text x={b[0] + 14 * u} y={b[1] + 10 * u} style={textStyle(28 * u, C)}>
              {L.label}
            </text>
          ) : null}
        </g>,
      );
    } else if (L.kind === 'photo') {
      const e = spring({frame: f - (L.t0 ?? 0) * fps, fps, config: {damping: 14}});
      const right = (L.side ?? 'right') === 'right';
      const cw = (L.w ?? 0.44) * W;
      const ch = cw * 0.68;
      const cx = right ? W - cw - 70 * u : 50 * u;
      const cy = Hh * 0.16;
      const age = Math.max(0, t - (L.t0 ?? 0));
      if (L.at) {
        const [x, y, ok] = proj(L.at[0], L.at[1]);
        if (ok)
          els.push(
            <line key={i} x1={x} y1={y} x2={right ? cx : cx + cw} y2={cy + ch * 0.5} stroke="#FFFFFF" strokeWidth={2.5 * u} strokeDasharray={`${8 * u} ${6 * u}`} opacity={o * Math.min(1, e)} />,
          );
      }
      stamps.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: cx,
            top: cy,
            width: cw,
            opacity: o * Math.min(1, e * 1.4),
            transform: `translateY(${(1 - Math.min(1, e)) * 40 * u}px) scale(${0.92 + 0.08 * Math.min(1, e)})`,
            transformOrigin: right ? 'right center' : 'left center',
          }}
        >
          <div style={{width: cw, height: ch, borderRadius: 14 * u, overflow: 'hidden', border: `${4 * u}px solid #FFFFFF`, boxShadow: '0 18px 50px rgba(0,0,0,0.55)', background: '#0B1726'}}>
            <Img src={staticFile(L.src)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.04 + age * 0.012}) translateX(${(right ? -1 : 1) * age * 0.25}%)`}} />
          </div>
          {L.caption ? (
            <div style={{marginTop: 10 * u, fontFamily: fonts.display, fontWeight: 700, fontSize: 28 * u, color: '#FFFFFF', textShadow: '0 2px 10px rgba(0,0,0,0.8)'}}>{L.caption}</div>
          ) : null}
          {L.credit ? <div style={{marginTop: 4 * u, fontFamily: fonts.body, fontSize: 15 * u, color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 6px rgba(0,0,0,0.9)'}}>{L.credit}</div> : null}
        </div>,
      );
    } else if (L.kind === 'stamp') {
      const e = spring({frame: f - (L.t0 ?? 0) * fps, fps, config: {damping: 9, mass: 0.8}});
      const sc = 1.6 - 0.6 * Math.min(1, e);
      stamps.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: (L.y ?? 0.42) * Hh,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            opacity: o * Math.min(1, e * 1.5),
            transform: `scale(${sc}) rotate(${L.text.length > 2 ? -6 : 0}deg)`,
          }}
        >
          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: (L.text.length <= 2 ? 170 : 74) * u,
              lineHeight: 1,
              color: C,
              border: L.text.length > 2 ? `${7 * u}px solid ${C}` : undefined,
              borderRadius: 12 * u,
              padding: L.text.length > 2 ? `${10 * u}px ${30 * u}px` : 0,
              background: L.text.length > 2 ? 'rgba(11,23,38,0.72)' : undefined,
              textShadow: '0 4px 24px rgba(0,0,0,0.6)',
              letterSpacing: 3 * u,
            }}
          >
            {L.text}
          </div>
          {L.sub ? (
            <div style={{marginTop: 14 * u, fontFamily: fonts.display, fontWeight: 700, fontSize: 30 * u, color: '#FFFFFF', background: 'rgba(11,23,38,0.72)', padding: `${6 * u}px ${18 * u}px`, borderRadius: 8 * u}}>
              {L.sub}
            </div>
          ) : null}
        </div>,
      );
    }
  });

  const fadeIn = interpolate(f, [0, 6], [0, 1], {extrapolateRight: 'clamp'});
  const fadeOut = interpolate(f, [durationInFrames - 5, durationInFrames], [1, 0.0], {extrapolateLeft: 'clamp'});
  // Altitude readout like Google Earth's status bar.
  const eye = cam.position.y * (1000 / exag);
  return (
    <div style={{position: 'absolute', left: box.x, top: box.y, width: W, height: Hh, overflow: 'hidden', background: night ? '#050B16' : '#0B1726', opacity: Math.min(fadeIn, 1) * (0.25 + 0.75 * fadeOut)}}>
      <ThreeCanvas frameloop="never" width={W} height={Hh} dpr={0.75} style={{position: 'absolute', inset: 0}} gl={{antialias: true, preserveDrawingBuffer: true}}>
        <CameraRig cam={cam} />
        <Fog color={spec.globe && c.dist > 2600 ? '#0B1726' : fogColor} near={c.dist * (spec.globe ? 6 : 1.3)} far={c.dist * (spec.globe ? 30 : 3.4)} />
        {data.globe && globeMatrix && globeO > 0.001 ? (
          <mesh matrixAutoUpdate={false} matrix={globeMatrix} renderOrder={-1}>
            <sphereGeometry args={[RE, 96, 64]} />
            <meshBasicMaterial map={data.globe} transparent opacity={globeO} fog={false} depthWrite={terrainO < 0.5} />
          </mesh>
        ) : null}
        {terrainO > 0.001
          ? data.packs.map((p, k) =>
              geoms[k] ? (
              <mesh key={p.name} geometry={geoms[k]!} position={[0, k * 0.004 * Math.max(1, c.dist / 50), 0]} renderOrder={k}>
                <meshBasicMaterial
                  map={p.tex}
                  color={tint}
                  transparent={k > 0 || terrainO < 1}
                  opacity={terrainO}
                  alphaMap={k > 0 ? featherMap() : null}
                  polygonOffset={k > 0}
                  polygonOffsetFactor={-2 * k}
                  polygonOffsetUnits={-4 * k}
                />
              </mesh>
              ) : null,
            )
          : null}
        <DrawOnce frame={f} />
      </ThreeCanvas>
      {/* sky haze toward the horizon */}
      <div style={{position: 'absolute', inset: 0, background: `linear-gradient(to bottom, ${night ? 'rgba(5,11,22,0.85)' : 'rgba(11,23,38,0.55)'} 0%, rgba(11,23,38,0) 22%)`, pointerEvents: 'none'}} />
      <svg width={W} height={Hh} style={{position: 'absolute', inset: 0}}>
        {els}
      </svg>
      {stamps}
      {/* vignette + right-edge blend into the tracker gutter */}
      <div style={{position: 'absolute', inset: 0, boxShadow: `inset 0 0 ${160 * u}px rgba(0,0,0,0.45)`, pointerEvents: 'none'}} />
      <div style={{position: 'absolute', right: 0, top: 0, bottom: 0, width: 60 * u, background: 'linear-gradient(to right, rgba(11,23,38,0), rgba(11,23,38,0.9))'}} />
      <div style={{position: 'absolute', left: 18 * u, top: 12 * u, fontFamily: fonts.body, fontSize: 15 * u, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5}}>
        {spec.globe && globeO > 0.5 ? 'NASA Blue Marble' : spec.credit || 'Imagery: Copernicus Sentinel-2 / Natural Earth · Elevation: Terrarium (SRTM et al.) · Borders: Survey of India outline'}
        {'   ·   '}
        {c.dist > 3500 ? `Eye alt ${Math.round(c.dist).toLocaleString('en-IN')} km` : `Eye alt ${eye >= 10000 ? Math.round(eye / 1000).toLocaleString('en-IN') + ' km' : Math.round(eye).toLocaleString('en-IN') + ' m'}`}
      </div>
    </div>
  );
};
