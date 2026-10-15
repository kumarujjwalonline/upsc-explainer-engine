import React from 'react';
import {Easing, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts} from '../theme';

// Production rule 31: Shorts get a new visual every 1-3 seconds. Beats are timed to the spoken
// word (seconds from the start of the Short) and drawn over the scene in two lanes: real photos
// as a card in the upper half, and text graphics (keywords, numbers, flags, icons, A-vs-B) in the
// lower half. Each beat pops in, holds and gets out of the way for the next one.
export type Beat =
  | {kind: 'photo'; t0: number; t1: number; src: string; caption?: string; credit: string; tag?: string; video?: boolean; focus?: [number, number]}
  | {kind: 'word'; t0: number; t1: number; text: string; sub?: string; tone?: 'orange' | 'yellow' | 'red' | 'green' | 'white'}
  | {kind: 'stat'; t0: number; t1: number; value: number; unit?: string; label: string; tone?: 'orange' | 'yellow' | 'red' | 'green' | 'white'; decimals?: number}
  | {kind: 'flag'; t0: number; t1: number; flag: FlagCode; text: string; sub?: string}
  | {kind: 'icon'; t0: number; t1: number; icon: IconName; text: string; sub?: string; tone?: 'orange' | 'yellow' | 'red' | 'green' | 'white'}
  | {kind: 'vs'; t0: number; t1: number; a: string; b: string; la: string; lb: string; fa?: FlagCode; fb?: FlagCode};

type FlagCode = 'IN' | 'CN' | 'PK' | 'BT' | 'GB' | 'TB';
type IconName = 'check' | 'cross' | 'alert' | 'pin' | 'question' | 'map' | 'road' | 'clock' | 'shield' | 'doc' | 'handshake' | 'mountain' | 'water' | 'phone' | 'trade' | 'soldier' | 'eye' | 'star';

const toneC = (t?: string) => ({orange: colors.orange, yellow: colors.yellow, red: colors.red, green: colors.green, white: '#FFFFFF'}[t || 'orange'] || colors.orange);

const fmt = (v: number, d = 0) => v.toLocaleString('en-IN', {minimumFractionDigits: d, maximumFractionDigits: d});

export const Flag: React.FC<{c: string; w: number}> = ({c, w}) => {
  const h = (w * 2) / 3;
  const r = {borderRadius: w * 0.06, overflow: 'hidden' as const, boxShadow: '0 6px 18px rgba(0,0,0,0.5)', display: 'block'};
  if (c === 'IN')
    return (
      <svg width={w} height={h} viewBox="0 0 90 60" style={r}>
        <rect width="90" height="20" fill="#FF9933" />
        <rect y="20" width="90" height="20" fill="#FFFFFF" />
        <rect y="40" width="90" height="20" fill="#138808" />
        <circle cx="45" cy="30" r="8" fill="none" stroke="#000080" strokeWidth="1.6" />
        <circle cx="45" cy="30" r="1.6" fill="#000080" />
      </svg>
    );
  if (c === 'CN')
    return (
      <svg width={w} height={h} viewBox="0 0 90 60" style={r}>
        <rect width="90" height="60" fill="#DE2910" />
        <polygon points="15,6 18,15 27,15 20,21 23,30 15,24 7,30 10,21 3,15 12,15" fill="#FFDE00" />
        {[[30, 6], [36, 12], [36, 21], [30, 27]].map(([x, y], k) => (
          <circle key={k} cx={x} cy={y} r="2.4" fill="#FFDE00" />
        ))}
      </svg>
    );
  if (c === 'PK')
    return (
      <svg width={w} height={h} viewBox="0 0 90 60" style={r}>
        <rect width="90" height="60" fill="#01411C" />
        <rect width="22" height="60" fill="#FFFFFF" />
        <circle cx="56" cy="30" r="14" fill="#FFFFFF" />
        <circle cx="61" cy="26" r="12" fill="#01411C" />
      </svg>
    );
  if (c === 'BT')
    return (
      <svg width={w} height={h} viewBox="0 0 90 60" style={r}>
        <polygon points="0,0 90,0 0,60" fill="#FFD520" />
        <polygon points="90,0 90,60 0,60" fill="#FF4E12" />
      </svg>
    );
  if (c === 'GB')
    return (
      <svg width={w} height={h} viewBox="0 0 90 60" style={r}>
        <rect width="90" height="60" fill="#012169" />
        <path d="M0,0 L90,60 M90,0 L0,60" stroke="#FFFFFF" strokeWidth="12" />
        <path d="M0,0 L90,60 M90,0 L0,60" stroke="#C8102E" strokeWidth="5" />
        <path d="M45,0 V60 M0,30 H90" stroke="#FFFFFF" strokeWidth="18" />
        <path d="M45,0 V60 M0,30 H90" stroke="#C8102E" strokeWidth="10" />
      </svg>
    );
  // Tibet (historical): a plain mountain-and-sun badge, not a political flag
  return (
    <svg width={w} height={h} viewBox="0 0 90 60" style={r}>
      <rect width="90" height="60" fill="#1B3A6B" />
      <circle cx="62" cy="20" r="9" fill="#F2C94C" />
      <polygon points="5,60 35,18 55,42 68,30 88,60" fill="#FFFFFF" />
    </svg>
  );
};

