"""Rule 31: Shorts get a new visual every 1-3 s. Builds job.shorts[*].beats from word timings.
usage: python jobs/lac-tools/make_beats.py <scratch lac dir>   (rewrites jobs/india-china-lac.json)
Each beat is (scene, needle, n, kind, props): it starts when that word is spoken. Text beats and
photo beats are separate lanes; a beat lasts until the next one in its lane (1.2-2.8 s)."""
import json, os, subprocess, sys
S = sys.argv[1]
ENG = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
JOB = f'{ENG}/jobs/india-china-lac.json'
WORDS = json.load(open(f'{S}/scene_words.json'))
REP = {}
for b in ['media/media', 'media2/media']:
    for x in json.load(open(f'{S}/{b}/report.json')):
        if 'file' in x: REP[x['file'][:-4]] = (f'{S}/{b}/{x["file"]}', x)

MISS = []
# the transcript spells many names in Devanagari
ALIAS = {'फ़र्क': 'फर्क', 'Pakistan': 'पाकिस्तान', 'सेनाएँ': 'सेनाएं', 'Ladakh': 'लद्दाख', 'Uttarakhand': 'उत्तराखंड',
         'Arunachal': 'अरुणाचल', 'McMahon': 'McMohan', 'Sikkim': 'सिक्किम', 'Bhutan': 'भूटान', 'Shimla': 'शिमला',
         'ऊँची': 'ऊंची', 'ridge': 'रिज', 'Kashmir': 'कश्मीर', 'Tibet': 'तिब्बत', 'Karakoram': 'कोरम', 'Galwan': 'गलवान',
         'patrol': 'petrol', 'Doval': 'डोवाल'}
def W(sid, needle, n=0):
    needle = '|'.join(x + ('|' + ALIAS[x] if x in ALIAS else '') for x in needle.split('|'))
    hits = [w for w in WORDS[sid] if any(x.lower() in w[0].lower() for x in needle.split('|'))]
    if len(hits) <= n:
        MISS.append(f'{sid} {needle!r}#{n}: ' + ' '.join(w[0] for w in WORDS[sid])); return None
    return hits[n][1]

AUTH = {'itbp-3': 'Ministry of Home Affairs', 'galwan-2': 'NASA World Wind / DiplomatTesterMan', 'g219-1': 'CIA (edited by SyntaxTerror)'}
def photo(name, caption, tag=None, focus=None):
    src, x = REP[name]
    out = f'{ENG}/public/lac/shorts/{name}.jpg'
    if not os.path.exists(out):
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-vf', "scale='min(1400,iw)':-2", '-q:v', '3', out], check=True)
    who = AUTH.get(name) or x['author'].split('(')[0].strip()
    d = {'kind': 'photo', 'src': f'lac/shorts/{name}.jpg', 'caption': caption, 'credit': f'Photo: {who} / Wikimedia Commons ({x["licence"]})'}
    if tag: d['tag'] = tag
    if focus: d['focus'] = focus
    return d

word = lambda text, sub=None, tone='orange': {'kind': 'word', 'text': text, **({'sub': sub} if sub else {}), 'tone': tone}
stat = lambda value, label, unit=None, tone='orange', decimals=0: {'kind': 'stat', 'value': value, 'label': label, **({'unit': unit} if unit else {}), 'tone': tone, 'decimals': decimals}
flag = lambda f, text, sub=None: {'kind': 'flag', 'flag': f, 'text': text, **({'sub': sub} if sub else {})}
icon = lambda i, text, sub=None, tone='orange': {'kind': 'icon', 'icon': i, 'text': text, **({'sub': sub} if sub else {}), 'tone': tone}
vs = lambda a, la, fa, b, lb, fb: {'kind': 'vs', 'a': a, 'la': la, 'fa': fa, 'b': b, 'lb': lb, 'fb': fb}

