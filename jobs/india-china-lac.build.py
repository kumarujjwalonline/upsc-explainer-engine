# Builds jobs/india-china-lac.json: one scene per script line, visuals timed to the spoken words.
import json, subprocess, re, sys
S = '/tmp/claude-0/-home-claude-upsc-explainer-engine/1b59de4d-217f-57f2-9b42-3176f8a70ecf/scratchpad/lac'
WORDS = json.load(open(f'{S}/scene_words.json'))
SECS = json.load(open(f'{S}/sections.json'))
ENG = '/home/claude/upsc-explainer-engine'

def dur(sid):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'{ENG}/public/lac/{sid}.wav'], capture_output=True, text=True).stdout)

MISS = []
def W(sid, needle, n=0, end=False):
    hits = [w for w in WORDS[sid] if any(x.lower() in w[0].lower() for x in needle.split('|'))]
    if len(hits) <= n:
        MISS.append(f'{sid} {needle!r}#{n}: ' + ' '.join(w[0] for w in WORDS[sid])); return 0
    return round(hits[n][2 if end else 1], 2)

# Places (approximate positions from open reporting; on screen as labels only)
P = {
    'galwan': [78.205, 34.752], 'gogra': [78.66, 34.39], 'hotsprings': [78.86, 34.36], 'depsang': [78.05, 35.30],
    'dbo': [77.93, 35.38], 'demchok': [79.45, 32.70], 'leh': [77.58, 34.16], 'doklam': [89.00, 27.30],
    'tawang': [91.866, 27.587], 'barahoti': [79.97, 30.83], 'lipulekh': [81.03, 30.23], 'shipki': [78.75, 31.82],
    'nathu': [88.83, 27.39], 'sela': [92.10, 27.50], 'rezang': [78.80, 33.45], 'rechin': [78.87, 33.50],
    'pangong_n': [78.84, 33.76], 'pangong_s': [78.86, 33.57], 'kkpass': [77.82, 35.51], 'isurazi': [97.32, 28.22],
    'bhutan_e': [91.63, 27.85], 'chushul': [78.65, 33.58],
}
# Pangong north-bank "Fingers" (approximate)
FING = {i: [78.735 + (i - 1) * 0.028, 33.755 + (0.004 if i in (4, 5) else 0)] for i in range(1, 9)}
if 'fingers' in globals():
    pass

WIDE = ['himalaya']
LAD = ['himalaya', 'ladakh']
ELAD = ['himalaya', 'ladakh', 'eladakh']
EAST = ['himalaya', 'east']

def T(packs, cam, layers=(), **kw):
    v = {'type': 'terrain', 'packs': packs, 'cam': cam, 'layers': list(layers)}
    v.update(kw)
    return v

def cam(t, ll, dist, tilt=40, heading=0):
    return {'t': t, 'lon': ll[0], 'lat': ll[1], 'dist': dist, 'tilt': tilt, 'heading': heading}

def line(ref=None, pts=None, **kw):
    d = {'kind': 'line'}
    if ref: d['ref'] = ref
    if pts: d['pts'] = pts
    d.update(kw)
    return d

def pin(at, label, t0=0, **kw):
    d = {'kind': 'pin', 'at': P[at] if isinstance(at, str) else at, 'label': label, 't0': t0}
    d.update(kw)
    return d

def label(at, text, t0=0, **kw):
    d = {'kind': 'label', 'at': P[at] if isinstance(at, str) else at, 'text': text, 't0': t0}
    d.update(kw)
    return d

def stamp(text, t0, **kw):
    d = {'kind': 'stamp', 'text': text, 't0': t0}
    d.update(kw)
    return d

def zone(at, t0, **kw):
    d = {'kind': 'zone', 'at': P[at] if isinstance(at, str) else at, 't0': t0}
    d.update(kw)
    return d

def units(pts, t0, **kw):
    d = {'kind': 'units', 'pts': pts, 't0': t0}
    d.update(kw)
    return d

def arrow(a, b, t0, **kw):
    d = {'kind': 'arrow', 'from': P[a] if isinstance(a, str) else a, 'to': P[b] if isinstance(b, str) else b, 't0': t0}
    d.update(kw)
    return d

def measure(refs, value, t0, dur=4, label=None, **kw):
    d = {'kind': 'measure', 'refs': refs, 'value': value, 'unit': 'km', 't0': t0, 'dur': dur}
    if label: d['label'] = label
    d.update(kw)
    return d

def counter(value, t0, label=None, unit=None, **kw):
    d = {'kind': 'counter', 'value': value, 't0': t0}
    if label: d['label'] = label
    if unit: d['unit'] = unit
    d.update(kw)
    return d

LACS = ['lac_west', 'lac_middle', 'lac_sikkim', 'lac_east']
def all_lac(t0=0, dur=3, **kw):
    return [line(r, dashed=True, color='#F2C94C', width=4, t0=t0, dur=dur, **kw) for r in LACS]

V = {}  # scene id -> dict(visual, onScreen, sfx, objective, completes, compact)

