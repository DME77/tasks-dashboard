#!/usr/bin/env python3
"""
Tower Management Report generator (CP-Atelier or HGP).

Pulls live task data for a tower from the ASAP PostgREST API and renders a
multi-page management-review PDF: project snapshot, completion by area,
sub-area / pour-wise status, scheduled task list, key observations.

Usage:
  TOWER="CP -ATELIER" python3 build_management_report.py
  TOWER="HGP"         python3 build_management_report.py
Optional:
  REPORT_DATE=2026-06-06   # override "today" for reproducible runs

Output:  <TowerSlug>_Management_Report.pdf  (in the project root, one level up)
"""
import os, json, re, datetime, urllib.request, urllib.parse, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

BASE_URL = os.environ.get("POSTGREST_URL", "https://asap.homelandgroup.org/api/db")
TOKEN = os.environ.get(
    "POSTGREST_TOKEN",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoicmVhZG9ubHkifQ.05FaqLTM4dxaaEIK0OYSecPGVCiw6luBNV9vzAJnikQ",
)
PROJECT_ID = "cmnjvabgp0077keve33sbnh4c"

TOWER_NAME = os.environ.get("TOWER", "HGP")

# Display name + output filename per tower
TOWER_META = {
    "HGP": {"title": "HOMELAND GLOBAL PARK", "sub": "HGP TOWER", "slug": "HGP"},
    "CP -ATELIER": {"title": "CP - ATELIER", "sub": "CP-ATELIER TOWER", "slug": "CP_Atelier"},
}
META = TOWER_META.get(TOWER_NAME, {"title": TOWER_NAME, "sub": TOWER_NAME, "slug": re.sub(r"[^A-Za-z0-9]+", "_", TOWER_NAME).strip("_")})

TODAY = datetime.date.today()
if os.environ.get("REPORT_DATE"):
    TODAY = datetime.date.fromisoformat(os.environ["REPORT_DATE"])


def pg_get(path):
    req = urllib.request.Request(
        BASE_URL + path,
        headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r)


def fetch_tasks():
    sel = (
        "select=taskName,completed,completedAt,startDate,endDate,createdAt,order,"
        "SubArea!inner(subAreaName,subAreaStatus,Area!inner(areaName,"
        "Tower!inner(towerName,Project!inner(projectId))))"
    )
    tw = urllib.parse.quote(TOWER_NAME)
    path = (
        f"/Task?{sel}"
        f"&SubArea.Area.Tower.towerName=eq.{tw}"
        f"&SubArea.Area.Tower.Project.projectId=eq.{PROJECT_ID}"
        f"&order=order.asc&limit=2000"
    )
    return pg_get(path)


def pdate(s):
    return datetime.date.fromisoformat(s[:10]) if s else None


def natural_key(name):
    m = re.search(r"(\d+)\s*([A-Za-z]*)", name)
    if m:
        return (0, int(m.group(1)), m.group(2))
    return (1, 0, name)  # non-numeric sub-areas sort after, alphabetically


# ── Gather + categorise ──────────────────────────────────────────────────────
try:
    raw = fetch_tasks()
except Exception as e:
    print("FATAL: could not fetch live data:", e)
    sys.exit(1)

rows = []
for t in raw:
    sa = t["SubArea"]; ar = sa["Area"]
    rows.append({
        "task": t["taskName"], "area": ar["areaName"], "sub": sa["subAreaName"],
        "active": (sa.get("subAreaStatus") == "active"),
        "completed": bool(t["completed"]), "end": pdate(t.get("endDate")),
    })

TOTAL = len(rows)
DONE = [r for r in rows if r["completed"]]
INC = [r for r in rows if not r["completed"]]
HOLD = [r for r in INC if not r["active"]]                       # paused sub-areas
ACTIVE_INC = [r for r in INC if r["active"]]
OVERDUE = [r for r in ACTIVE_INC if r["end"] and r["end"] < TODAY]
PENDING = [r for r in ACTIVE_INC if not (r["end"] and r["end"] < TODAY)]
PCT = round(len(DONE) / TOTAL * 100, 1) if TOTAL else 0

