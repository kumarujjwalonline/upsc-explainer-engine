import React from 'react';
import {Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {colors, fonts, toneColor} from '../theme';
import type {Tone} from '../types';

// Cinematic hook: full-bleed shots (real footage or photos with a slow camera move) cut together with
// crossfades, a dark film grade, letterbox, grain, optional rain and lightning, and big stamped numbers.
// Footage shots carry a `query` and are fetched on GitHub by scripts/fetch_footage.py (Commons first);
// a shot whose clip or photo is missing falls back to a dark storm plate so the hook never shows a hole.
export type MontageShot = {
  t0: number;
  src?: string;
  video?: boolean;
  query?: string;
  move?: 'in' | 'out' | 'left' | 'right' | 'up';
  focus?: [number, number];
  credit?: string;
};
export type MontageStamp = {text: string; sub?: string; t0: number; out?: number; tone?: Tone; y?: number};
export type MontageSpec = {
  shots: MontageShot[];
  stamps?: MontageStamp[];
  kicker?: {text: string; t0?: number; out?: number};
  flashes?: number[];
  rain?: number;
  grade?: 'storm' | 'night' | 'warm';
};

const XF = 0.6; // crossfade between shots, seconds

const GRADE = {
  storm: {filter: 'contrast(1.15) saturate(0.7) brightness(0.78)', tint: 'rgba(14,38,62,0.38)'},
  night: {filter: 'contrast(1.2) saturate(0.55) brightness(0.62)', tint: 'rgba(8,20,48,0.5)'},
  warm: {filter: 'contrast(1.1) saturate(0.85) brightness(0.85)', tint: 'rgba(60,32,10,0.25)'},
};

const Shot: React.FC<{s: MontageShot; from: number; len: number; grade: keyof typeof GRADE}> = ({s, from, len, grade}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (f - from) / fps;
  const o = interpolate(t, [0, XF, len, len + XF], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (o <= 0) return null;
  const k = interpolate(t, [0, len + XF], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const mv = s.move ?? 'in';
  const zoom = mv === 'out' ? 1.24 - 0.14 * k : mv === 'in' ? 1.08 + 0.16 * k : 1.16;
  const dx = mv === 'left' ? 4 - 8 * k : mv === 'right' ? -4 + 8 * k : 0;
  const dy = mv === 'up' ? 3 - 6 * k : 0;
  const focus = s.focus ?? [0.5, 0.45];
  const style: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: `${focus[0] * 100}% ${focus[1] * 100}%`,
    transform: `scale(${zoom}) translate(${dx}%, ${dy}%)`,
    transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`,
    filter: GRADE[grade].filter,
  };
  let body: React.ReactNode;
  if (!s.src) {
    body = <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 30%, #23364F 0%, #0A1422 60%, #04080F 100%)', transform: `scale(${zoom})`}} />;
  } else if (s.video) {
    body = (
      <Sequence from={from} layout="none">
        <OffthreadVideo src={staticFile(s.src)} muted style={style} />
      </Sequence>
    );
  } else {
    body = <Img src={/^https?:/.test(s.src) ? s.src : staticFile(s.src)} style={style} />;
  }
  return <div style={{position: 'absolute', inset: 0, opacity: o}}>{body}</div>;
};

export const Montage: React.FC<{spec: MontageSpec; box: {x: number; y: number; w: number; h: number}}> = ({spec, box}) => {
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const t = f / fps;
  const W = box.w;
  const H = box.h;
  const u = Math.min(W / 1480, H / 1080) * (W < H ? 1.4 : 1);
  const grade = spec.grade ?? 'storm';
  const shots = spec.shots;
  const total = durationInFrames / fps;

  // lightning: a bright double flicker at each time
  const flash = (spec.flashes ?? []).reduce((m, ft) => {
    const d = t - ft;
    if (d < 0 || d > 0.5) return m;
    const v = d < 0.06 ? 0.85 : d < 0.12 ? 0.15 : d < 0.18 ? 0.55 : Math.max(0, 0.55 * (1 - (d - 0.18) / 0.32));
    return Math.max(m, v);
  }, 0);

  // rain: three layers of diagonal streaks drifting down at different speeds
  const rain = spec.rain ?? 0;
  const rainLayers = rain
    ? [0, 1, 2].map((i) => {
        const sp = [2400, 1700, 1100][i];
        const len = [70, 46, 28][i] * u;
        const op = [0.32, 0.22, 0.14][i] * rain;
        const off = (t * sp * u) % (H * 0.5);
        const n = 70 - i * 12;
        const lines = Array.from({length: n}, (_, j) => {
          const x = ((j * 9301 + i * 4973) % 1000) / 1000;
          const y = ((j * 6151 + i * 1879) % 1000) / 1000;
          return {x: x * (W + 200) - 100, y: y * H * 1.5 - H * 0.5};
        });
        return (
          <svg key={i} width={W} height={H} style={{position: 'absolute', inset: 0, opacity: op}}>
            {lines.map((p, j) => {
              const y = ((p.y + off) % (H * 1.5)) - H * 0.25;
              return <line key={j} x1={p.x} y1={y} x2={p.x - len * 0.25} y2={y + len} stroke="#DCE8F5" strokeWidth={(1.4 - i * 0.3) * u} strokeLinecap="round" />;
            })}
          </svg>
        );
      })
    : null;

  const bar = interpolate(f, [0, 14], [0, 64 * u], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const fadeIn = interpolate(f, [0, 8], [0, 1], {extrapolateRight: 'clamp'});
  const fadeOut = interpolate(f, [durationInFrames - 6, durationInFrames], [1, 0.2], {extrapolateLeft: 'clamp'});
  const seed = f % 8;

  const cur = shots.reduce((c, s, i) => (t >= s.t0 ? i : c), 0);
  const credit = shots[cur]?.src ? shots[cur].credit : undefined;

  const k = spec.kicker;
  const kChars = k ? Math.floor(interpolate(t, [k.t0 ?? 0.3, (k.t0 ?? 0.3) + k.text.length * 0.045], [0, k.text.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})) : 0;
  const kOut = k?.out != null ? interpolate(t, [k.out, k.out + 0.4], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;

  return (
    <div style={{position: 'absolute', left: box.x, top: box.y, width: W, height: H, overflow: 'hidden', background: '#04080F', opacity: fadeIn * fadeOut}}>
      {shots.map((s, i) => {
        const next = i + 1 < shots.length ? shots[i + 1].t0 : total + 1;
        return <Shot key={i} s={s} from={Math.round(s.t0 * fps)} len={next - s.t0} grade={grade} />;
      })}
      <div style={{position: 'absolute', inset: 0, background: GRADE[grade].tint, mixBlendMode: 'multiply'}} />
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.72) 100%)'}} />
      {rainLayers}
      <div style={{position: 'absolute', inset: 0, background: '#EAF2FF', opacity: flash, mixBlendMode: 'screen'}} />
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: 0.09, mixBlendMode: 'overlay'}}>
        <filter id={`grain${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain${seed})`} />
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: bar, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: bar, background: '#000'}} />
      {k ? (
        <div style={{position: 'absolute', left: 48 * u, top: 64 * u + 26 * u, opacity: kOut, fontFamily: fonts.display, fontWeight: 700, fontSize: 30 * u, letterSpacing: 6 * u, color: '#FFFFFF', textShadow: '0 2px 14px rgba(0,0,0,0.9)'}}>
          {k.text.slice(0, kChars)}
          <span style={{opacity: f % 16 < 8 && kChars < k.text.length + 1 ? 1 : 0, color: colors.orange}}>▍</span>
        </div>
      ) : null}
      {(spec.stamps ?? []).map((s, i) => {
        if (t < s.t0) return null;
        const e = spring({frame: f - s.t0 * fps, fps, config: {damping: 10, mass: 0.8}});
        const out = s.out != null ? interpolate(t, [s.out, s.out + 0.35], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
        if (out <= 0) return null;
        const C = toneColor(s.tone ?? 'warn');
        const big = s.text.length <= 7;
        return (
          <div key={i} style={{position: 'absolute', left: 0, right: 0, top: (s.y ?? 0.36) * H, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: out * Math.min(1, e * 1.4), transform: `scale(${1.5 - 0.5 * Math.min(1, e)})`}}>
            <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: (big ? 150 : 78) * u, lineHeight: 1, color: C, letterSpacing: 2 * u, textShadow: `0 0 ${40 * u}px rgba(0,0,0,0.85), 0 4px 18px rgba(0,0,0,0.9)`}}>{s.text}</div>
            {s.sub ? (
              <div style={{marginTop: 16 * u, fontFamily: fonts.display, fontWeight: 700, fontSize: 32 * u, letterSpacing: 3 * u, textTransform: 'uppercase', color: '#FFFFFF', textShadow: '0 2px 12px rgba(0,0,0,0.95)'}}>{s.sub}</div>
            ) : null}
          </div>
        );
      })}
      {credit ? <div style={{position: 'absolute', right: 24 * u, bottom: 64 * u + 10 * u, fontFamily: fonts.body, fontSize: 15 * u, color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 6px rgba(0,0,0,0.9)'}}>{credit}</div> : null}
    </div>
  );
};
