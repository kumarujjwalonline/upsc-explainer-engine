import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts} from '../theme';
import {Region} from '../components/Box';

// Science scenes for the heat videos (production rule 17): 2.5D motion graphics drawn as SVG
// in a cabinet (oblique) projection, so they read as 3D blocks but render as fast as a slide.
// Every mode is timed in fractions of the scene, so it follows the narration it sits under.

export type HeatLabSpec = {
  mode: 'gapbars' | 'waste' | 'profile' | 'daynight' | 'albedo' | 'evapo' | 'canyon' | 'haze' | 'dryhumid' | 'sweat' | 'wetbulb' | 'wetgap' | 'body' | 'thermo' | 'redesign';
  variant?: string; // daynight: 'sunset' | 'cycle'; redesign: 'intro' | 'roofs' | 'green'
  thermo?: {min: number; max: number; from: number; to: number; unit?: string; marks: {v: number; label: string; tone?: 'warn' | 'bad' | 'muted'}[]; bands?: {from: number; to: number; label: string; tone: 'warn' | 'bad'}[]; heading?: string};
  labels?: Record<string, string>;
};

const W = 1390;
const H = 940;
const cl = (v: number) => Math.max(0, Math.min(1, v));
const ramp = (p: number, a: number, b: number) => cl((p - a) / (b - a));
const sm = (v: number) => v * v * (3 - 2 * v);
const rnd = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
};
const mix = (a: string, b: string, k: number) => {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((na >> s) & 255) * (1 - k) + ((nb >> s) & 255) * k);
  return '#' + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('');
};

// cabinet projection: x right, y back (up-right on screen), z up
type Proj = {ox: number; oy: number; s: number};
const P = (pr: Proj, x: number, y: number, z: number): [number, number] => [pr.ox + (x + y * 0.5) * pr.s, pr.oy - (z + y * 0.34) * pr.s];
const pts = (a: [number, number][]) => a.map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' ');

const Box: React.FC<{pr: Proj; x: number; y: number; z?: number; w: number; d: number; h: number; c: string; top?: string; op?: number; stroke?: string}> = ({pr, x, y, z = 0, w, d, h, c, top, op = 1, stroke}) => {
  const p = (a: number, b: number, cz: number) => P(pr, a, b, cz);
  const z1 = z + Math.max(0.001, h);
  return (
    <g opacity={op}>
      <polygon points={pts([p(x + w, y, z), p(x + w, y + d, z), p(x + w, y + d, z1), p(x + w, y, z1)])} fill={shade(c, 0.72)} stroke={stroke} strokeWidth={stroke ? 1 : 0} />
      <polygon points={pts([p(x, y, z), p(x + w, y, z), p(x + w, y, z1), p(x, y, z1)])} fill={c} stroke={stroke} strokeWidth={stroke ? 1 : 0} />
      <polygon points={pts([p(x, y, z1), p(x + w, y, z1), p(x + w, y + d, z1), p(x, y + d, z1)])} fill={top || shade(c, 1.18)} stroke={stroke} strokeWidth={stroke ? 1 : 0} />
    </g>
  );
};

const Tree: React.FC<{pr: Proj; x: number; y: number; z?: number; r?: number; k?: number; c?: string}> = ({pr, x, y, z = 0, r = 0.7, k = 1, c = '#3E8E4A'}) => {
  if (k <= 0.001) return null;
  const [bx, by] = P(pr, x, y, z);
  const [, ty] = P(pr, x, y, z + 1.3 * k);
  return (
    <g>
      <rect x={bx - 0.08 * pr.s} y={ty} width={0.16 * pr.s} height={by - ty} fill="#6B4A2E" />
      <circle cx={bx} cy={ty - r * 0.45 * pr.s * k} r={r * pr.s * k} fill={c} />
      <circle cx={bx - r * 0.35 * pr.s * k} cy={ty - r * 0.65 * pr.s * k} r={r * 0.55 * pr.s * k} fill={shade(c, 1.2)} />
    </g>
  );
};

const Label: React.FC<{x: number; y: number; text: string; o?: number; size?: number; color?: string; anchor?: 'start' | 'middle' | 'end'; weight?: number; bg?: boolean}> = ({x, y, text, o = 1, size = 30, color = colors.text, anchor = 'middle', weight = 700, bg}) => {
  if (o <= 0.001) return null;
  const wpx = text.length * size * 0.56 + 28;
  const bx = anchor === 'middle' ? x - wpx / 2 : anchor === 'end' ? x - wpx : x - 14;
  return (
    <g opacity={o}>
      {bg ? <rect x={bx} y={y - size * 0.95} width={wpx} height={size * 1.45} rx={10} fill="rgba(11,23,38,0.82)" stroke={colors.border} strokeWidth={2} /> : null}
      <text x={x} y={y} textAnchor={anchor} fontFamily={fonts.display} fontWeight={weight} fontSize={size} fill={color}>
        {text}
      </text>
    </g>
  );
};

const Stamp: React.FC<{x: number; y: number; text: string; k: number; color?: string; size?: number}> = ({x, y, text, k, color = colors.red, size = 46}) => {
  if (k <= 0.001) return null;
  const s = 1.6 - 0.6 * sm(k);
  const wpx = text.length * size * 0.62 + 40;
  return (
    <g transform={`translate(${x},${y}) rotate(-8) scale(${s})`} opacity={cl(k * 1.5)}>
      <rect x={-wpx / 2} y={-size * 0.95} width={wpx} height={size * 1.5} rx={8} fill="rgba(11,23,38,0.6)" stroke={color} strokeWidth={5} />
      <text x={0} y={size * 0.2} textAnchor="middle" fontFamily={fonts.display} fontWeight={800} fontSize={size} fill={color} letterSpacing={2}>
        {text}
      </text>
    </g>
  );
};

const Sun: React.FC<{x: number; y: number; r?: number; o?: number; t: number}> = ({x, y, r = 46, o = 1, t}) => (
  <g opacity={o}>
    <circle cx={x} cy={y} r={r * 2.2} fill="url(#hlSunGlow)" />
    {Array.from({length: 12}, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + t * 0.2;
      return <line key={i} x1={x + Math.cos(a) * r * 1.25} y1={y + Math.sin(a) * r * 1.25} x2={x + Math.cos(a) * r * 1.6} y2={y + Math.sin(a) * r * 1.6} stroke={colors.yellow} strokeWidth={5} strokeLinecap="round" />;
    })}
    <circle cx={x} cy={y} r={r} fill="#FFD25A" />
  </g>
);
const Moon: React.FC<{x: number; y: number; o: number}> = ({x, y, o}) => (
  <g opacity={o}>
    <circle cx={x} cy={y} r={34} fill="#E9EEF7" />
    <circle cx={x + 14} cy={y - 8} r={30} fill="#0B1726" />
  </g>
);

// arrow along a polyline, revealed by k (0..1)
const Arrow: React.FC<{d: string; len: number; k: number; color: string; w?: number; o?: number; head?: boolean}> = ({d, len, k, color, w = 6, o = 1, head = true}) => {
  if (k <= 0.001 || o <= 0.001) return null;
  const id = color.replace(/[^a-z0-9]/gi, '');
  return (
    <g opacity={o}>
      <defs>
        <marker id={`hlA${id}`} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={color} />
        </marker>
      </defs>
      <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${len * k} ${len}`} markerEnd={head && k > 0.97 ? `url(#hlA${id})` : undefined} />
    </g>
  );
};
const wavy = (x: number, y0: number, y1: number, amp = 9, waves = 3, ph = 0) => {
  const n = 24;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const q = i / n;
    const y = y0 + (y1 - y0) * q;
    const xx = x + Math.sin(q * waves * Math.PI * 2 + ph) * amp;
    d += (i ? 'L' : 'M') + xx.toFixed(1) + ',' + y.toFixed(1);
  }
  return d;
};