from collections import OrderedDict, Counter
area_stats = OrderedDict()
for r in rows:
    area_stats.setdefault(r["area"], [0, 0])
    area_stats[r["area"]][1] += 1
    if r["completed"]:
        area_stats[r["area"]][0] += 1
# order areas by size desc
area_stats = OrderedDict(sorted(area_stats.items(), key=lambda kv: -kv[1][1]))


def sub_status(area):
    subs = {}
    for r in rows:
        if r["area"] != area:
            continue
        subs.setdefault(r["sub"], [0, 0, r["active"]])
        subs[r["sub"]][1] += 1
        if r["completed"]:
            subs[r["sub"]][0] += 1
    items = sorted(subs.items(), key=lambda kv: natural_key(kv[0]))
    return [(name, dn, tt, round(dn / tt * 100) if tt else 0, act)
            for name, (dn, tt, act) in items]


# active incomplete, sorted by due date (overdue first naturally)
sched = sorted(ACTIVE_INC, key=lambda r: (r["end"] or datetime.date(2100, 1, 1)))
DATE_STR = TODAY.isoformat()

# ════════════════════════════════════════════════════════════════════════════
#  Render PDF
# ════════════════════════════════════════════════════════════════════════════
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, KeepTogether, PageBreak)
from reportlab.lib.styles import ParagraphStyle

NAVY = HexColor("#1f2d4d"); TEAL = HexColor("#0f8a8a"); GREEN = HexColor("#2e7d32")
GREY = HexColor("#e6e6e6"); LGREY = HexColor("#f4f5f7"); DGREY = HexColor("#555555")
AMBER = HexColor("#c77700"); RED = HexColor("#b00000"); HOLDC = HexColor("#6a5acd")

PAGE_W, PAGE_H = A4
LM = RM = 15 * mm
usable_w = PAGE_W - LM - RM


def S(n, **k):
    b = dict(fontName="Helvetica", fontSize=9, leading=12, textColor=black)
    b.update(k)
    return ParagraphStyle(n, **b)


st_body = S("body", fontSize=9.2, leading=13)
st_small = S("small", fontSize=7.6, leading=9.6, textColor=DGREY)
st_cell = S("cell", fontSize=8.4, leading=10.4)
st_cellb = S("cellb", fontName="Helvetica-Bold", fontSize=8.4, leading=10.4)
st_cellw = S("cellw", fontName="Helvetica-Bold", fontSize=8.4, leading=10.4, textColor=white)


def header_footer(c, doc):
    c.setFillColor(NAVY)
    c.rect(0, PAGE_H - 30 * mm, PAGE_W, 30 * mm, stroke=0, fill=1)
    c.setFillColor(white)
    if doc.page == 1:
        c.setFont("Helvetica-Bold", 9)
        c.drawString(LM, PAGE_H - 11 * mm, "HOMELAND GROUP")
        c.setFont("Helvetica-Bold", 22)
        c.drawString(LM, PAGE_H - 20 * mm, META["title"])
        c.setFont("Helvetica", 9.5)
        c.drawString(LM, PAGE_H - 25.5 * mm, "Project Status Report — Management Review")
        c.setFont("Helvetica", 8); c.setFillColor(HexColor("#c9d2e6"))
        c.drawRightString(PAGE_W - RM, PAGE_H - 25.5 * mm,
                          f"As of {DATE_STR}  ·  Live ASAP data  ·  Homeland Group")
    else:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(LM, PAGE_H - 13 * mm, f"{META['title']} — Management Report")
        c.setFont("Helvetica", 8.5); c.setFillColor(HexColor("#c9d2e6"))
        c.drawRightString(PAGE_W - RM, PAGE_H - 13 * mm, f"As of {DATE_STR}")
    c.setFillColor(DGREY); c.setFont("Helvetica", 7.5)
    c.drawString(LM, 10 * mm, "CONFIDENTIAL — Homeland Group Internal Use Only")
    c.drawRightString(PAGE_W - RM, 10 * mm, f"Page {doc.page}  |  Generated {DATE_STR}")
    c.setStrokeColor(GREY); c.setLineWidth(0.6)
    c.line(LM, 12.5 * mm, PAGE_W - RM, 12.5 * mm)


