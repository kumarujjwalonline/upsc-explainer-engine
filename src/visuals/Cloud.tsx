import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {colors, fonts, toneColor} from '../theme';
import {Region, useUnit} from '../components/Box';
import type {Tone} from '../types';

// Weather motion graphics for the cloudburst lesson (rule 17: show the physics in motion).
// Every time in the spec is in seconds from the scene start.
export type CloudSpec =
  | {mode: 'gauge'; value: number; unit?: string; minutes?: number; label: string; sub?: string; t0?: number; dur?: number}
  | {mode: 'tower'; t0?: number; dur?: number}
  | {mode: 'updraft'; speed?: string; releaseAt?: number; meterAt?: number}
  | {mode: 'orographic'; trap?: boolean; runoffAt?: number; label?: string}
  | {mode: 'bars'; heading?: string; unit?: string; bars: {label: string; value: number; tone?: Tone; t0?: number; sub?: string}[]; line?: {value: number; label: string; t0?: number}; max?: number};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.inOut(Easing.cubic);
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// A billowy cumulonimbus silhouette built from circles; `grow` 0..1 raises the tower, `anvil` spreads the top.
// Storm grey with a dark rain-heavy base so it reads clearly on the cream ground (rule 35).
let shapeId = 0;
const CloudShape: React.FC<{cx: number; base: number; w: number; h: number; anvil?: number; fill?: string; opacity?: number; heavy?: number}> = ({cx, base, w, h, anvil = 0, fill, opacity = 1, heavy = 0}) => {
  const id = React.useMemo(() => `cb${shapeId++}`, []);
  const puffs: React.ReactNode[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const y = base - (h * i) / n;
    const r = w * (0.34 - 0.12 * (i / n)) * (0.9 + 0.2 * rnd(i));
    puffs.push(<circle key={`l${i}`} cx={cx - r * 0.5} cy={y} r={r} />);
    puffs.push(<circle key={`r${i}`} cx={cx + r * 0.55} cy={y - r * 0.2} r={r * 0.92} />);
  }
  const top = base - h;
  const dark = heavy > 0 ? `rgb(${Math.round(70 - 30 * heavy)},${Math.round(84 - 34 * heavy)},${Math.round(104 - 36 * heavy)})` : '#46546A';
  return (
    <g opacity={opacity}>
      <defs>
        <linearGradient id={id} x1="0" y1={top - w * 0.3} x2="0" y2={base + w * 0.2} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={fill ?? '#EEF2F7'} />
          <stop offset="0.45" stopColor={fill ?? '#A9B6C7'} />
          <stop offset="1" stopColor={fill ?? dark} />
        </linearGradient>
      </defs>
      <g fill={`url(#${id})`} stroke="#3A4659" strokeOpacity={0.25} strokeWidth={3}>
        {puffs}
        {anvil > 0 ? <ellipse cx={cx + w * 0.2 * anvil} cy={top} rx={w * (0.4 + 0.55 * anvil)} ry={w * 0.13} /> : null}
      </g>
      <ellipse cx={cx} cy={base} rx={w * 0.58} ry={w * 0.17} fill={dark} />
    </g>
  );
};

