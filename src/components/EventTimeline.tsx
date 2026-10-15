import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {colors, fonts} from '../theme';
import type {BoxRect} from './Box';

// Production rule 29: while a series of events is being explained, a timeline runs along the
// bottom of the screen for that whole part. Events already explained turn green, the one being
// explained now is orange and pulses, and upcoming ones stay muted. Frames are relative to the
// Sequence this sits in.
// Events sit in date order; frames are when the narration explains each one (an event can be
// explained more than once). An event is done once explained; the latest one explained is current.
export type TimelineEvent = {date: string; label: string; frames: number[]};

export const TimelineBarHeight = (portrait: boolean) => (portrait ? 150 : 104);

export const EventTimeline: React.FC<{events: TimelineEvent[]; box: BoxRect; duration: number; title?: string; portrait?: boolean}> = ({events, box, duration, title, portrait}) => {
  const f = useCurrentFrame();
  const u = portrait ? 1.25 : 1;
  const enter = interpolate(f, [0, 14], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const exit = interpolate(f, [duration - 10, duration], [1, 0], {extrapolateLeft: 'clamp'});
  const n = events.length;
  let cur = -1;
  let curAt = -1;
  let far = -1;
  const seen = events.map((e, k) => {
    const past = e.frames.filter((x) => x <= f);
    if (past.length && Math.max(...past) >= curAt) {
      curAt = Math.max(...past);
      cur = k;
    }
    if (past.length) far = Math.max(far, k);
    return past.length > 0;
  });
  const pad = 70 * u;
  const step = n > 1 ? (box.w - 2 * pad) / (n - 1) : 0;
  const lw = Math.max(step, 120 * u);
  const xAt = (k: number) => (n > 1 ? pad + k * step : box.w / 2);
  // progress line grows smoothly toward the current event
  const farFirst = far < 0 ? 0 : Math.min(...events[far].frames);
  const grow = far < 0 ? 0 : interpolate(f, [farFirst, farFirst + 12], [far > 0 ? xAt(far - 1) : pad, xAt(far)], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const axisY = box.h * 0.45;
  return (
    <div
      style={{
        position: 'absolute',
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        opacity: enter * exit,
        transform: `translateY(${(1 - enter) * 30}px)`,
        background: 'rgba(11,23,38,0.86)',
        border: `2px solid ${colors.border}`,
        borderRadius: 16 * u,
        overflow: 'hidden',
      }}
    >
      {false && title ? (
        <div style={{position: 'absolute', left: 16 * u, top: 6 * u, fontFamily: fonts.display, fontWeight: 700, fontSize: 13 * u, letterSpacing: 2 * u, color: colors.muted, textTransform: 'uppercase'}}>{title}</div>
      ) : null}
      <div style={{position: 'absolute', left: pad, width: box.w - 2 * pad, top: axisY - 2 * u, height: 4 * u, borderRadius: 2 * u, background: colors.muted, opacity: 0.6}} />
      <div style={{position: 'absolute', left: pad, width: Math.max(0, grow - pad), top: axisY - 3 * u, height: 6 * u, borderRadius: 3 * u, background: colors.green}} />
      {events.map((e, k) => {
        const state = k === cur ? 'now' : seen[k] ? 'done' : 'next';
        const pop = state === 'now' ? interpolate(f - curAt, [0, 6, 12], [0.6, 1.25, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
        const pulse = state === 'now' ? ((f - curAt) % 40) / 40 : 0;
        const c = state === 'done' ? colors.green : state === 'now' ? colors.orange : colors.muted;
        const r = (state === 'now' ? 13 : 9) * u * pop;
        const x = xAt(k);
        return (
          <React.Fragment key={k}>
            {state === 'now' ? (
              <div style={{position: 'absolute', left: x - (r + 18 * u * pulse), top: axisY - (r + 18 * u * pulse), width: 2 * (r + 18 * u * pulse), height: 2 * (r + 18 * u * pulse), borderRadius: '50%', border: `${3 * u}px solid ${colors.orange}`, opacity: 1 - pulse}} />
            ) : null}
            <div style={{position: 'absolute', left: x - r, top: axisY - r, width: 2 * r, height: 2 * r, borderRadius: '50%', background: state === 'next' ? colors.bg : c, border: `${3 * u}px solid ${c}`, boxSizing: 'border-box'}} />
            <div
              style={{
                position: 'absolute',
                left: x - lw / 2,
                width: lw,
                top: axisY - 48 * u,
                textAlign: 'center',
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: (state === 'now' ? 25 : 21) * u,
                color: state === 'next' ? colors.muted : state === 'now' ? colors.orange : colors.green,
                whiteSpace: 'nowrap',
              }}
            >
              {e.date}
            </div>
            <div
              style={{
                position: 'absolute',
                left: x - lw / 2,
                width: lw,
                top: axisY + 18 * u,
                textAlign: 'center',
                fontFamily: fonts.body,
                fontWeight: state === 'now' ? 700 : 500,
                fontSize: (state === 'now' ? 18 : 16) * u,
                lineHeight: 1.15,
                color: state === 'next' ? colors.muted : state === 'now' ? '#FFFFFF' : colors.sub,
              }}
            >
              {e.label}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
