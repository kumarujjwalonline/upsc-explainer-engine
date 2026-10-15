# Builds the engine job for the Urban Heat Island video from the approved script (v3) and the
# measured scene clips. usage: python3 make_job.py <script-v3.md> <clips.json> <out job.json>
import json, re, sys

SCRIPT, CLIPS, OUT = sys.argv[1:4]
GAP = 0.75
scr = open(SCRIPT, encoding='utf8').read()
narr = {f'S{m.group(1)}': m.group(2).strip() for m in re.finditer(r'\*\*S(\d\d)\*\* · (.+)', scr)}
clips = json.load(open(CLIPS))


def at(sid, word, k=0):
    """Approximate second at which `word` is spoken in scene sid (by text position)."""
    t = re.sub(r'\[[^\]]*\]', '', narr[sid]).strip()
    i = -1
    for _ in range(k + 1):
        i = t.find(word, i + 1)
    if i < 0:
        raise SystemExit(f'{sid}: "{word}" not in narration')
    return round(clips[sid] * i / len(t), 2)


CITY = 'Imagery: Copernicus Sentinel-2 (2024) · Relief: Terrarium elevation (SRTM et al.) · Borders: Survey of India outline · Heat glow: illustrative'
RELIEF = 'Relief: Terrarium elevation (SRTM et al.) · Borders: Survey of India outline · Heat glow: illustrative'
AHD = [72.58, 23.03]
DEL = [77.21, 28.61]
MUM = [72.88, 19.07]
CHE = [80.27, 13.08]
COAST = [[70.0, 22.3], [72.6, 21.0], [72.85, 19.0], [73.7, 16.0], [74.8, 12.9], [76.2, 10.0], [77.5, 8.1], [78.2, 8.9], [79.8, 10.3],
         [80.3, 13.1], [80.1, 15.9], [82.2, 16.6], [83.3, 17.7], [85.8, 19.8], [86.9, 21.3], [88.2, 21.8]]


def cam(t, lon, lat, dist, tilt=40, heading=0):
    return {'t': t, 'lon': lon, 'lat': lat, 'dist': dist, 'tilt': tilt, 'heading': heading}


def terrain(packs, cams, layers, credit=RELIEF, **kw):
    v = {'type': 'terrain', 'packs': packs, 'cam': cams, 'layers': layers, 'credit': credit}
    v.update(kw)
    return v


def lab(mode, **kw):
    v = {'type': 'heatlab', 'mode': mode}
    v.update(kw)
    return v


def src(url, publisher, date, title, why, authors=None):
    v = {'type': 'source', 'url': url, 'publisher': publisher, 'date': date, 'title': title, 'why': why}
    if authors:
        v['authors'] = authors
    return v


S = {}  # id -> (objective, completes, onScreen, sfx, visual)
d = clips
S['S00'] = ('o1', [], "Ahmedabad, May 2010: ~1,344 extra deaths in one month", 'hit', terrain(
    ['india', 'gujarat', 'ahmedabad'],
    [cam(0, 76, 22.5, 1900, 20, 0), cam(3.2, 72.9, 23.0, 420, 32, 5), cam(7.0, 72.58, 23.03, 48, 50, 15), cam(d['S00'], 72.58, 23.03, 30, 58, 30)],
    [{'kind': 'pin', 'at': AHD, 'label': 'Ahmedabad', 'sub': 'Gujarat', 't0': 2.6, 'out': 7.2},
     {'kind': 'counter', 'to': 1344, 'from': 0, 'dur': 2.6, 't0': at('S00', '1,344') - 0.6, 'prefix': '~', 'label': 'extra deaths · May 2010', 'x': 0.05, 'y': 0.08},
     {'kind': 'heat', 'at': AHD, 'rx': 16, 'ry': 13, 't0': at('S00', 'सूरज'), 'grow': 2.0},
     {'kind': 'clock', 'from': 19, 'to': 24, 'dur': 3.5, 't0': at('S00', 'सूरज'), 'x': 0.86, 'y': 0.07, 'label': 'Midnight'},
     {'kind': 'label', 'at': [72.47, 22.93], 'text': 'still hot', 'tone': 'accent', 't0': at('S00', 'तो सवाल'), 'size': 34}],
    credit=CITY, night=True, drift=0.4))
