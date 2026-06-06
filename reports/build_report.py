#!/usr/bin/env python3
"""
Self-contained daily bulletin generator for Homeland Global Park.

Input (compact, produced by the scheduled task after it fetches the live APIs):
  report_data.json   — see schema in fetch_and_build instructions
Assets (committed with this script):
  panels.json, dwall_bg.png
Output:
  HGP_Morning_Bulletin_<YYYY-MM-DD>.pdf   (in this same folder)

Run:  python3 build_report.py
"""
import os, json, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
D = {}
try:
    with open(os.path.join(HERE,"report_data.json")) as f: D=json.load(f)
except Exception as e:
    print("FATAL: report_data.json missing or invalid:", e); raise SystemExit(1)

today = datetime.date.fromisoformat(D.get("date") or datetime.date.today().isoformat())
DATE_LONG = today.strftime("%A, %d %B %Y").upper()

towers = D.get("towers", {})
def area_rows(key): return D.get(key, [])   # list of [name,done,total,pct]

dwall = D.get("dwall", {})
done = dwall.get("done", [])
dw_total = dwall.get("total", 0); dw_done = dwall.get("doneCount", len(done))
def bt(letter): v=dwall.get(letter,[0,0]); return v[0], v[1]

try:
    from PIL import Image, ImageDraw
    panels = json.load(open(os.path.join(HERE,"panels.json")))
    img = Image.open(os.path.join(HERE,"dwall_bg.png")).convert("RGBA"); W,H=img.size
    ov  = Image.new("RGBA", img.size, (0,0,0,0)); dr=ImageDraw.Draw(ov)
    for k in done:
        if k in panels:
            p=panels[k]; cx,cy=p["x"]*W,p["y"]*H; r=W*0.0098
            dr.rectangle([cx-r,cy-r,cx+r,cy+r], fill=(250,204,21,150), outline=(160,110,0,255), width=3)
    Image.alpha_composite(img,ov).convert("RGB").save(os.path.join(HERE,"dwall_report.png"))
except Exception as e:
    print("WARN drawing overlay:", e)

# ── drawings + billing numbers ───────────────────────────────────────────────
dd = D.get("drawings", {})
dr_total=dd.get("total",0); dr_recv=dd.get("received",0); dr_pend=dd.get("pending",0)
dr_adv=dd.get("advCopy",0); dr_na=dd.get("na",0); dr_up=dd.get("upcoming",0)
bb = D.get("billing", {})
mp_days=bb.get("mp_days",0); mp_total=bb.get("mp_total",0); mp_peak=bb.get("mp_peak",0)
mp_last_date=bb.get("mp_last_date"); mp_last_total=bb.get("mp_last_total",0)
spend = bb.get("spend",0); avg=bb.get("avg",0)
def inr(n):
    s=str(int(n));
    if len(s)<=3: return "Rs "+s
    last3=s[-3:]; rest=s[:-3]; parts=[]
    while len(rest)>2: parts.insert(0,rest[-2:]); rest=rest[:-2]
    if rest: parts.insert(0,rest)
    return "Rs "+",".join(parts)+","+last3

# ════════════════════════════════════════════════════════════════════════════
#  Render PDF (reportlab)
# ════════════════════════════════════════════════════════════════════════════
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, Image, FrameBreak,
                                PageBreak, NextPageTemplate, KeepTogether)
from reportlab.lib.styles import ParagraphStyle

RED=HexColor("#b00000"); CREAM=HexColor("#f5f3ee"); GREY=HexColor("#e6e6e6"); DGREY=HexColor("#555555")
PAGE_W,PAGE_H=A4; LM=RM=12*mm; usable_w=PAGE_W-LM-RM; GAP=7*mm; COL_W=(usable_w-2*GAP)/3
def col_frames(top, bot=34):
    return [Frame(LM+i*(COL_W+GAP),bot,COL_W,top-bot,0,0,0,0,id=f"c{i}") for i in range(3)]
band=Frame(LM,342,usable_w,600-342,0,0,0,0,id="band")
p1_frames=[band]+col_frames(332); p2_frames=col_frames(600)

def S(n,**k):
    b=dict(fontName="Times-Roman",fontSize=8.6,leading=11.4,textColor=black); b.update(k); return ParagraphStyle(n,**b)
st_body=S("body",alignment=TA_JUSTIFY); st_kick=S("kick",fontName="Times-Bold",fontSize=7,leading=9,textColor=RED)
st_kickk=S("kickk",fontName="Times-Bold",fontSize=7,leading=9); st_hed=S("hed",fontName="Times-Bold",fontSize=13,leading=13.5)
st_hed2=S("hed2",fontName="Times-Bold",fontSize=12,leading=13); st_sub=S("sub",fontName="Times-Bold",fontSize=10.5,leading=12)
st_stat=S("stat",fontName="Times-Italic",fontSize=7.4,leading=9.4,textColor=DGREY)
st_li=S("li",alignment=TA_LEFT,fontSize=8.4,leading=10.6); st_cap=S("cap",alignment=TA_CENTER,fontName="Times-Italic",fontSize=8.2,leading=10.4,textColor=HexColor("#333333"))

