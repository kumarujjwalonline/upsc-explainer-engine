import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {colors, fonts} from './theme';
import type {Job} from './types';
import {Icon} from './components/Icon';

// 1280x720 thumbnail: one bold English headline, one emphasis word in orange,
// a supporting line, and the strongest icon from the video's first flow/hub scene.
export const Thumbnail: React.FC<{job: Job}> = ({job}) => {
  const t = job.thumbnail || {headline: job.title};
  const words = t.headline.split(' ');
  const emph = words.reduce((a, w) => (w.length > a.length ? w : a), '');
  const firstIcon = job.scenes
    .map((s) => (s.visual.type === 'hub' ? s.visual.center.icon : s.visual.type === 'flow' ? s.visual.steps.find((x) => x.icon)?.icon : undefined))
    .find(Boolean);
  if (t.images && t.images.length === 2) return <PhotoThumb headline={t.headline} sub={t.sub} images={t.images} emph={emph} />;
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 75% 50%, #173153 0%, ${colors.bg} 65%)`, fontFamily: fonts.display, padding: 64, boxSizing: 'border-box', justifyContent: 'center'}}>
      {firstIcon ? (
        <div style={{position: 'absolute', right: 70, top: '50%', transform: 'translateY(-50%)', width: 360, height: 360, borderRadius: '50%', background: colors.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 90px rgba(255,138,31,0.55)'}}>
          <Icon name={firstIcon} size={220} color={colors.bg} stroke={2.2} />
        </div>
      ) : null}
      <div style={{width: firstIcon ? 760 : 1150, display: 'flex', flexDirection: 'column', gap: 22}}>
        <div style={{width: 120, height: 10, background: colors.orange, borderRadius: 5}} />
        <div style={{fontWeight: 800, fontSize: words.length > 5 ? 82 : 100, lineHeight: 1.02, color: colors.text, textTransform: 'uppercase'}}>
          {words.map((w, i) => (
            <span key={i} style={{color: w === emph ? colors.orange : colors.text}}>
              {w}{' '}
            </span>
          ))}
        </div>
        {t.sub ? <div style={{fontFamily: fonts.body, fontWeight: 700, fontSize: 40, color: colors.yellow}}>{t.sub}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

// Two real photos side by side (e.g. Sanchi gateway | Gomateshwara), a "vs" badge and the headline across the foot.
const PhotoThumb: React.FC<{headline: string; sub?: string; images: string[]; emph: string}> = ({headline, sub, images, emph}) => (
  <AbsoluteFill style={{background: colors.bg, fontFamily: fonts.display}}>
    {images.map((src, i) => (
      <div key={i} style={{position: 'absolute', top: 0, bottom: 0, left: i ? '50%' : 0, width: '50%', overflow: 'hidden', borderLeft: i ? `8px solid ${colors.orange}` : undefined}}>
        <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 30%'}} />
      </div>
    ))}
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11,23,38,0.97) 0%, rgba(11,23,38,0.75) 32%, rgba(11,23,38,0) 58%)'}} />
    <div style={{position: 'absolute', left: '50%', top: 170, transform: 'translate(-50%, -50%)', width: 150, height: 150, borderRadius: '50%', background: colors.orange, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 74, boxShadow: '0 0 60px rgba(0,0,0,0.6)'}}>vs</div>
    <div style={{position: 'absolute', left: 50, right: 50, bottom: 46, textAlign: 'center'}}>
      <div style={{fontWeight: 800, fontSize: 104, lineHeight: 1, color: colors.text, textTransform: 'uppercase', textShadow: '0 6px 30px rgba(0,0,0,0.8)'}}>
        {headline.split(' ').map((w, i) => (
          <span key={i} style={{color: w === emph ? colors.orange : colors.text}}>{w} </span>
        ))}
      </div>
      {sub ? <div style={{marginTop: 14, fontFamily: fonts.body, fontWeight: 800, fontSize: 44, color: colors.yellow}}>{sub}</div> : null}
    </div>
  </AbsoluteFill>
);
