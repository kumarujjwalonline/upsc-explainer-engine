import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule, CellIsRule
from openpyxl.chart import BarChart, Reference
from openpyxl.utils import get_column_letter as L

import sys
src = openpyxl.load_workbook(sys.argv[1] if len(sys.argv) > 1 else "/mnt/project-files/topic-lists/upsc-explainer-topics.xlsx")
rows = []  # (priority, order, topic)
seen = set(); n = 0
for ws in src.worksheets[2:]:
    for r in ws.iter_rows(min_row=2, values_only=True):
        if not r[1] or r[1] in seen: continue
        seen.add(r[1]); n += 1
        rows.append((r[6] or '9', n, r[1]))
NS = 'Not started'
# Current state of the five video threads (read 2026-10-15)
active = {
 'Urban Heat Island & Heatwaves': ['Done','Done','Approved','Pending approval',NS,NS,NS,NS,NS,NS,NS,None,
   'Full narration recorded. Waiting on the free word check (Actions, render.yml transcribe, branch claude/uhi-voice-check) or your listen.'],
 'India-China Border (LAC) Explained': ['Done','Done','Approved','Done','Done','Done','Done','Pending','Done','Pending',NS,None,
   'Review page: https://claude.ai/artifact/SE8YYJJQJeDnLePyYKhzjn (13:15). 4 small visual slips listed. Shorts rendering.'],
 'Delimitation & North-South Debate': ['Done','Done','Approved','Done','Done','Done','Done','Pending','Done','Pending',NS,None,
   'Review page: https://claude.ai/artifact/8J6CXjjYXuEseF88CMj62D (16 min). 7 Shorts ready.'],
 'Buddhism vs Jainism': ['Done','Done','Approved','Pending approval',NS,NS,NS,NS,NS,NS,NS,None,
   'Narration recorded, free word check passed. Waiting on your OK on the voiceover before visuals.'],
 'Semiconductors & Chip Making': ['Done','Done','Approved','Done','Done','Done','Done','Pending','Done','Pending',NS,None,
   'Review page: https://claude.ai/artifact/HzAj7apkAmJ3ksQmH3XsBN (12:57). 6 Shorts ready.'],
}
order = list(active) + [t for _,_,t in sorted(r for r in rows if r[2] not in active)]
assert all(t in seen for t in active)

wb = openpyxl.Workbook()
p = wb.active; p.title = 'Pipeline'
hdr = ['Topic','Fact check','Script written','Script approval','Voiceover','Images','Clips','Edit/render',
       'Video approval','Thumbnail','Thumbnail approval','Uploaded','YouTube link','Last updated','Notes']
p.append(hdr)
STAMP = '2026-10-15 08:25 IST'
for t in order:
    if t in active:
        v = active[t]; p.append([t]+v[:11]+[v[11], STAMP, v[12]])
    else:
        p.append([t]+[NS]*11+[None,None,None])
F = 'Arial'
for c in p[1]:
    c.font = Font(name=F, bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor='1F3864')
    c.alignment = Alignment(wrap_text=True, vertical='center', horizontal='center')
for row in p.iter_rows(min_row=2, max_row=p.max_row, max_col=15):
    for c in row: c.font = Font(name=F, size=10)
p.freeze_panes = 'B2'
p.row_dimensions[1].height = 32
widths = [44]+[14]*11+[30,20,60]
for i,w in enumerate(widths,1): p.column_dimensions[L(i)].width = w
MAX = 2000
step = [NS,'In progress','Pending approval','Done','Blocked']
appr = [NS,'Pending','Approved','Blocked']
upl  = [NS,'In progress','Private','Public','Blocked']
def dv(opts, rng):
    d = DataValidation(type='list', formula1='"'+','.join(opts)+'"', allow_blank=True); d.add(rng); p.add_data_validation(d)
dv(step, f'B2:C{MAX}'); dv(step, f'E2:H{MAX}'); dv(step, f'J2:J{MAX}')
dv(appr, f'D2:D{MAX}'); dv(appr, f'I2:I{MAX}'); dv(appr, f'K2:K{MAX}')
dv(upl, f'L2:L{MAX}')
colors = {NS:'D9D9D9','In progress':'FFF2CC','Pending approval':'F8CBAD','Pending':'F8CBAD',
          'Done':'C6EFCE','Approved':'C6EFCE','Private':'C6EFCE','Public':'63BE7B','Blocked':'FFC7CE'}
for val,col in colors.items():
    p.conditional_formatting.add(f'B2:L{MAX}', CellIsRule(operator='equal', formula=[f'"{val}"'],
        fill=PatternFill('solid', start_color=col, end_color=col)))
for c in p['O'][1:]: c.alignment = Alignment(wrap_text=True, vertical='top')

