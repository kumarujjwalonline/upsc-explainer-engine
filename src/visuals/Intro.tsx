import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts} from '../theme';

// Channel intro between the trailer and the lesson: the channel name sweeps in, then the topic
// title and the host. Full frame, above the tracker, so the lesson visibly starts after it.
export type IntroSpec = {channel: string; title: string; kicker?: string; host?: string; hostImg?: string};

export const Intro: React.FC<IntroSpec> = ({channel, title, kicker, host, hostImg}) => {
  const f = useCurrentFrame();
  const {fps, width, height, durationInFrames} = useVideoConfig();
  const vertical = height > width;
  const u = Math.min(width, height) / 1080;
  const ease = (a: number, b: number) => interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const logo = spring({frame: f, fps, config: {damping: 14, mass: 0.7}});
  const line = ease(8, 26);
  const titleIn = ease(22, 40);
  const hostIn = ease(30, 50);
  const out = interpolate(f, [durationInFrames - 10, durationInFrames], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const glow = 0.5 + 0.5 * Math.sin(f / 8);
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 40%, ${colors.bg2} 0%, ${colors.bg} 70%)`, opacity: out}}>
      <AbsoluteFill style={{alignItems: vertical ? 'center' : 'flex-start', justifyContent: 'center', paddingLeft: vertical ? 0 : 150 * u, flexDirection: 'column', gap: 18 * u}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 22 * u, transform: `scale(${0.6 + 0.4 * logo})`, opacity: Math.min(1, logo * 1.4), transformOrigin: vertical ? 'center' : 'left center'}}>
          <div style={{background: colors.red, color: '#fff', fontFamily: fonts.display, fontWeight: 800, fontSize: 64 * u, padding: `${4 * u}px ${22 * u}px`, borderRadius: 14 * u, boxShadow: `0 ${8 * u}px 0 #8f1d1f`}}>UPSC</div>
          <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: 84 * u, letterSpacing: 2, color: colors.text}}>{channel}</div>
        </div>
        <div style={{height: 6 * u, width: 760 * u * line, background: colors.orange, borderRadius: 3, boxShadow: `0 0 ${24 * u}px ${colors.orange}`}} />
        {kicker ? (
          <div style={{fontFamily: fonts.display, fontWeight: 700, fontSize: 34 * u, letterSpacing: 4, color: colors.yellow, textTransform: 'uppercase', opacity: titleIn}}>{kicker}</div>
        ) : null}
        <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: (vertical ? 70 : 76) * u, lineHeight: 1.1, color: colors.text, maxWidth: (vertical ? 900 : 1150) * u, textAlign: vertical ? 'center' : 'left', opacity: titleIn, transform: `translateY(${(1 - titleIn) * 30 * u}px)`}}>{title}</div>
        {host ? (
          <div style={{fontFamily: fonts.body, fontWeight: 600, fontSize: 36 * u, color: colors.sub, opacity: hostIn}}>
            with <span style={{color: colors.orange, fontWeight: 800}}>{host}</span>
          </div>
        ) : null}
      </AbsoluteFill>
      {hostImg && !vertical ? (
        <Img
          src={staticFile(hostImg)}
          style={{position: 'absolute', right: -30 * u, bottom: 0, height: 760 * u, opacity: hostIn, transform: `translateX(${(1 - hostIn) * 80 * u}px)`, filter: `drop-shadow(-6px 0 ${14 + 8 * glow}px ${colors.orange}88) drop-shadow(0 10px 30px #000c)`}}
        />
      ) : null}
      <Audio src={staticFile('sfx/whoosh.wav')} volume={0.5} />
    </AbsoluteFill>
  );
};