def section(title):
    p = Paragraph(title, S("sec", fontName="Helvetica-Bold", fontSize=10.5,
                           leading=12.5, textColor=white))
    t = Table([[p]], colWidths=[usable_w])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), NAVY),
                           ("LEFTPADDING", (0, 0), (-1, -1), 7),
                           ("TOPPADDING", (0, 0), (-1, -1), 4),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    return t


def snapshot_cards():
    cards = [
        (str(TOTAL), "TOTAL TASKS", "Across all areas", NAVY),
        (str(len(DONE)), "COMPLETED", f"{PCT}% done", GREEN),
        (str(len(PENDING)), "PENDING", "Scheduled ahead", TEAL),
        (str(len(OVERDUE)), "OVERDUE",
         "All on schedule" if not OVERDUE else "Past due date",
         GREEN if not OVERDUE else RED),
    ]
    cw = (usable_w - 3 * 4) / 4
    cells = []
    for num, lab, sub, col in cards:
        inner = Table(
            [[Paragraph(num, S("n", fontName="Helvetica-Bold", fontSize=22, leading=24, textColor=col, alignment=TA_CENTER))],
             [Paragraph(lab, S("l", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=DGREY, alignment=TA_CENTER))],
             [Paragraph(sub, S("s", fontSize=6.8, leading=8.4, textColor=DGREY, alignment=TA_CENTER))]],
            colWidths=[cw], rowHeights=[26, 11, 10])
        inner.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), LGREY),
                                   ("LINEABOVE", (0, 0), (-1, 0), 2.2, col),
                                   ("BOX", (0, 0), (-1, -1), 0.5, GREY),
                                   ("TOPPADDING", (0, 0), (-1, -1), 1),
                                   ("BOTTOMPADDING", (0, 0), (-1, -1), 1)]))
        cells.append(inner)
    t = Table([cells], colWidths=[cw + 4] * 4)
    t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0),
                           ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                           ("TOPPADDING", (0, 0), (-1, -1), 0),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    return t


def hold_strip():
    holds_by_area = Counter(r["area"] for r in HOLD)
    where = ", ".join(f"{a} ({n})" for a, n in holds_by_area.most_common())
    p = Paragraph(f'<b>{len(HOLD)} task(s) ON HOLD</b> &nbsp;—&nbsp; paused sub-areas: {where}',
                  S("h", fontSize=8.6, leading=11, textColor=white))
    t = Table([[p]], colWidths=[usable_w])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), HOLDC),
                           ("LEFTPADDING", (0, 0), (-1, -1), 8),
                           ("TOPPADDING", (0, 0), (-1, -1), 4),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    return t


def area_bar(name, dn, tt, pct):
    barw = usable_w * 0.42
    fw = max(1, pct / 100.0 * barw)
    col = GREEN if pct >= 50 else (TEAL if pct >= 20 else AMBER)
    inner = Table([["", ""]], colWidths=[fw, barw - fw], rowHeights=[11])
    inner.setStyle(TableStyle([("BACKGROUND", (0, 0), (0, 0), col),
                               ("BACKGROUND", (1, 0), (1, 0), GREY),
                               ("LEFTPADDING", (0, 0), (-1, -1), 0),
                               ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                               ("TOPPADDING", (0, 0), (-1, -1), 0),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    return [Paragraph(name, st_cellb), inner,
            Paragraph(f"<b>{pct}%</b> ({dn}/{tt})", S("p", fontSize=8.4, leading=10.4, alignment=TA_LEFT))]


def area_table():
    data = [[Paragraph(h, st_cellw) for h in ["Area", "Total Tasks", "Completed", "Remaining", "% Done"]]]
    for a, (dn, tt) in area_stats.items():
        pct = round(dn / tt * 100) if tt else 0
        data.append([Paragraph(a, st_cell), Paragraph(str(tt), st_cell),
                     Paragraph(str(dn), st_cell), Paragraph(str(tt - dn), st_cell),
                     Paragraph(f"{pct}%", st_cellb)])
    t = Table(data, colWidths=[usable_w * 0.40] + [usable_w * 0.15] * 4)
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY),
                           ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LGREY]),
                           ("GRID", (0, 0), (-1, -1), 0.4, GREY),
                           ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                           ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                           ("TOPPADDING", (0, 0), (-1, -1), 4),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                           ("LEFTPADDING", (0, 0), (-1, -1), 6)]))
    return t