# ---------- Section 0 · Hook ----------
s = 'S00'
V[s] = dict(visual=T(ELAD, [cam(0, [78.22, 34.75], 55, 58, 75), cam(dur(s), [78.22, 34.755], 40, 56, 95)], [
    line('lac_west', dashed=True, color='#F2C94C', width=5, t0=0.2, dur=1.5, flicker=True),
    units([[78.175, 34.735], [78.18, 34.765], [78.172, 34.75]], 1.0, stagger=0.2),
    units([[78.262, 34.742], [78.258, 34.77], [78.268, 34.757]], 1.3, stagger=0.2, tone='bad'),
    label([78.10, 34.80], 'INDIA', 1.0, size=34), label([78.36, 34.80], 'CHINA', 1.3, size=34, tone='bad'),
    stamp('NO FIRING', W(s, 'गोली'), tone='bad', out=W(s, 'ऐसा') - 0.1, sub='Within 2 km of the LAC'),
    stamp('?', W(s, 'ऐसा'), tone='accent', y=0.3),
]))
s = 'S01'
V[s] = dict(visual=T(ELAD, [cam(0, P['galwan'], 40, 55, 110), cam(W(s, 'कहानी') - 0.2, P['galwan'], 48, 52, 130), cam(W(s, 'कहानी') + 2.6, [84.5, 31.0], 2900, 8, 0)], [
    pin('galwan', 'Galwan Valley', W(s, 'गलवान'), sub='June 2020', out=W(s, 'कहानी') - 0.3),
    stamp('20', W(s, '20'), tone='accent', sub='Indian soldiers martyred', out=W(s, 'कहानी') - 0.4, y=0.12),
    measure(LACS, 3488, W(s, 'कहानी') + 1.9, 4.6, 'Length of the LAC (India)', color='#F2C94C'),
    label([84.0, 33.2], 'LINE OF ACTUAL CONTROL', W(s, 'LAC'), size=36, tone='warn'),
], night=False, exag=1.6), sfx='hit')
s = 'S02'
V[s] = dict(visual=T(WIDE, [cam(0, [78, 18], 15000, 0, 0), cam(4.5, [82, 26], 7000, 10, 0), cam(9, [84.5, 31.0], 2900, 8, 0)], [
    *all_lac(8.0, 3),
], globe=True, drift=0), onScreen='GS-II · GS-III · Prelims maps')
s = 'S03'
V[s] = dict(visual={'type': 'points', 'heading': "Today's 6 questions", 'items': [
    'What is the LAC, and its 3 sectors?', 'The McMahon Line', 'The Aksai Chin dispute', '2020 standoff and buffer zones',
    'How disengagement happened', 'The way forward']})

# ---------- Section 1 · What is the LAC ----------
s = 'S04'
V[s] = dict(visual={'type': 'question', 'text': 'Border vs LoC vs LAC: what is the difference?', 'highlight': ['LoC', 'LAC']}, objective='o1')
s = 'S05'
V[s] = dict(visual={'type': 'points', 'heading': 'Three kinds of lines', 'items': [
    'International Border: agreed by both and marked on the ground',
    'LoC (with Pakistan): set on a signed map after the Simla Agreement, 1972',
    'LAC (with China): where each army actually holds, with no agreed map']}, objective='o1')
s = 'S06'
V[s] = dict(visual=T(WIDE, [cam(0, [84.5, 31.0], 2900, 8, 0), cam(dur(s), [84.5, 31.0], 2700, 10, 3)], [
    measure(LACS, 3488, 0.3, 3.9, hud=False, color='#FF8A1F'),
    {'kind': 'bars', 'title': 'Length of the LAC', 't0': W(s, '3488'), 'stagger': W(s, '2000') - W(s, '3488'), 'unit': 'km', 'items': [
        {'label': "India's count", 'value': 3488, 'color': '#FF8A1F'}, {'label': "China's count", 'value': 2000, 'color': '#E5383B'}]},
    stamp('Not even the length is agreed', W(s, 'एकमत') - 0.6, y=0.72, tone='warn'),
]), objective='o1')
s = 'S07'
V[s] = dict(visual=T(LAD, [cam(0, [84.5, 31.0], 2700, 10, 0), cam(3.5, [78.8, 34.3], 560, 42, 15), cam(dur(s), [78.9, 34.3], 480, 45, 25)], [
    measure(['lac_west'], 1597, W(s, 'Western'), W(s, 'किलोमीटर') - W(s, 'Western'), 'Western sector', color='#FF8A1F'),
    label([79.4, 35.6], 'WESTERN SECTOR', W(s, 'Western') + 1, size=40, tone='accent', sub='Ladakh'),
    pin('leh', 'Leh', 3.0),
]), objective='o1')
s = 'S08'
V[s] = dict(visual=T(WIDE, [cam(0, [78.9, 34.3], 480, 45, 25), cam(3.5, [79.6, 31.2], 520, 45, 10), cam(dur(s), [79.8, 31.0], 460, 47, 20)], [
    line('lac_west', color='#FF8A1F', width=3, t0=-1),
    measure(['lac_middle'], 545, W(s, 'Middle'), W(s, 'किलोमीटर') - W(s, 'Middle'), 'Middle sector', color='#F2C94C'),
    label([80.2, 32.4], 'MIDDLE SECTOR', W(s, 'Middle') + 1, size=40, tone='warn', sub='Himachal & Uttarakhand'),
    pin('barahoti', 'Barahoti', W(s, 'कम'), side='left'),
    stamp('Maps exchanged', W(s, 'maps'), sub='The only sector', y=0.62, tone='good'),
]), objective='o1')
s = 'S09'
V[s] = dict(visual=T(EAST, [cam(0, [79.8, 31.0], 460, 47, 20), cam(4.0, [93.0, 28.2], 900, 40, 0), cam(dur(s), [93.4, 28.1], 760, 44, 8)], [
    measure(['lac_sikkim', 'lac_east'], 1346, W(s, 'Eastern'), W(s, 'किलोमीटर') - W(s, 'Eastern'), 'Eastern sector', color='#3BB273'),
    label([94.0, 29.6], 'EASTERN SECTOR', W(s, 'Eastern') + 1, size=40, tone='good', sub='Sikkim & Arunachal'),
]), objective='o1')
s = 'S10'
V[s] = dict(visual=T(EAST + ['doklam'], [cam(0, [88.6, 27.55], 160, 48, 0), cam(W(s, 'डोकलाम') - 0.5, [88.8, 27.45], 110, 50, 10), cam(dur(s), [89.0, 27.32], 45, 58, 30)], [
    line('lac_sikkim', color='#3BB273', width=5, t0=0.3),
    label([88.45, 27.62], 'SIKKIM', 0.5, size=32), label([88.95, 27.62], 'TIBET (CHINA)', 0.8, size=30, tone='bad'),
    label([89.35, 27.25], 'BHUTAN', W(s, 'भूटान'), size=32),
    stamp('1890', W(s, '1890'), sub='Anglo-Chinese Convention', out=W(s, 'फिर'), y=0.2),
    pin('doklam', 'Doklam', W(s, 'डोकलाम'), sub='India–Bhutan–China tri-junction', tone='bad'),
    counter(73, W(s, '73') - 0.3, 'Doklam standoff, 2017', 'days', color='#E5383B', dur=1.2, pos='tr'),
]), objective='o1')
s = 'S11'
V[s] = dict(visual=T(WIDE, [cam(0, [84.5, 31.0], 2900, 8, 0), cam(dur(s), [85.0, 30.0], 3100, 22, 3)], [
    line('lac_west', color='#FF8A1F', width=6, t0=-1), line('lac_middle', color='#F2C94C', width=6, t0=-1),
    line('lac_sikkim', color='#3BB273', width=6, t0=-1), line('lac_east', color='#3BB273', width=6, t0=-1),
    label([78.0, 36.3], 'WEST: LADAKH', W(s, 'Western'), size=30, tone='accent', sub='Longest'),
    label([80.6, 32.4], 'MIDDLE: HP + UK', W(s, 'Middle'), size=30, tone='warn', sub='Shortest'),
    label([93.0, 29.8], 'EAST: SIKKIM + ARUNACHAL', W(s, 'Eastern'), size=30, tone='good'),
    {'kind': 'bars', 'title': 'Sector lengths', 't0': W(s, 'सबसे'), 'stagger': 0.5, 'unit': 'km', 'items': [
        {'label': 'Western', 'value': 1597, 'color': '#FF8A1F'}, {'label': 'Eastern', 'value': 1346, 'color': '#3BB273'}, {'label': 'Middle', 'value': 545, 'color': '#F2C94C'}]},
]), sfx='ping', objective='o1', completes=['o1'], onScreen='Prelims: West = Ladakh · Middle = HP & UK · East = Sikkim & Arunachal')

