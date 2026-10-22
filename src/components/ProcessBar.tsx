import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts} from '../theme';
import type {Format} from '../types';

// Rule 37 (Ujjwal, 2026-10-22): while a process is being explained, a small flowchart of it stays at the
// foot of the screen. Steps already explained turn green, the current one is orange, the rest stay muted.
// Shown only on the scenes that explain the process, not on every scene.
export type ProcessState = {set: string; steps: [number, number][]};

export const ProcessBar: React.FC<{title: string; steps: string[]; state: ProcessState; format: Format; visited: number[]}> = ({title, steps, state, format, visited}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const marks = [...state.steps].sort((a, b) => a[0] - b[0]);
  let cur = marks[0][1];
  let since = marks[0][0];
  const seen = new Set(visited);
  for (const [s, i] of marks)
    if (t >= s) {
      if (cur !== i) seen.add(cur);
      [cur, since] = [i, s];
    }
  for (let i = 0; i < cur; i++) seen.add(i);
  const pop = spring({frame: f - since * fps, fps, config: {damping: 12}});
  const enter = interpolate(f, [0, 8], [0, 1], {extrapolateRight: 'clamp'});
  const vertical = format === '9:16';
  const box = vertical ? {x: 60, y: 1660, w: 960, h: 110} : {x: 70, y: 1012, w: 1780, h: 62};
  const s = vertical ? 1.2 : 1;
  return (
    <div style={{position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, display: 'flex', alignItems: 'center', gap: 8 * s, fontFamily: fonts.display, opacity: enter, flexWrap: vertical ? 'wrap' : 'nowrap'}}>
      {!vertical ? (
        <div style={{flex: 'none', height: box.h, display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: 10, background: colors.dark, color: colors.ink, fontWeight: 800, fontSize: 19, letterSpacing: 1.2, textTransform: 'uppercase'}}>{title}</div>
      ) : null}
      {steps.map((label, i) => {
        const now = i === cur;
        const past = !now && seen.has(i);
        return (
          <React.Fragment key={i}>
            {i > 0 ? (
              <svg width={26 * s} height={20 * s} viewBox="0 0 26 20" style={{flex: 'none'}}>
                <path d="M2 10 H20 M14 4 L21 10 L14 16" stroke={past || now ? colors.green : colors.muted} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
            <div
              style={{
                flex: now ? 1.5 : 1,
                minWidth: 0,
                height: vertical ? 46 * s : box.h,
                borderRadius: 10 * s,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: `0 ${10 * s}px`,
                boxSizing: 'border-box',
                background: now ? colors.orange : past ? colors.green : colors.panel,
                border: `${2 * s}px solid ${now ? colors.orange : past ? colors.green : colors.border}`,
                color: now || past ? colors.ink : colors.muted,
                fontWeight: 800,
                fontSize: (steps.length > 5 ? 18 : 20) * s,
                lineHeight: 1.1,
                textAlign: 'center',
                transform: now ? `scale(${1 + 0.08 * (1 - Math.min(1, pop))})` : undefined,
                boxShadow: now ? '0 6px 18px rgba(227,106,0,0.35)' : 'none',
                overflow: 'hidden',
              }}
            >
              {past ? '✓ ' : ''}
              {label}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