S['S01'] = ('o1', [], "45°C dry vs 35°C humid: which is deadlier?", 'tick', lab('dryhumid'))
S['S02'] = ('o1', [], 'URBAN HEAT ISLAND', 'whoosh', terrain(
    ['sasia', 'india', 'delhi'],
    [cam(0, 70, 18, 9000, 0, 0), cam(3.0, 77.5, 27.5, 1400, 25, 0), cam(6.2, 77.2, 28.62, 60, 50, 10), cam(d['S02'], 77.2, 28.62, 42, 56, 20)],
    [{'kind': 'pin', 'at': DEL, 'label': 'Delhi', 't0': 2.6, 'out': 6.0},
     {'kind': 'heat', 'at': DEL, 'rx': 24, 'ry': 22, 't0': 5.6, 'grow': 2.2, 'label': 'Heat island'}],
    credit=CITY, night=True, globe=True, drift=0.3))
S['S03'] = ('o1', [], None, 'pop', {'type': 'points', 'heading': "Today's four questions",
            'items': ['What is an Urban Heat Island, and why does it form?', 'When is a heatwave declared?', 'What is wet bulb temperature, really?', 'How do Heat Action Plans save lives?'],
            'highlight': ['Urban Heat Island', 'heatwave', 'wet bulb', 'Heat Action Plans']})
S['S04'] = ('o1', [], 'UHI = city warmer than its surroundings', None, lab('profile'))
S['S05'] = ('o1', [], 'Day: ~0.5–4°C warmer · Night: ~1–3°C warmer', 'tick', lab('gapbars'))
S['S06'] = ('o1', [], None, 'whoosh', {'type': 'footage', 'query': 'city skyline night India', 'caption': 'After sunset, the city stays hot', 'fallback': lab('daynight', variant='sunset')})
S['S07'] = ('o1', ['o1'], 'Day: absorb · Night: release', None, lab('daynight', variant='cycle'))
S['S08'] = ('o2', [], None, 'pop', {'type': 'question', 'text': 'What turns a city into a heat island? Five big causes.', 'highlight': ['Five big causes']})
S['S09'] = ('o2', [], 'Albedo: asphalt 0.05–0.10 · white concrete 0.70–0.80', None, lab('albedo'))
S['S10'] = ('o2', [], "Evapotranspiration = nature's cooler", None, lab('evapo'))
S['S11'] = ('o2', [], 'Urban canyon traps heat', None, lab('canyon'))
S['S12'] = ('o2', [], 'Anthropogenic (waste) heat', None, lab('waste'))
S['S13'] = ('o2', [], 'Haze traps night-time heat', None, lab('haze'))
S['S14'] = ('o2', [], None, 'ping', {'type': 'hub', 'center': {'label': 'City = heat trap', 'icon': 'bolt'},
            'spokes': [{'label': 'Low albedo'}, {'label': 'Less greenery'}, {'label': 'Urban canyon'}, {'label': 'Waste heat'}, {'label': 'Pollution haze'}]})
S['S15'] = ('o2', ['o2'], 'Power · water · urban poor · outdoor workers', None,
            {'type': 'footage', 'query': 'construction workers India', 'caption': 'Outdoor workers face the most heat', 'fallback': {'type': 'points', 'heading': 'UHI impacts (Mains)', 'items': ['Higher demand for electricity', 'More pressure on water', 'Slum dwellers hit hardest', 'Outdoor workers at most risk'],
             'highlight': ['electricity', 'water', 'Slum dwellers', 'Outdoor workers']}})
S['S16'] = ('o3', [], None, 'whoosh', terrain(
    ['sasia', 'india'], [cam(0, 77.2, 28.6, 260, 45, 0), cam(d['S16'] - 0.5, 80.5, 21.5, 2700, 38, 0)],
    [{'kind': 'label', 'at': [81, 30.6], 'text': 'HIMALAYA', 't0': 2.8, 'size': 30},
     {'kind': 'label', 'at': [82, 26.0], 'text': 'INDO-GANGETIC PLAIN', 't0': 3.4, 'size': 26},
     {'kind': 'label', 'at': [77.3, 17.5], 'text': 'DECCAN PLATEAU', 't0': 4.0, 'size': 26}]))