def kicker(text,red=True):
    p=Paragraph(text.upper(),st_kick if red else st_kickk); t=Table([[p]],colWidths=[COL_W])
    t.setStyle(TableStyle([("LINEBELOW",(0,0),(-1,-1),0.6,black),("BOTTOMPADDING",(0,0),(-1,-1),1.5),("TOPPADDING",(0,0),(-1,-1),0),("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0)])); return t
def bar_row(name,pct,warn=False):
    fw=max(0.02,pct/100.0)*(COL_W*0.50); ew=(COL_W*0.50)-fw
    inner=Table([["",""]],colWidths=[fw,ew],rowHeights=[7])
    inner.setStyle(TableStyle([("BACKGROUND",(0,0),(0,0),RED if warn else black),("BACKGROUND",(1,0),(1,0),GREY),("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0)]))
    return [Paragraph(name,S("nm",fontSize=7.6,leading=8.6)),inner,Paragraph(f"<b>{pct}</b>",S("pc",fontSize=7.8,leading=8.6,alignment=2))]
def league(rows):
    bt_=Table(rows,colWidths=[COL_W*0.36,COL_W*0.50,COL_W*0.12])
    bt_.setStyle(TableStyle([("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),2),("TOPPADDING",(0,0),(-1,-1),1.5),("BOTTOMPADDING",(0,0),(-1,-1),1.5),("VALIGN",(0,0),(-1,-1),"MIDDLE")])); return bt_
def boxout(fl,fill=CREAM):
    t=Table([[f] for f in fl],colWidths=[COL_W-12]); t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),fill),("BOX",(0,0),(-1,-1),1.4,black),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)])); return t
def action(tag,col,text):
    tg=Paragraph(f'<b>{tag.upper()}</b>',S("tg",fontSize=6.6,leading=8,alignment=TA_CENTER,textColor=white if col!="w" else black))
    bg=RED if col=="r" else (black if col=="b" else white)
    tgt=Table([[tg]],colWidths=[44]); tgt.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),bg),("BOX",(0,0),(-1,-1),0.7,black),("TOPPADDING",(0,0),(-1,-1),1),("BOTTOMPADDING",(0,0),(-1,-1),1.5),("LEFTPADDING",(0,0),(-1,-1),2),("RIGHTPADDING",(0,0),(-1,-1),2)]))
    row=Table([[tgt,Paragraph(text,st_li)]],colWidths=[48,COL_W-12-48]); row.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(0,0),4),("TOPPADDING",(0,0),(-1,-1),2),("BOTTOMPADDING",(0,0),(-1,-1),2)])); return row

_z=dict(total=0,completed=0,pending=0,overdue=0,hold=0,doneWk=0,pct=0)
H=towers.get("HGP",_z); C=towers.get("CPA",_z)
a39,t39=bt("A"); b_d,b_t=bt("B"); c_d,c_t=bt("C"); d_d,d_t=bt("D")
mp_last_txt=(f"{mp_last_date}) was <b>{mp_last_total}</b>" if mp_last_date else "n/a)")

MAST={
 1:{"sub":"HOMELAND GLOBAL PARK · HGP TOWER",
    "vit":[(f"{H['pct']}%","HGP COMPLETE",False),(f"{H['completed']}","TASKS DONE",False),(f"{H['doneWk']}","CLOSED · 7 DAYS",False),
           (f"{H['overdue']}","OVERDUE",H['overdue']>0),(f"{H['hold']}","ON HOLD",H['hold']>0),(f"{dw_done}/{dw_total}","D-WALL PANELS",False)],
    "hed":f"HGP Tower at {H['pct']}%; Diaphragm Wall Leads as Basement Holds",
    "deck":f"The diaphragm wall stands at {round((dw_done/dw_total*100) if dw_total else 0)}% while {H['hold']} sub-area tasks remain on hold and {H['overdue']} items run overdue."},
 2:{"sub":"HOMELAND GLOBAL PARK · CP-ATELIER TOWER",
    "vit":[(f"{C['pct']}%","CPA COMPLETE",C['pct']<20),(f"{C['completed']}","TASKS DONE",False),(f"{C['doneWk']}","CLOSED · 7 DAYS",False),
           (f"{C['overdue']}","OVERDUE",C['overdue']>0),(f"{dr_pend}","DRAWINGS AWAITED",dr_pend>0),(f"{mp_total}","MAN-DAYS · MTD",False)],
    "hed":f"CP-Atelier at {C['pct']}%; Raft and B2 Columns Drive the Programme",
    "deck":f"{dr_pend} GFC drawings are still awaited as {mp_total} man-days are logged this month."},
}
def wrap(c,text,font,size,y,maxw,lead,color=black):
    c.setFont(font,size); c.setFillColor(color); cur=""; lines=[]
    for w in text.split():
        t=(cur+" "+w).strip()
        if c.stringWidth(t,font,size)<=maxw: cur=t
        else: lines.append(cur); cur=w
    if cur: lines.append(cur)
    for ln in lines: c.drawCentredString(PAGE_W/2,y,ln); y-=lead
    return y
