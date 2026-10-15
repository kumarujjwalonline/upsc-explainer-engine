import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {colors, fonts} from './theme';

// Production rule 31 (Oct 2026): a Short shows a new graphic every 1 to 3 seconds.
// The approved long video plays in a window (its scene area, tracker cropped off) while word-timed
// "beat" cards change underneath it; any beat longer than 3 s also gets a camera punch-in on the window.
export type Beat = [number, string, string, string];
export type ShortSpec = {id: string; hook: string; from: number; dur: number; cover?: string; beats: Beat[]; badges?: string[]};
export type ShortProps = {video: string; short: ShortSpec};

export const shortFrames = (p: ShortProps) => Math.round(p.short.dur * 30);

const I: Record<string, string> = {
  city: 'M3 21 V10 H8 V21 M8 21 V4 H15 V21 M15 21 V8 H21 V21 M2 21 H22 M10.5 7 h2 M10.5 10 h2 M10.5 13 h2 M10.5 16 h2 M5 13 h1 M17.5 11 h1.5 M17.5 14 h1.5',
  sun: 'M12 7 a5 5 0 1 0 0.01 0 M12 1 V3.5 M12 20.5 V23 M1 12 H3.5 M20.5 12 H23 M4.2 4.2 L6 6 M18 18 L19.8 19.8 M4.2 19.8 L6 18 M18 6 L19.8 4.2',
  moon: 'M20 14.5 A8.5 8.5 0 1 1 9.5 4 A7 7 0 0 0 20 14.5 Z',
  tree: 'M12 22 V14 M12 14 L8 11 M12 16 L15.5 13 M12 2 C7 2 5 6 6 9 C3.5 10.5 4.5 15 8 14.5 C9 16.5 15 16.5 16 14.5 C19.5 15 20.5 10.5 18 9 C19 6 17 2 12 2 Z',
  thermo: 'M10 4 a2 2 0 0 1 4 0 V14.5 a4 4 0 1 1 -4 0 Z M12 9 V17 M16 6 h3 M16 9 h2 M16 12 h3',
  drop: 'M12 2.5 C12 2.5 5 10.5 5 15 a7 7 0 0 0 14 0 C19 10.5 12 2.5 12 2.5 Z M9 15 a3 3 0 0 0 3 3',
  wind: 'M2 8 H14 a3 3 0 1 0 -3 -3 M2 12 H19 a3 3 0 1 1 -3 3 M2 16 H10 a2.5 2.5 0 1 1 -2.5 2.5',
  car: 'M3 16 V12 L5.5 7 H18.5 L21 12 V16 Z M3 12 H21 M7 19 a2 2 0 1 0 0.01 0 M17 19 a2 2 0 1 0 0.01 0',
  ac: 'M2 5 H22 V13 H2 Z M5 10 H19 M7 16 C7 18 5 18 5 20 M12 16 C12 18 10 18 10 20 M17 16 C17 18 15 18 15 20',
  smoke: 'M3 21 V14 L8 11 V14 L13 11 V14 L18 11 V21 Z M15 11 V5 H18 V11 M16 3 C15 1.5 17 1 16.5 0',
  road: 'M8 2 L3 22 M16 2 L21 22 M12 3 V6 M12 9.5 V13 M12 16.5 V21',
  person: 'M12 3 a3.2 3.2 0 1 0 0.01 0 M6 22 V14 C6 11 8.5 9.5 12 9.5 C15.5 9.5 18 11 18 14 V22',
  people: 'M8 4 a2.8 2.8 0 1 0 0.01 0 M2.5 21 V15 C2.5 12.5 5 11 8 11 C11 11 13.5 12.5 13.5 15 V21 M17 6 a2.4 2.4 0 1 0 0.01 0 M15.5 12 C19 11.5 21.5 13 21.5 15.5 V21',
  clock: 'M12 2 a10 10 0 1 0 0.01 0 M12 6 V12 L16 14.5',
  pin: 'M12 22 C12 22 5 14 5 9 a7 7 0 0 1 14 0 C19 14 12 22 12 22 Z M12 6.5 a2.5 2.5 0 1 0 0.01 0',
  calendar: 'M3 5 H21 V21 H3 Z M3 10 H21 M8 2 V7 M16 2 V7 M7 14 h2 M11 14 h2 M15 14 h2 M7 17.5 h2 M11 17.5 h2',
  alert: 'M12 2.5 L22 20.5 H2 Z M12 9 V14 M12 17 h0.01',
  doc: 'M5 2 H14 L19 7 V22 H5 Z M14 2 V7 H19 M8 12 H16 M8 15.5 H16 M8 19 H13',
  hospital: 'M3 22 V6 H21 V22 Z M9 22 V17 H15 V22 M12 8.5 V14 M9.25 11.25 H14.75 M1 22 H23',
  map: 'M2 5 L8 3 L16 5 L22 3 V19 L16 21 L8 19 L2 21 Z M8 3 V19 M16 5 V21',
  hill: 'M1 20 L8 8 L12 14 L15 10 L23 20 Z M6 11.5 L8 8 L10 11',
  q: 'M8.5 8.5 a3.5 3.5 0 1 1 5 3.2 C12.6 12.2 12 13 12 14.5 M12 18.5 h0.01 M12 1.5 a10.5 10.5 0 1 0 0.01 0',
  check: 'M12 1.5 a10.5 10.5 0 1 0 0.01 0 M7 12.5 L10.5 16 L17 8.5',
  fire: 'M12 22 C7 22 4.5 18.5 4.5 15 C4.5 10 9 8 9 3 C12 5 13 7.5 13 10 C14.5 9 15 7.5 15 6.5 C18 9 19.5 12 19.5 15 C19.5 18.5 17 22 12 22 Z M12 22 C10 22 9 20.5 9 19 C9 16.5 12 15 12 13 C14 15 15 16.5 15 19 C15 20.5 14 22 12 22',
  cloud: 'M7 19 H17.5 a4.5 4.5 0 0 0 0 -9 a6 6 0 0 0 -11.5 1.5 a3.8 3.8 0 0 0 1 7.5 Z M8 22 v0.01 M12 22 v0.01 M16 22 v0.01',
  up: 'M12 21 V4 M5 11 L12 4 L19 11',
  down: 'M12 3 V20 M5 13 L12 20 L19 13',
  equal: 'M4 9 H20 M4 15 H20',
  cycle: 'M20 12 a8 8 0 0 1 -14 5.3 M4 12 a8 8 0 0 1 14 -5.3 M18 2.5 V6.7 H13.8 M6 21.5 V17.3 H10.2',
  house: 'M2 11 L12 3 L22 11 M5 9 V21 H19 V9 M10 21 V15 H14 V21',
  clipboard: 'M6 4 H18 V22 H6 Z M9 2.5 H15 V5.5 H9 Z M9 10 L10.5 11.5 L13 9 M9 15 L10.5 16.5 L13 14 M14.5 11 H16 M14.5 16 H16',
};
const DIGIT: Record<string, string> = {one: '1', two: '2', three: '3', four: '4', five: '5'};

