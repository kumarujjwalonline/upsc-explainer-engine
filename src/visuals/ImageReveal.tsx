import React from 'react';
import {Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, onDark} from '../theme';
import {Region, useFade, useUnit} from '../components/Box';

// Licensed photo or generated art: mask wipe in, then a slow camera move (push in and drift, never a
// static slide), credit line. fit 'contain' keeps tall subjects (statues) whole over a blurred copy;
// focus is the point (0-1, 0-1) the camera drifts toward.
export const ImageReveal: React.FC<{src: string; credit?: string; caption?: string; fit?: 'cover' | 'contain'; focus?: [number, number]}> = ({
  src,
  credit,
  caption,
  fit = 'cover',
  focus = [0.5, 0.45],
}) => {
  const u = useUnit();
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const wipe = interpolate(f, [0, 16], [0, 100], {extrapolateRight: 'clamp'});
  const k = interpolate(f, [0, durationInFrames], [0, 1]);
  const zoom = 1.02 + 0.1 * k;
  const dx = (0.5 - focus[0]) * 12 * k;
  const dy = (0.5 - focus[1]) * 12 * k;
  const c = useFade(14);
  const url = /^https?:/.test(src) ? src : staticFile(src);
  const move = {transform: `scale(${zoom}) translate(${dx}%, ${dy}%)`, transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`};
  return (
    <Region>
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden', clipPath: `inset(0 ${100 - wipe}% 0 0 round ${18 * u}px)`}}>
        {fit === 'contain' ? (
          <>
            <Img src={url} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(28px) brightness(0.45)', transform: 'scale(1.15)'}} />
            <Img src={url} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', ...move}} />
          </>
        ) : (
          <Img src={url} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focus[0] * 100}% ${focus[1] * 100}%`, ...move}} />
        )}
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11,23,38,0.85) 0%, rgba(11,23,38,0) 45%)'}} />
      </div>
      {caption ? <div style={{position: 'absolute', left: 40 * u, bottom: 70 * u, fontSize: 40 * u, fontWeight: 700, color: colors.ink, opacity: c}}>{caption}</div> : null}
      {credit ? <div style={{position: 'absolute', left: 40 * u, bottom: 24 * u, fontSize: 20 * u, color: onDark.sub, opacity: c}}>{credit}</div> : null}
    </Region>
  );
};