const Gauge: React.FC<Extract<CloudSpec, {mode: 'gauge'}>> = ({value, unit = 'mm', minutes = 60, label, sub, t0 = 0.4, dur = 4}) => {
  const u = useUnit();
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = interpolate(f / fps, [t0, t0 + dur], [0, 1], {...clamp, easing: ease});
  const W = 1390, H = 940;
  const gx = 330, gy = 140, gw = 200, gh = 620;
  const lvl = gh * 0.82 * p;
  const ang = p * 2 * Math.PI;
  const cx = 930, cy = 400, r = 190;
  return (
    <Region>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        {Array.from({length: 40}, (_, i) => {
          const x = (rnd(i) * W * 0.6) + 120;
          const y = ((f * (14 + 6 * rnd(i + 9)) + rnd(i + 3) * H) % (H * 0.8)) - 40;
          return <line key={i} x1={x} y1={y} x2={x - 6} y2={y + 34} stroke={colors.blue} strokeWidth={3} opacity={0.35 * p + 0.1} />;
        })}
        <rect x={gx} y={gy} width={gw} height={gh} rx={18} fill="none" stroke={colors.sub} strokeWidth={6} />
        <rect x={gx + 8} y={gy + gh - 8 - lvl} width={gw - 16} height={lvl} rx={10} fill={colors.blue} opacity={0.9} />
        {[0, 0.25, 0.5, 0.75, 1].map((k) => (
          <g key={k}>
            <line x1={gx + gw} x2={gx + gw + 26} y1={gy + gh - 8 - gh * 0.82 * k} y2={gy + gh - 8 - gh * 0.82 * k} stroke={colors.sub} strokeWidth={3} />
            <text x={gx + gw + 36} y={gy + gh - 8 - gh * 0.82 * k + 10} fill={colors.sub} fontSize={30} fontFamily={fonts.body}>{Math.round(value * k)}</text>
          </g>
        ))}
        <text x={gx + gw / 2} y={gy + gh + 70} textAnchor="middle" fill={colors.text} fontSize={60} fontWeight={800} fontFamily={fonts.display}>
          {Math.round(value * p)} {unit}
        </text>
        <circle cx={cx} cy={cy} r={r} fill={colors.panel} stroke={colors.border} strokeWidth={6} />
        <path d={`M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${ang > Math.PI ? 1 : 0} 1 ${cx + r * Math.sin(ang)} ${cy - r * Math.cos(ang)} Z`} fill={colors.orange} opacity={0.85} />
        <circle cx={cx} cy={cy} r={r * 0.55} fill={colors.bg} />
        <text x={cx} y={cy + 22} textAnchor="middle" fill={colors.text} fontSize={64} fontWeight={800} fontFamily={fonts.display}>{Math.round(minutes * p)} min</text>
      </svg>
      <div style={{position: 'absolute', left: 700 * u, top: 640 * u, width: 640 * u, textAlign: 'center', opacity: interpolate(f / fps, [t0 + dur * 0.6, t0 + dur], [0, 1], clamp)}}>
        <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: 52 * u, color: colors.yellow, lineHeight: 1.15}}>{label}</div>
        {sub ? <div style={{fontSize: 34 * u, color: colors.sub, marginTop: 10 * u}}>{sub}</div> : null}
      </div>
    </Region>
  );
};