s17 = [cam(0, 80.5, 22.5, 2800, 36, 0), cam(d['S17'], 80.5, 22.8, 2750, 36, 0)]
S['S17'] = ('o3', [], 'Plains ≥40°C · Coast ≥37°C · Hills ≥30°C', None, terrain(['sasia', 'india'], s17, [
    {'kind': 'heat', 'at': [80.5, 26.2], 'rx': 650, 'ry': 260, 't0': at('S17', 'plains'), 'label': 'Plains ≥ 40°C'},
    {'kind': 'line', 'pts': COAST, 'color': '#F2C94C', 'width': 6, 't0': at('S17', 'coastal'), 'dur': 1.8, 'label': 'Coast ≥ 37°C', 'labelAt': [73.0, 16.5]},
    {'kind': 'heat', 'at': [78.6, 31.0], 'rx': 360, 'ry': 120, 't0': at('S17', 'hilly'), 'color': '#F2C94C', 'label': 'Hills ≥ 30°C'}], drift=0.15))
S['S18'] = ('o3', [], '+4.5 to +6.4°C → Heatwave · above +6.4°C → Severe', None, lab('thermo', thermo={
    'heading': 'How far above normal?', 'min': -1, 'max': 8.5, 'from': 0, 'to': 7.6, 'unit': 'dep',
    'marks': [{'v': 0, 'label': 'Normal', 'tone': 'muted'}, {'v': 4.5, 'label': '+4.5°C'}, {'v': 6.4, 'label': '+6.4°C', 'tone': 'bad'}],
    'bands': [{'from': 4.5, 'to': 6.4, 'label': 'Heatwave', 'tone': 'warn'}, {'from': 6.4, 'to': 8.5, 'label': 'Severe heatwave', 'tone': 'bad'}]}))
S['S19'] = ('o3', [], 'Actual ≥45°C → Heatwave · ≥47°C → Severe', None, lab('thermo', thermo={
    'heading': 'Whatever the normal is', 'min': 38, 'max': 50, 'from': 39, 'to': 48.5,
    'marks': [{'v': 45, 'label': '45°C'}, {'v': 47, 'label': '47°C', 'tone': 'bad'}],
    'bands': [{'from': 45, 'to': 47, 'label': 'Heatwave', 'tone': 'warn'}, {'from': 47, 'to': 50, 'label': 'Severe heatwave', 'tone': 'bad'}]}))
S['S20'] = ('o3', [], '≥2 stations · 2 consecutive days · declared on day 2', None, terrain(
    ['sasia', 'india'], [cam(0, 80.5, 21.5, 2600, 38, 0), cam(3.5, 79.0, 26.9, 620, 45, 0), cam(d['S20'], 79.0, 26.9, 560, 48, 8)],
    [{'kind': 'heat', 'at': [79.0, 27.0], 'rx': 170, 'ry': 120, 't0': 3.0, 'color': '#F2C94C', 'label': 'One sub-division'},
     {'kind': 'pin', 'at': [78.2, 27.5], 'label': 'Station 1', 't0': at('S20', '2 stations'), 'side': 'left'},
     {'kind': 'pin', 'at': [79.8, 26.6], 'label': 'Station 2', 't0': at('S20', '2 stations') + 0.4, 'side': 'right'},
     {'kind': 'stamp', 'text': 'DAY 1', 't0': at('S20', 'लगातार'), 'out': at('S20', 'लगातार') + 1.5, 'tone': 'warn', 'y': 0.12},
     {'kind': 'stamp', 'text': 'DAY 2', 't0': at('S20', 'लगातार') + 1.8, 'out': at('S20', 'दूसरे दिन') - 0.2, 'tone': 'accent', 'y': 0.12},
     {'kind': 'stamp', 'text': 'HEATWAVE DECLARED', 'sub': 'on day 2', 't0': at('S20', 'दूसरे दिन'), 'tone': 'bad', 'y': 0.12}],
    credit=RELIEF + ' · Stations: illustrative'))
S['S21'] = ('o3', [], None, 'ping', {'type': 'formula', 'heading': 'IMD heatwave numbers (Prelims)', 'lines': [
    {'text': 'Thresholds: plains 40 · coast 37 · hills 30 (°C)', 'note': 'maximum temperature'},
    {'text': 'Departure: +4.5 to +6.4 → heatwave · more than +6.4 → severe', 'note': 'above normal'},
    {'text': 'Actual: 45 or more → heatwave · 47 or more → severe', 'final': True}]})