# ---------- Section 2 · McMahon Line ----------
s = 'S12'
V[s] = dict(visual=T(EAST + ['tawang'], [cam(0, [92.8, 26.7], 260, 50, 340), cam(dur(s), P['tawang'], 45, 60, 330)], [
    label([93.6, 27.9], 'ARUNACHAL PRADESH', 0.4, size=36, sub='India'),
    stamp('"South Tibet"?', W(s, 'South'), sub="China's claim; India rejects it", tone='bad', y=0.24),
    pin('tawang', 'Tawang', W(s, 'कहाँ') if any('कहाँ' in w[0] for w in WORDS[s]) else 6),
]), objective='o2')
s = 'S13'
V[s] = dict(visual={'type': 'points', 'heading': 'Simla Convention, 1914', 'items': [
    'British India: Henry McMahon', 'Tibet: Lonchen Shatra', 'China: Ivan Chen']}, objective='o2')
s = 'S14'
V[s] = dict(visual=T(EAST, [cam(0, [94.3, 28.0], 820, 22, 0), cam(dur(s), [94.4, 28.0], 720, 26, 4)], [
    measure(['lac_east'], 890, W(s, 'McMahon'), W(s, 'Isuraji') - W(s, 'McMahon'), 'McMahon Line, 1914', color='#FF8A1F'),
    label([93.0, 28.75], 'McMahon Line (1914)', W(s, 'Isuraji'), size=30, tone='accent'),
    pin('bhutan_e', "Bhutan's eastern edge", W(s, 'भूटान'), side='right'),
    pin('isurazi', 'Isu Razi Pass', W(s, 'Isuraji'), side='left'),
]), objective='o2')
s = 'S15'
V[s] = dict(visual=T(EAST, [cam(0, [93.0, 28.05], 160, 62, 270), cam(dur(s), [93.0, 28.05], 130, 64, 285)], [
    line('lac_east', color='#FF8A1F', width=5, t0=-1),
    label([93.0, 28.12], 'WATERSHED: THE HIGHEST RIDGE', 0.8, size=30, tone='accent'),
    arrow([93.05, 28.15], [93.1, 28.55], W(s, 'एक', 1) if len([w for w in WORDS[s] if 'एक' in w[0]]) > 1 else 7, label='to Tibet', tone='bad'),
    arrow([93.0, 28.0], [92.95, 27.55], W(s, 'दूसरी') if any('दूसरी' in w[0] for w in WORDS[s]) else 9, label='to India', tone='good'),
]), objective='o2')
s = 'S16'
V[s] = dict(visual={'type': 'compare',
    'left': {'heading': "China's argument", 'tone': 'muted', 'items': ['Never signed the Simla Convention', 'Says Tibet could not sign a treaty']},
    'right': {'heading': "India's position", 'tone': 'good', 'items': ['The McMahon Line is the valid boundary', 'Arunachal Pradesh is an integral part of India']}}, objective='o2')
s = 'S17'
V[s] = dict(visual={'type': 'source', 'url': 'https://www.outlookindia.com/national/mea-china-arunachal-pradesh-name-change', 'publisher': 'Outlook India',
    'title': "'Senseless Attempts', 'Invented Names': India Rejects China's Bid To Rename Places In Arunachal Pradesh",
    'why': 'MEA: renaming places does not alter the reality that Arunachal Pradesh is an integral part of India'}, objective='o2')
s = 'S18'
V[s] = dict(visual=T(EAST + ['tawang'], [cam(0, P['tawang'], 26, 62, 0), cam(dur(s), P['tawang'], 18, 64, 140)], [
    pin('tawang', 'Tawang Monastery', 0.6, sub='A major centre of Tibetan Buddhism'),
    stamp('Land + Identity + Faith', W(s, 'पहचान') if any('पहचान' in w[0] for w in WORDS[s]) else dur(s) - 4, y=0.7, tone='warn'),
], drift=0), objective='o2', completes=['o2'], sfx='ping')

