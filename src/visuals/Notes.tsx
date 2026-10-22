import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts, toneColor} from '../theme';
import {Region, useEnter, useUnit} from '../components/Box';
import type {Tone} from '../types';

// Rule 38 (Ujjwal, 2026-10-22): the video ends with the most important UPSC notes, Prelims facts and
// Mains points as cards that fill in one line at a time, like a revision sheet.
export const Notes: React.FC<{heading: string; kicker?: string; groups: {title: string; tone?: Tone; items: string[]}[]}> = ({heading, kicker, groups}) => {
  const u = useUnit();
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const e = useEnter(0);
  const total = groups.reduce((a, g) => a + g.items.length, 0);
  const span = Math.max(30, durationInFrames * 0.82 - 20);
  let k = 0;
  return (
    <Region style={{display: 'flex', flexDirection: 'column', gap: 22 * u, padding: `${20 * u}px ${10 * u}px`, boxSizing: 'border-box'}}>
      <div style={{opacity: e, transform: `translateY(${(1 - e) * 20}px)`}}>
        {kicker ? <div style={{fontSize: 24 * u, letterSpacing: 4, fontWeight: 700, color: colors.orange}}>{kicker.toUpperCase()}</div> : null}
        <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: 56 * u, color: colors.text, lineHeight: 1.1}}>{heading}</div>
      </div>
      <div style={{display: 'flex', gap: 26 * u, flex: 1, minHeight: 0}}>
        {groups.map((g, gi) => {
          const C = toneColor(g.tone ?? (gi ? 'warn' : 'accent'));
          return (
            <div key={gi} style={{flex: 1, minWidth: 0, background: colors.panel, borderRadius: 20 * u, borderTop: `${10 * u}px solid ${C}`, boxShadow: '0 10px 30px rgba(19,35,58,0.10)', padding: `${22 * u}px ${26 * u}px`, display: 'flex', flexDirection: 'column', gap: 16 * u}}>
              <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: 34 * u, color: C, letterSpacing: 1}}>{g.title}</div>
              {g.items.map((it, i) => {
                const at = 14 + (span * k++) / Math.max(1, total);
                const o = interpolate(f, [at, at + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
                return (
                  <div key={i} style={{display: 'flex', gap: 14 * u, opacity: o, transform: `translateX(${(1 - o) * 24}px)`}}>
                    <div style={{flex: 'none', width: 30 * u, height: 30 * u, marginTop: 4 * u, borderRadius: 8 * u, background: C, color: colors.ink, fontWeight: 800, fontSize: 18 * u, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>✓</div>
                    <div style={{fontSize: (groups.length > 1 ? 29 : 34) * u, lineHeight: 1.32, color: colors.text, fontWeight: 600}}>{it}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </Region>
  );
};