export const Icon: React.FC<{name: IconName; s: number; c: string}> = ({name, s, c}) => {
  const p = {fill: 'none', stroke: c, strokeWidth: 6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  const g: Record<IconName, React.ReactNode> = {
    check: <path d="M18 52 L40 74 L82 28" {...p} strokeWidth={10} />,
    cross: <path d="M24 24 L76 76 M76 24 L24 76" {...p} strokeWidth={10} />,
    alert: (
      <>
        <path d="M50 12 L92 86 H8 Z" {...p} />
        <path d="M50 38 V60" {...p} strokeWidth={8} />
        <circle cx="50" cy="72" r="4.5" fill={c} />
      </>
    ),
    pin: (
      <>
        <path d="M50 92 C30 64 20 52 20 38 A30 30 0 0 1 80 38 C80 52 70 64 50 92 Z" {...p} />
        <circle cx="50" cy="38" r="10" {...p} />
      </>
    ),
    question: (
      <>
        <path d="M34 34 A16 16 0 1 1 56 48 C50 52 50 56 50 62" {...p} strokeWidth={9} />
        <circle cx="50" cy="80" r="5.5" fill={c} />
      </>
    ),
    map: <path d="M10 22 L36 12 L64 22 L90 12 V78 L64 88 L36 78 L10 88 Z M36 12 V78 M64 22 V88" {...p} />,
    road: (
      <>
        <path d="M34 90 L44 10 M66 90 L56 10" {...p} />
        <path d="M50 20 V30 M50 44 V56 M50 70 V84" {...p} strokeWidth={5} />
      </>
    ),
    clock: (
      <>
        <circle cx="50" cy="50" r="38" {...p} />
        <path d="M50 26 V50 L66 60" {...p} />
      </>
    ),
    shield: <path d="M50 8 L86 22 V48 C86 70 70 84 50 92 C30 84 14 70 14 48 V22 Z" {...p} />,
    doc: (
      <>
        <path d="M22 8 H62 L80 26 V92 H22 Z M62 8 V26 H80" {...p} />
        <path d="M34 46 H68 M34 60 H68 M34 74 H56" {...p} strokeWidth={5} />
      </>
    ),
    handshake: <path d="M6 44 L26 30 L44 36 L56 30 L94 44 M26 30 L18 60 L40 80 L52 72 L62 78 L82 58 L94 44 M44 36 L36 50 C40 56 48 54 56 46" {...p} />,
    mountain: <path d="M4 86 L36 30 L52 54 L66 36 L96 86 Z M30 42 L36 30 L44 42" {...p} />,
    water: <path d="M50 10 C34 34 22 50 22 64 A28 28 0 0 0 78 64 C78 50 66 34 50 10 Z" {...p} />,
    phone: <path d="M24 10 L40 10 L46 32 L36 40 C42 54 50 62 62 66 L70 56 L92 62 L92 78 C92 86 84 92 76 90 C42 84 16 58 10 26 C8 16 14 10 24 10 Z" {...p} />,
    trade: (
      <>
        <path d="M10 34 H80 L64 18 M90 66 H20 L36 82" {...p} />
      </>
    ),
    soldier: (
      <>
        <circle cx="50" cy="28" r="14" {...p} />
        <path d="M30 22 H70 M20 92 C20 66 32 54 50 54 C68 54 80 66 80 92" {...p} />
      </>
    ),
    eye: (
      <>
        <path d="M6 50 C26 20 74 20 94 50 C74 80 26 80 6 50 Z" {...p} />
        <circle cx="50" cy="50" r="13" {...p} />
      </>
    ),
    star: <path d="M50 8 L61 38 L94 38 L67 58 L77 90 L50 70 L23 90 L33 58 L6 38 L39 38 Z" {...p} />,
  };
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" style={{display: 'block', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.55))'}}>
      {g[name]}
    </svg>
  );
};