# ---------- Section 3 · Aksai Chin ----------
s = 'S19'
V[s] = dict(visual=T(LAD, [cam(0, P['leh'], 140, 55, 30), cam(dur(s), [79.3, 35.05], 300, 50, 40)], [
    pin('leh', 'Leh', 0.2),
    label([79.5, 35.2], 'AKSAI CHIN', W(s, 'Aksai'), size=44, sub='Cold, high plateau · ~5,000 m'),
]), objective='o3')
s = 'S20'
V[s] = dict(visual=T(LAD, [cam(0, [79.1, 35.0], 520, 38, 10), cam(dur(s), [79.1, 35.0], 460, 42, 18)], [
    line('lac_west', dashed=True, color='#F2C94C', width=3, t0=-1),
    line('johnson', color='#FF8A1F', width=6, t0=W(s, '1865'), dur=2.5, label='Johnson Line, 1865 (approx.)', labelAt=[77.9, 35.9]),
    line('mm_line', color='#5BC0EB', width=6, dashed=True, t0=W(s, '1899'), dur=2.5, label='Macartney-MacDonald Line, 1899 (approx.)', labelAt=[78.6, 35.05]),
    label([79.7, 35.25], 'AKSAI CHIN', 0.5, size=36),
]), objective='o3')
s = 'S21'
V[s] = dict(visual=T(LAD, [cam(0, [78.6, 34.6], 600, 35, 10), cam(dur(s), [78.6, 34.6], 540, 38, 15)], [
    line('johnson', color='#FF8A1F', width=4, t0=-1),
    {'kind': 'area', 'ref': 'aksai', 'tone': 'accent', 'opacity': 0.28, 't0': W(s, 'official'), 'label': 'AKSAI CHIN', 'labelAt': [79.3, 35.2]},
    label([77.4, 34.0], 'LADAKH', 0.4, size=40),
    stamp("India's official map", W(s, 'official'), sub='All of Aksai Chin is part of Ladakh', y=0.72, tone='accent'),
]), objective='o3')
s = 'S22'
V[s] = dict(visual=T(LAD, [cam(0, [79.2, 35.4], 700, 35, 0), cam(dur(s), [79.2, 35.3], 620, 38, 8)], [
    line('g219', color='#E5383B', width=6, t0=W(s, 'सड़क'), dur=3.5, label='Xinjiang–Tibet road', labelAt=[79.6, 36.0]),
    label([78.8, 37.4], 'XINJIANG', W(s, 'Xinjiang'), size=34, tone='bad'), label([80.9, 33.2], 'TIBET', W(s, 'तिब्बत'), size=34, tone='bad'),
    stamp('1957', W(s, '1957'), sub='India finds out', y=0.6, out=W(s, '1962') - 0.2),
    stamp('1962', W(s, '1962'), sub='War', y=0.6, tone='bad'),
]), objective='o3')
s = 'S23'
V[s] = dict(visual=T(LAD, [cam(0, [78.2, 35.2], 680, 35, 0), cam(dur(s), [78.1, 35.4], 620, 38, 6)], [
    {'kind': 'area', 'ref': 'aksai', 'tone': 'bad', 'hatch': True, 't0': W(s, '38,000'), 'label': 'Aksai Chin', 'labelAt': [79.3, 35.15]},
    {'kind': 'area', 'ref': 'shaksgam', 'tone': 'bad', 'hatch': True, 't0': W(s, 'Shaksgam'), 'label': 'Shaksgam Valley', 'labelAt': [76.7, 36.05]},
    counter(38000, W(s, '38,000') - 0.3, 'Occupied by China', 'sq km', color='#E5383B', dur=1.4, pos='tr'),
    counter(5180, W(s, '5180') - 0.3, 'Shaksgam, ceded by Pakistan', 'sq km', color='#E5383B', dur=1.4, pos='tr'),
    label([76.7, 35.8], 'ceded by Pakistan, 1963', W(s, 'Shaksgam') + 0.6, size=22, tone='warn'),
]), objective='o3', onScreen='Source: Government of India reply in Parliament')
s = 'S24'
V[s] = dict(visual=T(WIDE, [cam(0, [79.4, 34.6], 1300, 30, 0), cam(dur(s), [79.4, 34.6], 1150, 33, 5)], [
    {'kind': 'area', 'ref': 'aksai', 'tone': 'bad', 'hatch': True, 't0': -1},
    arrow([79.0, 37.3], [80.6, 32.6], W(s, 'Xinjiang'), tone='bad', label='Xinjiang → Tibet', dur=1.5),
    arrow('leh', 'kkpass', W(s, 'लद्दाख'), tone='accent', label='Karakoram', dur=1.2),
    label([78.0, 33.6], 'LADAKH', 0.3, size=34), label([80.5, 37.8], 'XINJIANG', 0.3, size=32, tone='bad'), label([83.5, 32.4], 'TIBET', 0.3, size=32, tone='bad'),
]), objective='o3')
s = 'S25'
V[s] = dict(visual=T(WIDE, [cam(0, [84.5, 31.0], 2900, 8, 0), cam(dur(s), [84.5, 31.0], 2650, 12, 4)], [
    *all_lac(W(s, 'Line') - 0.2, 2.5),
    label([84.0, 33.2], 'LINE OF ACTUAL CONTROL', W(s, 'Line'), size=36, tone='warn'),
    stamp('1959', W(s, '1959'), sub="Zhou Enlai's letter first uses the term", y=0.6, out=W(s, '1962') - 0.2),
    stamp('1962', W(s, '1962'), sub='Where the armies stopped became the LAC', y=0.6, tone='bad'),
]), objective='o3')
s = 'S26'
V[s] = dict(visual=T(ELAD, [cam(0, P['galwan'], 60, 50, 90), cam(dur(s), P['galwan'], 48, 55, 110)], [
    line('lac_west', dashed=True, color='#F2C94C', width=5, t0=0.2, dur=1.2),
    stamp('1993', W(s, '1993'), sub='Agreement on peace and tranquillity', y=0.1, out=W(s, '1996') - 0.2),
    stamp('1996', W(s, '1996'), sub='No firing within 2 km of the LAC', y=0.1, out=W(s, 'इसीलिए') - 0.2),
    zone('galwan', W(s, '2'), rx=2.0, label='2 km: no firing'),
    counter(2, W(s, '2') - 0.2, 'No-firing distance from the LAC', 'km', dur=0.6, pos='bl', out=W(s, 'इसीलिए') - 0.2),
    stamp('Sticks and stones', W(s, 'लाठियों') - 0.3, sub='Galwan, 2020', y=0.1, tone='bad'),
], exag=1.6), objective='o3', completes=['o3'], sfx='ping')

