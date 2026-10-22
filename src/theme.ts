import {staticFile} from 'remotion';
import type {Format, Tone} from './types';

// Production rules (rule 34, 2026-10-22): bright cream ground, dark navy text, orange/yellow emphasis,
// other colours only where they carry meaning. `ink` is the text colour on photos, footage and dark fills.
export const colors = {
  bg: '#F7F0E1',
  bg2: '#FDF9F1',
  panel: '#FFFFFF',
  land: '#E4D6B8',
  border: '#D8C9AA',
  text: '#13233A',
  sub: '#4F5B6B',
  muted: '#A2A8AE',
  orange: '#E36A00',
  yellow: '#C98A00',
  green: '#2E9E62',
  red: '#D62F33',
  blue: '#2F6DB5',
  ink: '#FFFFFF',
  dark: '#13233A',
};

// Over photos, footage, terrain and other dark surfaces the brighter originals read better.
export const onDark = {text: '#FFFFFF', sub: '#D3DCE8', muted: '#8C9BB0', orange: '#FF8A1F', yellow: '#F2C94C', green: '#3BB273', red: '#E5383B', blue: '#7FA6D6'};

export const toneColor = (t: Tone = 'accent') =>
  ({neutral: colors.text, accent: colors.orange, warn: colors.yellow, good: colors.green, bad: colors.red, muted: colors.muted}[t]);
export const toneOnDark = (t: Tone = 'accent') =>
  ({neutral: onDark.text, accent: onDark.orange, warn: onDark.yellow, good: onDark.green, bad: onDark.red, muted: onDark.muted}[t]);

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
