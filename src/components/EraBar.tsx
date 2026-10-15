import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts} from '../theme';
import type {Format} from '../types';

// Rule (Ujjwal, 2026-10-15): while a series of events is explained, a timeline stays at the foot of the
// screen for the whole part. Periods already covered turn green, the one being explained is orange,
// and the ones still to come stay grey.
export type EraPeriod = {date: string; label: string};
export type EraState = {set: string; steps: [number, number][]}; // [seconds into scene, index of current period]

export const EraBar: React.FC<{periods: EraPeriod[]; state: EraState; format: Format; visited: number[]}> = ({periods, state, format, visited}) => {
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const t = f / fps;
  const steps = [...state.steps].sort((a, b) => a[0] - b[0]);
  let cur = steps[0][1];
  let since = steps[0][0];
  const seen = new Set(visited);
  for (const [s, i] of steps)
    if (t >= s) {
      if (cur !== i) seen.add(cur);
      [cur, since] = [i, s];
    }
  const fresh = !visited.includes(cur) || since > 0;
  const changed = spring({frame: f - since * fps, fps, config: {damping: 14}});
  const vertical = format === '9:16';
  const box = vertical ? {x: 60, y: 1675, w: 960, h: 92} : {x: 70, y: 1018, w: 1780, h: 54};
  const s = vertical ? 1.15 : 1;
  const out = interpolate(f, [durationInFrames - 1, durationInFrames], [1, 1]);
  const n = periods.length;
  return (
    <div style={{position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, opacity: out, display: 'flex', alignItems: 'center', gap: 6 * s, fontFamily: fonts.display}}>
      {periods.map((p, i) => {
        const now = i === cur;
        const past = !now && seen.has(i);
        const fill = now ? (fresh ? Math.min(1, changed) : 1) : 0;
        const bg = past ? colors.green : now ? colors.orange : 'rgba(91,107,130,0.25)';
        return (
          <div
            key={i}
            style={{
              flex: now ? 1.6 : 1,
              height: box.h,
              borderRadius: 8 * s,
              position: 'relative',
              overflow: 'hidden',
              background: past ? 'rgba(59,178,115,0.9)' : 'rgba(19,36,59,0.92)',
              border: `${2 * s}px solid ${now ? colors.orange : past ? colors.green : colors.border}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: `0 ${10 * s}px`,
              boxSizing: 'border-box',
              minWidth: 0,
            }}
          >
            {now ? <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: bg, opacity: 0.95}} /> : null}
            <div style={{position: 'relative', fontSize: (n > 6 ? 15 : 17) * s, fontWeight: 800, color: now ? colors.bg : past ? colors.bg : colors.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1}}>
              {p.date}
            </div>
            <div style={{position: 'relative', fontSize: (n > 6 ? 13 : 14) * s, fontWeight: 600, color: now ? colors.bg : past ? '#0B2A1A' : colors.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.15}}>
              {p.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};