const Defs: React.FC = () => (
  <defs>
    <radialGradient id="hlSunGlow">
      <stop offset="0%" stopColor="#FFD25A" stopOpacity={0.55} />
      <stop offset="100%" stopColor="#FFD25A" stopOpacity={0} />
    </radialGradient>
    <radialGradient id="hlHeat" cx="50%" cy="100%" r="80%">
      <stop offset="0%" stopColor={colors.red} stopOpacity={0.55} />
      <stop offset="60%" stopColor={colors.orange} stopOpacity={0.25} />
      <stop offset="100%" stopColor={colors.orange} stopOpacity={0} />
    </radialGradient>
    <linearGradient id="hlCurve" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={colors.orange} stopOpacity={0.45} />
      <stop offset="100%" stopColor={colors.orange} stopOpacity={0} />
    </linearGradient>
  </defs>
);

const useT = () => {
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const t = f / fps;
  const D = durationInFrames / fps;
  return {t, D, p: t / D};
};

// a little city: rows of towers on a slab
const CITY = [
  [0.4, 0.4, 1.2, 1.2, 3.2], [2.0, 0.3, 1.0, 1.1, 4.6], [3.4, 0.5, 1.3, 1.0, 2.6], [5.0, 0.3, 1.0, 1.2, 5.4], [6.4, 0.4, 1.2, 1.1, 3.6],
  [0.6, 2.2, 1.1, 1.1, 2.4], [2.2, 2.1, 1.2, 1.2, 3.0], [3.8, 2.3, 1.0, 1.0, 4.2], [5.2, 2.1, 1.2, 1.2, 2.8], [6.7, 2.2, 1.0, 1.0, 3.3],
];
const City: React.FC<{pr: Proj; x0: number; k?: number; roof?: (i: number) => string; wall?: string; night?: number; scale?: number}> = ({pr, x0, k = 1, roof, wall = '#7D8CA3', night = 0, scale = 1}) => {
  const order = CITY.map((b, i) => ({b, i})).sort((a, c) => c.b[1] - a.b[1] || a.b[0] - c.b[0]);
  return (
    <g>
      {order.map(({b, i}) => {
        const kk = sm(cl(k * 1.6 - i * 0.06));
        const wc = mix(wall, '#2A3550', night * 0.6);
        return <Box key={i} pr={pr} x={x0 + b[0] * scale} y={b[1]} w={b[2] * scale} d={b[3]} h={b[4] * kk} c={wc} top={roof ? roof(i) : shade(wc, 1.15)} op={kk > 0 ? 1 : 0} />;
      })}
    </g>
  );
};

// ---------------- modes ----------------

const GapBars: React.FC<{p: number; t: number; L: Record<string, string>}> = ({p, L}) => {
  const base = 700;
  const unit = 52; // px per °C above a common baseline
  const group = (x0: number, k0: number, title: string, lo: number, hi: number, sky: string, sub: string) => {
    const k = sm(ramp(p, k0, k0 + 0.12));
    const r = sm(ramp(p, k0 + 0.12, k0 + 0.3));
    const ruralH = 190 * k;
    const cityLo = ruralH + lo * unit * r;
    const cityHi = ruralH + hi * unit * r;
    return (
      <g opacity={k}>
        <rect x={x0} y={90} width={560} height={660} rx={24} fill={sky} stroke={colors.border} strokeWidth={2} />
        <Label x={x0 + 280} y={150} text={title} size={40} weight={800} />
        <rect x={x0 + 80} y={base - ruralH} width={150} height={ruralH} rx={12} fill={colors.green} />
        <Label x={x0 + 155} y={base + 40} text={L.rural || 'Countryside'} size={26} />
        <rect x={x0 + 330} y={base - cityLo} width={150} height={cityLo} rx={12} fill={colors.orange} />
        <rect x={x0 + 330} y={base - cityHi} width={150} height={cityHi - cityLo} rx={12} fill={colors.red} opacity={0.55} />
        <line x1={x0 + 80} x2={x0 + 480} y1={base - ruralH} y2={base - ruralH} stroke="#FFFFFF" strokeWidth={3} strokeDasharray="10 8" opacity={r} />
        <Label x={x0 + 405} y={base + 40} text={L.city || 'City'} size={26} />
        <Label x={x0 + 405} y={base - cityHi - 22} text={sub} size={30} color={colors.yellow} weight={800} o={ramp(p, k0 + 0.25, k0 + 0.32)} />
      </g>
    );
  };
  return (
    <g>
      {group(70, 0.05, L.day || 'Daytime', 0.5, 4, '#2A3A52', '+0.5 to 4°C')}
      {group(760, 0.45, L.night || 'Night-time', 1, 3, '#111C33', '+1 to 3°C')}
      <Label x={W / 2} y={60} text={L.src || 'Source: US EPA (1–7°F by day, 2–5°F at night)'} size={22} color={colors.sub} weight={600} o={ramp(p, 0.1, 0.2)} />
    </g>
  );
};

const Waste: React.FC<{p: number; t: number; L: Record<string, string>}> = ({p, t, L}) => {
  const pr = {ox: 70, oy: 700, s: 54};
  const cyc = ramp(p, 0.3, 0.4);
  const step = p < 0.45 ? -1 : Math.floor(((p - 0.45) / 0.5) * 3) % 3;
  const acK = sm(ramp(p, 0.08, 0.2)) * (0.6 + 0.4 * ramp(p, 0.55, 0.8));
  const cars = Array.from({length: 6}, (_, i) => ((t * 0.9 + i / 6) % 1) * 12 - 1.5);
  const cx = 1010;
  const cy = 330;
  const R = 150;
  const labels = [L.a || 'Hotter city', L.b || 'More ACs', L.c || 'More waste heat'];
  return (
    <g>
      <Box pr={pr} x={-0.5} y={-1.6} w={12} d={6} h={0.3} c="#4A5262" top="#5C6474" />
      <Box pr={pr} x={-0.5} y={-1.6} z={0.3} w={12} d={1.2} h={0.02} c="#2B3036" top="#2B3036" />
      {cars.map((x, i) => (
        <g key={i}>
          <Box pr={pr} x={x} y={-1.3 + (i % 2) * 0.55} z={0.32} w={0.8} d={0.4} h={0.32} c={['#C0392B', '#2E86C1', '#F4D03F', '#ECF0F1', '#27AE60', '#8E44AD'][i]} />
          <circle cx={P(pr, x - 0.1, -1.1 + (i % 2) * 0.55, 0.4)[0]} cy={P(pr, x - 0.1, -1.1 + (i % 2) * 0.55, 0.4)[1]} r={10 + 6 * ((t * 2 + i) % 1)} fill={colors.red} opacity={0.35 * (1 - ((t * 2 + i) % 1)) * sm(ramp(p, 0.05, 0.15))} />
        </g>
      ))}
      <g transform={`translate(0,${-0.3 * pr.s})`}>
        <City pr={pr} x0={0.5} />
      </g>
      {CITY.slice(0, 5).map((b, i) => {
        const [x, y] = P(pr, 0.5 + b[0] + b[2], b[1] + 0.2, 0.3 + b[4] * 0.55);
        return (
          <g key={i} opacity={acK}>
            <rect x={x - 4} y={y - 18 - 16} width={34} height={22} fill="#D5DBE3" stroke="#7D8CA3" strokeWidth={2} />
            {[0, 1].map((q) => (
              <path key={q} d={wavy(x + 40 + q * 18, y - 20, y - 90 - 40 * ((t + i * 0.2) % 1), 6, 1.2, t * 4 + i + q)} stroke={colors.red} strokeWidth={5} fill="none" opacity={0.9 - 0.3 * q} />
            ))}
          </g>
        );
      })}
      <g opacity={cyc}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={colors.border} strokeWidth={8} />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={colors.orange} strokeWidth={8} strokeDasharray={`${2 * Math.PI * R * 0.25} ${2 * Math.PI * R}`} transform={`rotate(${t * 70} ${cx} ${cy})`} />
        {labels.map((l, i) => {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
          const on = step === i;
          return (
            <g key={i}>
              <circle cx={cx + Math.cos(a) * R} cy={cy + Math.sin(a) * R} r={on ? 20 : 13} fill={on ? colors.orange : colors.panel} stroke={colors.orange} strokeWidth={4} />
              <Label x={cx + Math.cos(a) * R} y={cy + Math.sin(a) * R + (i === 0 ? -36 : 62)} text={l} size={on ? 30 : 26} color={on ? colors.orange : colors.text} bg />
            </g>
          );
        })}
        <Label x={cx} y={cy + 10} text={L.center || 'Vicious cycle'} size={30} color={colors.yellow} weight={800} />
      </g>
    </g>
  );
};