def masthead(c,doc):
    m=MAST.get(doc.page,MAST[1]); cx=PAGE_W/2; top=PAGE_H-10*mm
    c.setFont("Times-Roman",8); c.setFillColor(HexColor("#333333"))
    c.drawCentredString(cx,top,"H O M E L A N D   G R O U P   ·   P R O J E C T   M A N A G E M E N T   D E S K   ·   E S T.  2 0 2 6")
    c.setFont("Times-Bold",36); c.setFillColor(black); c.drawCentredString(cx,top-30,"The Homeland Herald")
    y=top-38; c.setLineWidth(2); c.line(LM,y,PAGE_W-RM,y); c.setLineWidth(0.6); c.line(LM,y-2.5,PAGE_W-RM,y-2.5)
    yb=top-52; c.setLineWidth(0.7); c.line(LM,yb+9,PAGE_W-RM,yb+9); c.line(LM,yb-3,PAGE_W-RM,yb-3)
    c.setFont("Times-Roman",7.6); c.setFillColor(black); c.drawString(LM+2,yb,"VOL. I — DAILY SITE EDITION")
    c.setFont("Times-Bold",7.6); c.drawCentredString(cx,yb,m["sub"])
    c.setFont("Times-Roman",7.6); c.drawRightString(PAGE_W-RM-2,yb,DATE_LONG+" · MORNING")
    n=len(m["vit"]); gap=4; bw=(usable_w-(n-1)*gap)/n; by=top-90; bh=26
    for i,(num,lab,hot) in enumerate(m["vit"]):
        bx=LM+i*(bw+gap); c.setLineWidth(1); c.setStrokeColor(black); c.rect(bx,by,bw,bh,stroke=1,fill=0)
        c.setFont("Times-Bold",15 if len(num)<5 else 12); c.setFillColor(RED if hot else black); c.drawCentredString(bx+bw/2,by+11,num)
        c.setFont("Times-Roman",5.5); c.setFillColor(HexColor("#333333")); c.drawCentredString(bx+bw/2,by+3.5,lab)
    yh=by-14; ye=wrap(c,m["hed"],"Times-Bold",18,yh,usable_w,19)
    ye=wrap(c,m["deck"],"Times-Italic",9.6,ye-2,usable_w-40,12,color=HexColor("#333333"))
    c.setLineWidth(1.5); c.line(LM,ye-4,PAGE_W-RM,ye-4)
    c.setFont("Times-Roman",7); c.setFillColor(HexColor("#555555"))
    c.drawCentredString(cx,22,"Homeland Global Park — Daily Site Bulletin · generated from live ASAP project data · Confidential — for management review")
    c.drawRightString(PAGE_W-RM,22,f"Page {doc.page} of 2")

story=[]; sp=lambda h=6: story.append(Spacer(1,h))
# PAGE 1 — HGP
img_w=322
if os.path.exists(os.path.join(HERE,"dwall_report.png")):
    story.append(Image(os.path.join(HERE,"dwall_report.png"),width=img_w,height=img_w*2339/3309,hAlign='CENTER')); sp(3)