S['S22'] = ('o3', ['o3'], 'What about humidity?', 'hit', {'type': 'question', 'text': 'These criteria look at temperature, not humidity.', 'highlight': ['not humidity']})
S['S23'] = ('o4', [], None, 'whoosh', terrain(
    ['sasia', 'india', 'delhi'], [cam(0, 77.2, 28.6, 420, 42, 0), cam(1.2, 77.0, 28.0, 700, 40, 0), cam(d['S23'] - 0.6, 73.4, 19.6, 700, 40, 0)],
    [{'kind': 'pin', 'at': DEL, 'label': 'Delhi', 'sub': 'Dry heat, e.g. 42°C', 't0': 0.4},
     {'kind': 'arrow', 'from': DEL, 'to': MUM, 't0': 1.4, 'dur': 4.5, 'color': '#F2C94C'},
     {'kind': 'pin', 'at': MUM, 'label': 'Mumbai', 'sub': 'Humid heat, e.g. 34°C', 't0': at('S23', 'Mumbai')}],
    credit=RELIEF + ' · Temperatures: illustrative'))
S['S24'] = ('o4', [], 'Sweat cools only if it evaporates', None, lab('sweat'))
S['S25'] = ('o4', [], 'Wet bulb = lowest temperature reachable by evaporation', None, lab('wetbulb'))
S['S26'] = ('o4', [], 'Dry air: big gap · 100% humidity: no gap', None, lab('wetgap'))
S['S27'] = ('o4', [], 'Skin ≈ 35°C · Wet bulb 35°C → no cooling', 'hit', lab('body'))
S['S28'] = ('o4', [], '35°C wet bulb · ~6 hours · theoretical limit', None, src(
    'https://www.pnas.org/doi/10.1073/pnas.0913352107', 'PNAS (Proceedings of the National Academy of Sciences)', 'May 2010',
    'An adaptability limit to climate change due to heat stress', '35°C wet bulb as the theoretical limit for human survival', 'Steven C. Sherwood, Matthew Huber'))
S['S29'] = ('o4', [], 'Real-world limit: ~30–31°C wet bulb', 'tick', {'type': 'stat', 'value': 31, 'from': 35, 'prefix': '~', 'suffix': '°C', 'label': 'critical wet bulb limit measured in real people',
            'source': 'Vecellio et al., Journal of Applied Physiology, 2022 (Penn State)'})
S['S30'] = ('o4', [], 'Persian Gulf: brief readings above 35°C wet bulb', 'whoosh', terrain(
    ['sasia', 'india'],
    [cam(0, 62, 18, 9000, 0, 0), cam(4.0, 52.2, 25.6, 1500, 32, 0), cam(at('S30', 'Indian subcontinent') - 0.5, 52.5, 25.4, 1350, 34, 0), cam(d['S30'], 77.5, 22.0, 3100, 34, 0)],
    [{'kind': 'pin', 'at': [50.1, 26.3], 'label': 'Dhahran', 't0': 4.2, 'side': 'left', 'tone': 'bad'},
     {'kind': 'pin', 'at': [51.53, 25.29], 'label': 'Doha', 't0': 4.8, 'side': 'left', 'tone': 'bad'},
     {'kind': 'pin', 'at': [55.94, 25.79], 'label': 'Ras Al Khaimah', 't0': 5.4, 'side': 'right', 'tone': 'bad'},
     {'kind': 'heat', 'at': [52.5, 25.8], 'rx': 380, 'ry': 200, 't0': 6.0},
     {'kind': 'heat', 'at': [81.0, 26.0], 'rx': 700, 'ry': 260, 't0': at('S30', 'Indian subcontinent')},
     {'kind': 'heat', 'at': [68.5, 25.0], 'rx': 300, 'ry': 220, 't0': at('S30', 'Indian subcontinent') + 0.3},
     {'kind': 'line', 'pts': COAST, 'color': '#FF8A1F', 'width': 6, 't0': at('S30', 'Indian subcontinent') + 0.5, 'dur': 2.0}],
    credit='Relief: Terrarium elevation (SRTM et al.) · Borders: Survey of India outline · Data: Raymond et al., Science Advances 2020 · Glow: illustrative', globe=True, drift=0.1))