const Profile: React.FC<{p: number; t: number; L: Record<string, string>}> = ({p, L}) => {
  const pr = {ox: 110, oy: 640, s: 44};
  const zones = [
    {name: L.z0 || 'Rural', c: '#6FA34B'},
    {name: L.z1 || 'Suburb', c: '#A3A57A'},
    {name: L.z2 || 'Downtown', c: '#8B93A1'},
    {name: L.z3 || 'Park', c: '#3F8A46'},
    {name: L.z4 || 'Rural', c: '#6FA34B'},
  ];
  const temps = [0.15, 0.45, 1, 0.38, 0.15];
  const curveK = sm(ramp(p, 0.42, 0.8));
  const xs = zones.map((_, i) => P(pr, i * 5 + 2.5, 2, 0)[0]);
  const ys = temps.map((v) => 300 - v * 190);
  let d = `M${P(pr, 0, 2, 0)[0]},${ys[0]}`;
  const all = [[P(pr, 0, 2, 0)[0], ys[0]], ...xs.map((x, i) => [x, ys[i]]), [P(pr, 25, 2, 0)[0], ys[4]]];
  for (let i = 1; i < all.length; i++) {
    const [x0, y0] = all[i - 1];
    const [x1, y1] = all[i];
    const mx = (x0 + x1) / 2;
    d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
  }
  const x0 = all[0][0];
  const x1 = all[all.length - 1][0];
  return (
    <g>
      {zones.map((z, i) => {
        const k = sm(ramp(p, 0.04 + i * 0.07, 0.14 + i * 0.07));
        const bx = i * 5;
        return (
          <g key={i} opacity={k}>
            <Box pr={pr} x={bx} y={0} w={5} d={4} h={0.35} c={shade(z.c, 0.8)} top={z.c} />
            {i === 1 ? [0.5, 2.2, 3.6].flatMap((xx, j) => [<Box key={'a' + j} pr={pr} x={bx + xx} y={2.3} z={0.35} w={0.9} d={0.9} h={0.9 * k} c="#D9C7A4" top="#B5543C" />, <Box key={'b' + j} pr={pr} x={bx + xx + 0.3} y={0.5} z={0.35} w={0.9} d={0.9} h={0.8 * k} c="#D9C7A4" top="#B5543C" />]) : null}
            {i === 2
              ? [[0.3, 2.3, 4.2], [1.8, 2.4, 5.6], [3.4, 2.2, 3.8], [0.6, 0.4, 3.4], [2.1, 0.5, 4.8], [3.6, 0.4, 3.0]].map(([xx, yy, hh], j) => <Box key={j} pr={pr} x={bx + xx} y={yy} z={0.35} w={1.1} d={1.2} h={hh * k} c="#7D8CA3" top="#A9B4C6" />)
              : null}
            {i === 3 ? (
              <g>
                <Box pr={pr} x={bx + 1.2} y={1.2} z={0.36} w={2.4} d={1.4} h={0.02} c="#3C7BB8" top="#4F93D2" />
                {[[0.6, 3.2], [2.4, 3.4], [4.2, 3.1], [0.7, 0.6], [4.3, 0.7], [2.5, 0.4]].map(([xx, yy], j) => <Tree key={j} pr={pr} x={bx + xx} y={yy} z={0.35} k={k} r={0.55} />)}
              </g>
            ) : null}
            {i === 0 || i === 4
              ? Array.from({length: 7}, (_, j) => {
                  const a = P(pr, bx + 0.3, 0.4 + j * 0.5, 0.36);
                  const b = P(pr, bx + 4.7, 0.4 + j * 0.5, 0.36);
                  return <line key={j} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#4F7F35" strokeWidth={3} />;
                })
              : null}
            <Label x={P(pr, bx + 2.5, 0, 0)[0]} y={P(pr, 0, 0, 0)[1] + 52} text={z.name} size={28} o={k} />
          </g>
        );
      })}
      <g opacity={curveK > 0 ? 1 : 0}>
        <clipPath id="hlProfClip">
          <rect x={x0} y={0} width={(x1 - x0) * curveK} height={H} />
        </clipPath>
        <path d={`${d} L${x1},330 L${x0},330 Z`} fill="url(#hlCurve)" clipPath="url(#hlProfClip)" />
        <path d={d} fill="none" stroke={colors.orange} strokeWidth={7} strokeLinecap="round" clipPath="url(#hlProfClip)" />
        <Label x={x0} y={90} anchor="start" text={L.curve || 'Temperature'} size={30} color={colors.orange} o={curveK} />
        <Label x={xs[2]} y={ys[2] - 26} text={L.peak || 'Warmest'} size={28} color={colors.red} o={ramp(p, 0.62, 0.7)} bg />
        <Label x={xs[3]} y={ys[3] - 26} text={L.dip || 'Cooler'} size={26} color={colors.green} o={ramp(p, 0.72, 0.8)} bg />
      </g>
    </g>
  );
};