const Tower: React.FC<Extract<CloudSpec, {mode: 'tower'}>> = ({t0 = 0.5, dur = 5}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const g = interpolate(t, [t0, t0 + dur], [0.05, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const W = 1390, H = 940, ground = 860, kmPx = 52;
  const everest = 8.85 * kmPx;
  const cloudH = 14 * kmPx * g;
  return (
    <Region>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        {Array.from({length: 17}, (_, k) => (
          <g key={k} opacity={k % 2 ? 0.35 : 0.8}>
            <line x1={90} x2={1290} y1={ground - k * kmPx} y2={ground - k * kmPx} stroke={colors.border} strokeWidth={k % 5 ? 1 : 2} strokeDasharray="6 10" />
            {k % 2 === 0 ? <text x={40} y={ground - k * kmPx + 9} fill={colors.sub} fontSize={26} fontFamily={fonts.body}>{k} km</text> : null}
          </g>
        ))}
        <polygon points={`210,${ground} 420,${ground - everest} 470,${ground - everest + 40} 640,${ground}`} fill="#6B5B45" />
        <polygon points={`420,${ground - everest} 470,${ground - everest + 40} 445,${ground - everest + 70} 395,${ground - everest + 50}`} fill="#E8EEF5" />
        <text x={420} y={ground - everest - 22} textAnchor="middle" fill={colors.text} fontSize={34} fontWeight={700} fontFamily={fonts.display}>Everest 8.8 km</text>
        <CloudShape cx={960} base={ground - 40} w={300} h={cloudH} anvil={interpolate(g, [0.7, 1], [0, 1], clamp)} />
        <text x={960} y={ground - 40 - cloudH - 70} textAnchor="middle" fill={colors.yellow} fontSize={44} fontWeight={800} fontFamily={fonts.display} opacity={interpolate(g, [0.6, 0.9], [0, 1], clamp)}>
          Cumulonimbus 12–15 km
        </text>
        <rect x={0} y={ground} width={W} height={H - ground} fill={colors.land} />
      </svg>
    </Region>
  );
};

const Updraft: React.FC<Extract<CloudSpec, {mode: 'updraft'}>> = ({speed = '60–120 km/h', releaseAt, meterAt = 0}) => {
  const u = useUnit();
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const t = f / fps;
  const W = 1390, H = 940, ground = 880, cloudBase = 580;
  const rel = releaseAt === undefined ? 0 : interpolate(t, [releaseAt, releaseAt + 0.8], [0, 1], clamp);
  const since = releaseAt === undefined ? -1 : t - releaseAt;
  const fill = interpolate(t, [meterAt, releaseAt ?? durationInFrames / fps], [0.1, 0.95], clamp) * (1 - interpolate(since, [0, 3], [0, 1], clamp));
  const heavy = interpolate(t, [meterAt, releaseAt ?? durationInFrames / fps], [0.1, 1], clamp);
  // The burst: a white flash, a short camera shake, then a solid sheet of rain and the ground flooding.
  const flash = since < 0 ? 0 : since < 0.08 ? 0.9 : since < 0.16 ? 0.2 : since < 0.24 ? 0.6 : Math.max(0, 0.6 * (1 - (since - 0.24) / 0.5));
  const shake = since > 0 && since < 1.2 ? Math.sin(since * 70) * 14 * (1 - since / 1.2) : 0;
  const drops = Array.from({length: 54}, (_, i) => {
    const phase = rnd(i) * 10;
    const x = 500 + rnd(i + 50) * 400;
    const cyc = (t * (0.55 + 0.3 * rnd(i + 7)) + phase) % 1;
    const yUp = 540 - Math.abs(Math.sin(cyc * Math.PI)) * 380;
    const grow = 7 + 12 * heavy * rnd(i + 21);
    return <ellipse key={i} cx={x} cy={yUp} rx={grow * 0.62} ry={grow} fill="#D6EBFF" stroke="#1E4F8A" strokeWidth={2.5} opacity={1 - rel} />;
  });
  const sheet =
    rel > 0
      ? Array.from({length: 150}, (_, i) => {
          const x = 420 + rnd(i + 300) * 560;
          const sp = 1500 + 700 * rnd(i + 400);
          const y = cloudBase + ((since * sp + rnd(i + 500) * 400) % (ground - cloudBase + 60));
          return <line key={`s${i}`} x1={x} y1={y} x2={x - 10} y2={y + 70} stroke="#1E5FAF" strokeWidth={4 + 3 * rnd(i)} strokeLinecap="round" opacity={0.85 * rel} />;
        })
      : null;
  const flood = interpolate(since, [0.4, 4], [0, 70], clamp);
  const arrow = 1 - rel;
  const stamp = since > 0 ? spring({frame: f - (releaseAt ?? 0) * fps, fps, config: {damping: 9, mass: 0.7}}) : 0;
  return (
    <Region>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        <g transform={`translate(${shake} ${shake * 0.4})`}>
          <rect x={20} y={20} width={W - 40} height={H - 40} rx={28} fill="#5E6E85" opacity={0.14 * heavy + 0.22 * rel} />
          <CloudShape cx={700} base={cloudBase} w={480} h={430} anvil={0.7} heavy={heavy} />
          {[590, 700, 810].map((x, k) => {
            const off = (t * 220 + k * 90) % 260;
            return (
              <g key={x} opacity={arrow}>
                <line x1={x} x2={x} y1={870} y2={170} stroke={colors.orange} strokeWidth={12} strokeDasharray="40 30" strokeDashoffset={off} />
                <polygon points={`${x - 28},${190} ${x + 28},${190} ${x},${138}`} fill={colors.orange} />
              </g>
            );
          })}
          {drops}
          {sheet}
          <rect x={0} y={ground} width={W} height={H - ground} fill={colors.land} />
          {flood > 0 ? <path d={`M 300 ${ground + 4} Q 700 ${ground - flood - 10 * Math.sin(t * 6)} 1100 ${ground + 4} Z`} fill="#2F6DB5" opacity={0.85} /> : null}
          <g>
            <rect x={1110} y={200} width={90} height={520} rx={14} fill={colors.panel} stroke={colors.text} strokeWidth={5} />
            <rect x={1118} y={712 - 504 * fill} width={74} height={504 * fill} rx={10} fill={colors.blue} />
            <text x={1155} y={770} textAnchor="middle" fill={colors.text} fontSize={30} fontWeight={700} fontFamily={fonts.body}>water held</text>
          </g>
          <text x={90} y={240} fill={colors.orange} fontSize={54} fontWeight={800} fontFamily={fonts.display} opacity={arrow}>Updraft</text>
          <text x={90} y={296} fill={colors.text} fontSize={36} fontWeight={600} fontFamily={fonts.body} opacity={arrow}>{speed}</text>
        </g>
        <rect x={0} y={0} width={W} height={H} fill="#FFFFFF" opacity={flash} />
      </svg>
      {since > 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 70 * u, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${1.6 - 0.6 * Math.min(1, stamp)})`, opacity: Math.min(1, stamp * 1.5)}}>
          <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: 110 * u, lineHeight: 1, color: colors.red, letterSpacing: 4 * u, WebkitTextStroke: `${3 * u}px #FFFFFF`, textShadow: '0 6px 24px rgba(19,35,58,0.35)'}}>CLOUDBURST</div>
          <div style={{marginTop: 12 * u, fontFamily: fonts.display, fontWeight: 800, fontSize: 40 * u, color: colors.ink, background: colors.dark, padding: `${6 * u}px ${22 * u}px`, borderRadius: 10 * u}}>All the water released at once</div>
        </div>
      ) : null}
    </Region>
  );
};