def sub_grid(items, cols=4):
    cells = []
    for name, dn, tt, pct, act in items:
        if not act and pct < 100:
            border, fill, pcol = HOLDC, HexColor("#eeebfa"), HOLDC
            label = "HOLD"
        elif pct >= 100:
            border, fill, pcol = GREEN, HexColor("#eaf5ea"), GREEN
            label = None
        elif pct > 0:
            border, fill, pcol = TEAL, HexColor("#e6f3f3"), TEAL
            label = None
        else:
            border, fill, pcol = GREY, white, DGREY
            label = None
        sub_rows = [
            [Paragraph(name, S("pn", fontName="Helvetica-Bold", fontSize=7.8, leading=9.2, alignment=TA_CENTER))],
            [Paragraph(f"{pct}%", S("pp", fontName="Helvetica-Bold", fontSize=11, leading=12, alignment=TA_CENTER, textColor=pcol))],
            [Paragraph(f"{dn}/{tt}" + (f" · {label}" if label else ""),
                       S("pc", fontSize=6.2, leading=7.4, alignment=TA_CENTER, textColor=DGREY))],
        ]
        tile = Table(sub_rows, colWidths=[(usable_w - (cols - 1) * 5) / cols], rowHeights=[11, 14, 8])
        tile.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), fill),
                                  ("BOX", (0, 0), (-1, -1), 1.1, border),
                                  ("LINEABOVE", (0, 0), (-1, 0), 2.5, border),
                                  ("TOPPADDING", (0, 0), (-1, -1), 1),
                                  ("BOTTOMPADDING", (0, 0), (-1, -1), 1)]))
        cells.append(tile)
    while len(cells) % cols:
        cells.append("")
    rows_ = [cells[i:i + cols] for i in range(0, len(cells), cols)]
    cw = (usable_w - (cols - 1) * 5) / cols
    t = Table(rows_, colWidths=[cw + 5] * cols)
    t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0),
                           ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                           ("TOPPADDING", (0, 0), (-1, -1), 2),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
    return t


def schedule_table(items):
    data = [[Paragraph(h, st_cellw) for h in ["Task Name", "Area", "Sub-Area", "Due Date", "Status"]]]
    for r in items:
        days = (r["end"] - TODAY).days if r["end"] else None
        if days is None:
            tag, dcol = "—", DGREY
        elif days < 0:
            tag, dcol = f"{-days}d overdue", RED
        elif days <= 7:
            tag, dcol = f"{days}d", RED
        elif days <= 21:
            tag, dcol = f"{days}d", AMBER
        else:
            tag, dcol = f"{days}d", TEAL
        data.append([Paragraph(r["task"], st_cell), Paragraph(r["area"], st_cell),
                     Paragraph(r["sub"], st_cell),
                     Paragraph(r["end"].isoformat() if r["end"] else "—", st_cell),
                     Paragraph(f'<font color="#{dcol.hexval()[2:]}"><b>{tag}</b></font>', st_cell)])
    t = Table(data, colWidths=[usable_w * 0.30, usable_w * 0.22, usable_w * 0.18,
                               usable_w * 0.15, usable_w * 0.15], repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY),
                           ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LGREY]),
                           ("GRID", (0, 0), (-1, -1), 0.4, GREY),
                           ("ALIGN", (3, 0), (-1, -1), "CENTER"),
                           ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                           ("TOPPADDING", (0, 0), (-1, -1), 3),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                           ("LEFTPADDING", (0, 0), (-1, -1), 5)]))
    return t


