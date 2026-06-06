#!/usr/bin/env python3
"""
CP-Atelier Management Report generator.

Pulls live task data for the CP-Atelier tower from the ASAP PostgREST API and
renders a multi-page management-review PDF (project snapshot, completion by
area, pour-wise status, upcoming deadlines, scheduled task list, key
observations).

Run:  python3 build_cpa_management_report.py
Output: CP_Atelier_Management_Report.pdf  (in the project root, one level up)
"""
import os, json, datetime, urllib.request, urllib.parse, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

BASE_URL = os.environ.get("POSTGREST_URL", "https://asap.homelandgroup.org/api/db")
TOKEN = os.environ.get(
    "POSTGREST_TOKEN",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoicmVhZG9ubHkifQ.05FaqLTM4dxaaEIK0OYSecPGVCiw6luBNV9vzAJnikQ",
)
PROJECT_ID = "cmnjvabgp0077keve33sbnh4c"
TOWER_NAME = "CP -ATELIER"

TODAY = datetime.date.today()
# Allow override for reproducible runs:  REPORT_DATE=2026-06-06 python3 ...
if os.environ.get("REPORT_DATE"):
    TODAY = datetime.date.fromisoformat(os.environ["REPORT_DATE"])


def pg_get(path):
    url = BASE_URL + path
    req = urllib.request.Request(
        url, headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def fetch_tasks():
    sel = (
        "select=taskName,completed,completedAt,startDate,endDate,createdAt,order,"
        "SubArea!inner(subAreaName,Area!inner(areaName,"
        "Tower!inner(towerName,Project!inner(projectId))))"
    )
    tower = urllib.parse.quote(TOWER_NAME)
    path = (
        f"/Task?{sel}"
        f"&SubArea.Area.Tower.towerName=eq.{tower}"
        f"&SubArea.Area.Tower.Project.projectId=eq.{PROJECT_ID}"
        f"&order=order.asc&limit=1000"
    )
    return pg_get(path)


def pdate(s):
    return datetime.date.fromisoformat(s[:10]) if s else None


def natural_pour_key(name):
    """Sort 'Pour - 1', 'Pour - 1 A', 'Pour - 2', ... 'Pour - 10' numerically."""
    import re
    m = re.search(r"(\d+)\s*([A-Za-z]*)", name)
    if m:
        return (int(m.group(1)), m.group(2))
    return (9999, name)


# ── Gather + shape data ──────────────────────────────────────────────────────
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
        "completed": bool(t["completed"]), "order": t.get("order"),
        "start": pdate(t.get("startDate")), "end": pdate(t.get("endDate")),
        "compAt": pdate(t.get("completedAt")),
    })

TOTAL = len(rows)
DONE = sum(1 for r in rows if r["completed"])
PENDING = [r for r in rows if not r["completed"]]
OVERDUE = [r for r in PENDING if r["end"] and r["end"] < TODAY]
PCT = round(DONE / TOTAL * 100, 1) if TOTAL else 0

from collections import OrderedDict
AREA_ORDER = ["Basement Raft work", "Column and Slab work"]
area_stats = OrderedDict((a, [0, 0]) for a in AREA_ORDER)
for r in rows:
    if r["area"] not in area_stats:
        area_stats[r["area"]] = [0, 0]
    area_stats[r["area"]][1] += 1
    if r["completed"]:
        area_stats[r["area"]][0] += 1


def pour_status(area):
    pours = {}
    for r in rows:
        if r["area"] != area:
            continue
        pours.setdefault(r["sub"], [0, 0])
        pours[r["sub"]][1] += 1
        if r["completed"]:
            pours[r["sub"]][0] += 1
    items = sorted(pours.items(), key=lambda kv: natural_pour_key(kv[0]))
    return [(name, dn, tt, round(dn / tt * 100) if tt else 0) for name, (dn, tt) in items]


pend_sorted = sorted(PENDING, key=lambda r: (r["end"] or datetime.date(2100, 1, 1)))
DATE_STR = TODAY.isoformat()

# ════════════════════════════════════════════════════════════════════════════
#  Render PDF
# ════════════════════════════════════════════════════════════════════════════
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, KeepTogether)
from reportlab.lib.styles import ParagraphStyle

NAVY = HexColor("#1f2d4d")
TEAL = HexColor("#0f8a8a")
GREEN = HexColor("#2e7d32")
GREY = HexColor("#e6e6e6")
LGREY = HexColor("#f4f5f7")
DGREY = HexColor("#555555")
AMBER = HexColor("#c77700")
RED = HexColor("#b00000")

PAGE_W, PAGE_H = A4
LM = RM = 15 * mm
usable_w = PAGE_W - LM - RM