story.append(Paragraph(f"D-Wall Work — GFC Layout (Diaphragm Wall). Yellow = panels cast. {dw_done} of {dw_total} complete — Type-A {a39}/{t39}, Type-B {b_d}/{b_t}, Type-D {d_d}/{d_t}, Type-C {c_d}/{c_t}.",st_cap))
story.append(FrameBreak())
story.append(kicker("HGP · Progress by Area",red=False)); sp(3)
story.append(league([bar_row(a, p, p<20) for (a,_,_,p) in area_rows("areasHGP")[:6]]))
sp(2); story.append(Paragraph("Bars = % of tasks complete. Red below 20%.",st_stat)); sp(8)
story.append(kicker("Site Spotlight · Diaphragm Wall")); sp(3)
story.append(Paragraph(f"Wall at {dw_done}/{dw_total}; Type-C at {c_d}/{c_t}",st_hed)); sp(2)
story.append(Paragraph(f"The diaphragm wall reads <b>{dw_done} of {dw_total} panels cast</b>. Type-A is at <b>{a39}/{t39}</b>, Type-D <b>{d_d}/{d_t}</b>, Type-B <b>{b_d}/{b_t}</b>, and Type-C <b>{c_d}/{c_t}</b> &mdash; the largest open quantity on the wall.",st_body))
story.append(Paragraph(f"<b>Pending:</b> Type-C &times;{c_t-c_d} &middot; Type-B &times;{b_t-b_d} &middot; Type-D &times;{d_t-d_d}",st_stat)); sp(8)
story.append(kicker("Basement & Schedule")); sp(3)
story.append(Paragraph("On-Hold Front Caps HGP",st_sub)); sp(1)
story.append(Paragraph(f"HGP carries <b>{H['hold']} tasks on hold</b>, <b>{H['overdue']} overdue</b> and {H['pending']} pending; {H['doneWk']} closed in the last seven days.",st_body)); sp(8)
ed1=[kicker("Editorial · The Boss's Action Desk"),Spacer(1,2),Paragraph("HGP — Decisions Today",st_hed2),Spacer(1,3),
 action("Unblock","r",f"<b>Release the on-hold front.</b> {H['hold']} tasks on hold — the biggest drag on HGP's {H['pct']}%. A go/no-go is needed."),
 action("Start","r",f"<b>Mobilise Type-C D-Wall.</b> {c_d} of {c_t} panels begun; confirm GFC drawings and panel sequence."),
 action("Recover","b",f"<b>Re-baseline {H['overdue']} overdue tasks</b> before the slip widens."),
 action("Close","w",f"<b>Finish quick wins:</b> D-Wall Type-D ({d_t-d_d} left) and Type-B ({b_t-b_d} left).")]
story.append(KeepTogether(boxout(ed1)))
# PAGE 2 — CP-ATELIER
story.append(NextPageTemplate('p2')); story.append(PageBreak())
story.append(kicker("CP-Atelier · Progress by Area",red=False)); sp(3)
story.append(league([bar_row(a, p, p<20) for (a,_,_,p) in area_rows("areasCPA")[:6]]))
sp(2); story.append(Paragraph("Active fronts. Bars = % of tasks complete.",st_stat)); sp(8)
story.append(kicker("Front Page · CP-Atelier Status")); sp(3)
story.append(Paragraph(f"Tower at {C['pct']}%; {C['completed']} of {C['total']} Tasks Closed",st_hed)); sp(2)
story.append(Paragraph(f"CP-Atelier stands at <b>{C['completed']} of {C['total']} tasks complete ({C['pct']}%)</b>, with {C['overdue']} overdue and {C['hold']} on hold. {C['pending']} tasks remain pending.",st_body)); sp(8)
story.append(kicker("Drawings Desk · GFC Tracker")); sp(3)
story.append(Paragraph(f"{dr_pend} Drawings Still Awaited",st_sub)); sp(1)
story.append(Paragraph(f"Of <b>{dr_total} tracked drawings</b>, <b>{dr_recv} are received</b> and {dr_adv} in advance copy, but <b>{dr_pend} remain pending</b> with consultants. <b>{dr_up} drawings</b> sit on the upcoming schedule.",st_body)); sp(8)
story.append(kicker("Labour & Materials · This Month")); sp(3)
story.append(Paragraph(f"{mp_total} Man-Days; Spend {inr(spend)}",st_sub)); sp(1)
story.append(Paragraph(f"This month logs <b>{mp_total} man-days across {mp_days} active days</b>, peaking at <b>{mp_peak} workers</b>; the latest count ({mp_last_txt}). Spend month-to-date is <b>{inr(spend)}</b>, averaging <b>{inr(avg)}/day</b>.",st_body)); sp(8)
ed2=[kicker("Editorial · The Boss's Action Desk"),Spacer(1,2),Paragraph("CP-Atelier — Decisions Today",st_hed2),Spacer(1,3),
 action("Chase","r",f"<b>Pursue {dr_pend} pending drawings.</b> Escalate with consultants; several feed upcoming work."),
 action("Resource","b","<b>Lift the slowest area.</b> Review crew and shuttering cycle on the trailing front."),
 action("Sustain","b","<b>Hold the daily manpower pace</b> to keep the pour programme on track."),
 action("Plan","w",f"<b>Sequence the {dr_up} upcoming drawings</b> against the raft and B2 column schedule.")]
story.append(KeepTogether(boxout(ed2)))

out=os.path.join(HERE, f"HGP_Morning_Bulletin_{today.isoformat()}.pdf")
doc=BaseDocTemplate(out,pagesize=A4,leftMargin=LM,rightMargin=RM,topMargin=12*mm,bottomMargin=12*mm)
doc.addPageTemplates([PageTemplate(id="p1",frames=p1_frames,onPage=masthead),
                      PageTemplate(id="p2",frames=p2_frames,onPage=masthead)])
doc.build(story)
print("WROTE", out)