def observation(num, title, body):
    n = Paragraph(num, S("on", fontName="Helvetica-Bold", fontSize=13, leading=15, textColor=white, alignment=TA_CENTER))
    nbox = Table([[n]], colWidths=[24], rowHeights=[20])
    nbox.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), NAVY),
                              ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                              ("LEFTPADDING", (0, 0), (-1, -1), 0),
                              ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    txt = [Paragraph(title, S("ot", fontName="Helvetica-Bold", fontSize=9.5, leading=12, textColor=NAVY)),
           Paragraph(body, st_body)]
    row = Table([[nbox, txt]], colWidths=[30, usable_w - 30])
    row.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                             ("LEFTPADDING", (0, 0), (0, 0), 0),
                             ("LEFTPADDING", (1, 0), (1, 0), 8),
                             ("TOPPADDING", (0, 0), (-1, -1), 2),
                             ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    return row


# ── Build story ──────────────────────────────────────────────────────────────
story = []
sp = lambda h=8: story.append(Spacer(1, h))

sp(2)
story.append(section(f"PROJECT SNAPSHOT — {META['sub']}")); sp(8)
story.append(snapshot_cards()); sp(10)
overall = Table([[Paragraph(f"<b>Overall completion: {PCT}%</b>", S("ov", fontSize=10, leading=13, textColor=NAVY)),
                  Paragraph(f"<b>{len(DONE)} of {TOTAL} tasks done</b>", S("ov2", fontSize=10, leading=13, textColor=NAVY, alignment=2))]],
                colWidths=[usable_w * 0.5, usable_w * 0.5])
overall.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), LGREY),
                             ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                             ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8)]))
story.append(overall)
if HOLD:
    sp(4); story.append(hold_strip())
sp(12)
story.append(section("COMPLETION BY AREA")); sp(8)
bars = Table([area_bar(a, dn, tt, round(dn / tt * 100) if tt else 0) for a, (dn, tt) in area_stats.items()],
             colWidths=[usable_w * 0.30, usable_w * 0.44, usable_w * 0.26])
bars.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                          ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                          ("LEFTPADDING", (0, 0), (-1, -1), 2)]))
story.append(bars); sp(8)
story.append(area_table()); sp(14)

# Sub-area status sections — one per area
story.append(section("SUB-AREA / POUR-WISE STATUS")); sp(6)
story.append(Paragraph("Green = 100% complete · Teal = in progress · Gray = not started · Purple = on hold (sub-area paused). "
                       "Tile shows tasks done / total.", st_small)); sp(8)
for a in area_stats:
    items = sub_status(a)
    dn, tt = area_stats[a]
    pct = round(dn / tt * 100) if tt else 0
    block = [Paragraph(f"{a} — {pct}% ({dn}/{tt})",
                       S("ah", fontName="Helvetica-Bold", fontSize=9.5, leading=12, textColor=NAVY)),
             Spacer(1, 4), sub_grid(items)]
    story.append(KeepTogether(block)); sp(10)

# Scheduled task list — active incomplete (overdue first, then upcoming)
story.append(PageBreak()); sp(2)
story.append(section(f"SCHEDULED TASK LIST — {len(sched)} ACTIVE TASKS ({len(OVERDUE)} overdue, {len(PENDING)} upcoming)")); sp(8)
story.append(Paragraph("Active (non-held) incomplete tasks, sorted by due date. On-hold tasks are excluded and summarised above.", st_small)); sp(6)
PER = 26
for i in range(0, len(sched), PER):
    if i:
        story.append(PageBreak()); sp(2)
        story.append(section("SCHEDULED TASK LIST — CONTINUED")); sp(8)
    story.append(schedule_table(sched[i:i + PER]))