PLAN = {
 'short1': [
  ('S04', 'basic', 0, icon('question', 'A basic question')),
  ('S04', 'Border', 0, word('BORDER', tone='white')),
  ('S04', 'LoC', 0, word('LoC', tone='yellow')),
  ('S04', 'LAC', 0, word('LAC', tone='red')),
  ('S04', 'फ़र्क', 0, icon('question', "What's the difference?")),
  ('S05', 'International', 0, icon('check', 'International Border', 'Agreed by both, marked on the ground', 'green')),
  ('S05', 'mark', 0, photo('itbp-1', 'The ITBP guards India\'s border with China')),
  ('S05', 'Pakistan', 0, flag('PK', 'Line of Control', 'With Pakistan')),
  ('S05', '1972', 0, stat(1972, 'Simla Agreement')),
  ('S05', 'signed', 0, icon('doc', 'Set on a signed map')),
  ('S05', 'China', 0, flag('CN', 'LAC', 'With China')),
  ('S05', 'सेनाएँ', 0, photo('itbp-3', 'Indo-Tibetan Border Police guard of honour')),
  ('S05', 'control', 1, icon('soldier', 'Where each army actually is')),
  ('S05', 'साझा', 0, icon('cross', 'No agreed map', None, 'red')),
  ('S06', 'India', 0, flag('IN', '3,488 km', "India's count")),
  ('S06', 'China', 0, flag('CN', '~2,000 km', "China's count")),
  ('S06', 'यानी', 0, vs('3,488 km', 'India', 'IN', '~2,000 km', 'China', 'CN')),
  ('S06', 'एकमत', 0, icon('cross', 'Not even the length is agreed', None, 'red')),
  ('S07', 'तीन', 0, stat(3, 'Sectors')),
  ('S07', 'Western', 0, word('WESTERN', 'Ladakh')),
  ('S07', 'Ladakh', 0, photo('pangong-1', 'Pangong Tso, Ladakh')),
  ('S07', '1,597|1597', 0, stat(1597, 'Western sector', 'km')),
  ('S07', 'विवाद', 0, icon('alert', 'Most disputed', None, 'red')),
  ('S08', 'Middle', 0, word('MIDDLE', 'Himachal + Uttarakhand', 'yellow')),
  ('S08', 'Uttarakhand', 0, photo('shipkila-1', 'Shipki La, Himachal Pradesh')),
  ('S08', '545', 0, stat(545, 'Middle sector', 'km', 'yellow')),
  ('S08', 'कम', 0, icon('check', 'Least disputed', None, 'green')),
  ('S08', 'exchange', 0, icon('handshake', 'Maps exchanged', 'The only sector', 'green')),
  ('S09', 'तीसरा', 0, word('EASTERN', 'Sikkim + Arunachal')),
  ('S09', 'Arunachal', 0, photo('tawang-1', 'Tawang, Arunachal Pradesh')),
  ('S09', '1,346|1346', 0, stat(1346, 'Eastern sector', 'km')),
  ('S09', 'McMahon', 0, word('McMAHON LINE', None, 'yellow')),
  ('S10', 'Sikkim', 0, icon('star', 'Sikkim is the exception', None, 'yellow')),
  ('S10', '1890', 0, stat(1890, 'Anglo-Chinese Convention')),
  ('S10', 'China', 0, flag('CN', 'China accepts it too')),
  ('S10', '2017', 0, word('2017 · DOKLAM', None, 'red')),
  ('S10', 'Bhutan', 0, flag('BT', 'India · Bhutan · China', 'Tri-junction')),
  ('S10', '73', 0, stat(73, 'Days face to face', None, 'red')),
  ('S11', 'Prelims', 0, word('PRELIMS TIP', None, 'yellow')),
  ('S11', 'Western', 0, word('WESTERN = LADAKH', None, 'white')),
  ('S11', 'Middle', 0, word('MIDDLE = HP + UK', None, 'white')),
  ('S11', 'Eastern', 0, word('EASTERN = SIKKIM + ARUNACHAL', None, 'white')),
  ('S11', 'लंबा', 0, icon('check', 'Longest: Western', None, 'green')),
  ('S11', 'छोटा', 0, icon('check', 'Shortest: Middle', None, 'green')),
 ],
 'short2': [
  ('S12', 'Eastern', 0, photo('tawang-2', 'Tawang Monastery, Arunachal Pradesh')),
  ('S12', 'Arunachal', 0, word('ARUNACHAL PRADESH')),
  ('S12', 'South', 0, word("'SOUTH TIBET'?", "China's claim", 'red')),
  ('S12', 'दावा', 0, icon('question', 'Where did this come from?')),
  ('S13', '1914', 0, stat(1914, 'Simla Convention')),
  ('S13', 'Shimla', 0, photo('simla-3', 'Frontier map from the Simla talks', 'ORIGINAL MAP')),
  ('S13', 'Henry', 0, flag('GB', 'Henry McMahon', 'British India')),
  ('S13', 'Lonchen', 0, flag('TB', 'Lonchen Shatra', 'Tibet')),
  ('S13', 'Ivan', 0, flag('CN', 'Ivan Chen', 'China')),
  ('S14', 'McMahon', 0, word('McMAHON LINE', None, 'yellow')),
  ('S14', '890', 0, stat(890, 'Long', 'km')),
  ('S14', 'Bhutan', 0, flag('BT', 'From Bhutan...')),
  ('S14', 'Isu', 0, icon('pin', '...to Isu Razi Pass', 'Near Myanmar')),
  ('S15', 'ऊँची', 0, icon('mountain', 'Along the highest peaks')),
  ('S15', 'watershed', 0, photo('selapass-1', 'Sela Pass, Arunachal Pradesh')),
  ('S15', 'watershed', 1, word('WATERSHED', None, 'yellow')),
  ('S15', 'ridge', 0, icon('water', 'Water splits at the ridge')),
  ('S15', 'दूसरी', 0, icon('water', 'Two sides, two rivers', None, 'yellow')),
  ('S16', 'China', 0, flag('CN', 'Never signed')),
  ('S16', 'sign', 0, icon('cross', 'Not signed by China', None, 'red')),
  ('S16', 'Tibet', 0, flag('TB', "Tibet 'not independent'", "China's argument")),
  ('S16', 'treaty', 0, icon('doc', "'So no treaty'", "China's view")),
  ('S16', 'India', 0, flag('IN', 'McMahon Line is the border')),
  ('S16', 'Arunachal', 0, photo('tawang-3', 'Tawang, Arunachal Pradesh')),
  ('S16', 'अभिन्न', 0, word('ARUNACHAL = INDIA', None, 'green')),
  ('S17', 'नाम', 0, icon('doc', "China's 'new names' lists")),
  ('S17', 'Arunachal', 0, photo('vibrant-1', 'Geku village, Arunachal Pradesh')),
  ('S17', 'reject', 0, icon('cross', 'India rejects them', None, 'red')),
  ('S17', 'नए', 0, word("NAMES DON'T CHANGE FACTS", None, 'green')),
 ],
 'short3': [
  ('S19', 'Western', 0, word('WESTERN SECTOR')),
  ('S19', 'विवाद', 0, icon('alert', 'The biggest dispute', None, 'red')),
  ('S19', 'Aksai', 0, word('AKSAI CHIN', None, 'yellow')),
  ('S19', 'plateau', 0, icon('mountain', 'Cold, barren plateau')),
  ('S19', 'important', 0, icon('question', 'Why does it matter?')),
  ('S20', 'British', 0, flag('GB', 'Two British lines')),
  ('S20', '1865', 0, stat(1865, 'Johnson Line')),
  ('S20', 'Kashmir', 0, icon('check', 'Aksai Chin in Kashmir', None, 'green')),
  ('S20', '1899', 0, stat(1899, 'Macartney-MacDonald Line', None, 'yellow')),
  ('S20', 'China', 0, flag('CN', 'Most of it to China')),
  ('S21', 'Independence', 0, flag('IN', 'India chose the Johnson Line')),
  ('S21', 'Ladakh', 0, word('AKSAI CHIN = LADAKH', "India's official map", 'green')),
  ('S22', '1950', 0, word('1950s', None, 'white')),
  ('S22', 'सड़क', 0, icon('road', 'China builds a road')),
  ('S22', 'Xinjiang', 0, photo('g219-1', "China's G219 highway (map)", 'MAP')),
  ('S22', '1957', 0, stat(1957, 'India finds out', None, 'red')),
  ('S22', '1962', 0, word('→ 1962 WAR', None, 'red')),
  ('S23', 'Government', 0, icon('doc', 'Govt of India in Parliament')),
  ('S23', '38,000|38000', 0, stat(38000, 'Occupied by China', 'sq km', 'red')),
  ('S23', 'अवैध', 0, icon('alert', 'Illegal occupation', None, 'red')),
  ('S23', '1963', 0, stat(1963, 'Shaksgam Valley')),
  ('S23', '5,180|5180', 0, stat(5180, 'Ceded by Pakistan to China', 'sq km')),
  ('S23', 'मान्यता', 0, icon('cross', "India doesn't recognise it", None, 'red')),
  ('S24', 'Xinjiang', 0, flag('CN', 'Links Xinjiang to Tibet')),
  ('S24', 'Tibet', 0, photo('aksai-3', 'Aksai Chin from the ISS')),
  ('S24', 'India', 0, flag('IN', "Ladakh's security")),
  ('S24', 'Karakoram', 0, icon('mountain', 'Access to the Karakoram')),
 ],
 'short4': [
  ('S33', 'पीछे', 0, icon('soldier', 'How to pull armies back?')),
  ('S33', 'Galwan', 0, photo('galwan-2', 'Galwan valley, the 2020 clash site', 'SATELLITE VIEW')),
  ('S33', 'जवाब', 0, icon('question', 'The answer?')),
  ('S33', 'buffer', 0, word('BUFFER ZONES', None, 'yellow')),
  ('S34', 'no-patrolling|patrolling', 0, word('NO-PATROLLING ZONE')),
  ('S34', 'पीछे', 0, icon('shield', 'Both sides pull back')),
  ('S34', 'patrol', 1, icon('cross', 'Nobody patrols', None, 'red')),
  ('S34', 'मक़सद|मकसद', 0, icon('eye', 'The goal')),
  ('S34', 'टकराव', 0, icon('check', 'Distance, so no clash', None, 'green')),
  ('S35', 'Galwan', 0, word('GALWAN', 'July 2020')),
  ('S35', '3', 0, stat(3, 'Buffer zone', 'km')),
  ('S35', 'डेढ़', 0, stat(1.5, 'Each side', 'km', 'yellow', 1)),
  ('S35', 'Pangong', 0, photo('pangong-2', 'Pangong Tso, eastern Ladakh')),
  ('S35', 'Finger', 0, word('FINGER 3 → FINGER 8', 'Feb 2021', 'yellow')),
  ('S35', '8', 1, stat(8, 'No-patrolling stretch', 'km')),
  ('S36', '2021', 0, word('GOGRA · PP-17A', 'August 2021')),
  ('S36', '2022', 0, word('HOT SPRINGS · PP-15', 'September 2022', 'yellow')),
  ('S36', 'disengagement', 0, icon('check', 'Disengaged', None, 'green')),
  ('S36', 'buffer', 0, photo('pangong-3', 'Eastern Ladakh')),
  ('S37', 'सवाल', 0, icon('question', 'But questions were raised')),
  ('S37', 'Critics', 0, icon('alert', "Critics' view", None, 'red')),
  ('S37', 'Army', 0, flag('IN', 'Areas India used to patrol')),
  ('S37', 'चरवाहे', 0, icon('cross', 'Grazing lands lost', 'Local herders', 'red')),
  ('S37', 'Government', 0, icon('doc', "Government's answer")),
  ('S37', 'अस्थायी', 0, icon('clock', 'Temporary', 'Can be reviewed', 'green')),
 ],
 'short5': [
  ('S41', 'Mains', 0, word('MAINS CONCEPT', None, 'yellow')),
  ('S41', 'तीन', 0, word("THE 3 D's", None, 'white')),
  ('S41', 'Disengagement', 0, word('1 · DISENGAGEMENT')),
  ('S41', 'आमने-सामने|आमने', 0, icon('soldier', 'Pull back face-offs')),
  ('S41', 'De-escalation|escalation', 0, word('2 · DE-ESCALATION', None, 'yellow')),
  ('S41', 'अतिरिक्त', 0, icon('shield', 'Cut extra troops and weapons')),
  ('S41', 'De-induction|induction', 0, word('3 · DE-INDUCTION', None, 'red')),
  ('S41', 'वापस', 0, icon('trade', 'Send them back home')),
  ('S42', 'Eastern', 0, photo('pangong-1', 'Eastern Ladakh')),
  ('S42', 'disengagement', 0, icon('check', 'Disengagement: done', None, 'green')),
  ('S42', 'बाक़ी|बाकी', 0, icon('cross', 'De-escalation, de-induction: pending', None, 'red')),
  ('S42', 'हज़ारों|हजारों', 0, word('THOUSANDS OF TROOPS STILL THERE', None, 'red')),
 ],
 'short6': [
  ('S43', 'Special', 0, word('SPECIAL REPRESENTATIVES', None, 'yellow')),
  ('S43', 'Doval', 0, flag('IN', 'Ajit Doval', 'NSA')),
  ('S43', 'Wang', 0, flag('CN', 'Wang Yi', 'Foreign Minister')),
  ('S43', '2025', 0, word('24TH ROUND', 'Aug 2025 · New Delhi', 'white')),
  ('S43', 'early', 0, word("'EARLY HARVEST'", None, 'yellow')),
  ('S43', 'Expert', 0, icon('doc', 'Expert Group set up')),
  ('S44', 'Eastern', 0, icon('shield', 'General Level Mechanisms', 'Eastern + Middle sector')),
  ('S44', 'Lipulekh', 0, icon('trade', 'Border trade reopens')),
  ('S44', 'Shipki', 0, photo('shipkila-1', 'Shipki La, Himachal Pradesh')),
  ('S45', '2026', 0, word('25TH ROUND', 'Aug 2026 · Beijing', 'white')),
  ('S45', 'Beijing', 0, photo('modixi-3', 'PM Modi and President Xi, 2025')),
  ('S45', 'eight', 0, stat(8, 'Point joint document')),
  ('S45', 'substantial', 0, word("'EARLY AND SUBSTANTIAL HARVEST'", None, 'yellow')),
  ('S45', 'hotlines', 0, icon('phone', 'New military hotlines', None, 'green')),
 ],
}