# ---------- Section 4 · 2020 standoff ----------
FR = [P['galwan'], P['gogra'], P['hotsprings'], P['pangong_n'], P['pangong_s'], P['depsang'], P['demchok']]
s = 'S27'
V[s] = dict(visual=T(ELAD, [cam(0, [78.7, 34.0], 520, 42, 10), cam(dur(s), [78.7, 34.0], 450, 45, 18)], [
    line('lac_west', dashed=True, color='#F2C94C', width=4, t0=-1),
    label([78.2, 34.2], 'EASTERN LADAKH', 0.3, size=34),
    stamp('April–May 2020', W(s, 'April'), y=0.15, out=W(s, 'सैनिक') + 1.5),
    units([[p[0] + 0.06, p[1] + 0.02] for p in FR], W(s, 'सैनिक'), stagger=0.18, tone='bad'),
]), objective='o4')
s = 'S28'
V[s] = dict(visual=T(ELAD, [cam(0, [78.7, 34.0], 450, 45, 18), cam(dur(s), [78.7, 34.0], 420, 47, 22)], [
    line('lac_west', dashed=True, color='#F2C94C', width=4, t0=-1),
    pin('galwan', 'Galwan', W(s, 'Galwan')),
    pin('pangong_n', 'Pangong North', W(s, 'North')),
    pin('pangong_s', 'Pangong South', W(s, 'South'), side='left'),
    pin('gogra', 'Gogra', W(s, 'Gogra'), side='left'),
    pin('hotsprings', 'Hot Springs', W(s, 'Hot')),
    pin('depsang', 'Depsang', W(s, 'Depsang'), tone='warn'),
    pin('demchok', 'Demchok', W(s, 'Demchok'), tone='warn'),
]), objective='o4', onScreen='Friction points')
s = 'S29'
V[s] = dict(visual=T(ELAD, [cam(0, P['galwan'], 42, 55, 100), cam(dur(s), P['galwan'], 34, 57, 125)], [
    pin('galwan', 'Galwan · PP14', 0.4, sub='15 June 2020'),
    stamp('20', W(s, '20'), sub='Col. B. Santosh Babu and 19 soldiers', out=W(s, 'China') - 0.2, y=0.08),
    stamp('4', W(s, '4'), sub='Deaths China admitted', out=W(s, '1975') - 0.2, y=0.08, tone='bad'),
    stamp('Since 1975', W(s, '1975'), sub='First deaths on the LAC', y=0.1, tone='bad'),
], night=True, drift=0.3, exag=1.6), objective='o4', sfx='hit')
s = 'S30'
V[s] = dict(visual=T(ELAD, [cam(0, [79.1, 33.7], 110, 50, 330), cam(W(s, 'North') - 0.2, [78.85, 33.73], 55, 55, 0), cam(dur(s), [78.84, 33.745], 30, 58, 10)], [
    label([79.2, 33.62], 'PANGONG TSO', 0.4, size=40),
    counter(134, W(s, '134') - 0.3, 'Length of the lake', 'km', dur=1.2, pos='tr'),
    {'kind': 'bars', 'title': 'Who holds the lake', 't0': W(s, 'तिहाई') - 0.3, 'stagger': 0.6, 'pos': 'tr', 'items': [
        {'label': 'India', 'value': 1, 'text': 'about 1/3', 'color': '#3BB273'}, {'label': 'China', 'value': 2, 'text': 'about 2/3', 'color': '#E5383B'}]},
    *[label(FING[i], f'F{i}', W(s, 'Finger') + 0.15 * i, size=26, tone='warn') for i in range(1, 9)],
]), objective='o4')
s = 'S31'
V[s] = dict(visual=T(ELAD, [cam(0, [78.84, 33.745], 30, 58, 10), cam(dur(s), [78.84, 33.745], 26, 60, 18)], [
    *[label(FING[i], f'F{i}', -1, size=24, tone='warn') for i in range(1, 9)],
    pin(FING[8], "India: LAC at Finger 8", W(s, '8'), tone='good'),
    pin(FING[4], "China claims up to Finger 4", W(s, '4'), tone='bad', side='left'),
    units([FING[4]], W(s, '2020'), icon='block', tone='bad'),
]), objective='o4')
s = 'S32'
V[s] = dict(visual=T(ELAD, [cam(0, [78.86, 33.6], 45, 50, 200), cam(dur(s), [78.84, 33.52], 28, 62, 220)], [
    label([78.84, 33.5], 'KAILASH RANGE', W(s, 'Kailash'), size=36, tone='accent'),
    pin('rezang', 'Rezang La', W(s, 'चोटियों') if any('चोटियों' in w[0] for w in WORDS[s]) else 6),
    pin('rechin', 'Rechin La', (W(s, 'चोटियों') if any('चोटियों' in w[0] for w in WORDS[s]) else 6) + 0.5),
    units([P['rezang'], P['rechin']], W(s, 'positions'), stagger=0.3),
    arrow('rechin', [78.93, 33.56], W(s, 'साफ'), label='Clear view', tone='accent'),
    stamp('Leverage', W(s, 'leverage'), y=0.2, tone='good'),
]), objective='o4')
s = 'S33'
V[s] = dict(visual=T(ELAD, [cam(0, P['galwan'], 34, 56, 90), cam(dur(s), P['galwan'], 30, 58, 100)], [
    units([[78.19, 34.745], [78.195, 34.758], [78.19, 34.752]], 0.3, stagger=0.15),
    units([[78.222, 34.745], [78.218, 34.758], [78.225, 34.752]], 0.5, stagger=0.15, tone='bad'),
    stamp('?', W(s, 'हो') if any(w[0].startswith('हो') for w in WORDS[s]) else 4, out=W(s, 'buffer') - 0.3),
    stamp('Buffer zones', W(s, 'buffer'), tone='warn'),
]), objective='o4')
s = 'S34'
V[s] = dict(visual=T(ELAD, [cam(0, P['galwan'], 30, 58, 100), cam(dur(s), P['galwan'], 27, 60, 110)], [
    units([[78.18, 34.745], [78.185, 34.76]], 0.2, stagger=0.15),
    units([[78.235, 34.745], [78.23, 34.76]], 0.3, stagger=0.15, tone='bad'),
    zone('galwan', W(s, 'पीछे'), rx=1.5, label='No-patrolling zone'),
    arrow([78.195, 34.752], [78.17, 34.752], W(s, 'पीछे'), tone='accent'),
    arrow([78.215, 34.752], [78.24, 34.752], W(s, 'पीछे'), tone='bad'),
]), objective='o4')
s = 'S35'
V[s] = dict(visual=T(ELAD, [cam(0, P['galwan'], 34, 56, 100), cam(W(s, 'Pangong') - 0.3, P['galwan'], 30, 58, 110), cam(W(s, 'Pangong') + 2.2, [78.84, 33.745], 30, 58, 10), cam(dur(s), [78.84, 33.745], 27, 60, 15)], [
    zone('galwan', 0.4, rx=1.5, label='Galwan buffer zone'),
    counter(3, W(s, 'तीन') - 0.2, 'Galwan buffer zone', 'km', dur=0.8, pos='tr', out=W(s, 'Pangong') - 0.2),
    counter(8, W(s, '8', 1) - 0.3, 'Pangong north bank, Finger 3 to 8', 'km', dur=0.8, pos='tr'),
    stamp('July 2020', W(s, 'July'), y=0.15, out=W(s, 'Pangong')),
    *[label(FING[i], f'F{i}', W(s, 'Pangong'), size=22, tone='warn') for i in (3, 8)],
    {'kind': 'zone', 'at': [(FING[3][0] + FING[8][0]) / 2, 33.76], 'rx': 4.2, 'ry': 1.0, 't0': W(s, 'February'), 'label': 'Finger 3 to 8 · ~8 km'},
    stamp('Feb 2021', W(s, 'February'), y=0.15),
]), objective='o4')
s = 'S36'
V[s] = dict(visual=T(ELAD, [cam(0, [78.76, 34.37], 55, 55, 0), cam(dur(s), [78.76, 34.37], 48, 58, 10)], [
    zone('gogra', W(s, 'Gogra'), rx=1.5, label='Gogra · PP17A'),
    zone('hotsprings', W(s, 'Hot'), rx=1.5, label='Hot Springs · PP15'),
    stamp('Aug 2021', W(s, 'August'), y=0.12, out=W(s, 'September') - 0.1),
    stamp('Sep 2022', W(s, 'September'), y=0.12),
]), objective='o4')
s = 'S37'
V[s] = dict(visual={'type': 'compare',
    'left': {'heading': 'Critics', 'tone': 'warn', 'items': ['Many zones were areas the Indian Army used to patrol', 'Local herders grazed animals there']},
    'right': {'heading': 'Government', 'tone': 'neutral', 'items': ['A temporary arrangement', 'Can be revisited as the situation demands']}}, objective='o4', completes=['o4'], sfx='ping')