S['S31'] = ('o4', ['o4'], None, None, terrain(
    ['sasia', 'india'], [cam(0, 76.5, 17.5, 2000, 38, 0), cam(d['S31'], 76.5, 16.5, 1800, 40, 0)],
    [{'kind': 'pin', 'at': MUM, 'label': 'Mumbai', 't0': at('S31', 'Mumbai'), 'side': 'left'},
     {'kind': 'pin', 'at': CHE, 'label': 'Chennai', 't0': at('S31', 'Chennai'), 'side': 'right'},
     {'kind': 'heat', 'at': MUM, 'rx': 70, 't0': at('S31', 'UHI'), 'label': 'humid + UHI'},
     {'kind': 'heat', 'at': CHE, 'rx': 70, 't0': at('S31', 'UHI') + 0.3, 'label': 'humid + UHI'}], drift=0.1))
S['S32'] = ('o5', [], None, 'whoosh', terrain(
    ['india', 'gujarat', 'ahmedabad'],
    [cam(0, 77, 22, 2300, 34, 0), cam(2.0, 72.8, 23.0, 320, 40, 0), cam(d['S32'], 72.58, 23.04, 34, 56, 20)],
    [{'kind': 'pin', 'at': AHD, 'label': 'Ahmedabad', 'sub': 'Gujarat', 't0': 1.2, 'out': 3.6},
     {'kind': 'label', 'at': [72.574, 23.075], 'text': 'Sabarmati river', 't0': 3.4, 'size': 26, 'color': '#9CC8F0'}],
    credit=CITY.replace(' · Heat glow: illustrative', ''), drift=0.6))
S['S33'] = ('o5', [], 'May 2010: ~1,344 excess deaths (+43%)', 'ping', {'type': 'stat', 'value': 1344, 'prefix': '~', 'label': 'excess deaths in Ahmedabad in May 2010 (+43%)',
            'source': 'Azhar et al., PLoS ONE 2014; Hess et al. 2018'})
S['S34'] = ('o5', [], '2013: Ahmedabad HAP — first in South Asia', None, {'type': 'flow', 'heading': "South Asia's first Heat Action Plan", 'steps': [
    {'label': 'Ahmedabad Municipal Corporation', 'icon': 'home'}, {'label': '+ public health experts', 'icon': 'people'}, {'label': 'Heat Action Plan, 2013', 'sub': 'first in South Asia', 'icon': 'check'}]})
S['S35'] = ('o5', [], '1 Awareness · 2 Early warning + coordination', None, {'type': 'flow', 'heading': 'Heat Action Plan: pillars 1 and 2', 'steps': [
    {'label': '1. Public awareness', 'sub': "what to do, what not to do", 'icon': 'people'}, {'label': '2. Early warning', 'sub': 'colour-coded alerts, departments coordinate', 'icon': 'bolt'}]})
S['S36'] = ('o5', [], '3 Health capacity · 4 Reduce exposure', None, {'type': 'flow', 'heading': 'Heat Action Plan: all four pillars', 'steps': [
    {'label': '1. Awareness', 'icon': 'people'}, {'label': '2. Early warning', 'icon': 'bolt'},
    {'label': '3. Health capacity', 'sub': 'train doctors and health workers', 'icon': 'check'}, {'label': '4. Reduce exposure', 'sub': 'water, cool spaces, work hours', 'icon': 'home'}]})
S['S37'] = ('o5', [], '~1,190 deaths avoided per year', 'ping', {'type': 'stat', 'value': 1190, 'prefix': '~', 'label': 'deaths avoided each year after the plan (estimate)',
            'source': 'Hess et al., Journal of Environmental and Public Health, 2018'})