const Panel: React.FC<{children: React.ReactNode; accent: string; style?: React.CSSProperties}> = ({children, accent, style}) => (
  <div
    style={{
      background: 'rgba(11,23,38,0.92)',
      border: `3px solid ${accent}`,
      borderRadius: 26,
      padding: '26px 38px',
      boxShadow: '0 18px 50px rgba(0,0,0,0.55)',
      display: 'flex',
      alignItems: 'center',
      gap: 30,
      maxWidth: 960,
      ...style,
    }}
  >
    {children}
  </div>
);

const Title: React.FC<{text: string; sub?: string; color?: string; size?: number}> = ({text, sub, color = '#FFFFFF', size = 64}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0}}>
    <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: size, lineHeight: 1.05, color, textTransform: 'uppercase'}}>{text}</div>
    {sub ? <div style={{fontFamily: fonts.body, fontWeight: 600, fontSize: 36, lineHeight: 1.2, color: colors.sub}}>{sub}</div> : null}
  </div>
);

const BeatView: React.FC<{b: Beat; t: number; fps: number}> = ({b, t, fps}) => {
  const k = t - b.t0;
  const left = b.t1 - t;
  const pin = interpolate(k, [0, 0.12, 0.28], [0, 1.08, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const out = interpolate(left, [0, 0.18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const o = Math.min(interpolate(k, [0, 0.12], [0, 1], {extrapolateRight: 'clamp'}), out);
  if (b.kind === 'photo') {
    const z = interpolate(k, [0, b.t1 - b.t0], [1.04, 1.16]);
    const [fx, fy] = b.focus || [0.5, 0.5];
    const slide = interpolate(k, [0, 0.3], [-70, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
    const media: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${fx * 100}% ${fy * 100}%`, transform: `scale(${z})`, transformOrigin: `${fx * 100}% ${fy * 100}%`};
    return (
      <div style={{position: 'absolute', left: 50, top: 330, width: 980, opacity: o, transform: `translateY(${slide}px) rotate(${interpolate(k, [0, 0.3], [-2.5, -0.8], {extrapolateRight: 'clamp'})}deg)`}}>
        <div style={{width: 980, height: 700, borderRadius: 26, overflow: 'hidden', border: '6px solid #FFFFFF', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', background: colors.bg, position: 'relative'}}>
          {b.video ? <OffthreadVideo src={staticFile(b.src)} muted style={media} /> : <Img src={staticFile(b.src)} style={media} />}
          <div style={{position: 'absolute', left: 22, top: 22, fontFamily: fonts.display, fontWeight: 800, fontSize: 26, letterSpacing: 2, color: colors.bg, background: colors.orange, padding: '6px 16px', borderRadius: 8}}>{b.tag || (b.video ? 'REAL FOOTAGE' : 'REAL PHOTO')}</div>
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 150, background: 'linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0))'}} />
          {b.caption ? <div style={{position: 'absolute', left: 26, right: 26, bottom: 44, fontFamily: fonts.display, fontWeight: 700, fontSize: 40, lineHeight: 1.15, color: '#FFFFFF'}}>{b.caption}</div> : null}
          <div style={{position: 'absolute', left: 26, bottom: 12, fontFamily: fonts.body, fontSize: 20, color: 'rgba(255,255,255,0.85)'}}>{b.credit}</div>
        </div>
      </div>
    );
  }
  const wrap: React.CSSProperties = {position: 'absolute', left: 0, right: 0, top: 1150, display: 'flex', justifyContent: 'center', opacity: o, transform: `scale(${pin})`, transformOrigin: '50% 50%'};
  if (b.kind === 'word') {
    const c = toneC(b.tone);
    return (
      <div style={wrap}>
        <div style={{background: c, color: b.tone === 'white' || b.tone === 'yellow' ? colors.bg : b.tone === 'orange' || !b.tone ? colors.bg : '#FFFFFF', borderRadius: 22, padding: '22px 40px', maxWidth: 960, boxShadow: '0 18px 50px rgba(0,0,0,0.55)', transform: 'rotate(-2deg)', textAlign: 'center'}}>
          <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: 76, lineHeight: 1.05, textTransform: 'uppercase'}}>{b.text}</div>
          {b.sub ? <div style={{fontFamily: fonts.body, fontWeight: 700, fontSize: 38, marginTop: 8, opacity: 0.85}}>{b.sub}</div> : null}
        </div>
      </div>
    );
  }
  if (b.kind === 'stat') {
    const c = toneC(b.tone);
    const v = b.value * interpolate(k, [0, Math.min(1.1, (b.t1 - b.t0) * 0.6)], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
    return (
      <div style={wrap}>
        <Panel accent={c} style={{flexDirection: 'column', gap: 4, padding: '24px 48px'}}>
          <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: 130, lineHeight: 1, color: c}}>
            {!b.unit && b.value >= 1800 && b.value <= 2100 && !b.decimals ? Math.round(v) : fmt(v, b.decimals)}
            {b.unit ? <span style={{fontSize: 64, marginLeft: 14}}>{b.unit}</span> : null}
          </div>
          <div style={{fontFamily: fonts.display, fontWeight: 700, fontSize: 40, color: '#FFFFFF', textTransform: 'uppercase', textAlign: 'center'}}>{b.label}</div>
        </Panel>
      </div>
    );
  }
  if (b.kind === 'flag')
    return (
      <div style={wrap}>
        <Panel accent={colors.yellow}>
          <Flag c={b.flag} w={170} />
          <Title text={b.text} sub={b.sub} />
        </Panel>
      </div>
    );
  if (b.kind === 'icon') {
    const c = toneC(b.tone);
    return (
      <div style={wrap}>
        <Panel accent={c}>
          <div style={{transform: `scale(${interpolate(k, [0, 0.25, 0.4], [0.4, 1.2, 1], {extrapolateRight: 'clamp'})})`}}>
            <Icon name={b.icon} s={150} c={c} />
          </div>
          <Title text={b.text} sub={b.sub} />
        </Panel>
      </div>
    );
  }
  // vs
  const side = (val: string, lab: string, f: string | undefined, c: string, d: number) => {
    const s = interpolate(k, [d, d + 0.25], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.6))});
    return (
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transform: `scale(${s})`}}>
        {f ? <Flag c={f} w={120} /> : null}
        <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: 70, color: c, lineHeight: 1.05, textAlign: 'center'}}>{val}</div>
        <div style={{fontFamily: fonts.body, fontWeight: 700, fontSize: 32, color: colors.sub, textAlign: 'center'}}>{lab}</div>
      </div>
    );
  };
  return (
    <div style={{...wrap, transform: 'none'}}>
      <Panel accent={colors.border} style={{width: 960, padding: '26px 28px', gap: 10}}>
        {side(b.a, b.la, b.fa, colors.orange, 0)}
        <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: 54, color: colors.muted}}>VS</div>
        {side(b.b, b.lb, b.fb, colors.red, 0.35)}
      </Panel>
    </div>
  );
};

export const ShortBeats: React.FC<{beats: Beat[]}> = ({beats}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  return (
    <>
      {beats
        .filter((b) => t >= b.t0 && t <= b.t1)
        .map((b, i) => (
          <BeatView key={`${b.kind}-${b.t0}-${i}`} b={b} t={t} fps={fps} />
        ))}
    </>
  );
};