const DayNight: React.FC<{p: number; t: number; variant?: string; L: Record<string, string>}> = ({p, t, variant, L}) => {
  const pr = {ox: 130, oy: 720, s: 56};
  const sunset = variant === 'sunset';
  const nightK = sunset ? sm(ramp(p, 0.2, 0.85)) : sm(ramp(p, 0.4, 0.55));
  const sky = mix(mix('#5FA8E8', '#F08A4B', sm(cl(nightK * 2))), '#0B1A33', sm(cl(nightK * 2 - 1)));
  const absorbK = sunset ? 0 : ramp(p, 0.06, 0.38) * (1 - ramp(p, 0.42, 0.5));
  const releaseK = sunset ? ramp(p, 0.75, 0.95) : ramp(p, 0.55, 0.62);
  const countryCool = sunset ? sm(ramp(p, 0.6, 0.95)) : sm(ramp(p, 0.55, 0.85));
  const field = mix('#6FA34B', '#3B6A9A', countryCool);
  const cityWarm = mix('#9AA6B8', '#C9744A', sm(ramp(p, sunset ? 0.6 : 0.3, sunset ? 0.95 : 0.6)) * 0.55);
  const roofs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => P(pr, 6 + CITY[i][0] + CITY[i][2] / 2, CITY[i][1] + CITY[i][3] / 2, CITY[i][4]));
  return (
    <g>
      <rect x={0} y={0} width={W} height={H} fill={sky} opacity={0.9} />
      <Sun x={sunset ? interpolate(p, [0, 0.6], [300, 140], {extrapolateRight: 'clamp'}) : 230} y={sunset ? interpolate(p, [0, 0.6], [150, 520], {extrapolateRight: 'clamp'}) : interpolate(nightK, [0, 1], [150, 600])} o={1 - sm(ramp(nightK, 0.5, 0.8))} t={t} />
      <Moon x={1180} y={130} o={sm(ramp(nightK, 0.65, 1))} />
      {nightK > 0.6
        ? Array.from({length: 40}, (_, i) => <circle key={i} cx={rnd(i) * W} cy={rnd(i + 99) * 330} r={1.5 + rnd(i + 7) * 1.5} fill="#FFFFFF" opacity={(nightK - 0.6) * 2 * (0.4 + 0.6 * rnd(i + 3))} />)
        : null}
      <Box pr={pr} x={0} y={0} w={6} d={4.5} h={0.4} c={shade(field, 0.8)} top={field} />
      <Box pr={pr} x={6} y={0} w={8} d={4.5} h={0.4} c="#5E6878" top="#8C95A3" />
      <Box pr={pr} x={14} y={0} w={6} d={4.5} h={0.4} c={shade(field, 0.8)} top={field} />
      {[[1.2, 3.3], [3.5, 3.6], [4.6, 1.2], [1.5, 0.9], [15.4, 3.3], [17.8, 3.4], [18.6, 1.1], [15.8, 0.8]].map(([x, y], i) => <Tree key={i} pr={pr} x={x} y={y} z={0.4} r={0.5} c={mix('#3E8E4A', '#2C5A7A', countryCool)} />)}
      <g transform={`translate(0,${-0.4 * pr.s})`}>
        <City pr={pr} x0={6} wall={cityWarm} night={nightK} />
      </g>
      {/* day: sunlight soaks in */}
      {absorbK > 0
        ? roofs.slice(0, 8).map(([x, y], i) => {
            const ph = (t * 0.9 + i * 0.13) % 1;
            const y0 = y - 260;
            return (
              <g key={i} opacity={absorbK}>
                <line x1={x - 40} y1={y0 + ph * 200} x2={x - 40 + 30} y2={y0 + ph * 200 + 60} stroke={colors.yellow} strokeWidth={6} strokeLinecap="round" opacity={1 - ph} />
                <circle cx={x} cy={y - 22.4} r={10 + 6 * Math.sin(t * 4 + i)} fill={colors.orange} opacity={0.5} />
              </g>
            );
          })
        : null}
      {/* night: stored heat leaks out */}
      {releaseK > 0
        ? roofs.map(([x, y], i) => {
            const ph = (t * 0.55 + rnd(i) * 1) % 1;
            return <path key={i} d={wavy(x, y - 30 - ph * 160, y - 110 - ph * 160, 8, 1.5, t * 3 + i)} stroke={colors.red} strokeWidth={6} fill="none" strokeLinecap="round" opacity={releaseK * (1 - ph) * 0.95} />;
          })
        : null}
      {releaseK > 0 ? <ellipse cx={P(pr, 10, 2.2, 0)[0]} cy={P(pr, 10, 2.2, 2)[1]} rx={330} ry={230} fill="url(#hlHeat)" opacity={releaseK * 0.9} /> : null}
      {!sunset ? <Label x={P(pr, 10, 0, 0)[0]} y={775} text={L.day || 'Day: roads, roofs and walls absorb heat'} size={32} o={ramp(p, 0.06, 0.12) * (1 - ramp(p, 0.4, 0.46))} color={colors.yellow} bg /> : null}
      {!sunset ? <Label x={P(pr, 10, 0, 0)[0]} y={775} text={L.night || 'Night: the stored heat comes back out'} size={32} o={ramp(p, 0.56, 0.62)} color={colors.orange} bg /> : null}
      <Label x={P(pr, 3, 0, 0)[0]} y={P(pr, 0, 0, 0)[1] + 40} text={L.rural || 'Countryside'} size={26} o={1} color={countryCool > 0.5 ? '#9CC8F0' : colors.text} />
      <Label x={P(pr, 17, 0, 0)[0]} y={P(pr, 0, 0, 0)[1] + 40} text={L.rural || 'Countryside'} size={26} o={1} color={countryCool > 0.5 ? '#9CC8F0' : colors.text} />
      <Label x={P(pr, 10, 0, 0)[0]} y={P(pr, 0, 0, 0)[1] + 40} text={L.city || 'City'} size={26} o={1} color={releaseK > 0.3 ? colors.orange : colors.text} />
      {!sunset ? <Label x={P(pr, 17.5, 4.5, 0)[0]} y={P(pr, 17.5, 4.5, 3)[1]} text={L.cool || 'cools fast'} size={26} color="#9CC8F0" o={ramp(p, 0.7, 0.78)} bg /> : null}
    </g>
  );
};

const Albedo: React.FC<{p: number; t: number; L: Record<string, string>}> = ({p, t, L}) => {
  const pr = {ox: 120, oy: 640, s: 50};
  const sx = 695;
  const sy = 120;
  const leftK = sm(ramp(p, 0.04, 0.14));
  const raysK = ramp(p, 0.15, 0.35);
  const meterK = sm(ramp(p, 0.45, 0.75));
  const rightK = sm(ramp(p, 0.1, 0.2));
  const asphalt = P(pr, 4.5, 1.5, 0.3);
  const roof = P(pr, 17, 1.5, 2.6);
  const heat = 0.5 + 0.5 * Math.sin(t * 5);
  const beams = (tx: number, ty: number, n: number, back: number, k: number, key: string) =>
    Array.from({length: n}, (_, i) => {
      const off = (i - (n - 1) / 2) * 34;
      const d1 = `M${sx + off * 0.4},${sy + 50} L${tx + off},${ty}`;
      const l1 = Math.hypot(tx + off - sx, ty - sy);
      const show = i < back;
      const d2 = `M${tx + off},${ty} L${tx + off + (tx < sx ? -170 : 170)},${ty - 330}`;
      return (
        <g key={key + i}>
          <Arrow d={d1} len={l1} k={k} color={colors.yellow} w={5} />
          {show ? <Arrow d={d2} len={380} k={ramp(p, 0.33 + i * 0.03, 0.48 + i * 0.03)} color="#FFF3C4" w={5} /> : null}
        </g>
      );
    });
  return (
    <g>
      <Sun x={sx} y={sy} t={t} r={42} />
      <g opacity={leftK}>
        <Box pr={pr} x={0} y={0} w={10} d={3.5} h={0.3} c="#22262C" top="#2B3036" />
        {[0, 1, 2, 3, 4].map((i) => {
          const a = P(pr, 0.6 + i * 2, 1.75, 0.31);
          const b = P(pr, 1.6 + i * 2, 1.75, 0.31);
          return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#E9E2C8" strokeWidth={5} />;
        })}
        <ellipse cx={asphalt[0]} cy={asphalt[1]} rx={220} ry={50} fill={colors.red} opacity={meterK * (0.25 + 0.2 * heat)} />
      </g>
      <g opacity={rightK}>
        <Box pr={pr} x={13} y={0} w={8} d={3.5} h={2.6} c="#B7BFCB" top="#F4F6F9" />
      </g>
      {beams(asphalt[0], asphalt[1], 4, 1, raysK, 'a')}
      {beams(roof[0], roof[1], 4, 4, raysK, 'r')}
      {[
        {x: P(pr, 5, 0, 0)[0], v: 0.075, name: L.left || 'New asphalt', val: L.leftVal || 'reflects only 5–10%', c: colors.red},
        {x: P(pr, 17, 0, 0)[0], v: 0.75, name: L.right || 'White concrete / roof', val: L.rightVal || 'reflects 70–80%', c: colors.green},
      ].map((m, i) => (
        <g key={i} opacity={i === 0 ? leftK : rightK}>
          <Label x={m.x} y={720} text={m.name} size={32} />
          <rect x={m.x - 200} y={746} width={400} height={26} rx={13} fill={colors.panel} stroke={colors.border} strokeWidth={2} />
          <rect x={m.x - 200} y={746} width={400 * m.v * meterK} height={26} rx={13} fill={m.c} />
          <Label x={m.x} y={812} text={m.val} size={26} color={colors.sub} weight={600} o={meterK} />
        </g>
      ))}
    </g>
  );
};

const Vapour: React.FC<{cx: number; cy: number; spread: number; t: number; k: number; n?: number; color?: string; rise?: number}> = ({cx, cy, spread, t, k, n = 26, color = '#8FD3FF', rise = 260}) => {
  if (k <= 0.001) return null;
  return (
    <g>
      {Array.from({length: n}, (_, i) => {
        const ph = (t * (0.35 + rnd(i) * 0.25) + rnd(i + 50)) % 1;
        const x = cx + (rnd(i + 9) - 0.5) * spread + Math.sin(t * 2 + i) * 10;
        const y = cy - ph * rise;
        return <circle key={i} cx={x} cy={y} r={5 + rnd(i + 3) * 6} fill={color} opacity={k * (1 - ph) * 0.85} />;
      })}
    </g>
  );
};