# Summary
s = wb.create_sheet('Summary')
s.sheet_view.showGridLines = False
R = f'Pipeline!$A$2:$A${MAX}'
def col(x): return f'Pipeline!${x}$2:${x}${MAX}'
tiles = [
 ('Total topics', f'=COUNTA({R})', 'D9E1F2'),
 ('Not started', f'=COUNTIFS({R},"<>",{col("B")},"Not started")+COUNTIFS({R},"<>",{col("B")},"")', 'D9D9D9'),
 ('In progress', f'=COUNTA({R})-B5-B12-B13', 'FFF2CC'),
 ('Script pending approval', f'=COUNTIF({col("D")},"Pending")', 'F8CBAD'),
 ('Script approved', f'=COUNTIF({col("D")},"Approved")', 'C6EFCE'),
 ('Video pending approval', f'=COUNTIF({col("I")},"Pending")', 'F8CBAD'),
 ('Thumbnail pending approval', f'=COUNTIF({col("K")},"Pending")', 'F8CBAD'),
 ('Posted Private', f'=COUNTIF({col("L")},"Private")', 'C6EFCE'),
 ('Posted Public', f'=COUNTIF({col("L")},"Public")', '63BE7B'),
 ('Blocked', '=SUMPRODUCT(('+R+'<>"")*(('+'+'.join(f'({col(x)}="Blocked")' for x in 'BCDEFGHIJKL')+')>0))', 'FFC7CE'),
]
s['A1'] = 'UPSC Explainers pipeline'; s['A1'].font = Font(name=F, size=18, bold=True, color='1F3864')
s['A2'] = 'Counts update automatically from the Pipeline tab. A blank status counts as Not started.'
s['A2'].font = Font(name=F, size=10, italic=True, color='595959')
# Label/value table (feeds tiles), rows 4-13
s['A3'] = 'Measure'; s['B3'] = 'Topics'
for c in (s['A3'], s['B3']): c.font = Font(name=F, bold=True)
for i,(lab,f,_) in enumerate(tiles):
    s.cell(4+i,1,lab).font = Font(name=F); s.cell(4+i,2,f).font = Font(name=F)
# fix In progress refs: B5 not started, B11 private, B12 public
s['B6'] = f'=B4-B5-B11-B12'
# Tiles in D3:M10 (5 per row, 2 cols each)
thin = Side(style='thin', color='BFBFBF')
for i,(lab,_,colr) in enumerate(tiles):
    r0 = 4 + (i//5)*4; c0 = 4 + (i%5)*2
    s.merge_cells(start_row=r0, start_column=c0, end_row=r0, end_column=c0+1)
    s.merge_cells(start_row=r0+1, start_column=c0, end_row=r0+2, end_column=c0+1)
    a = s.cell(r0,c0,lab); a.font = Font(name=F, size=10, bold=True, color='404040')
    b = s.cell(r0+1,c0,f'=B{4+i}'); b.font = Font(name=F, size=28, bold=True, color='1F3864')
    for rr in range(r0, r0+3):
        for cc in (c0, c0+1):
            x = s.cell(rr,cc); x.fill = PatternFill('solid', fgColor=colr)
            x.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            x.border = Border(left=thin if cc==c0 else None, right=thin if cc==c0+1 else None,
                              top=thin if rr==r0 else None, bottom=thin if rr==r0+2 else None)
for cc in range(4,14): s.column_dimensions[L(cc)].width = 11
s.column_dimensions['A'].width = 28; s.column_dimensions['B'].width = 10; s.column_dimensions['C'].width = 3
for rr in (4,8): s.row_dimensions[rr].height = 30
# Stage table rows 17+
s['A16'] = 'Where each topic is now'; s['A16'].font = Font(name=F, size=13, bold=True, color='1F3864')
s['A17'] = 'Stage'; s['B17'] = 'Videos'
for c in (s['A17'], s['B17']): c.font = Font(name=F, bold=True)
A_ = f'{R},"<>"'
stages = [
 ('Not started', '=B5'),
 ('Fact check', f'=COUNTIFS({A_},{col("B")},"<>Done",{col("B")},"<>Not started",{col("B")},"<>")'),
 ('Script writing', f'=COUNTIFS({A_},{col("B")},"Done",{col("C")},"<>Done")'),
 ('Script approval', f'=COUNTIFS({A_},{col("C")},"Done",{col("D")},"<>Approved")'),
 ('Voiceover', f'=COUNTIFS({A_},{col("D")},"Approved",{col("E")},"<>Done")'),
 ('Images and clips', f'=COUNTIFS({A_},{col("E")},"Done",{col("G")},"<>Done")'),
 ('Edit/render', f'=COUNTIFS({A_},{col("G")},"Done",{col("H")},"<>Done")'),
 ('Video approval', f'=COUNTIFS({A_},{col("H")},"Done",{col("I")},"<>Approved")'),
 ('Thumbnail', f'=COUNTIFS({A_},{col("I")},"Approved",{col("K")},"<>Approved")'),
 ('Upload', f'=COUNTIFS({A_},{col("K")},"Approved",{col("L")},"<>Private",{col("L")},"<>Public")'),
 ('Posted', '=B11+B12'),
]
for i,(lab,f) in enumerate(stages):
    s.cell(18+i,1,lab).font = Font(name=F); s.cell(18+i,2,f).font = Font(name=F)
ch = BarChart(); ch.type = 'bar'; ch.style = 10
ch.title = 'Videos per stage'; ch.y_axis.title = 'Videos'; ch.legend = None
ch.add_data(Reference(s, min_col=2, min_row=17, max_row=28), titles_from_data=True)
ch.set_categories(Reference(s, min_col=1, min_row=18, max_row=28))
ch.x_axis.scaling.orientation = 'maxMin'
ch.height = 9; ch.width = 20
s.add_chart(ch, 'D16')
wb.active = 0
wb.save('dashboard.xlsx')
print(len(order), 'topics')
