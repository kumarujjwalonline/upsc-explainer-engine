import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts} from '../theme';
import type {Format} from '../types';

// Bottom timeline for stretches of narration that walk through dated events. It stays on screen for
// the whole stretch: a period turns green once narrated, the one being talked about glows orange,
// and periods still to come stay grey. Points are in date order; `at` is the frame (relative to the
// stretch) where the narration reaches each one, so the story may jump back and forth in time.
export type TimelinePoint = {date: string; label: string; at: number};

export const TimelineBar: React.FC<{points: TimelinePoint[]; format: Format; title?: string}> = ({points, format}) => {
  const f = useCurrentFrame();
  const {durationInFrames, width} = useVideoConfig();
  const tall = format === '9:16';
  const u = tall ? 1 : 1;
  const left = tall ? 70 : 90;
  const right = tall ? 70 : 90;
  const y = tall ? 1690 : 1036; // the line; dates sit just under it
  const span = width - left - right;
  const n = points.length;
  const xOf = (i: number) => left + (n === 1 ? span / 2 : (span * i) / (n - 1));
  const show = interpolate(f, [0, 12, durationInFrames - 10, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const reached = points.map((p) => f >= p.at);
  let cur = -1; // the point narrated most recently
  points.forEach((p, i) => {
    if (reached[i] && (cur < 0 || p.at > points[cur].at)) cur = i;
  });
  return (
    <AbsoluteFill style={{opacity: show, transform: `translateY(${(1 - show) * 30}px)`, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: left - 30, right: right - 30, top: y - 56 * u, height: 100 * u, background: 'linear-gradient(to bottom, rgba(11,23,38,0.0), rgba(11,23,38,0.85) 35%)', borderRadius: 12}} />
      <div style={{position: 'absolute', left, width: span, top: y - 2, height: 4, background: colors.border, borderRadius: 2}} />
      {points.slice(1).map((p, k) => {
        // a stretch between two periods turns green once both have been narrated, growing from the earlier one
        if (!reached[k] || !reached[k + 1]) return null;
        const g = interpolate(f, [Math.max(points[k].at, p.at), Math.max(points[k].at, p.at) + 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
        return <div key={`s${k}`} style={{position: 'absolute', left: xOf(k), width: (xOf(k + 1) - xOf(k)) * g, top: y - 2, height: 4, background: colors.green, borderRadius: 2}} />;
      })}
      {points.map((p, i) => {
        const isCur = i === cur;
        const pop = isCur ? interpolate(f, [p.at, p.at + 6, p.at + 14], [1, 1.6, 1.25], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
        const c = isCur ? colors.orange : reached[i] ? colors.green : colors.muted;
        const x = xOf(i);
        const anchor = i === 0 ? 'flex-start' : i === n - 1 ? 'flex-end' : 'center';
        const shift = i === 0 ? 0 : i === n - 1 ? -100 : -50;
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: x - 9, top: y - 9, width: 18, height: 18, borderRadius: 9, background: reached[i] ? c : colors.bg, border: `3px solid ${c}`, transform: `scale(${pop})`, boxShadow: isCur ? `0 0 18px ${colors.orange}` : 'none'}} />
            <div style={{position: 'absolute', left: x, top: y + 14, transform: `translateX(${shift}%)`, display: 'flex', flexDirection: 'column', alignItems: anchor, whiteSpace: 'nowrap'}}>
              <div style={{fontFamily: fonts.display, fontWeight: isCur ? 800 : 600, fontSize: (isCur ? 19 : 16) * u, color: isCur ? colors.orange : reached[i] ? colors.text : colors.muted}}>{p.date}</div>
            </div>
            {isCur ? (
              <div style={{position: 'absolute', left: x, bottom: `calc(100% - ${y - 18}px)`, transform: `translateX(${shift}%) translateY(${(1 - Math.min(1, (pop - 1) / 0.25)) * 8}px)`, whiteSpace: 'nowrap', fontFamily: fonts.display, fontWeight: 700, fontSize: 20 * u, color: colors.bg, background: colors.orange, padding: '4px 14px', borderRadius: 8}}>
                {p.label}
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
