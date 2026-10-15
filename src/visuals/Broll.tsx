import React from 'react';
import {AbsoluteFill, Easing, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts} from '../theme';

// Real b-roll (Wikimedia Commons, fetched on GitHub by scripts/fetch_footage.py), full frame at the
// start of a scene before its graphic. Video plays muted; a photo gets a slow Ken Burns move.
export type BrollSpec = {
  title?: string; // Commons file title, e.g. "File:Cleanroom.jpg"
  src?: string; // filled by fetch_footage.py
  kind?: 'video' | 'photo';
  credit?: string;
  caption?: string;
  sec?: number; // how long it holds before the graphic (default 3)
  from?: number; // start offset into the source video, seconds
  move?: 'in' | 'out' | 'left' | 'right';
};

export const brollFrames = (b: BrollSpec | undefined, fps: number, sceneFrames: number) =>
  b && b.src ? Math.min(Math.round((b.sec ?? 3) * fps), Math.max(0, sceneFrames - 45)) : 0;

export const Media: React.FC<{b: BrollSpec; len: number}> = ({b, len}) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, Math.max(1, len)], [0, 1], {extrapolateRight: 'clamp'});
  const move = b.move || 'in';
  const scale = move === 'out' ? 1.14 - 0.1 * t : move === 'in' ? 1.04 + 0.1 * t : 1.12;
  const x = move === 'left' ? 3 - 6 * t : move === 'right' ? -3 + 6 * t : 0;
  const style: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale}) translateX(${x}%)`};
  if (!b.src) return null;
  return b.kind === 'video' ? <OffthreadVideo src={staticFile(b.src)} muted style={style} /> : <Img src={staticFile(b.src)} style={style} />;
};

export const BrollLayer: React.FC<{b: BrollSpec; frames: number}> = ({b, frames}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const enter = interpolate(f, [0, 7], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const exit = interpolate(f, [frames - 8, frames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  const bar = interpolate(f, [4, 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  if (f >= frames) return null;
  return (
    <AbsoluteFill style={{opacity: 1 - exit, transform: `scale(${1 + 0.06 * exit})`, background: colors.bg}}>
      <AbsoluteFill style={{opacity: enter}}>
        <Media b={b} len={frames} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'linear-gradient(to top, rgba(8,14,26,0.88) 0%, rgba(8,14,26,0.15) 40%, rgba(8,14,26,0) 60%)'}} />
      {b.caption ? (
        <div style={{position: 'absolute', left: 80 * u, bottom: 110 * u, display: 'flex', alignItems: 'center', gap: 20 * u, transform: `translateX(${(1 - bar) * -60}px)`, opacity: bar}}>
          <div style={{width: 10 * u, height: 64 * u, background: colors.orange, borderRadius: 4}} />
          <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: 56 * u, color: colors.text, textShadow: '0 4px 24px rgba(0,0,0,0.6)'}}>{b.caption}</div>
        </div>
      ) : null}
      {b.credit ? <div style={{position: 'absolute', left: 80 * u, bottom: 56 * u, fontSize: 20 * u, color: 'rgba(255,255,255,0.7)', opacity: bar}}>{b.credit}</div> : null}
    </AbsoluteFill>
  );
};