S['S38'] = ('o5', [], 'NDMA heatwave guidelines (2016, revised later)', None, terrain(
    ['sasia', 'india'], [cam(0, 79.5, 22, 2700, 34, 0), cam(d['S38'], 79.5, 21.5, 2600, 36, 0)],
    [{'kind': 'pin', 'at': AHD, 'label': 'Ahmedabad', 'sub': 'first, 2013', 't0': 0.6, 'side': 'left'},
     {'kind': 'pin', 'at': [79.09, 21.15], 'label': 'Nagpur', 't0': at('S38', 'राज्य'), 'side': 'left'},
     {'kind': 'pin', 'at': [85.82, 20.30], 'label': 'Odisha', 't0': at('S38', 'राज्य') + 0.4, 'side': 'right'},
     {'kind': 'pin', 'at': [78.47, 17.39], 'label': 'Telangana', 't0': at('S38', 'राज्य') + 0.8, 'side': 'right'},
     {'kind': 'pin', 'at': [80.65, 16.51], 'label': 'Andhra Pradesh', 't0': at('S38', 'राज्य') + 1.2, 'side': 'right'},
     {'kind': 'pin', 'at': DEL, 'label': 'Delhi', 't0': at('S38', 'राज्य') + 1.6, 'side': 'left'}],
    credit='Relief: Terrarium elevation (SRTM et al.) · Borders: Survey of India outline · Pins: examples of Heat Action Plans', drift=0.1))
S['S39'] = ('o5', [], 'CPR 2023: 37 HAPs · 18 states', None, {'type': 'stat', 'value': 37, 'suffix': ' plans', 'label': 'Heat Action Plans reviewed across 18 states',
            'source': 'Centre for Policy Research, March 2023'})
S['S40'] = ('o5', [], 'Vulnerability 2/37 · Funding 11/37 · Legal basis 0/37', 'hit', {'type': 'points', 'heading': 'What the CPR review found (out of 37 plans)', 'items': [
    'Proper vulnerability assessment: only 2', 'Talked about where the money comes from: only 11', 'Stated their legal basis: 0'], 'highlight': ['only 2', 'only 11', '0']})
S['S41'] = ('o5', [], 'Local thresholds: 10/37', None, {'type': 'stat', 'value': 10, 'suffix': ' of 37', 'label': 'plans set local temperature thresholds',
            'source': 'Centre for Policy Research, March 2023'})
S['S42'] = ('o5', ['o5'], 'Not a notified disaster · states use up to 10% of SDRF', None, {'type': 'flow', 'heading': 'The policy gap', 'steps': [
    {'label': 'DM Act: notified disasters', 'icon': 'doc'}, {'label': 'Heatwave not on the list', 'icon': 'cross'},
    {'label': 'State declares it state-specific', 'sub': 'e.g. Telangana', 'icon': 'check'}, {'label': 'Relief from up to 10% of SDRF', 'icon': 'money'}]})
S['S43'] = ('o6', [], None, 'pop', {'type': 'footage', 'query': 'aerial view Indian city', 'caption': 'The fix is in how we build cities', 'fallback': lab('redesign', variant='intro')})
S['S44'] = ('o6', [], 'Cool roofs · Telangana target: 300 sq km by 2028', None, lab('redesign', variant='roofs'))
S['S45'] = ('o6', [], None, None, lab('redesign', variant='green'))
S['S46'] = ('o6', [], None, None, {'type': 'footage', 'query': 'street vendor India', 'caption': 'Outdoor workers: shifted hours, water, shade', 'fallback': {'type': 'points', 'heading': 'Way forward', 'items': ['4. Add humidity and wet bulb to heat alerts', '5. Outdoor workers: shifted hours, drinking water, cool shelters'],
            'highlight': ['humidity and wet bulb', 'Outdoor workers']}})
S['S47'] = ('o6', [], 'Short-term vs long-term measures', None, {'type': 'compare', 'left': {'heading': 'Short-term', 'items': ['Heat alerts', 'Drinking water', 'Health system ready'], 'tone': 'warn'},
            'right': {'heading': 'Long-term', 'items': ['Cool roofs', 'Greenery and water bodies', 'Heat-resilient city planning'], 'tone': 'good'}})
S['S48'] = ('o6', [], None, None, {'type': 'points', 'heading': 'Recap', 'items': ['UHI causes: low albedo, less greenery, urban canyon, waste heat, pollution', 'IMD thresholds: plains 40, coast 37, hills 30 (°C)'],
            'highlight': ['UHI causes', '40, coast 37, hills 30']})