const Orographic: React.FC<Extract<CloudSpec, {mode: 'orographic'}>> = ({trap, runoffAt, label}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const W = 1390, H = 940;
  const ridge = 'M 0 880 L 0 820 C 200 800 360 760 520 600 C 610 500 660 330 720 280 C 780 330 820 470 900 560 C 1000 680 1200 760 1390 790 L 1390 880 Z';
  const g = interpolate(t, [0.8, 4.5], [0.1, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const run = runoffAt === undefined ? 0 : interpolate(t, [runoffAt, runoffAt + 2.5], [0, 1], clamp);
  const wind = (k: number) => {
    const s = ((t * 0.35 + k * 0.22) % 1);
    const x = interpolate(s, [0, 0.55, 1], [-40, 560, 690]);
    const y = interpolate(s, [0, 0.55, 1], [760 - k * 26, 560 - k * 20, 300 - k * 10]);
    return <circle key={k} cx={x} cy={y} r={11} fill={colors.blue} opacity={interpolate(s, [0, 0.1, 0.9, 1], [0, 1, 1, 0])} />;
  };
  const wind2 = (k: number) => {
    const s = ((t * 0.35 + k * 0.25 + 0.1) % 1);
    const x = interpolate(s, [0, 0.6, 1], [1430, 860, 760]);
    const y = interpolate(s, [0, 0.6, 1], [770 - k * 24, 560 - k * 16, 330]);
    return <circle key={`b${k}`} cx={x} cy={y} r={11} fill={colors.green} opacity={interpolate(s, [0, 0.1, 0.9, 1], [0, 1, 1, 0])} />;
  };
  return (
    <Region>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        <CloudShape cx={720} base={300} w={330} h={260 * g} anvil={interpolate(g, [0.8, 1], [0, 0.7], clamp)} />
        {g > 0.6 ? Array.from({length: 30}, (_, i) => {
          const x = 600 + rnd(i) * 240;
          const y = 320 + ((t * 600 * (0.8 + 0.4 * rnd(i + 3)) + rnd(i + 9) * 300) % 260);
          return <line key={i} x1={x} y1={y} x2={x - 5} y2={y + 26} stroke={colors.blue} strokeWidth={3} opacity={interpolate(g, [0.6, 1], [0, 0.8], clamp)} />;
        }) : null}
        <path d={ridge} fill="#6B5B45" />
        <path d="M 640 360 C 600 470 560 560 470 650 C 380 730 260 780 120 810" fill="none" stroke={run > 0.4 ? '#8A6A44' : colors.blue} strokeWidth={10} strokeDasharray="1400" strokeDashoffset={1400 * (1 - run)} />
        <path d="M 800 380 C 850 500 930 600 1060 690 C 1150 740 1250 770 1340 790" fill="none" stroke={run > 0.4 ? '#8A6A44' : colors.blue} strokeWidth={10} strokeDasharray="1400" strokeDashoffset={1400 * (1 - run)} />
        {Array.from({length: 7}, (_, k) => wind(k))}
        {trap ? Array.from({length: 6}, (_, k) => wind2(k)) : null}
        <text x={70} y={690} fill={colors.blue} fontSize={38} fontWeight={700} fontFamily={fonts.display}>Moist monsoon wind</text>
        {trap ? <text x={1320} y={700} textAnchor="end" fill={colors.green} fontSize={38} fontWeight={700} fontFamily={fonts.display}>Wind from the other side</text> : null}
        {label ? <text x={720} y={120} textAnchor="middle" fill={colors.yellow} fontSize={50} fontWeight={800} fontFamily={fonts.display} opacity={g}>{label}</text> : null}
        {run > 0 ? <text x={720} y={920} textAnchor="middle" fill="#8A4F14" fontSize={40} fontWeight={800} fontFamily={fonts.display} opacity={run}>Water + mud + boulders → flash flood</text> : null}
      </svg>
    </Region>
  );
};

const Bars: React.FC<Extract<CloudSpec, {mode: 'bars'}>> = ({heading, unit = 'mm', bars, line, max}) => {
  const u = useUnit();
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const W = 1390, H = 940, base = 780, top = 190;
  const m = max ?? Math.max(...bars.map((b) => b.value), line?.value ?? 0) * 1.1;
  const y = (v: number) => base - ((base - top) * v) / m;
  const bw = Math.min(260, 900 / bars.length);
  const gap = (1150 - bw * bars.length) / (bars.length + 1);
  return (
    <Region>
      {heading ? <div style={{position: 'absolute', left: 0, right: 0, top: 30 * u, textAlign: 'center', fontFamily: fonts.display, fontWeight: 800, fontSize: 52 * u}}>{heading}</div> : null}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        <line x1={110} x2={1290} y1={base} y2={base} stroke={colors.border} strokeWidth={4} />
        {bars.map((b, i) => {
          const p = interpolate(t, [b.t0 ?? 0.4 + i * 0.6, (b.t0 ?? 0.4 + i * 0.6) + 1.6], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
          const x = 140 + gap + i * (bw + gap);
          const v = b.value * p;
          const c = toneColor(b.tone ?? 'accent');
          return (
            <g key={i} opacity={p > 0 ? 1 : 0}>
              <rect x={x} y={y(v)} width={bw} height={base - y(v)} rx={10} fill={c} />
              <text x={x + bw / 2} y={y(v) - 20} textAnchor="middle" fill={colors.text} fontSize={50} fontWeight={800} fontFamily={fonts.display}>
                {v.toLocaleString('en-IN', {maximumFractionDigits: b.value % 1 ? 1 : 0})} {unit}
              </text>
              <text x={x + bw / 2} y={base + 56} textAnchor="middle" fill={colors.text} fontSize={36} fontWeight={700} fontFamily={fonts.body}>{b.label}</text>
              {b.sub ? <text x={x + bw / 2} y={base + 100} textAnchor="middle" fill={colors.sub} fontSize={28} fontFamily={fonts.body}>{b.sub}</text> : null}
            </g>
          );
        })}
        {line ? (
          <g opacity={interpolate(t, [line.t0 ?? 0.2, (line.t0 ?? 0.2) + 0.6], [0, 1], clamp)}>
            <line x1={110} x2={1290} y1={y(line.value)} y2={y(line.value)} stroke={colors.red} strokeWidth={5} strokeDasharray="22 14" />
            <text x={1290} y={y(line.value) - 16} textAnchor="end" fill={colors.red} fontSize={36} fontWeight={800} fontFamily={fonts.display}>{line.label}</text>
          </g>
        ) : null}
      </svg>
    </Region>
  );
};

export const Cloud: React.FC<CloudSpec> = (spec) => {
  switch (spec.mode) {
    case 'gauge':
      return <Gauge {...spec} />;
    case 'tower':
      return <Tower {...spec} />;
    case 'updraft':
      return <Updraft {...spec} />;
    case 'orographic':
      return <Orographic {...spec} />;
    case 'bars':
      return <Bars {...spec} />;
    default:
      return null;
  }
};