def S(n, **k):
    b = dict(fontName="Helvetica", fontSize=9, leading=12, textColor=black)
    b.update(k)
    return ParagraphStyle(n, **b)


st_h1 = S("h1", fontName="Helvetica-Bold", fontSize=13, leading=15, textColor=NAVY)
st_body = S("body", fontSize=9.2, leading=13)
st_small = S("small", fontSize=7.6, leading=9.6, textColor=DGREY)
st_cell = S("cell", fontSize=8.4, leading=10.4)
st_cellb = S("cellb", fontName="Helvetica-Bold", fontSize=8.4, leading=10.4)
st_cellw = S("cellw", fontName="Helvetica-Bold", fontSize=8.4, leading=10.4, textColor=white)


def header_footer(c, doc):
    # top band
    c.setFillColor(NAVY)
    c.rect(0, PAGE_H - 30 * mm, PAGE_W, 30 * mm, stroke=0, fill=1)
    c.setFillColor(white)
    if doc.page == 1:
        c.setFont("Helvetica-Bold", 9)
        c.drawString(LM, PAGE_H - 11 * mm, "HOMELAND GROUP")
        c.setFont("Helvetica-Bold", 22)
        c.drawString(LM, PAGE_H - 20 * mm, "CP - ATELIER")
        c.setFont("Helvetica", 9.5)
        c.drawString(LM, PAGE_H - 25.5 * mm, "Project Status Report — Management Review")
        c.setFont("Helvetica", 8)
        c.setFillColor(HexColor("#c9d2e6"))
        c.drawRightString(PAGE_W - RM, PAGE_H - 25.5 * mm,
                          f"As of {DATE_STR}  ·  Live ASAP data  ·  Homeland Group")
    else:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(LM, PAGE_H - 13 * mm, "CP - ATELIER — Management Report")
        c.setFont("Helvetica", 8.5)
        c.setFillColor(HexColor("#c9d2e6"))
        c.drawRightString(PAGE_W - RM, PAGE_H - 13 * mm, f"As of {DATE_STR}")
    # footer
    c.setFillColor(DGREY)
    c.setFont("Helvetica", 7.5)
    c.drawString(LM, 10 * mm, "CONFIDENTIAL — Homeland Group Internal Use Only")
    c.drawRightString(PAGE_W - RM, 10 * mm, f"Page {doc.page}  |  Generated {DATE_STR}")
    c.setStrokeColor(GREY)
    c.setLineWidth(0.6)
    c.line(LM, 12.5 * mm, PAGE_W - RM, 12.5 * mm)


def section(title):
    p = Paragraph(title, S("sec", fontName="Helvetica-Bold", fontSize=10.5,
                           leading=12.5, textColor=white))
    t = Table([[p]], colWidths=[usable_w])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("LEFTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


def snapshot_cards():
    cards = [
        (str(TOTAL), "TOTAL TASKS", "Across all areas", NAVY),
        (str(DONE), "COMPLETED", f"{PCT}% done", GREEN),
        (str(len(PENDING)), "PENDING", "Scheduled ahead", TEAL),
        (str(len(OVERDUE)), "OVERDUE",
         "All on schedule" if not OVERDUE else "Past due date",
         GREEN if not OVERDUE else RED),
    ]
    cw = (usable_w - 3 * 4) / 4
    cells = []
    for num, lab, sub, col in cards:
        inner = Table(
            [[Paragraph(num, S("n", fontName="Helvetica-Bold", fontSize=22,
                               leading=24, textColor=col, alignment=TA_CENTER))],
             [Paragraph(lab, S("l", fontName="Helvetica-Bold", fontSize=8,
                               leading=10, textColor=DGREY, alignment=TA_CENTER))],
             [Paragraph(sub, S("s", fontSize=6.8, leading=8.4,
                               textColor=DGREY, alignment=TA_CENTER))]],
            colWidths=[cw], rowHeights=[26, 11, 10])
        inner.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LGREY),
            ("LINEABOVE", (0, 0), (-1, 0), 2.2, col),
            ("BOX", (0, 0), (-1, -1), 0.5, GREY),
            ("TOPPADDING", (0, 0), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ]))
        cells.append(inner)
    t = Table([cells], colWidths=[cw + 4] * 4)
    t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0),
                           ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                           ("TOPPADDING", (0, 0), (-1, -1), 0),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    return t


def area_bar(name, dn, tt, pct):
    barw = usable_w * 0.42
    fw = max(1, pct / 100.0 * barw)
    col = GREEN if pct >= 50 else (TEAL if pct >= 20 else AMBER)
    inner = Table([["", ""]], colWidths=[fw, barw - fw], rowHeights=[11])
    inner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), col), ("BACKGROUND", (1, 0), (1, 0), GREY),
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return [Paragraph(name, st_cellb), inner,
            Paragraph(f"<b>{pct}%</b> ({dn}/{tt})", S("p", fontSize=8.4, leading=10.4, alignment=TA_LEFT))]