const Icon: React.FC<{name: string; size: number}> = ({name, size}) =>
  DIGIT[name] ? (
    <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: size * 0.82, lineHeight: 1, color: colors.yellow}}>{DIGIT[name]}</div>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d={I[name] || I.q} />
    </svg>
  );

const fit = (s: string, max: number, k: number) => Math.min(max, Math.max(46, k / Math.max(1, s.length)));

const BeatCard: React.FC<{b: Beat; local: number; out: number}> = ({b, local, out}) => {
  const {fps} = useVideoConfig();
  const [, icon, a, sub] = b;
  const pop = spring({frame: local, fps, config: {damping: 13, stiffness: 170}});
  const y = interpolate(pop, [0, 1], [70, 0]);
  const o = interpolate(local, [0, 5], [0, 1], {extrapolateRight: 'clamp'}) * interpolate(out, [0, 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const subO = interpolate(local, [12, 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const iconS = spring({frame: local - 2, fps, config: {damping: 9, stiffness: 160}});
  const numeric = /\d/.test(a) || a === a.toUpperCase();
  return (
    <div style={{position: 'absolute', left: 50, top: 1190, width: 980, height: 430, opacity: o, transform: `translateY(${y}px)`, display: 'flex', alignItems: 'center', gap: 40, padding: '0 44px', background: 'linear-gradient(135deg,#13243B,#0F1E33)', border: `3px solid ${colors.border}`, borderRadius: 34, boxShadow: '0 20px 60px #0008'}}>
      <div style={{flex: '0 0 210px', height: 210, borderRadius: '50%', border: `6px solid ${colors.orange}`, background: '#FF8A1F1a', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${iconS}) rotate(${interpolate(iconS, [0, 1], [-25, 0])}deg)`, boxShadow: '0 0 40px #FF8A1F55'}}>
        <Icon name={icon} size={120} />
      </div>
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: fit(a, 92, 1150), lineHeight: 1.05, color: numeric ? colors.yellow : colors.text, textTransform: 'uppercase', textShadow: '0 4px 0 #0007'}}>{a}</div>
        {sub ? <div style={{marginTop: 14, opacity: subO, fontFamily: fonts.display, fontWeight: 700, fontSize: fit(sub, 50, 1250), lineHeight: 1.15, color: colors.orange}}>{sub}</div> : null}
      </div>
    </div>
  );
};

// focus points (fractions of the window) the camera punches toward
const FOCI = [[0.5, 0.45], [0.3, 0.4], [0.7, 0.4], [0.5, 0.3], [0.35, 0.55], [0.65, 0.55]];

export const ShortBeats: React.FC<ShortProps> = ({video, short}) => {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const beats = short.beats.map((b) => ({b, at: Math.round(b[0] * 30)}));
  let k = 0;
  beats.forEach((x, i) => { if (f >= x.at) k = i; });
  const cur = beats[k];
  const next = beats[k + 1] ? beats[k + 1].at : durationInFrames;
  // camera: a new framing at every beat, plus an extra punch-in halfway through any beat longer than 3 s
  const len = next - cur.at;
  const half = len > 90 ? cur.at + Math.floor(len / 2) : Infinity;
  const shot = k * 2 + (f >= half ? 1 : 0);
  const shotStart = f >= half ? half : cur.at;
  const [fx, fy] = FOCI[shot % FOCI.length];
  const zTarget = shot % 2 === 0 ? 1.1 : 1.32;
  const zPrev = shot % 2 === 0 ? 1.32 : 1.1;
  const t = interpolate(f, [shotStart, shotStart + 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const z = (zPrev + (zTarget - zPrev) * t) * interpolate(f - shotStart, [0, 90], [1, 1.04], {extrapolateRight: 'clamp'});
  const s = 1080 / 1460;
  const W = 1080, H = 800;
  const coverO = short.cover ? interpolate(f, [14, 22], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
  const prog = f / durationInFrames;
  return (
    <AbsoluteFill style={{background: colors.bg, fontFamily: fonts.body}}>
      <AbsoluteFill style={{backgroundImage: 'linear-gradient(#ffffff08 1px, transparent 1px), linear-gradient(90deg, #ffffff08 1px, transparent 1px)', backgroundSize: '60px 60px'}} />
      <div style={{position: 'absolute', left: 50, top: 70, display: 'flex', gap: 16}}>
        {(short.badges || ['UPSC PRELIMS', 'GS-1 · GS-3']).map((t, i) => (
          <div key={i} style={{background: i === 0 ? colors.red : colors.yellow, color: i === 0 ? '#fff' : colors.bg, fontFamily: fonts.display, fontWeight: 800, fontSize: 38, padding: '4px 22px', borderRadius: 12}}>{t}</div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 50, top: 150, width: 980, height: 160, display: 'flex', alignItems: 'center', fontFamily: fonts.display, fontWeight: 800, fontSize: fit(short.hook, 64, 2300), lineHeight: 1.1, color: colors.text, textTransform: 'uppercase'}}>{short.hook}</div>
      <div style={{position: 'absolute', left: 0, top: 330, width: W, height: H, overflow: 'hidden', borderTop: `4px solid ${colors.orange}`, borderBottom: `4px solid ${colors.orange}`}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: 1920 * s, height: 1080 * s, transformOrigin: `${fx * 1460 * s}px ${fy * 1080 * s}px`, transform: `scale(${z})`}}>
          <OffthreadVideo src={staticFile(video)} startFrom={Math.round(short.from * 30)} style={{width: 1920 * s, height: 1080 * s}} />
        </div>
      </div>
      {beats.map((x, i) => {
        const end = beats[i + 1] ? beats[i + 1].at : durationInFrames;
        if (f < x.at || f >= end) return null;
        return <BeatCard key={i} b={x.b} local={f - x.at} out={end - f} />;
      })}
      <div style={{position: 'absolute', left: 50, top: 1690, width: 980, height: 12, borderRadius: 6, background: colors.border}}>
        <div style={{width: `${prog * 100}%`, height: '100%', borderRadius: 6, background: colors.orange}} />
      </div>
      <div style={{position: 'absolute', left: 50, top: 1730, width: 980, display: 'flex', justifyContent: 'space-between', fontFamily: fonts.display, fontWeight: 700, fontSize: 34, color: colors.sub}}>
        <span>Ujjwal · <span style={{color: colors.yellow}}>UPSC EXPLAINERS</span></span>
        <span>Full video on the channel</span>
      </div>
      {coverO > 0 ? <Img src={staticFile(short.cover!)} style={{position: 'absolute', inset: 0, width: 1080, height: 1920, opacity: coverO}} /> : null}
    </AbsoluteFill>
  );
};
