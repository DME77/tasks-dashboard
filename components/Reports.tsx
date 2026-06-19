"use client";

interface ReportItem {
  title: string;
  desc: string;
  file: string;
  icon: string;
  tag?: string;
}

const REPORTS: ReportItem[] = [
  {
    title: "HGP Tower — Full Management Report",
    desc: "Comprehensive project review for the HGP tower: snapshot KPIs, completion by area, schedule status, serial task registers for all 6 areas, and key observations. Built from live ASAP data.",
    file: "/reports/HGP_Tower_Management_Report.pdf",
    icon: "📊",
    tag: "HGP · All areas",
  },
  {
    title: "D-Wall Work — Management Report",
    desc: "Diaphragm-wall panel status for HGP: completion by panel type, upcoming schedule, recent progress and key observations. Built from live ASAP data.",
    file: "/reports/HGP_DWall_Management_Report.pdf",
    icon: "🧱",
    tag: "HGP · D-Wall",
  },
  {
    title: "HGP — Management Report",
    desc: "Tower-wide project status review for Homeland Global Park: snapshot, completion by area, pour-wise status and observations.",
    file: "/reports/HGP_Management_Report.pdf",
    icon: "🏗️",
    tag: "HGP",
  },
  {
    title: "CP-Atelier — Management Report",
    desc: "Project status review for the CP-Atelier tower: snapshot, completion by area, pour-wise status and observations.",
    file: "/reports/CP_Atelier_Management_Report.pdf",
    icon: "🏢",
    tag: "CP-Atelier",
  },
];

export default function Reports() {
  return (
    <div className="panel">
      <h3 style={{ marginBottom: 4 }}>📄 Management Reports</h3>
      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 0, marginBottom: 16 }}>
        Download the latest management-review PDFs. Open in a new tab or save to your device.
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        {REPORTS.map((r) => (
          <div
            key={r.file}
            style={{
              display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
              padding: "14px 16px", borderRadius: 12,
              border: "1px solid var(--border)", background: "var(--panel-bg)",
            }}
          >
            <span style={{ fontSize: 26 }}>{r.icon}</span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{r.title}</span>
                {r.tag && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: "var(--muted)",
                    border: "1px solid var(--border)", borderRadius: 20, padding: "1px 8px",
                  }}>{r.tag}</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{r.desc}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <a
                href={r.file}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: "1px solid var(--border)", color: "var(--text)", textDecoration: "none",
                  background: "var(--sidebar-bg)", whiteSpace: "nowrap",
                }}
              >
                Open
              </a>
              <a
                href={r.file}
                download
                style={{
                  padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: "none", color: "#fff", textDecoration: "none",
                  background: "#0f8a8a", whiteSpace: "nowrap",
                }}
              >
                ⬇ Download
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