const Evapo: React.FC<{p: number; t: number; L: Record<string, string>}> = ({p, t, L}) => {
  const pr = {ox: 200, oy: 680, s: 58};
  const conc = sm(ramp(p, 0.62, 0.86));
  const treeK = 1 - sm(ramp(p, 0.64, 0.8));
  const vap = sm(ramp(p, 0.08, 0.2)) * (1 - sm(ramp(p, 0.66, 0.8)));
  const tiles = [];
  for (let i = 0; i < 14; i++)
    for (let j = 0; j < 5; j++) {
      const k = cl((conc * 1.6 - (13 - i) / 14) * 3);
      if (k <= 0) continue;
      tiles.push(<Box key={i + '-' + j} pr={pr} x={i} y={j} z={0.3} w={0.98} d={0.98} h={0.08 * k} c="#9AA1AC" top={mix('#B9BEC6', '#A7ADB6', (i + j) % 2)} />);
    }
  const canopy = P(pr, 5, 2.5, 3.2);
  return (
    <g>
      <rect x={0} y={0} width={W} height={H} fill={mix('#1B4F7A', '#5A2A1E', conc)} opacity={0.35} />
      <Box pr={pr} x={0} y={0} w={14} d={5} h={0.3} c="#3B6A2C" top="#5E9B44" />
      {tiles}
      <Tree pr={pr} x={5} y={2.5} z={0.3} r={1.5} k={treeK} />
      <Tree pr={pr} x={9.5} y={3.5} z={0.3} r={1.0} k={treeK} />
      <Vapour cx={canopy[0]} cy={canopy[1] - 30} spread={200} t={t} k={vap} />
      <Vapour cx={P(pr, 9.5, 3.5, 2)[0]} cy={P(pr, 9.5, 3.5, 2)[1] - 20} spread={130} t={t + 3} k={vap} n={16} />
      <Label x={canopy[0] + 330} y={210} text={L.vapour || 'Leaves release water vapour'} size={30} color="#8FD3FF" o={ramp(p, 0.16, 0.24) * (1 - ramp(p, 0.6, 0.66))} bg />
      <Label x={canopy[0] + 330} y={270} text={L.cool || 'The air around cools down'} size={28} color="#8FD3FF" o={ramp(p, 0.36, 0.44) * (1 - ramp(p, 0.6, 0.66))} bg />
      <Label x={W / 2} y={775} text={L.concrete || 'Concrete: no water, no cooling'} size={34} color={colors.orange} o={ramp(p, 0.82, 0.88)} bg />
    </g>
  );
};

const Canyon: React.FC<{p: number; t: number; L: Record<string, string>}> = ({p, t, L}) => {
  const pr = {ox: 300, oy: 820, s: 62};
  const k = sm(ramp(p, 0.02, 0.14));
  const rays = ramp(p, 0.2, 0.5);
  const glow = sm(ramp(p, 0.3, 0.7));
  const windK = ramp(p, 0.72, 0.9);
  const lw = P(pr, 6, 0, 0)[0];
  const rw = P(pr, 7.6, 0, 0)[0];
  const top = P(pr, 0, 0, 10)[1];
  const bot = P(pr, 0, 0, 0.3)[1];
  const zig = (x0: number, n: number) => {
    let d = `M${x0},${top - 120}`;
    let x = x0;
    let y = top - 120;
    const step = (bot - top) / n;
    for (let i = 0; i <= n; i++) {
      x = i % 2 === 0 ? rw - 4 : lw + 4;
      y = top + step * (i + 0.5);
      d += ` L${x},${y}`;
    }
    return {d, len: (n + 2) * Math.hypot(rw - lw, step) + 200};
  };
  const z1 = zig(lw + 40, 6);
  return (
    <g>
      <rect x={lw} y={top} width={rw - lw} height={bot - top} fill={colors.orange} opacity={glow * 0.45} />
      <Box pr={pr} x={-1} y={0} w={16} d={4} h={0.3} c="#4A5262" top="#5C6474" />
      <Box pr={pr} x={2} y={0.5} w={4} d={3} z={0.3} h={10 * k} c="#7D8CA3" top="#A9B4C6" />
      <Box pr={pr} x={7.6} y={0.5} w={4} d={3} z={0.3} h={10 * k} c="#7D8CA3" top="#A9B4C6" />
      {Array.from({length: 18}, (_, i) => {
        const r = Math.floor(i / 2);
        const [x, y] = P(pr, (i % 2 ? 4.2 : 2.6), 0.5, 1 + r * 1.0);
        return <rect key={i} x={x} y={y - 26} width={60} height={22} fill="#C9D6E8" opacity={0.35 * k} />;
      })}
      <Sun x={lw - 170} y={top - 170} t={t} r={36} />
      <Arrow d={z1.d} len={z1.len} k={rays} color={colors.yellow} w={6} />
      <Arrow d={zig(lw + 20, 8).d} len={zig(lw + 20, 8).len} k={ramp(p, 0.3, 0.6)} color={colors.orange} w={5} />
      {[0, 1, 2].map((i) => {
        const ph = (t * 0.5 + i / 3) % 1;
        const y = top - 50 - i * 26;
        return <Arrow key={i} d={`M${90 + ph * 200},${y} L${90 + ph * 200 + 900},${y}`} len={900} k={windK} color="#9CC8F0" w={5} o={1 - ph * 0.6} />;
      })}
      {[0, 1].map((i) => {
        const y = bot - 150 - i * 160;
        return (
          <g key={i} opacity={windK}>
            <Arrow d={`M90,${y} L${P(pr, 2, 0, 0)[0] - 20},${y}`} len={300} k={windK} color="#9CC8F0" w={5} head={false} />
            <Label x={P(pr, 2, 0, 0)[0] - 40} y={y + 10} text="✕" size={34} color={colors.red} anchor="end" o={ramp(p, 0.82, 0.86)} />
          </g>
        );
      })}
      <Label x={1130} y={top - 50} text={L.wind || 'Wind passes over the top'} size={26} color="#9CC8F0" o={ramp(p, 0.78, 0.84)} bg />
    </g>
  );
};

const Haze: React.FC<{p: number; t: number; L: Record<string, string>}> = ({p, t, L}) => {
  const pr = {ox: 330, oy: 720, s: 62};
  const dome = sm(ramp(p, 0.14, 0.45));
  const cx = P(pr, 5, 2, 0)[0];
  const baseY = P(pr, 5, 2, 0)[1] - 120;
  return (
    <g>
      <rect x={0} y={0} width={W} height={H} fill="#081326" opacity={0.6} />
      {Array.from({length: 40}, (_, i) => <circle key={i} cx={rnd(i) * W} cy={rnd(i + 99) * 250} r={1.5 + rnd(i + 7) * 1.5} fill="#FFFFFF" opacity={0.6 * rnd(i + 3) * (1 - dome * 0.8)} />)}
      <Box pr={pr} x={-1.5} y={0} w={13} d={4.5} h={0.3} c="#4A5262" top="#5C6474" />
      <g transform={`translate(0,${-0.3 * pr.s})`}>
        <City pr={pr} x0={0.5} night={0.8} />
      </g>
      <ellipse cx={cx} cy={baseY} rx={560} ry={420 * dome} fill="#8C8F96" opacity={0.38 * dome} />
      <path d={`M${cx - 560},${baseY} A560,${420 * dome} 0 0 1 ${cx + 560},${baseY}`} fill="none" stroke="#B7BBC3" strokeWidth={4} strokeDasharray="14 10" opacity={dome} />
      {Array.from({length: 7}, (_, i) => {
        const x = cx - 360 + i * 120;
        const ph = (t * 0.45 + rnd(i) * 1) % 1;
        const domeY = baseY - 420 * dome * Math.sqrt(Math.max(0, 1 - ((x - cx) / 560) ** 2)) + 10;
        const up = baseY - 20;
        const span = up - domeY;
        const q = ph < 0.55 ? ph / 0.55 : 1 - (ph - 0.55) / 0.45;
        const y = up - span * q;
        const o = ramp(p, 0.08, 0.16);
        const goingDown = ph >= 0.55;
        return (
          <g key={i} opacity={o}>
            <path d={wavy(x, y + 70, y, 6, 1, t * 4 + i)} stroke={goingDown && dome > 0.5 ? '#FF6B4A' : colors.red} strokeWidth={6} fill="none" strokeLinecap="round" />
            <path d={goingDown && dome > 0.5 ? `M${x - 12},${y + 70} L${x},${y + 88} L${x + 12},${y + 70}` : `M${x - 12},${y + 14} L${x},${y - 4} L${x + 12},${y + 14}`} fill={colors.red} />
          </g>
        );
      })}
      <Label x={cx} y={baseY - 420 * dome - 30} text={L.dome || 'Smoke and dust: a layer of haze'} size={30} color="#D5D8DE" o={ramp(p, 0.3, 0.4)} bg />
      <Label x={cx} y={775} text={L.title || 'Night-time heat bounces back down'} size={32} color={colors.orange} o={ramp(p, 0.55, 0.62)} bg />
    </g>
  );
};

