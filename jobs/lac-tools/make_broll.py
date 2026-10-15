# Picks real photos/footage (Wikimedia Commons candidates) for scenes, copies them into public/lac/broll
# and writes broll.json (scene -> overlays with times from the transcript). Credits come from the report.
import json, os, shutil, glob, subprocess
S = '/tmp/claude-0/-home-claude-upsc-explainer-engine/1b59de4d-217f-57f2-9b42-3176f8a70ecf/scratchpad/lac'
ENG = '/home/claude/upsc-explainer-engine'
WORDS = json.load(open(f'{S}/scene_words.json'))
REP = {}
for rp in glob.glob(f'{S}/media*/media/report.json'):
    base = os.path.dirname(rp)
    for x in json.load(open(rp)):
        if x.get('file'): REP[x['file']] = {**x, 'path': os.path.join(base, x['file'])}

def W(sid, needle, n=0):
    hits = [w for w in WORDS[sid] if any(k.lower() in w[0].lower() for k in needle.split('|'))]
    return round(hits[n][1], 2)

def dur(sid):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'{ENG}/public/lac/{sid}.wav'], capture_output=True, text=True).stdout)

def credit(x):
    kind = 'Video' if x['file'].endswith('.mp4') else ('Map' if 'MAP' in (x.get('tag') or '') else 'Photo')
    a = {'Nathu_La-Stairs.JPG': 'Ambuj Saxena'}.get(x['author'].split(':')[0], x['author']).replace('Originally uploaded to English Wikipedia by en:User:', '').rstrip('.')
    return f"{kind}: {a} / Wikimedia Commons ({x['licence']})"

PICKS = json.load(open(f'{S}/picks.json'))
out = {}
for p in PICKS:
    x = REP[p['file']]
    sid = p['scene']
    t0 = p['t0'] if isinstance(p['t0'], (int, float)) else W(sid, p['t0'])
    t1 = p['t1'] if isinstance(p['t1'], (int, float)) else (dur(sid) - 0.2 if p['t1'] == 'end' else W(sid, p['t1']))
    name = f"{sid}-{p['file']}"
    shutil.copy(x['path'], f'{ENG}/public/lac/broll/{name}')
    o = {'src': f'lac/broll/{name}', 't0': round(t0 + p.get('d0', 0), 2), 't1': round(t1 + p.get('d1', 0), 2), 'credit': credit({**x, 'tag': p.get('tag')}), 'caption': p['caption']}
    for k in ('tag', 'focus', 'zoom'):
        if k in p: o[k] = p[k]
    if name.endswith('.mp4'): o['video'] = True
    out.setdefault(sid, []).append(o)
    print(sid, o['t0'], o['t1'], name, '|', o['credit'])
json.dump(out, open(f'{S}/broll.json', 'w'), ensure_ascii=False, indent=1)
