import {staticFile} from 'remotion';
import type {Format, Tone} from './types';

// Production rules: deep navy ground, white primary text, orange/yellow emphasis,
// other colours only where they carry meaning.
export const colors = {
  bg: '#0B1726',
  bg2: '#0F1E33',
  panel: '#13243B',
  land: '#16263A',
  border: '#2E4562',
  text: '#FFFFFF',
  sub: '#B8C4D6',
  muted: '#5B6B82',
  orange: '#FF8A1F',
  yellow: '#F2C94C',
  green: '#3BB273',
  red: '#E5383B',
  blue: '#5B7DA6',
};

export const toneColor = (t: Tone = 'accent') =>
  ({neutral: colors.text, accent: colors.orange, warn: colors.yellow, good: colors.green, bad: colors.red, muted: colors.muted}[t]);

// Fonts are bundled in public/fonts (Inter variable + Poppins 600/700/800, Google Fonts, OFL) so
// renders never depend on reaching fonts.gstatic.com.
const FACES: [string, string, string][] = [
  ['Inter', 'inter.woff2', '100 900'],
  ['Poppins', 'poppins-600.woff2', '600'],
  ['Poppins', 'poppins-700.woff2', '700'],
  ['Poppins', 'poppins-800.woff2', '800'],
];
if (typeof document !== 'undefined' && typeof FontFace !== 'undefined') {
  const css = FACES.map(([fam, file, weight]) => `@font-face{font-family:'${fam}';src:url('${staticFile('fonts/' + file)}') format('woff2');font-weight:${weight};font-display:block}`).join('');
  const el = document.createElement('style');
  el.textContent = css;
  document.head.appendChild(el);
  FACES.forEach(([fam, , weight]) => document.fonts.load(`${weight.split(' ')[0]} 20px '${fam}'`));
}
export const fonts = {body: 'Inter, system-ui, sans-serif', display: 'Poppins, Inter, sans-serif'};

export const FPS = 30;
export const size = (f: Format) => (f === '9:16' ? {width: 1080, height: 1920} : {width: 1920, height: 1080});

// Regions. The tracker owns its box; content never enters it (boundary rule).
export const layout = (f: Format) =>
  f === '9:16'
    ? {canvas: {x: 60, y: 300, w: 960, h: 1340}, tracker: {x: 60, y: 90, w: 960, h: 170}}
    : {canvas: {x: 70, y: 70, w: 1390, h: 940}, tracker: {x: 1500, y: 70, w: 350, h: 940}};