# ---------- Section 5 · Disengagement & talks ----------
s = 'S38'
V[s] = dict(visual=T(LAD, [cam(0, P['depsang'], 90, 50, 0), cam(W(s, 'Demchok') - 0.4, P['depsang'], 80, 52, 10), cam(dur(s), P['demchok'], 90, 52, 20)], [
    pin('depsang', 'Depsang Plains', W(s, 'Depsang'), tone='warn'), pin('dbo', 'DBO', W(s, 'Depsang') + 0.5, side='left'),
    pin('demchok', 'Demchok', W(s, 'Demchok'), tone='warn'),
]), objective='o5')
s = 'S39'
V[s] = dict(visual=T(LAD, [cam(0, [78.7, 34.0], 600, 38, 0), cam(dur(s), [78.7, 34.0], 540, 42, 8)], [
    line('lac_west', dashed=True, color='#F2C94C', width=4, t0=-1),
    stamp('21 Oct 2024', W(s, '21'), sub='Patrolling arrangement agreed', y=0.12, out=W(s, 'Depsang') - 0.2),
    pin('depsang', 'Depsang', W(s, 'Depsang'), tone='good'), pin('demchok', 'Demchok', W(s, 'Demchok'), tone='good'),
    arrow([77.95, 35.25], [78.15, 35.35], W(s, 'patrolling', 1), tone='good', label='Patrolling resumes'),
    arrow([79.30, 32.75], [79.48, 32.68], W(s, 'patrolling', 1) + 0.3, tone='good'),
    label([79.3, 32.5], 'Grazing resumes', W(s, 'grazing'), size=24, tone='good'),
    stamp('Kazan · BRICS', W(s, 'Kazan'), sub='Modi–Xi meeting, 23 Oct 2024', y=0.12),
]), objective='o5')
s = 'S40'
V[s] = dict(visual=T(ELAD, [cam(0, [78.6, 34.3], 420, 45, 15), cam(dur(s), [78.6, 34.3], 380, 47, 22)], [
    zone('galwan', 0.4, rx=2.5, label='Galwan'), zone('gogra', 0.6, rx=2.5), zone('hotsprings', 0.8, rx=2.5, label='Gogra–Hot Springs'),
    {'kind': 'zone', 'at': [78.84, 33.76], 'rx': 5, 'ry': 2, 't0': 1.0, 'label': 'Pangong'},
    pin('depsang', 'Depsang: patrols back', 1.4, tone='good'),
    stamp('Buffer zones remain', W(s, 'patrolling'), y=0.12, tone='warn'),
]), objective='o5')
s = 'S41'
V[s] = dict(visual={'type': 'flow', 'heading': 'The 3 Ds', 'steps': [
    {'label': 'Disengagement', 'sub': 'Face-to-face troops step back', 'icon': 'people'},
    {'label': 'De-escalation', 'sub': 'Extra troops and weapons reduced', 'icon': 'truck'},
    {'label': 'De-induction', 'sub': 'Troops sent back from the area', 'icon': 'home'}]}, objective='o5')