job = json.load(open(JOB))
sc = {s['id']: s for s in job['scenes']}
fr = lambda s: max(15, round(s['durationSec'] * 30)) / 30
report = []
for sh in job['shorts']:
    off = {}; t = 0
    for k in sh['scenes']:
        off[k] = t; t += fr(sc[k])
    total = t
    # windows where the scene's own full-bleed b-roll plays: no photo cards there
    bw = [(off[k] + b['t0'], off[k] + b['t1']) for k in sh['scenes'] for b in sc[k].get('broll', [])]
    raw = []
    for sid, needle, n, spec in PLAN[sh['id']]:
        w = W(sid, needle, n)
        if w is None: continue
        raw.append({**spec, 't0': round(off[sid] + w, 2)})
    raw.sort(key=lambda b: b['t0'])
    beats = []
    for lane in ('photo', 'text'):
        L = [b for b in raw if (b['kind'] == 'photo') == (lane == 'photo')]
        for i, b in enumerate(L):
            nxt = L[i + 1]['t0'] if i + 1 < len(L) else total
            b['t1'] = round(min(b['t0'] + (3.2 if lane == 'photo' else 2.8), nxt - 0.05, total), 2)
            if b['t1'] - b['t0'] < 1.0: continue
            if lane == 'photo' and any(a < b['t1'] and b['t0'] < c for a, c in bw): continue
            beats.append(b)
    beats.sort(key=lambda b: b['t0'])
    sh['beats'] = beats
    # longest stretch with nothing new on screen (beat start or end, scene cut, b-roll cut)
    ev = sorted({0, round(total, 2)} | {round(off[k], 2) for k in sh['scenes']} | {x for b in beats for x in (b['t0'], b['t1'])} | {x for a, c in bw for x in (a, c)})
    gaps = [(round(b - a, 1), round(a, 1)) for a, b in zip(ev, ev[1:]) if b - a > 3.0]
    report.append(f"{sh['id']}: {len(beats)} beats over {total:.1f}s; gaps >3s: {gaps}")
json.dump(job, open(JOB, 'w'), ensure_ascii=False, indent=1)
print('\n'.join(report))
print('MISSING:', *MISS, sep='\n  ')
