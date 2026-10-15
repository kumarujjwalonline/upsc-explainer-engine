import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {colors, fonts, FPS, layout} from './theme';
import type {Job, RenderProps, Scene} from './types';
import {Tracker, trackerStates} from './components/Tracker';
import {SceneVisual} from './visuals/SceneVisual';
import {BoxContext} from './components/Box';
import {Caption} from './components/Caption';
import {Backdrop} from './components/Backdrop';
import {Broll} from './components/Broll';
import {EventTimeline} from './components/EventTimeline';
import {ShortBeats} from './components/ShortBeats';

export const sceneFrames = (s: Scene) => Math.max(15, Math.round((s.durationSec || 4) * FPS));

const pickScenes = (job: Job, ids?: string[]) =>
  ids && ids.length ? job.scenes.filter((s) => ids.includes(s.id)) : job.scenes;

export const totalFrames = (p: RenderProps) =>
  pickScenes(p.job, p.sceneIds).reduce((a, s) => a + sceneFrames(s), 0) + (p.hook ? 0 : 0);

export const Explainer: React.FC<RenderProps> = ({job, format, sceneIds, hook, shortId}) => {
  const beats = shortId ? (job.shorts || []).find((x) => x.id === shortId)?.beats || [] : [];
  const scenes = pickScenes(job, sceneIds);
  const L = layout(format);
  // Tracker states are computed over the whole video so a Short shows the same
  // progress the scene had in the long video.
  const states = useMemo(() => trackerStates(job), [job]);

  let at = 0;
  const seqs = scenes.map((s) => {
    const from = at;
    const dur = sceneFrames(s);
    at += dur;
    return {s, from, dur};
  });

  // Rule 29 timeline bars: each spans its scene range (as far as this cut includes it).
  const portrait = format === '9:16';
  const full = portrait ? {x: 0, y: 280, w: 1080, h: 1640} : {x: 0, y: 0, w: 1480, h: 1080};
  const barBox = portrait ? {x: 60, y: 1730, w: 960, h: 150} : {x: 90, y: 926, w: 1360, h: 118};
  const order = job.scenes.map((s) => s.id);
  const inTl = new Set<string>();
  const bars = (job.timelines || []).flatMap((tl, ti) => {
    const a = order.indexOf(tl.from);
    const b = order.indexOf(tl.to);
    const mine = seqs.filter(({s}) => {
      const k = order.indexOf(s.id);
      return k >= a && k <= b;
    });
    if (!mine.length) return [];
    mine.forEach(({s}) => inTl.add(s.id));
    const start = mine[0].from;
    const end = mine[mine.length - 1].from + mine[mine.length - 1].dur;
    const events = tl.events
      .map((e) => {
        const frames = [{scene: e.scene, sec: e.sec}, ...(e.also || [])].flatMap((at) => {
          const q = mine.find(({s}) => s.id === at.scene);
          return q ? [q.from - start + Math.round(at.sec * FPS)] : [];
        });
        return frames.length ? {date: e.date, label: e.label, frames} : null;
      })
      .filter((e): e is {date: string; label: string; frames: number[]} => !!e);
    if (events.length < 2) return [];
    return [
      <Sequence key={`tl${ti}`} from={start} durationInFrames={end - start} name={`timeline-${ti}`}>
        <EventTimeline events={events} box={barBox} duration={end - start} title={tl.title} portrait={portrait} />
      </Sequence>,
    ];
  });

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg, fontFamily: fonts.body, color: colors.text}}>
      <Backdrop />
      {seqs.map(({s, from, dur}) => (
        <Sequence key={s.id} from={from} durationInFrames={dur} name={s.id}>
          <BoxContext.Provider value={inTl.has(s.id) && !portrait ? {...L.canvas, h: L.canvas.h - 80} : L.canvas}>
            <SceneVisual scene={s} format={format} />
            {(s.broll || []).map((b, k) => (
              <Broll key={k} {...b} box={full} />
            ))}
            {s.onScreen ? <Caption text={s.onScreen} /> : null}
          </BoxContext.Provider>
          {s.audio ? <Audio src={staticFile(s.audio)} /> : null}
          {s.sfx ? <Audio src={staticFile(`sfx/${s.sfx}.wav`)} volume={0.55} /> : null}
          <Tracker
            title={job.tracker.title}
            objectives={job.tracker.objectives}
            state={states[s.id]}
            box={L.tracker}
            format={format}
            compact={!!s.compact}
            durationInFrames={dur}
          />
        </Sequence>
      ))}
      {bars}
      {beats.length ? <ShortBeats beats={beats} /> : null}
      {hook ? <HookBanner text={hook} /> : null}
    </AbsoluteFill>
  );
};

// Shorts only: the hook sits above the content for the first 3 seconds.
const HookBanner: React.FC<{text: string}> = ({text}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8, 80, 95], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const y = interpolate(f, [0, 10], [30, 0], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 110, opacity: o}}>
      <div
        style={{
          transform: `translateY(${y}px)`,
          background: colors.orange,
          color: colors.bg,
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: 56,
          lineHeight: 1.15,
          padding: '22px 34px',
          borderRadius: 16,
          maxWidth: 940,
          textAlign: 'center',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