const Person: React.FC<{x: number; y: number; s?: number; heat?: number}> = ({x, y, s = 1, heat = 0}) => {
  const c = mix('#C9D6E8', '#E5383B', heat);
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <circle cx={0} cy={-210} r={38} fill={c} />
      <path d="M-62,-160 Q0,-178 62,-160 L74,-40 Q76,-24 60,-24 L52,-24 L46,-110 L40,0 L22,120 Q20,134 6,134 L0,134 L-6,134 Q-20,134 -22,120 L-40,0 L-46,-110 L-52,-24 L-60,-24 Q-76,-24 -74,-40 Z" fill={c} />
    </g>
  );
};

const Thermo: React.FC<{x: number; y: number; h: number; level: number; color?: string; wet?: boolean; scale?: number}> = ({x, y, h, level, color = colors.red, wet, scale = 1}) => {
  const w = 34 * scale;
  return (
    <g>
      <rect x={x - w / 2} y={y - h} width={w} height={h} rx={w / 2} fill="#E9EEF5" stroke="#9FB0C6" strokeWidth={3} />
      <rect x={x - w / 4} y={y - h * level} width={w / 2} height={h * level} rx={w / 4} fill={color} />
      <circle cx={x} cy={y + 10 * scale} r={30 * scale} fill={color} stroke="#9FB0C6" strokeWidth={3} />
      {wet ? <path d={`M${x - 36 * scale},${y - 14 * scale} Q${x},${y - 34 * scale} ${x + 36 * scale},${y - 14 * scale} L${x + 34 * scale},${y + 40 * scale} Q${x},${y + 58 * scale} ${x - 34 * scale},${y + 40 * scale} Z`} fill="#7FB8E6" opacity={0.9} /> : null}
      {wet ? <path d={`M${x - 6},${y + 48 * scale} q6,14 0,22 q-6,-8 0,-22`} fill="#7FB8E6" /> : null}
    </g>
  );
};

const DryHumid: React.FC<{p: number; t: number; L: Record<string, string>}> = ({p, t, L}) => {
  const lk = sm(ramp(p, 0.02, 0.1));
  const rk = sm(ramp(p, 0.22, 0.3));
  const answer = ramp(p, 0.62, 0.68);
  const heat = sm(ramp(p, 0.72, 0.9));
  const panel = (x0: number, k: number, hot: string, title: string, sub: string, humid: boolean) => (
    <g opacity={k} transform={`translate(0,${(1 - k) * 40})`}>
      <rect x={x0} y={70} width={630} height={700} rx={24} fill={humid ? '#1C3550' : '#3A2A1C'} stroke={colors.border} strokeWidth={2} />
      {humid ? Array.from({length: 60}, (_, i) => <circle key={i} cx={x0 + 20 + rnd(i) * 590} cy={90 + rnd(i + 40) * 660} r={2 + rnd(i + 5) * 3} fill="#9CC8F0" opacity={0.35} />) : null}
      <Label x={x0 + 315} y={130} text={title} size={44} color={hot} weight={800} />
      <Label x={x0 + 315} y={176} text={sub} size={28} color={colors.sub} weight={600} />
      <Thermo x={x0 + 130} y={640} h={380} level={humid ? 0.62 : 0.86} color={hot} />
      <Person x={x0 + 400} y={600} s={1.25} heat={humid ? heat * 0.85 : 0} />
      {/* sweat */}
      {Array.from({length: 8}, (_, i) => {
        const bx = x0 + 400 + (rnd(i) - 0.5) * 120;
        const by = 380 + rnd(i + 20) * 260;
        if (!humid) {
          const ph = (t * 0.6 + rnd(i + 3)) % 1;
          return <circle key={i} cx={bx + ph * 40} cy={by - ph * 160} r={6 + ph * 6} fill="#BFE3FF" opacity={(1 - ph) * 0.9} />;
        }
        const dk = ramp(p, 0.3 + i * 0.03, 0.36 + i * 0.03);
        return <path key={i} d={`M${bx},${by - 12} q9,14 0,22 q-9,-8 0,-22`} fill="#7FB8E6" opacity={dk} transform={`translate(0,${dk * 8})`} />;
      })}
      <Label x={x0 + 400} y={250} text={humid ? L.stay || 'Sweat stays on the skin' : L.dry || 'Sweat dries off fast'} size={26} color={humid ? colors.orange : '#BFE3FF'} o={humid ? ramp(p, 0.38, 0.44) : ramp(p, 0.12, 0.18)} bg />
    </g>
  );
  return (
    <g>
      {panel(40, lk, colors.orange, L.left || '45°C', L.leftSub || 'dry air', false)}
      {panel(720, rk, colors.yellow, L.right || '35°C', L.rightSub || 'air full of moisture', true)}
      <Label x={W / 2} y={775} text={L.q || 'Which one is more dangerous?'} size={34} o={ramp(p, 0.42, 0.48) * (1 - answer)} bg />
      <Stamp x={1035} y={560} text={L.stamp || 'MORE DANGEROUS'} k={answer} />
    </g>
  );
};

const Sweat: React.FC<{p: number; t: number; L: Record<string, string>}> = ({p, t, L}) => {
  const pr = {ox: 90, oy: 640, s: 50};
  const humid = sm(ramp(p, 0.6, 0.7));
  const drops = ramp(p, 0.04, 0.2);
  const evap = ramp(p, 0.2, 0.3) * (1 - humid);
  const skin = mix('#E3A98A', '#E5383B', sm(ramp(p, 0.72, 0.95)) * 0.7);
  return (
    <g>
      <rect x={0} y={0} width={W} height={H} fill={mix('#3A2A1C', '#1C3550', humid)} opacity={0.45} />
      {humid > 0 ? Array.from({length: 90}, (_, i) => <circle key={i} cx={rnd(i) * W} cy={60 + rnd(i + 40) * 420} r={2 + rnd(i + 5) * 4} fill="#9CC8F0" opacity={0.4 * humid} />) : null}
      <Box pr={pr} x={0} y={0} w={22} d={4} h={1.2} c="#B5694B" top={skin} />
      <Box pr={pr} x={0} y={0} w={22} d={4} z={-1.6} h={1.6} c="#E9C46A" top="#E9C46A" />
      {Array.from({length: 9}, (_, i) => {
        const [x, y] = P(pr, 1.5 + i * 2.3, 2, 1.2);
        const ph = (t * 0.55 + rnd(i)) % 1;
        return (
          <g key={i}>
            <path d={`M${x},${y - 60} q26,38 0,60 q-26,-22 0,-60`} fill="#7FB8E6" opacity={drops * (evap > 0.5 ? 1 - evap * 0.6 : 1)} />
            {evap > 0 ? <circle cx={x + Math.sin(t * 2 + i) * 12} cy={y - 70 - ph * 260} r={10 + ph * 12} fill="#8FD3FF" opacity={evap * (1 - ph)} /> : null}
            {evap > 0 ? <Arrow d={`M${x + 24},${y - 30} L${x + 24},${y - 150}`} len={120} k={ramp(p, 0.3, 0.4)} color={colors.orange} w={5} o={evap} /> : null}
          </g>
        );
      })}
      <Label x={W / 2} y={120} text={L.dry || 'Dry air: sweat evaporates and carries heat away'} size={32} color="#BFE3FF" o={ramp(p, 0.24, 0.3) * (1 - humid)} bg />
      <Label x={W / 2} y={120} text={L.humid || 'Humid air: sweat cannot evaporate'} size={32} color={colors.orange} o={humid} bg />
      <Label x={W / 2} y={P(pr, 0, 0, 0)[1] + 120} text={L.skin || 'Skin'} size={28} color={colors.sub} />
    </g>
  );
};

