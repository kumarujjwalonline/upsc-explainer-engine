import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts, toneColor} from '../theme';
import type {Sfx, Tone} from '../types';
import {Media, type BrollSpec} from './Broll';

// Trailer-style cold open: fast cuts of b-roll and slammed numbers over the hook line,
// a white flash and a whip at every cut, then the title question. Full frame, above the tracker.
export type MontageCut = {
  at: number; // seconds from scene start
  kind: 'media' | 'big' | 'title';
  media?: BrollSpec; // kind media (title/src as for b-roll)
  value?: string; // kind big: "20%", "0", "92%"
  label?: string; // line under the value, or the title text
  tone?: Tone;
  sfx?: Sfx;
};
export type MontageSpec = {cuts: MontageCut[]; flash?: boolean};

const Cut: React.FC<{c: MontageCut; len: number; i: number}> = ({c, len, i}) => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const dir = i % 2 ? -1 : 1;
  const whip = interpolate(f, [0, 5], [1, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const slam = spring({frame: f, fps, config: {damping: 11, mass: 0.6}});
  const flash = interpolate(f, [0, 3], [0.85, 0], {extrapolateRight: 'clamp'});
  const tone = toneColor(c.tone || 'accent');
  return (
    <AbsoluteFill style={{transform: `translateX(${dir * whip * 18}%) skewX(${dir * whip * -8}deg)`, background: colors.bg}}>
      {c.kind === 'media' && c.media ? (
        <>
          <Media b={{move: i % 2 ? 'out' : 'in', ...c.media}} len={len} />
          <AbsoluteFill style={{background: 'linear-gradient(to top, rgba(8,14,26,0.8) 0%, rgba(8,14,26,0) 50%)'}} />
          {c.label ? (
            <div style={{position: 'absolute', left: 80 * u, bottom: 90 * u, fontFamily: fonts.display, fontWeight: 800, fontSize: 64 * u, color: colors.text, textShadow: '0 4px 24px rgba(0,0,0,0.7)', transform: `scale(${0.9 + 0.1 * slam})`, transformOrigin: 'left bottom'}}>
              {c.label}
            </div>
          ) : null}
        </>
      ) : null}
      {c.kind === 'big' ? (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 * u, background: `radial-gradient(ellipse at 50% 45%, ${colors.bg2} 0%, ${colors.bg} 70%)`}}>
          <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: 300 * u, lineHeight: 1, color: tone, transform: `scale(${2.2 - 1.2 * slam})`, opacity: Math.min(1, slam * 1.5), textShadow: `0 0 60px ${tone}55`}}>{c.value}</div>
          {c.label ? <div style={{fontFamily: fonts.display, fontWeight: 700, fontSize: 60 * u, color: colors.text, textAlign: 'center', maxWidth: '85%', opacity: interpolate(f, [4, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>{c.label}</div> : null}
        </AbsoluteFill>
      ) : null}
      {c.kind === 'title' ? (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', background: `radial-gradient(ellipse at 50% 45%, ${colors.bg2} 0%, ${colors.bg} 70%)`}}>
          <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: 110 * u, lineHeight: 1.1, color: colors.text, textAlign: 'center', maxWidth: '86%', transform: `scale(${1.25 - 0.25 * slam})`}}>
            {(c.label || '').split('|').map((part, k) => (
              <span key={k} style={{color: k % 2 ? tone : colors.text}}>{part}</span>
            ))}
          </div>
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill style={{background: '#FFFFFF', opacity: flash}} />
    </AbsoluteFill>
  );
};

export const Montage: React.FC<MontageSpec> = ({cuts}) => {
  const {fps, durationInFrames} = useVideoConfig();
  const starts = cuts.map((c) => Math.round(c.at * fps));
  return (
    <AbsoluteFill style={{background: colors.bg}}>
      {cuts.map((c, i) => {
        const from = starts[i];
        const len = (i + 1 < cuts.length ? starts[i + 1] : durationInFrames) - from;
        return (
          <Sequence key={i} from={from} durationInFrames={len}>
            <Cut c={c} len={len} i={i} />
            <Audio src={staticFile(`sfx/${c.sfx || (c.kind === 'big' ? 'hit' : 'whoosh')}.wav`)} volume={c.kind === 'big' ? 0.6 : 0.4} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