s = 'S42'
V[s] = dict(visual={'type': 'points', 'heading': 'Eastern Ladakh today', 'items': [
    'Disengagement: done', 'De-escalation: pending', 'De-induction: pending', 'Tens of thousands of troops still deployed on both sides'],
    'highlight': ['done', 'pending']}, objective='o5')
s = 'S43'
V[s] = dict(visual={'type': 'source', 'url': 'https://www.globalsecurity.org/military/library/news/2025/08/mil-250819-india-mea01.htm', 'publisher': 'Ministry of External Affairs (via GlobalSecurity.org)',
    'date': '19 Aug 2025', 'title': '24th round of Special Representatives talks, New Delhi',
    'why': 'Expert Group on "early harvest" in boundary delimitation'}, objective='o5')
s = 'S44'
V[s] = dict(visual=T(WIDE, [cam(0, [84.5, 30.5], 2800, 8, 0), cam(dur(s), [84.5, 30.5], 2600, 10, 3)], [
    *all_lac(-1),
    pin('shipki', 'Shipki La', W(s, 'Shipki')), pin('lipulekh', 'Lipulekh', W(s, 'Lipulekh')), pin('nathu', 'Nathu La', W(s, 'Nathu')),
    stamp('Border trade to reopen', W(s, 'trade'), y=0.12, tone='good'),
]), objective='o5')
s = 'S45'
V[s] = dict(visual={'type': 'source', 'url': 'https://aninews.in/news/world/asia/expert-group-to-advance-discussions-on-early-and-substantial-harvest-of-india-china-boundary-delimitation-mea20260828224910/',
    'publisher': 'ANI', 'date': '28 Aug 2026', 'title': 'Expert group to advance discussions on early and substantial harvest of India-China boundary delimitation: MEA',
    'why': '25th round, Beijing: eight-point joint outcome'}, objective='o5', completes=['o5'], sfx='ping')

# ---------- Section 6 · Way forward ----------
s = 'S46'
V[s] = dict(visual=T(WIDE, [cam(0, [84.5, 31.0], 2900, 8, 0), cam(dur(s), [84.5, 31.0], 2700, 10, 3)], [
    *all_lac(-1, flicker=True),
    stamp('Not yet', W(s, 'जवाब'), y=0.15, tone='warn'),
]), objective='o6')
s = 'S47'
V[s] = dict(visual={'type': 'points', 'heading': 'Way forward', 'items': ['1. Clarify the LAC on paper', '2. Complete the 3 Ds to build trust']}, objective='o6')
s = 'S48'
V[s] = dict(visual=T(EAST + ['tawang'], [cam(0, [92.3, 27.3], 120, 52, 330), cam(dur(s), [92.0, 27.5], 80, 56, 320)], [
    line('sela_road', color='#FF8A1F', width=6, t0=W(s, 'सेला') - 0.5, dur=2.5),
    pin('sela', 'Sela Tunnel', W(s, 'सेला')), pin('tawang', 'Tawang', W(s, 'तवांग'), side='left'),
    stamp('Vibrant Villages Programme', W(s, 'Vibrant'), sub='Keeping border villages alive', y=0.12, tone='good'),
]), objective='o6')
s = 'S49'
V[s] = dict(visual={'type': 'compare',
    'left': {'heading': 'Short-term', 'tone': 'accent', 'items': ['Hotlines', 'Patrolling protocols', 'The 3 Ds']},
    'right': {'heading': 'Long-term', 'tone': 'good', 'items': ['Boundary settlement', 'Infrastructure', 'Development of border people']}}, objective='o6')
s = 'S50'
V[s] = dict(visual=T(WIDE, [cam(0, [84.5, 31.0], 2900, 8, 0), cam(dur(s), [84.5, 31.0], 2700, 10, 3)], [
    line('lac_west', color='#FF8A1F', width=6, t0=W(s, 'Western')), line('lac_middle', color='#F2C94C', width=6, t0=W(s, 'Middle')),
    line('lac_sikkim', color='#3BB273', width=6, t0=W(s, 'Eastern')), line('lac_east', color='#3BB273', width=6, t0=W(s, 'Eastern')),
    measure(LACS, 3488, W(s, 'LAC') - 0.2, 3.4, 'Length of the LAC', hud=True, color='#FFFFFF', width=3, out=W(s, 'Western', 1) - 0.3),
    label([93.5, 29.5], 'McMahon Line', W(s, 'मैकमाहन'), size=30, tone='good'),
    {'kind': 'area', 'ref': 'aksai', 'tone': 'bad', 'hatch': True, 't0': W(s, 'अक्साई'), 'label': 'Aksai Chin', 'labelAt': [79.3, 35.2]},
]), objective='o6')
s = 'S51'
V[s] = dict(visual=T(ELAD, [cam(0, [78.6, 34.0], 500, 42, 10), cam(dur(s), [78.6, 34.0], 450, 45, 16)], [
    zone('galwan', W(s, 'buffer'), rx=2.5), zone('gogra', W(s, 'buffer') + 0.2, rx=2.5), zone('hotsprings', W(s, 'buffer') + 0.4, rx=2.5),
    {'kind': 'zone', 'at': [78.84, 33.76], 'rx': 5, 'ry': 2, 't0': W(s, 'buffer') + 0.6},
    pin('depsang', 'Depsang', W(s, 'डेपसांग'), tone='good'), pin('demchok', 'Demchok', W(s, 'डेमचौक'), tone='good'),
    stamp('A long road ahead', W(s, 'लंबा') - 1.0, y=0.12, tone='warn'),
]), objective='o6')
s = 'S52'
V[s] = dict(visual=T(WIDE, [cam(0, [84.5, 31.0], 2800, 8, 0), cam(dur(s) * 0.45, [84.5, 31.0], 3400, 5, 0), cam(dur(s), [82, 24], 16000, 0, 0)], [
    *all_lac(-1, flicker=True),
], globe=True, drift=0), objective='o6', completes=['o6'])