def area_table():
    data = [[Paragraph(h, st_cellw) for h in
             ["Area", "Total Tasks", "Completed", "Remaining", "% Done"]]]
    for a in area_stats:
        dn, tt = area_stats[a]
        pct = round(dn / tt * 100) if tt else 0
        data.append([Paragraph(a, st_cell), Paragraph(str(tt), st_cell),
                     Paragraph(str(dn), st_cell), Paragraph(str(tt - dn), st_cell),
                     Paragraph(f"{pct}%", st_cellb)])
    t = Table(data, colWidths=[usable_w * 0.40] + [usable_w * 0.15] * 4)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LGREY]),
        ("GRID", (0, 0), (-1, -1), 0.4, GREY),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def pour_grid(items, cols=4):
    """Grid of pour tiles: name, %, colour-coded."""
    cells = []
    for name, dn, tt, pct in items:
        if pct >= 100:
            border, fill = GREEN, HexColor("#eaf5ea")
        elif pct > 0:
            border, fill = TEAL, HexColor("#e6f3f3")
        else:
            border, fill = GREY, white
        tile = Table(
            [[Paragraph(name, S("pn", fontName="Helvetica-Bold", fontSize=8,
                                leading=9.5, alignment=TA_CENTER))],
             [Paragraph(f"{pct}%", S("pp", fontName="Helvetica-Bold", fontSize=11,
                                     leading=13, alignment=TA_CENTER,
                                     textColor=border if pct > 0 else DGREY))]],
            colWidths=[(usable_w - (cols - 1) * 5) / cols], rowHeights=[12, 15])
        tile.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), fill),
            ("BOX", (0, 0), (-1, -1), 1.1, border),
            ("LINEABOVE", (0, 0), (-1, 0), 2.5, border),
            ("TOPPADDING", (0, 0), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ]))
        cells.append(tile)
    # pad to full rows
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
    data = [[Paragraph(h, st_cellw) for h in
             ["Task Name", "Area", "Sub-Area", "Due Date", "Days Left"]]]
    for r in items:
        days = (r["end"] - TODAY).days if r["end"] else None
        dcol = RED if (days is not None and days <= 7) else (AMBER if (days is not None and days <= 21) else TEAL)
        data.append([
            Paragraph(r["task"], st_cell),
            Paragraph(r["area"], st_cell),
            Paragraph(r["sub"], st_cell),
            Paragraph(r["end"].isoformat() if r["end"] else "—", st_cell),
            Paragraph(f'<font color="#{dcol.hexval()[2:]}"><b>{days}d</b></font>' if days is not None else "—",
                      st_cell),
        ])
    t = Table(data, colWidths=[usable_w * 0.34, usable_w * 0.24, usable_w * 0.16,
                               usable_w * 0.15, usable_w * 0.11], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LGREY]),
        ("GRID", (0, 0), (-1, -1), 0.4, GREY),
        ("ALIGN", (3, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def observation(num, title, body):
    n = Paragraph(num, S("on", fontName="Helvetica-Bold", fontSize=13,
                         leading=15, textColor=white, alignment=TA_CENTER))
    nbox = Table([[n]], colWidths=[24], rowHeights=[20])
    nbox.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), NAVY),
                              ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                              ("LEFTPADDING", (0, 0), (-1, -1), 0),
                              ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    txt = [Paragraph(title, S("ot", fontName="Helvetica-Bold", fontSize=9.5,
                              leading=12, textColor=NAVY)),
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

raft = pour_status("Basement Raft work")
cns = pour_status("Column and Slab work")
rb_dn, rb_tt = area_stats["Basement Raft work"]
cs_dn, cs_tt = area_stats["Column and Slab work"]

# Page 1
sp(2)
story.append(section("PROJECT SNAPSHOT — CP-ATELIER TOWER")); sp(8)
story.append(snapshot_cards()); sp(10)
overall = Table([[Paragraph(f"<b>Overall completion: {PCT}%</b>", S("ov", fontSize=10, leading=13, textColor=NAVY)),
                  Paragraph(f"<b>{DONE} of {TOTAL} tasks done</b>", S("ov2", fontSize=10, leading=13, textColor=NAVY, alignment=2))]],
                colWidths=[usable_w * 0.5, usable_w * 0.5])
overall.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), LGREY),
                             ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                             ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8)]))