S['S49'] = ('o6', [], None, None, {'type': 'points', 'heading': 'Recap', 'items': ['Wet bulb: can sweat still cool the body?', 'Real danger starts near 31°C wet bulb, before 35', 'HAPs save lives when local, funded and legally backed'],
            'highlight': ['31°C', 'local, funded and legally backed']})
S['S50'] = ('o6', ['o6'], "35°C… but what's the humidity?", 'hit', terrain(
    ['sasia', 'india', 'ahmedabad'], [cam(0, 72.58, 23.03, 40, 55, 20), cam(d['S50'], 74, 21, 9000, 0, 0)],
    [{'kind': 'heat', 'at': AHD, 'rx': 16, 't0': -1}], credit=CITY, globe=True, night=True, drift=0.2))

scenes = []
for sid in sorted(narr):
    obj, comp, on, sfx, vis = S[sid]
    sc = {'id': sid, 'narration': narr[sid], 'durationSec': round(clips[sid] + GAP, 2), 'audio': f'jobs/urban-heat-island/{sid}.mp3', 'objective': obj, 'completes': comp, 'visual': vis}
    if on:
        sc['onScreen'] = on
    if sfx:
        sc['sfx'] = sfx
    if vis['type'] in ('stat', 'formula'):
        sc['compact'] = True
    scenes.append(sc)

job = {
    'id': 'urban-heat-island',
    'title': "Why 35°C Can Kill You: Wet Bulb Temperature, Heatwaves & Urban Heat Islands | UPSC",
    'format': '16:9',
    'tracker': {'title': 'Lesson progress', 'objectives': [
        {'id': 'o1', 'label': 'What is UHI'}, {'id': 'o2', 'label': 'Causes of UHI'}, {'id': 'o3', 'label': 'Heatwave: IMD criteria'},
        {'id': 'o4', 'label': 'Wet bulb temperature'}, {'id': 'o5', 'label': 'Heat Action Plans'}, {'id': 'o6', 'label': 'Way forward & recap'}]},
    'scenes': scenes,
    'shorts': [
        {'id': 'short-1', 'hook': "Why doesn't your city cool down at night?", 'scenes': ['S04', 'S05', 'S06', 'S07']},
        {'id': 'short-2', 'hook': '5 reasons your city is a heat trap', 'scenes': ['S08', 'S09', 'S10', 'S11', 'S12', 'S13', 'S14']},
        {'id': 'short-3', 'hook': '40, 37, 30: the heatwave numbers', 'scenes': ['S16', 'S17', 'S18', 'S19', 'S20', 'S21']},
        {'id': 'short-4', 'hook': "35°C can kill. Here's why.", 'scenes': ['S24', 'S25', 'S26', 'S27', 'S28', 'S29']},
        {'id': 'short-5', 'hook': "One city's plan against killer heat", 'scenes': ['S32', 'S33', 'S34', 'S35', 'S36', 'S37']},
        {'id': 'short-6', 'hook': 'Can white roofs cool a city?', 'scenes': ['S43', 'S44', 'S45', 'S46']},
    ],
    'timebars': [{'scenes': ['S33', 'S34', 'S35', 'S36', 'S37', 'S38', 'S39', 'S40', 'S41', 'S42'], 'nodes': [
        {'date': 'May 2010', 'label': 'Heatwave', 'scene': 'S33'},
        {'date': '2013', 'label': 'HAP pilot', 'scene': 'S34', 'at': at('S34', '2013') + 0.4},
        {'date': '2014', 'label': 'Full roll-out', 'scene': 'S35'},
        {'date': '2016', 'label': 'NDMA guidelines', 'scene': 'S38', 'at': at('S38', '2016')},
        {'date': '2023', 'label': 'CPR review', 'scene': 'S39', 'at': at('S39', '2023')},
        {'date': 'Today', 'label': 'Policy gap', 'scene': 'S42', 'at': at('S42', 'Heatwave')}]}],
    'thumbnail': {'headline': '35°C CAN KILL?', 'sub': 'Wet Bulb Explained', 'scene': 'S00'},
}
json.dump(job, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('scenes', len(scenes), 'total', round(sum(s['durationSec'] for s in scenes), 1), 's')
for sh in job['shorts']:
    print(sh['id'], round(sum(s['durationSec'] for s in scenes if s['id'] in sh['scenes']), 1), 's')
