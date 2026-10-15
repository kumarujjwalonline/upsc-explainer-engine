import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {colors, fonts} from '../theme';
import type {Format} from '../types';

// Production rule (Ujjwal, 15 Oct 2026): while a series of events is explained, a timeline stays at the
// bottom of the screen. Periods already covered turn green, the current one glows orange, and the
// periods still to come stay muted. Every scene of the series repeats the same bar, so it reads as one
// bar that stays on screen; `from` is the previous scene's position so the progress line slides on.
export type TimeBarSpec = {nodes: {date: string; label?: string}[]; at: number; from?: number};

export const timeBarTop = (format: Format) => (format === '9:16' ? 1660 : 1012);

export const TimeBar: React.FC<TimeBarSpec & {format: Format}> = ({nodes, at, from, format}) => {
  const f = useCurrentFrame();
  const vertical = format === '9:16';
  const box = vertical ? {x: 60, y: 1660, w: 960, h: 150} : {x: 70, y: 1012, w: 1390, h: 64};
  const n = nodes.length;
  const t = interpolate(f, [0, 18], [from ?? at, at], {extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const xs = nodes.map((_, i) => box.x + 40 + (n === 1 ? 0 : (i * (box.w - 80)) / (n - 1)));
  const lineY = box.y + (vertical ? 40 : 18);
  const fillX = interpolate(t, [0, Math.max(1, n - 1)], [xs[0], xs[n - 1]], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pulse = 0.5 + 0.5 * Math.sin(f / 6);
  const enter = interpolate(f, [0, 8], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: from === undefined ? enter : 1}}>
      <div style={{position: 'absolute', left: xs[0], top: lineY - 2, width: xs[n - 1] - xs[0], height: 4, background: colors.border, borderRadius: 2}} />
      <div style={{position: 'absolute', left: xs[0], top: lineY - 2, width: Math.max(0, fillX - xs[0]), height: 4, background: colors.green, borderRadius: 2}} />
      {nodes.map((nd, i) => {
        const state = i < at - 0.01 ? 'past' : Math.abs(i - at) < 0.01 ? 'now' : 'next';
        const c = state === 'past' ? colors.green : state === 'now' ? colors.orange : colors.muted;
        const r = state === 'now' ? 9 + 2 * pulse : 7;
        return (
          <React.Fragment key={i}>
            {state === 'now' ? (
              <div style={{position: 'absolute', left: xs[i] - 18, top: lineY - 18, width: 36, height: 36, borderRadius: 18, background: colors.orange, opacity: 0.18 + 0.15 * pulse}} />
            ) : null}
            <div style={{position: 'absolute', left: xs[i] - r, top: lineY - r, width: 2 * r, height: 2 * r, borderRadius: r, background: state === 'next' ? colors.bg : c, border: `3px solid ${c}`, boxSizing: 'border-box'}} />
            <div
              style={{
                position: 'absolute',
                left: xs[i] - 110,
                width: 220,
                top: lineY + 13,
                textAlign: 'center',
                fontFamily: fonts.display,
                fontWeight: state === 'now' ? 800 : 600,
                fontSize: vertical ? 24 : 18,
                lineHeight: 1.15,
                color: state === 'next' ? colors.sub : c,
                opacity: state === 'next' ? 0.75 : 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {nd.date}
              {nd.label ? <span style={{fontWeight: 500, fontFamily: fonts.body, color: state === 'next' ? colors.muted : colors.sub}}> · {nd.label}</span> : null}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