story.append(overall); sp(12)
story.append(section("COMPLETION BY AREA")); sp(8)
bars = Table([area_bar(a, *([area_stats[a][0], area_stats[a][1], round(area_stats[a][0] / area_stats[a][1] * 100) if area_stats[a][1] else 0]))
              for a in area_stats],
             colWidths=[usable_w * 0.30, usable_w * 0.44, usable_w * 0.26])
bars.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                          ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                          ("LEFTPADDING", (0, 0), (-1, -1), 2)]))
story.append(bars); sp(8)
story.append(area_table()); sp(14)
story.append(KeepTogether([section("POUR-WISE STATUS — BASEMENT RAFT WORK"), Spacer(1, 8), pour_grid(raft)]))
sp(6)
story.append(Paragraph("Green = 100% complete · Teal = in progress · Gray = not started · Top strip shows status.", st_small))

# Page 2
from reportlab.platypus import PageBreak
story.append(PageBreak()); sp(2)
story.append(KeepTogether([section("POUR-WISE STATUS — COLUMN AND SLAB WORK"), Spacer(1, 8), pour_grid(cns)]))
sp(6)
story.append(Paragraph("Each pour holds 3 tasks (skin wall, column/shear-wall reinforcement, slab shuttering). % = tasks complete.", st_small))
sp(14)
story.append(section(f"SCHEDULED TASK LIST — ALL {len(PENDING)} PENDING (sorted by due date)")); sp(8)
story.append(schedule_table(pend_sorted[:14]))

# Page 3 — remainder of schedule + observations
story.append(PageBreak()); sp(2)
if len(pend_sorted) > 14:
    story.append(section("SCHEDULED TASK LIST — CONTINUED")); sp(8)
    story.append(schedule_table(pend_sorted[14:])); sp(14)
story.append(section("KEY OBSERVATIONS & OUTLOOK")); sp(8)

due7 = [r for r in PENDING if r["end"] and (r["end"] - TODAY).days <= 7]
due21 = [r for r in PENDING if r["end"] and (r["end"] - TODAY).days <= 21]
raft_pct = round(rb_dn / rb_tt * 100) if rb_tt else 0
cs_pct = round(cs_dn / cs_tt * 100) if cs_tt else 0

obs = []
if not OVERDUE:
    obs.append(("01", "Zero Overdue Tasks — Project On Schedule",
                f"All {len(PENDING)} pending tasks carry future due dates. CP-Atelier is tracking against its planned schedule with no slippages recorded as of {DATE_STR}."))
else:
    obs.append(("01", f"{len(OVERDUE)} Overdue Task(s) — Action Required",
                f"{len(OVERDUE)} pending task(s) are past their due date and need re-baselining before the slip widens."))
obs.append(("02", f"Basement Raft Work — {raft_pct}% Complete ({rb_dn}/{rb_tt} pours done)",
            f"{rb_dn} raft pours are cast; {rb_tt - rb_dn} remain. The next raft pours are due from "
            f"{pend_sorted[0]['end'].strftime('%d-%b') if pend_sorted else 'n/a'} onward and should be sequenced with rebar and shuttering supply."))
obs.append(("03", f"Column & Slab Work — {cs_pct}% Complete ({cs_dn}/{cs_tt} tasks done)",
            f"This area needs accelerated focus. Skin-wall, column/shear-wall reinforcement and slab-shuttering milestones dominate the next 60 days; "
            f"{len(due21)} task(s) fall due within 21 days."))
if due7:
    obs.append(("04", f"{len(due7)} Task(s) Due Within 7 Days",
                "Near-term deadlines need crew and material confirmation now: " +
                ", ".join(f"{r['sub']} ({r['end'].strftime('%d-%b')})" for r in due7) + "."))
else:
    obs.append(("04", "No Immediate Deadline Pressure (next 7 days)",
                f"No tasks are due within 7 days. {len(due21)} task(s) fall due within the next 21 days and should be kept on radar."))

for n, ti, bd in obs:
    story.append(observation(n, ti, bd))
sp(4)
story.append(Paragraph(
    f"Report auto-generated from live ASAP PostgREST data · Homeland Group · {DATE_STR} · "
    "CP-Atelier tower within the Homeland Global Park project.", st_small))

OUT = os.path.join(ROOT, "CP_Atelier_Management_Report.pdf")
doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=LM, rightMargin=RM,
                      topMargin=33 * mm, bottomMargin=16 * mm)
frame = Frame(LM, 16 * mm, usable_w, PAGE_H - 33 * mm - 16 * mm, id="main",
              leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=header_footer)])
doc.build(story)
print("WROTE", OUT)
print(f"  {DATE_STR}: total={TOTAL} done={DONE} ({PCT}%) pending={len(PENDING)} overdue={len(OVERDUE)}")
print(f"  Basement Raft {rb_dn}/{rb_tt}  Column&Slab {cs_dn}/{cs_tt}")
