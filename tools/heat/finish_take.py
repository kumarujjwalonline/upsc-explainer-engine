"""Approved eleven_v4 recipe without a transcript: soften breaths by 20 dB, make every
natural sentence gap (quiet >= 0.5 s) exactly 0.75 s, then light treatment (no pitch shift).
usage: finish_take.py in.mp3 out.wav"""
import sys, numpy as np, subprocess, parselmouth
src, out = sys.argv[1:3]; sr = 44100; hop = 441
x = np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',src,'-ac','1','-ar',str(sr),'-f','f32le','-'],capture_output=True).stdout,dtype=np.float32).astype(np.float64)
n = len(x)//hop
db = np.array([20*np.log10(np.sqrt(np.mean(x[i*hop:(i+1)*hop]**2))+1e-9) for i in range(n)]); peak = np.percentile(db,95)
p = parselmouth.Sound(x,sr).to_pitch(time_step=0.01,pitch_floor=60,pitch_ceiling=300)
f0 = np.interp(np.arange(n)*0.01+0.005,p.xs(),p.selected_array['frequency'],left=0,right=0)
def runs(mask, minlen):
    r=[];i=0
    while i<n:
        if mask[i]:
            j=i
            while j<n and mask[j]: j+=1
            if j-i>=minlen: r.append((i,j))
            i=j
        else: i+=1
    return r
gain = np.ones(n); br = runs((f0==0)&(db>peak-45)&(db<peak-16), 12)
for a,b in br: gain[a:b] = 0.1
g = np.repeat(gain,hop); g = np.concatenate([g,np.ones(len(x)-len(g))])
k = int(0.04*sr); g = np.minimum(g,np.convolve(g,np.ones(k)/k,mode='same'))
y = x*g
db2 = np.array([20*np.log10(np.sqrt(np.mean(y[i*hop:(i+1)*hop]**2))+1e-9) for i in range(n)])
gaps = [(a,b) for a,b in runs(db2<peak-38, 50) if a>20 and b<n-20]
F = int(0.01*sr); seg=[]; pos=0; y=y.astype(np.float32)
for a,b in gaps:
    A,B = a*hop, b*hop; s = y[pos:A].copy(); s[-F:] *= np.linspace(1,0,F)
    seg += [s, np.zeros(int(0.75*sr),np.float32)]
    y[B:B+F] *= np.linspace(0,1,F); pos = B
seg.append(y[pos:]); z = np.concatenate(seg)
subprocess.run(['ffmpeg','-y','-v','error','-f','f32le','-ar',str(sr),'-ac','1','-i','-','-af','silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,bass=g=2:f=120:w=0.7,acompressor=threshold=0.125:ratio=2:attack=15:release=180:makeup=1.3,alimiter=limit=0.95',out],input=z.tobytes(),check=True)
print(src, 'breaths softened', len(br), '| pauses set', len(gaps), '| dur', round(len(z)/sr,1))
