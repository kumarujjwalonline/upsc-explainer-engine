"""Cut the approved, processed section takes (f*.wav, made by finish_take.py) into scene clips.
Word timings come from free Scribe on the raw takes; finish_take's pause edits are replayed to map
raw time -> processed time. usage: cut_scenes.py <voice/full dir> <script-v3.md> <out dir>"""
import json, re, sys, subprocess, numpy as np, parselmouth
D, SCRIPT, OUT = sys.argv[1:4]
SR = 44100; hop = 441
SECT = {'s0': range(0, 4), 's1': range(4, 8), 's2': range(8, 16), 's3': range(16, 23), 's4': range(23, 32),
        's5a': range(32, 39), 's5b': range(39, 43), 's6': range(43, 51)}
F = {'s0': 'f0', 's1': 'f1', 's2': 'f2', 's3': 'f3', 's4': 'f4', 's5a': 'f5a', 's5b': 'f5b', 's6': 'f6'}
NUM = set('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand point percent'.split())

def load(p):
    b = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(b, dtype=np.float32).astype(np.float64)

def toks(text):
    text = re.sub(r'\[[^\]]*\]', '', text).replace('-', ' ')
    out = []
    for w in re.findall(r'[\wऀ-ॣ०-ॿ]+', text):
        w = w.lower().replace('़', '')
        if any(c.isdigit() for c in w) or w in NUM: continue
        out.append(w)
    return out

scr = open(SCRIPT, encoding='utf8').read()
first = {int(m.group(1)): toks(m.group(2))[:5] for m in re.finditer(r'\*\*S(\d\d)\*\* · (.+)', scr)}

def gaps_of(x):
    # identical to finish_take.py
    n = len(x) // hop
    db = np.array([20*np.log10(np.sqrt(np.mean(x[i*hop:(i+1)*hop]**2))+1e-9) for i in range(n)]); peak = np.percentile(db, 95)
    p = parselmouth.Sound(x, SR).to_pitch(time_step=0.01, pitch_floor=60, pitch_ceiling=300)
    f0 = np.interp(np.arange(n)*0.01+0.005, p.xs(), p.selected_array['frequency'], left=0, right=0)
    def runs(mask, minlen):
        r = []; i = 0
        while i < n:
            if mask[i]:
                j = i
                while j < n and mask[j]: j += 1
                if j - i >= minlen: r.append((i, j))
                i = j
            else: i += 1
        return r
    gain = np.ones(n)
    for a, b in runs((f0 == 0) & (db > peak-45) & (db < peak-16), 12): gain[a:b] = 0.1
    g = np.repeat(gain, hop); g = np.concatenate([g, np.ones(len(x)-len(g))])
    k = int(0.04*SR); g = np.minimum(g, np.convolve(g, np.ones(k)/k, mode='same'))
    y = x*g
    db2 = np.array([20*np.log10(np.sqrt(np.mean(y[i*hop:(i+1)*hop]**2))+1e-9) for i in range(n)])
    return [(a*0.01, b*0.01) for a, b in runs(db2 < peak-38, 50) if a > 20 and b < n-20]

def rms_db(z):
    m = len(z) // hop; return 20*np.log10(np.sqrt((z[:m*hop].reshape(m, hop)**2).mean(1))+1e-9)

clips = {}
for k, fk in F.items():
    x = load(f'{D}/{k}.mp3'); fz = load(f'{D}/{fk}.wav')
    G = gaps_of(x)
    def to_z(t):
        s = 0.0
        for a, b in G:
            if t >= b: s += (b-a) - 0.75
            elif t > a: return a - s + min(0.75, t-a)
        return t - s
    # leading trim by silenceremove: align envelopes
    W = [w for w in json.load(open(f'{D}/{k}.words.json', encoding='utf8'))['words'] if w.get('type') == 'word' and not w['text'].startswith('[')]
    t0 = W[0]['start']; lead = max(0.0, to_z(t0) - 0.0)
    ef = rms_db(fz[:int(3*SR)]); on = int(np.argmax(ef > ef.max()-30)) * 0.01   # speech onset in f
    off = to_z(t0) - on   # processed-time shift
    ht = []
    for i, w in enumerate(W):
        for t in toks(w['text']): ht.append((t, i))
    pos = 0; starts = {}
    for s in SECT[k]:
        f3 = first[s]; best = None
        L = len(f3)
        for i in range(pos, len(ht)-L+1):
            sc = sum(ht[i+q][0] == f3[q] for q in range(L))
            if sc == L or (sc >= L-1 and ht[i][0] == f3[0]): best = i; break
        if best is None: raise SystemExit(f'{k} S{s:02d} opening {f3} not found after {pos}')
        starts[s] = W[ht[best][1]]['start']; pos = best + 1
    d = rms_db(fz); quiet = d < np.percentile(d, 95) - 38
    cuts = []
    sc = list(SECT[k])
    for s in sc[1:]:
        tz = to_z(starts[s]) - off; c = int(round(tz*100))
        # the 0.75 s gap ending just before this word
        lo = max(0, c-150); seg = quiet[lo:c+20]; best = None; i = 0
        while i < len(seg):
            if seg[i]:
                j = i
                while j < len(seg) and seg[j]: j += 1
                if j-i >= 40: best = (lo+i, lo+j)
                elif j-i >= 8 and (best is None or best[1]-best[0] < 40) and (best is None or j-i > best[1]-best[0]): best = (lo+i, lo+j)
                i = j
            else: i += 1
        if best is None: raise SystemExit(f'{k} S{s:02d}: no gap near {tz:.2f}s')
        cuts.append(best)
    edges = [(0, None)] + cuts
    for idx, s in enumerate(sc):
        a = 0 if idx == 0 else cuts[idx-1][1]*hop - int(0.05*SR)
        b = len(fz) if idx == len(sc)-1 else cuts[idx][0]*hop + int(0.08*SR)
        seg = fz[a:b].astype(np.float32).copy(); fd = int(0.008*SR); seg[:fd] *= np.linspace(0, 1, fd); seg[-fd:] *= np.linspace(1, 0, fd)
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '160k', f'{OUT}/S{s:02d}.mp3'], input=seg.tobytes(), check=True)
        clips[f'S{s:02d}'] = round(len(seg)/SR, 3)
    print(k, 'short', [round((b-a)/100,2) for a,b in cuts if b-a<40], 'gaps', len(G), 'shift', round(off, 3), 'cuts', [(round(a/100, 2), round(b/100, 2)) for a, b in cuts])
json.dump(clips, open(f'{OUT}/clips.json', 'w'), indent=1)
print('clips', len(clips), 'total', round(sum(clips.values()), 1))