const WetBulb: React.FC<{p: number; t: number; L: Record<string, string>}> = ({p, t, L}) => {
  const fanK = ramp(p, 0.36, 0.44);
  const drop = sm(ramp(p, 0.48, 0.85));
  const wrap = ramp(p, 0.22, 0.3);
  const ang = t * 720 * fanK;
  return (
    <g>
      <Thermo x={500} y={700} h={460} level={0.7} color={colors.red} />
      <Thermo x={900} y={700} h={460} level={0.7 - 0.28 * drop} color="#4F93D2" wet={wrap > 0.5} />
      <Label x={560} y={820} text={L.dry || 'Dry bulb'} size={28} />
      <Label x={860} y={820} text={L.wet || 'Wet bulb (wet cloth)'} size={28} color="#9CC8F0" o={wrap} />
      <g opacity={fanK} transform="translate(200,520)">
        <rect x={-12} y={20} width={24} height={200} fill="#5B6B82" />
        <circle cx={0} cy={0} r={110} fill="none" stroke="#9FB0C6" strokeWidth={5} />
        <g transform={`rotate(${ang})`}>
          {[0, 120, 240].map((a) => <ellipse key={a} cx={0} cy={-52} rx={26} ry={52} fill="#C9D6E8" transform={`rotate(${a})`} />)}
        </g>
        <circle cx={0} cy={0} r={16} fill="#5B6B82" />
      </g>
      {[0, 1, 2].map((i) => {
        const ph = (t * 0.8 + i / 3) % 1;
        const y = 480 + i * 50;
        return <Arrow key={i} d={`M${330 + ph * 100},${y} L${330 + ph * 100 + 100},${y}`} len={100} k={fanK} color="#9CC8F0" w={5} o={1 - ph} />;
      })}
      <Vapour cx={900} cy={690} spread={60} t={t} k={drop > 0 ? fanK * (1 - ramp(p, 0.9, 1) * 0.5) : 0} n={14} rise={180} />
      <Label x={960} y={640 - 460 * (0.7 - 0.28 * drop)} anchor="start" text={L.wb || 'Wet bulb temperature'} size={28} color="#9CC8F0" o={ramp(p, 0.8, 0.86)} bg />
      <line x1={920} x2={950} y1={700 - 460 * (0.7 - 0.28 * drop)} y2={700 - 460 * (0.7 - 0.28 * drop)} stroke="#9CC8F0" strokeWidth={3} strokeDasharray="8 6" opacity={ramp(p, 0.8, 0.86)} />
      <Label x={W / 2} y={110} text={L.title || 'Evaporation cools the wet bulb'} size={32} o={ramp(p, 0.5, 0.56)} bg />
    </g>
  );
};

const WetGap: React.FC<{p: number; t: number; L: Record<string, string>}> = ({p, L}) => {
  const lk = sm(ramp(p, 0.04, 0.12));
  const g1 = sm(ramp(p, 0.1, 0.4));
  const rk = sm(ramp(p, 0.5, 0.58));
  const g2 = sm(ramp(p, 0.6, 0.85));
  const pair = (x0: number, k: number, gap: number, title: string, note: string, humid: boolean) => (
    <g opacity={k}>
      <rect x={x0} y={70} width={620} height={740} rx={24} fill={humid ? '#1C3550' : '#3A2A1C'} stroke={colors.border} strokeWidth={2} />
      <Label x={x0 + 310} y={135} text={title} size={38} weight={800} color={humid ? '#9CC8F0' : colors.orange} />
      <Thermo x={x0 + 200} y={660} h={420} level={0.78} color={colors.red} />
      <Thermo x={x0 + 420} y={660} h={420} level={0.78 - gap} color="#4F93D2" wet />
      <Label x={x0 + 200} y={770} text={L.dry || 'Air'} size={26} />
      <Label x={x0 + 420} y={770} text={L.wet || 'Wet bulb'} size={26} color="#9CC8F0" />
      {gap > 0.02 ? <line x1={x0 + 300} x2={x0 + 300} y1={660 - 420 * 0.78} y2={660 - 420 * (0.78 - gap)} stroke={colors.yellow} strokeWidth={5} /> : null}
      <Label x={x0 + 310} y={190} text={note} size={28} color={colors.yellow} o={humid ? ramp(p, 0.84, 0.9) : ramp(p, 0.36, 0.42)} bg />
    </g>
  );
  return (
    <g>
      {pair(50, lk, 0.32 * g1, L.left || 'Dry air', L.leftNote || 'Big gap', false)}
      {pair(720, rk, 0.32 * (1 - g2), L.right || '100% humidity', L.rightNote || 'No gap', true)}
    </g>
  );
};

const Body: React.FC<{p: number; t: number; L: Record<string, string>}> = ({p, t, L}) => {
  const wb = interpolate(p, [0.4, 0.82], [24, 35], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const flow = cl((35 - wb) / 11);
  const heat = sm(ramp(p, 0.8, 0.95));
  return (
    <g>
      <Person x={640} y={640} s={1.6} heat={heat} />
      {Array.from({length: 10}, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const ph = (t * (0.15 + 0.6 * flow) + i * 0.1) % 1;
        const r0 = 200;
        const r1 = r0 + 60 + ph * 140 * Math.max(0.05, flow);
        const cx = 640;
        const cy = 420;
        return (
          <Arrow key={i} d={`M${cx + Math.cos(a) * r0},${cy + Math.sin(a) * r0 * 1.3} L${cx + Math.cos(a) * r1},${cy + Math.sin(a) * r1 * 1.3}`} len={r1 - r0 + 2} k={ramp(p, 0.05, 0.15)} color={colors.orange} w={6} o={0.25 + 0.75 * flow} />
        );
      })}
      <g opacity={ramp(p, 0.15, 0.22)}>
        <rect x={980} y={150} width={330} height={150} rx={18} fill={colors.panel} stroke={colors.border} strokeWidth={2} />
        <Label x={1145} y={205} text={L.skin || 'Skin'} size={28} color={colors.sub} />
        <Label x={1145} y={270} text="≈ 35°C" size={54} color={colors.orange} weight={800} />
      </g>
      <g opacity={ramp(p, 0.38, 0.44)}>
        <rect x={980} y={330} width={330} height={150} rx={18} fill={colors.panel} stroke={wb >= 34.9 ? colors.red : colors.border} strokeWidth={wb >= 34.9 ? 4 : 2} />
        <Label x={1145} y={385} text={L.wb || 'Wet bulb'} size={28} color="#9CC8F0" />
        <Label x={1145} y={450} text={`${Math.round(wb)}°C`} size={54} color={wb >= 34.9 ? colors.red : '#9CC8F0'} weight={800} />
      </g>
      <Stamp x={1145} y={620} text={L.stamp || 'NO COOLING'} k={ramp(p, 0.84, 0.9)} />
    </g>
  );
};