# Key observations
story.append(PageBreak()); sp(2)
story.append(section("KEY OBSERVATIONS & OUTLOOK")); sp(8)

due7 = [r for r in PENDING if r["end"] and (r["end"] - TODAY).days <= 7]
due21 = [r for r in PENDING if r["end"] and (r["end"] - TODAY).days <= 21]
overdue_by_area = Counter(r["area"] for r in OVERDUE)
top_areas = sorted(area_stats.items(), key=lambda kv: (kv[1][0] / kv[1][1]) if kv[1][1] else 0)
worst = [a for a, (dn, tt) in top_areas if tt and dn / tt < 0.5][:2]

obs = []
n = 1
if OVERDUE:
    where = ", ".join(f"{a} ({c})" for a, c in overdue_by_area.most_common())
    obs.append((f"{n:02d}", f"{len(OVERDUE)} Overdue Tasks — Recovery Needed",
                f"{len(OVERDUE)} active tasks are past their due date — concentrated in {where}. "
                f"These should be re-baselined and resequenced before the slip widens further.")); n += 1
else:
    obs.append((f"{n:02d}", "Zero Overdue Tasks — On Schedule",
                f"All active pending tasks carry future due dates as of {DATE_STR}.")); n += 1
if HOLD:
    hold_where = ", ".join(f"{a} ({c})" for a, c in Counter(r['area'] for r in HOLD).most_common())
    obs.append((f"{n:02d}", f"{len(HOLD)} Tasks On Hold — Awaiting Go-Ahead",
                f"{len(HOLD)} tasks sit in paused sub-areas ({hold_where}). A go/no-go decision is needed to release this work; "
                f"it is the largest single block on overall completion.")); n += 1
# strongest + weakest area
best_a, (bd, bt) = max(area_stats.items(), key=lambda kv: (kv[1][0] / kv[1][1]) if kv[1][1] else 0)
obs.append((f"{n:02d}", f"Lead Area: {best_a} — {round(bd / bt * 100)}% ({bd}/{bt})",
            f"{best_a} is the most advanced front. Sustain its pace while recovering the trailing areas: "
            + ("; ".join(f"{a} at {round(area_stats[a][0]/area_stats[a][1]*100)}%" for a in worst) if worst else "none below 50%")
            + ".")); n += 1
if due7:
    obs.append((f"{n:02d}", f"{len(due7)} Task(s) Due Within 7 Days",
                "Near-term deadlines need crew and material confirmation now: "
                + ", ".join(f"{r['sub']}·{r['area'].split(' ')[0]} ({r['end'].strftime('%d-%b')})" for r in due7[:6])
                + ("…" if len(due7) > 6 else "") + ".")); n += 1
else:
    obs.append((f"{n:02d}", "No Deadlines Within 7 Days",
                f"No active tasks are due within 7 days; {len(due21)} fall due within 21 days and should be kept on radar.")); n += 1

for nn, ti, bd_ in obs:
    story.append(observation(nn, ti, bd_))
sp(4)
story.append(Paragraph(
    f"Report auto-generated from live ASAP PostgREST data · Homeland Group · {DATE_STR} · "
    f"{META['title']} tower within the Homeland Global Park project.", st_small))

OUT = os.path.join(ROOT, f"{META['slug']}_Management_Report.pdf")
doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=LM, rightMargin=RM,
                      topMargin=33 * mm, bottomMargin=16 * mm)
frame = Frame(LM, 16 * mm, usable_w, PAGE_H - 33 * mm - 16 * mm, id="main",
              leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=header_footer)])
doc.build(story)
print("WROTE", OUT)
print(f"  {DATE_STR} [{TOWER_NAME}]: total={TOTAL} done={len(DONE)} ({PCT}%) "
      f"pending={len(PENDING)} overdue={len(OVERDUE)} hold={len(HOLD)}")
for a, (dn, tt) in area_stats.items():
    print(f"    {a}: {dn}/{tt}")