# ---------- rule 29: timeline bars ----------
def ev(date, lab, sid, needle, n=0, also=()):
    e = {'date': date, 'label': lab, 'scene': sid, 'sec': W(sid, needle, n)}
    if also: e['also'] = [{'scene': a, 'sec': W(a, b)} for a, b in also]
    return e
TIMELINES = [
    {'title': 'Key dates', 'from': 'S13', 'to': 'S26', 'events': [
        ev('1865', 'Johnson Line', 'S20', '1865'),
        ev('1899', 'Macartney-MacDonald Line', 'S20', '1899'),
        ev('1914', 'Simla Convention', 'S13', '1914'),
        ev('1957', 'China road found', 'S22', '1957'),
        ev('1959', "'LAC' first used", 'S25', '1959'),
        ev('1962', 'War', 'S22', '1962', also=[('S25', '1962')]),
        ev('1963', 'Shaksgam ceded', 'S23', '1963'),
        ev('1993', 'Peace agreement', 'S26', '1993'),
        ev('1996', 'No-firing pact', 'S26', '1996'),
    ]},
    {'title': '2020 to today', 'from': 'S27', 'to': 'S45', 'events': [
        ev('Apr 2020', 'Troop build-up', 'S27', 'April'),
        ev('Jun 2020', 'Galwan clash', 'S29', '15'),
        ev('Jul 2020', 'Galwan buffer', 'S35', 'July'),
        ev('Aug 2020', 'Kailash Range', 'S32', 'August'),
        ev('Feb 2021', 'Pangong pull-back', 'S35', 'February'),
        ev('Aug 2021', 'Gogra', 'S36', 'August'),
        ev('Sep 2022', 'Hot Springs', 'S36', 'September'),
        ev('Oct 2024', 'Depsang, Demchok deal', 'S39', 'October'),
        ev('Aug 2025', 'SR talks, 24th round', 'S43', 'अगस्त'),
        ev('Aug 2026', 'SR talks, 25th round', 'S45', 'अगस्त'),
    ]},
]

# ---------- rules 19/30: real photos and footage ----------
BR = json.load(open(f'{S}/broll.json')) if __import__('os').path.exists(f'{S}/broll.json') else {}

# ---------- assemble ----------
scenes = []
for sec in SECS:
    for sc in sec['scenes']:
        sid = sc['id']
        v = V[sid]
        scene = {'id': sid, 'narration': sc['text'], 'durationSec': round(dur(sid), 3), 'audio': f'lac/{sid}.wav', 'visual': v['visual']}
        if sid in BR: scene['broll'] = BR[sid]
        for k in ('objective', 'completes', 'onScreen', 'sfx', 'compact'):
            if k in v: scene[k] = v[k]
        scenes.append(scene)
# objective for S00–S03 hook: none; keep tracker idle
job = {
    'id': 'india-china-lac',
    'title': 'India-China Border (LAC) Explained',
    'format': '16:9',
    'tracker': {'title': 'LAC', 'objectives': [
        {'id': 'o1', 'label': 'What is the LAC (3 sectors)'}, {'id': 'o2', 'label': 'McMahon Line'},
        {'id': 'o3', 'label': 'Aksai Chin'}, {'id': 'o4', 'label': '2020 standoff & buffer zones'},
        {'id': 'o5', 'label': 'Disengagement & talks'}, {'id': 'o6', 'label': 'Way forward & recap'}]},
    'scenes': scenes,
    'shorts': [
        {'id': 'short1', 'hook': "Why India and China can't even agree on the border's length", 'scenes': [f'S{i:02d}' for i in range(4, 12)]},
        {'id': 'short2', 'hook': "Why China calls Arunachal 'South Tibet'", 'scenes': [f'S{i:02d}' for i in range(12, 18)]},
        {'id': 'short3', 'hook': 'China built a road on Indian land, and India found out years later', 'scenes': [f'S{i:02d}' for i in range(19, 25)]},
        {'id': 'short4', 'hook': 'How do you stop two armies from clashing again?', 'scenes': [f'S{i:02d}' for i in range(33, 38)]},
        {'id': 'short5', 'hook': 'Disengagement is done. So why are troops still there?', 'scenes': ['S41', 'S42']},
        {'id': 'short6', 'hook': "What is the 'early harvest' India and China keep talking about?", 'scenes': ['S43', 'S44', 'S45']},
    ],
    'thumbnail': {'headline': 'WHERE IS THE BORDER?', 'sub': 'LAC Explained', 'scene': 'S20'},
    'timelines': TIMELINES,
}
if MISS:
    print('\n'.join(MISS)); sys.exit(1)
json.dump(job, open(f'{ENG}/jobs/india-china-lac.json', 'w'), ensure_ascii=False, indent=1)
print('scenes', len(scenes), 'total', round(sum(s['durationSec'] for s in scenes), 1), 's')
print('terrain scenes', sum(1 for s in scenes if s['visual']['type'] == 'terrain'))