const ThermoScale: React.FC<{p: number; spec: NonNullable<HeatLabSpec['thermo']>}> = ({p, spec}) => {
  const x = 380;
  const y0 = 800;
  const h = 640;
  const pos = (v: number) => y0 - ((v - spec.min) / (spec.max - spec.min)) * h;
  const rise = interpolate(p, [0.12, 0.85], [spec.from, spec.to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad)});
  const col = (spec.bands || []).reduce((c, b) => (rise >= b.from ? (b.tone === 'bad' ? colors.red : colors.orange) : c), '#E06C3C');
  return (
    <g>
      {spec.heading ? <Label x={W / 2} y={80} text={spec.heading} size={34} bg /> : null}
      {(spec.bands || []).map((b, i) => (
        <g key={i} opacity={ramp(p, 0.06 + i * 0.05, 0.12 + i * 0.05)}>
          <rect x={x + 60} y={pos(Math.min(b.to, spec.max))} width={470} height={pos(b.from) - pos(Math.min(b.to, spec.max))} fill={b.tone === 'bad' ? colors.red : colors.orange} opacity={rise >= b.from ? 0.45 : 0.18} />
          <Label x={x + 545} y={(pos(b.from) + pos(Math.min(b.to, spec.max))) / 2 + 12} anchor="start" text={b.label} size={34} color={b.tone === 'bad' ? colors.red : colors.orange} weight={800} />
        </g>
      ))}
      {spec.marks.map((m, i) => (
        <g key={i} opacity={ramp(p, 0.04, 0.1)}>
          <line x1={x - 50} x2={x + 530} y1={pos(m.v)} y2={pos(m.v)} stroke={m.tone === 'muted' ? colors.sub : m.tone === 'bad' ? colors.red : colors.yellow} strokeWidth={4} strokeDasharray={m.tone === 'muted' ? '12 8' : undefined} />
          <Label x={x - 70} y={pos(m.v) + 11} anchor="end" text={m.label} size={30} color={m.tone === 'muted' ? colors.sub : colors.text} />
        </g>
      ))}
      <rect x={x - 30} y={y0 - h - 30} width={60} height={h + 40} rx={30} fill="#E9EEF5" stroke="#9FB0C6" strokeWidth={4} />
      <rect x={x - 15} y={pos(rise)} width={30} height={y0 - pos(rise) + 10} rx={15} fill={col} />
      <circle cx={x} cy={y0 + 40} r={52} fill={col} stroke="#9FB0C6" strokeWidth={4} />
      <Label x={x} y={y0 + 54} text={`${rise.toFixed(spec.unit === 'dep' ? 1 : 0)}`} size={30} color="#FFFFFF" weight={800} o={spec.unit === 'dep' ? 0 : 1} />
    </g>
  );
};

const Redesign: React.FC<{p: number; t: number; variant?: string; L: Record<string, string>}> = ({p, t, variant = 'intro', L}) => {
  const pr = {ox: 300, oy: 700, s: 66};
  const roofsK = variant === 'roofs' ? p : variant === 'green' ? 1 : 0;
  const greenK = variant === 'green' ? sm(ramp(p, 0.05, 0.45)) : 0;
  const windK = variant === 'green' ? ramp(p, 0.6, 0.7) : 0;
  const domeK = variant === 'intro' ? sm(ramp(p, 0.15, 0.6)) : variant === 'roofs' ? 1 - 0.55 * sm(ramp(p, 0.35, 0.85)) : 0.45 - 0.3 * greenK;
  const roof = (i: number) => {
    const k = cl((roofsK - 0.12 - i * 0.045) * 8);
    return mix('#2E3440', '#F4F6F9', variant === 'green' ? 1 : k);
  };
  const cx = P(pr, 4.5, 2, 0)[0];
  const baseY = P(pr, 4.5, 2, 0)[1] - 90;
  return (
    <g>
      <Box pr={pr} x={-1.5} y={-0.5} w={12} d={5} h={0.3} c="#4A5262" top={mix('#5C6474', '#5E9B44', greenK * 0.35)} />
      {greenK > 0 ? <Box pr={pr} x={7.6} y={1.6} z={0.3} w={2.4} d={1.6} h={0.02} c="#3C7BB8" top="#4F93D2" op={greenK} /> : null}
      <g transform={`translate(0,${-0.3 * pr.s})`}>
        <City pr={pr} x0={-1} roof={roof} scale={variant === 'green' ? 1 : 1} />
      </g>
      {greenK > 0
        ? [[-1.2, 4.1], [0.6, 4.2], [2.6, 4.1], [4.6, 4.2], [6.6, 4.1], [-1.2, 1.8], [8.6, 4.1], [9.6, 0.9], [1.6, -0.3], [4.4, -0.3], [7.4, -0.3]].map(([x, y], i) => <Tree key={i} pr={pr} x={x} y={y} z={0.3} r={0.55} k={cl(greenK * 1.5 - i * 0.04)} />)
        : null}
      <Vapour cx={cx} cy={baseY - 40} spread={700} t={t} k={greenK * 0.7} n={30} rise={200} />
      <ellipse cx={cx} cy={baseY} rx={560 * (0.6 + 0.4 * domeK)} ry={380 * domeK} fill="url(#hlHeat)" opacity={0.95 * cl(domeK * 1.4)} />
      {variant === 'roofs'
        ? CITY.slice(0, 6).map((b, i) => {
            const k = cl((roofsK - 0.2 - i * 0.045) * 8);
            const [x, y] = P(pr, -1 + b[0] + b[2] / 2, b[1] + b[3] / 2, b[4] + 0.3);
            return <Arrow key={i} d={`M${x},${y - 10} L${x + 90},${y - 200}`} len={210} k={k} color="#FFF3C4" w={5} />;
          })
        : null}
      {[0, 1, 2].map((i) => {
        const ph = (t * 0.6 + i / 3) % 1;
        const [, y] = P(pr, 0, 1.4 + i * 1.0, 0.8);
        return <Arrow key={i} d={`M${100 + ph * 150},${y} L${100 + ph * 150 + 1000},${y - 340 * 0.0}`} len={1000} k={windK} color="#9CC8F0" w={5} o={1 - ph * 0.5} />;
      })}
      {variant === 'intro' ? <Label x={cx} y={775} text={L.title || 'Solutions are in the city’s design'} size={34} o={ramp(p, 0.3, 0.42)} bg /> : null}
      {variant === 'roofs' ? <Label x={1120} y={160} text={L.tag || 'Indoors: about 2–4°C cooler'} size={30} color={colors.green} o={ramp(p, 0.8, 0.86)} bg /> : null}
      {variant === 'green' ? <Label x={cx} y={775} text={L.title || 'Trees, parks and lakes cool the air'} size={34} o={ramp(p, 0.15, 0.22) * (1 - ramp(p, 0.56, 0.6))} bg /> : null}
      {variant === 'green' ? <Label x={cx} y={775} text={L.wind || 'Streets planned so the wind can flow'} size={34} color="#9CC8F0" o={ramp(p, 0.62, 0.68)} bg /> : null}
    </g>
  );
};

export const HeatLab: React.FC<HeatLabSpec> = (spec) => {
  const {t, p} = useT();
  const L = spec.labels || {};
  const fade = interpolate(p, [0, 0.03], [0, 1], {extrapolateRight: 'clamp'});
  let body: React.ReactNode = null;
  switch (spec.mode) {
    case 'gapbars':
      body = <GapBars p={p} t={t} L={L} />;
      break;
    case 'waste':
      body = <Waste p={p} t={t} L={L} />;
      break;
    case 'profile':
      body = <Profile p={p} t={t} L={L} />;
      break;
    case 'daynight':
      body = <DayNight p={p} t={t} variant={spec.variant} L={L} />;
      break;
    case 'albedo':
      body = <Albedo p={p} t={t} L={L} />;
      break;
    case 'evapo':
      body = <Evapo p={p} t={t} L={L} />;
      break;
    case 'canyon':
      body = <Canyon p={p} t={t} L={L} />;
      break;
    case 'haze':
      body = <Haze p={p} t={t} L={L} />;
      break;
    case 'dryhumid':
      body = <DryHumid p={p} t={t} L={L} />;
      break;
    case 'sweat':
      body = <Sweat p={p} t={t} L={L} />;
      break;
    case 'wetbulb':
      body = <WetBulb p={p} t={t} L={L} />;
      break;
    case 'wetgap':
      body = <WetGap p={p} t={t} L={L} />;
      break;
    case 'body':
      body = <Body p={p} t={t} L={L} />;
      break;
    case 'thermo':
      body = spec.thermo ? <ThermoScale p={p} spec={spec.thermo} /> : null;
      break;
    case 'redesign':
      body = <Redesign p={p} t={t} variant={spec.variant} L={L} />;
      break;
  }
  return (
    <Region>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{opacity: fade}}>
        <Defs />
        {body}
      </svg>
    </Region>
  );
};
