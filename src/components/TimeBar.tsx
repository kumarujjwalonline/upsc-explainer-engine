import React from 'react';
import {interpolate, useCurrentFrame, Easing} from 'remotion';
import {colors, fonts} from '../theme';
import type {BoxRect} from './Box';

// Production rule (Oct 2026): whenever the narration walks through a series of events, a timeline
// stays at the foot of the screen for that whole stretch. Periods already covered turn green,
// the one being explained now is orange, and the ones still to come stay grey.
export type TimeBarNode = {date: string; label: string; frame: number};

export const TimeBar: React.FC<{nodes: TimeBarNode[]; from: number; to: number; box: BoxRect; u: number}> = ({nodes, from, to, box, u}) => {
  const f = useCurrentFrame();
  if (f < from || f >= to) return null;
  const o = interpolate(f, [from, from + 12, to - 10, to], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const n = nodes.length;
  const pad = 70 * u;
  const W = box.w - 2 * pad;
  const x = (i: number) => pad + (n <= 1 ? W / 2 : (W * i) / (n - 1));
  let active = -1;
  nodes.forEach((nd, i) => {
    if (f >= nd.frame) active = i;
  });
  // progress line slides from the previous node to the active one
  const prevFrame = active >= 0 ? nodes[active].frame : from;
  const k = interpolate(f, [prevFrame, prevFrame + 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const fillTo = active <= 0 ? x(0) : x(active - 1) + (x(active) - x(active - 1)) * k;
  const H = 112 * u;
  const y = 44 * u;
  return (
    <div style={{position: 'absolute', left: box.x, top: box.y + box.h - H, width: box.w, height: H, opacity: o}}>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11,23,38,0.92), rgba(11,23,38,0.75))', borderTop: `2px solid ${colors.border}`, borderRadius: 12 * u}} />
      <svg width={box.w} height={H} style={{position: 'absolute', inset: 0}}>
        <line x1={x(0)} x2={x(n - 1)} y1={y} y2={y} stroke={colors.muted} strokeWidth={6 * u} strokeLinecap="round" />
        {active >= 0 ? <line x1={x(0)} x2={fillTo} y1={y} y2={y} stroke={colors.green} strokeWidth={6 * u} strokeLinecap="round" /> : null}
        {nodes.map((nd, i) => {
          const state = i < active ? 'done' : i === active ? 'now' : 'next';
          const c = state === 'done' ? colors.green : state === 'now' ? colors.orange : colors.muted;
          const pulse = state === 'now' ? 1 + 0.25 * Math.abs(Math.sin((f - nd.frame) / 9)) : 1;
          const anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
          const tx = i === 0 ? x(i) - 12 * u : i === n - 1 ? x(i) + 12 * u : x(i);
          return (
            <g key={i}>
              {state === 'now' ? <circle cx={x(i)} cy={y} r={20 * u * pulse} fill={colors.orange} opacity={0.25} /> : null}
              <circle cx={x(i)} cy={y} r={11 * u} fill={state === 'next' ? colors.bg : c} stroke={c} strokeWidth={4 * u} />
              <text x={tx} y={y - 20 * u} textAnchor={anchor} fontFamily={fonts.display} fontWeight={800} fontSize={27 * u} fill={c}>
                {nd.date}
              </text>
              <text x={tx} y={y + 40 * u} textAnchor={anchor} fontFamily={fonts.body} fontWeight={state === 'now' ? 700 : 500} fontSize={22 * u} fill={state === 'next' ? colors.sub : '#FFFFFF'}>
                {nd.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
