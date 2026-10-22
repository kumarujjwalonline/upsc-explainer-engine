import React from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts} from '../theme';
import type {BoxRect} from './Box';

// Rule 35 (Ujjwal, 2026-10-22): a generated illustration shown large and sharp beside the scene's
// graphic, sliding in and then drifting slowly. Always labelled as an illustration, never passed off as a photo.
export const Art: React.FC<{src: string; caption?: string; box: BoxRect}> = ({src, caption, box}) => {
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const e = spring({frame: f - 4, fps, config: {damping: 16, mass: 0.8}});
  const k = interpolate(f, [0, durationInFrames], [0, 1]);
  const out = interpolate(f, [durationInFrames - 8, durationInFrames], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, opacity: Math.min(1, e) * out, transform: `translateX(${(1 - e) * 80}px) rotate(${(1 - e) * 2}deg)`}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: 22, overflow: 'hidden', background: colors.panel, border: `6px solid ${colors.panel}`, boxShadow: '0 18px 50px rgba(19,35,58,0.22)'}}>
        <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.04 + 0.08 * k}) translateY(${-1.5 * k}%)`}} />
        {caption ? (
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, padding: '40px 22px 16px', background: 'linear-gradient(to top, rgba(19,35,58,0.85), rgba(19,35,58,0))', fontFamily: fonts.display, fontWeight: 700, fontSize: 28, color: colors.ink}}>{caption}</div>
        ) : null}
      </div>
      <div style={{position: 'absolute', right: 14, top: 14, fontFamily: fonts.body, fontSize: 14, fontWeight: 600, letterSpacing: 1, color: colors.ink, background: 'rgba(19,35,58,0.6)', padding: '4px 10px', borderRadius: 6}}>ILLUSTRATION</div>
    </div>
  );
};
