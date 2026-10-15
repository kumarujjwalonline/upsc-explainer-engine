import React from 'react';
import {Easing, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts} from '../theme';
import type {BoxRect} from './Box';

// Production rules 19 and 30: real photos and footage cut in over the scene for a few seconds,
// full-bleed, with a slow push-in, a "real place" tag and the licence credit on screen.
export type BrollSpec = {src: string; t0: number; t1: number; credit: string; caption?: string; video?: boolean; tag?: string; focus?: [number, number]; zoom?: [number, number]};

export const Broll: React.FC<BrollSpec & {box: BoxRect; lift?: number}> = ({src, t0, t1, credit, caption, video, tag, focus, zoom, box, lift = 0}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  if (t < t0 - 0.05 || t > t1 + 0.05) return null;
  const o = interpolate(t, [t0, t0 + 0.35, t1 - 0.35, t1], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const [z0, z1] = zoom || [1.04, 1.14];
  const z = interpolate(t, [t0, t1], [z0, z1], {easing: Easing.inOut(Easing.sin)});
  const [fx, fy] = focus || [0.5, 0.5];
  const u = Math.min(box.w / 1480, box.h / 1080) * (box.w < box.h ? 1.45 : 1);
  const media: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${fx * 100}% ${fy * 100}%`, transform: `scale(${z})`, transformOrigin: `${fx * 100}% ${fy * 100}%`};
  return (
    <div style={{position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, overflow: 'hidden', opacity: o, background: colors.bg}}>
      {video ? (
        <OffthreadVideo src={staticFile(src)} muted startFrom={0} style={media} />
      ) : (
        <Img src={staticFile(src)} style={media} />
      )}
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11,23,38,0.75) 0%, rgba(11,23,38,0) 30%), linear-gradient(to bottom, rgba(11,23,38,0.55) 0%, rgba(11,23,38,0) 22%)'}} />
      <div style={{position: 'absolute', right: 0, top: 0, bottom: 0, width: 60 * u, background: 'linear-gradient(to right, rgba(11,23,38,0), rgba(11,23,38,0.9))'}} />
      {caption ? (
        <div style={{position: 'absolute', left: 40 * u, top: 36 * u, display: 'flex', alignItems: 'center', gap: 12 * u}}>
          <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: 18 * u, letterSpacing: 2 * u, color: colors.bg, background: colors.orange, padding: `${5 * u}px ${12 * u}px`, borderRadius: 6 * u}}>{tag || (video ? 'REAL FOOTAGE' : 'REAL PHOTO')}</div>
          <div style={{fontFamily: fonts.display, fontWeight: 700, fontSize: 34 * u, color: '#FFFFFF', textShadow: '0 2px 12px rgba(0,0,0,0.7)'}}>{caption}</div>
        </div>
      ) : null}
      <div style={{position: 'absolute', left: 18 * u, bottom: (14 + lift) * u, fontFamily: fonts.body, fontSize: 15 * u, color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 4px rgba(0,0,0,0.8)'}}>{credit}</div>
    </div>
  );
};
