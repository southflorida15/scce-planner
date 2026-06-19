import { useState } from "react";
import { SESSIONS, FIXED_EVENTS, DAY_ORDER, DAY_LABELS, SPEAKERS } from "../data/sessions";
import { downloadAgendaPDF, agendaPDFToBlob } from "../utils/agendaPdf";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday"];

function timeToMinutes(timeRange) {
  const start = timeRange.split("–")[0].trim();
  const [timePart, ampm] = start.split(" ");
  let [h, m] = timePart.split(":").map(Number);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

const EVENT_TYPE_STYLE = {
  meal:      { icon: "🍽️", bg: "#fef9c3", border: "#fde047", text: "#854d0e" },
  break:     { icon: "☕",  bg: "#f1f5f9", border: "#cbd5e1", text: "#475569" },
  reception: { icon: "🥂",  bg: "#fae8ff", border: "#e9d5ff", text: "#86198f" },
  general:   { icon: "🎤",  bg: "#dbeafe", border: "#93c5fd", text: "#1e40af" },
  exam:      { icon: "📝",  bg: "#fee2e2", border: "#fecaca", text: "#991b1b" },
};

export default function MyAgendaTab({ agenda, onNavigateToPlanner, onBioClick }) {
  const { selectedIds, clearAll, syncMsg, syncType } = agenda;

  const selectedSessions = [...selectedIds]
    .map(id => SESSIONS.find(s => s.id === id))
    .filter(Boolean);

  const totalSelected = selectedSessions.length;
  const daysWithPicks = DAYS.filter(d => selectedSessions.some(s => s.day === d) || FIXED_EVENTS.some(e => e.day === d));

  function exportCSV() {
    if (!totalSelected) { alert("No sessions selected yet."); return; }
    const items = [...selectedSessions].sort((a,b) =>
      DAY_ORDER[a.day]-DAY_ORDER[b.day] || timeToMinutes(a.time)-timeToMinutes(b.time));
    const rows = [["ID","Day","Time","Track","Title","Speakers","Live"]];
    items.forEach(s => rows.push([s.id,s.day,s.time,s.track,`"${s.title.replace(/"/g,'""')}"`,`"${s.sp.join("; ")}"`,s.live?"Yes":"No"]));
    const blob = new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "SCCE_CEI_2026_MyAgenda.csv";
    a.click();
  }

  function printAgenda() {
    window.print();
  }

  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [electiveOnly, setElectiveOnly] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const canNativeShareFiles = typeof navigator !== "undefined" &&
    navigator.canShare &&
    navigator.canShare({ files: [new File([""], "test.pdf", { type: "application/pdf" })] });

  function buildSortedItems() {
    return [...selectedSessions].sort((a,b) =>
      DAY_ORDER[a.day]-DAY_ORDER[b.day] || timeToMinutes(a.time)-timeToMinutes(b.time));
  }

  function handleDownloadPDF() {
    if (!totalSelected) { alert("No sessions selected yet."); return; }
    downloadAgendaPDF(buildSortedItems());
    setShareMenuOpen(false);
  }

  async function handleNativeShare() {
    if (!totalSelected) { alert("No sessions selected yet."); return; }
    setShareBusy(true);
    try {
      const blob = agendaPDFToBlob(buildSortedItems());
      const file = new File([blob], "SCCE_CEI_2026_MyAgenda.pdf", { type: "application/pdf" });
      await navigator.share({
        files: [file],
        title: "SCCE CEI 2026 — My Agenda",
        text: "Here's my agenda for SCCE CEI 2026.",
      });
    } catch (err) {
      // user cancelled or share failed — silently ignore cancellation
      if (err?.name !== "AbortError") {
        alert("Sharing failed. Try downloading the PDF instead.");
      }
    } finally {
      setShareBusy(false);
      setShareMenuOpen(false);
    }
  }

  function handleEmailLink() {
    if (!totalSelected) { alert("No sessions selected yet."); return; }
    const items = buildSortedItems();
    const lines = items.map(s => `${s.day}, ${s.time} — ${s.title}${s.sp.length ? ` (${s.sp.join(", ")})` : ""}`);
    const body = `My SCCE CEI 2026 Agenda:\n\n${lines.join("\n")}\n\n(Generated from the SCCE CEI 2026 Agenda Planner)`;
    const subject = "My SCCE CEI 2026 Agenda";
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setShareMenuOpen(false);
  }

  function handleSMSLink() {
    if (!totalSelected) { alert("No sessions selected yet."); return; }
    const items = buildSortedItems();
    const lines = items.slice(0, 8).map(s => `${s.time.split("–")[0].trim()} ${s.title}`);
    const body = `My SCCE CEI 2026 agenda:\n${lines.join("\n")}${items.length > 8 ? `\n+${items.length - 8} more` : ""}`;
    window.location.href = `sms:?body=${encodeURIComponent(body)}`;
    setShareMenuOpen(false);
  }

  async function handleClearAll() {
    if (!confirm("Clear your entire agenda? This cannot be undone.")) return;
    await clearAll();
  }

  const noPicksYet = totalSelected === 0;

  return (
    <div style={s.root}>
      {/* ── PRINT-ONLY HEADER ── */}
      <div className="print-only" style={s.printHeader}>
        <div style={{ fontSize: "20px", fontWeight: "800" }}>SCCE CEI 2026 — My Agenda</div>
        <div style={{ fontSize: "10px", fontStyle: "italic", color: "#555" }}>unofficial · Sept 27–30, 2026 · Rosen Shingle Creek, Orlando FL</div>
      </div>

      {/* ── HEADER ── */}
      <div style={s.header} className="no-print">
        <div>
          <h1 style={s.h1}>My Agenda</h1>
          <p style={s.sub}>
            {noPicksYet
              ? (electiveOnly
                  ? "No elective sessions picked yet"
                  : "No sessions picked yet — showing the fixed conference schedule")
              : `${totalSelected} session${totalSelected !== 1 ? "s" : ""} selected across ${daysWithPicks.length} day${daysWithPicks.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div style={s.actions}>
          <div style={{ position: "relative" }}>
            <button style={{ ...s.actionBtn, background: "#7c3aed" }} onClick={() => setShareMenuOpen(v => !v)}>
              📤 Share
            </button>
            {shareMenuOpen && (
              <>
                <div style={s.shareMenuOverlay} onClick={() => setShareMenuOpen(false)} />
                <div style={s.shareMenu}>
                  {canNativeShareFiles && (
                    <button style={s.shareMenuItem} onClick={handleNativeShare} disabled={shareBusy}>
                      <span style={s.shareMenuIcon}>📱</span>
                      <div>
                        <div style={s.shareMenuTitle}>{shareBusy ? "Preparing…" : "Share via Messages, Mail, AirDrop…"}</div>
                        <div style={s.shareMenuSub}>Sends the agenda as a PDF</div>
                      </div>
                    </button>
                  )}
                  <button style={s.shareMenuItem} onClick={handleDownloadPDF}>
                    <span style={s.shareMenuIcon}>📄</span>
                    <div>
                      <div style={s.shareMenuTitle}>Download PDF</div>
                      <div style={s.shareMenuSub}>Save a copy to your device</div>
                    </div>
                  </button>
                  <button style={s.shareMenuItem} onClick={handleEmailLink}>
                    <span style={s.shareMenuIcon}>✉️</span>
                    <div>
                      <div style={s.shareMenuTitle}>Email</div>
                      <div style={s.shareMenuSub}>Opens your mail app with agenda text</div>
                    </div>
                  </button>
                  <button style={s.shareMenuItem} onClick={handleSMSLink}>
                    <span style={s.shareMenuIcon}>💬</span>
                    <div>
                      <div style={s.shareMenuTitle}>Text Message</div>
                      <div style={s.shareMenuSub}>Opens Messages with agenda summary</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
          <button style={{ ...s.actionBtn, background: "#2563eb" }} onClick={exportCSV}>⬇ CSV</button>
          <button style={{ ...s.actionBtn, background: "#1e293b" }} onClick={printAgenda}>🖨 Print</button>
          {!noPicksYet && <button style={{ ...s.actionBtn, background: "#dc2626" }} onClick={handleClearAll}>✕ Clear All</button>}
        </div>
      </div>

      <div className="no-print" style={s.electiveRow}>
        <label style={s.electiveLabel}>
          <input
            type="checkbox"
            checked={electiveOnly}
            onChange={e => setElectiveOnly(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          Show only my elective sessions
        </label>
        {electiveOnly && (
          <span style={s.electiveHint}>
            Hiding meals, breaks, and general sessions shared by all attendees
          </span>
        )}
      </div>

      {noPicksYet && (
        <div className="no-print" style={s.nudgeBanner}>
          <span style={{ fontSize: "16px" }}>💡</span>
          <span>You haven't picked any sessions yet. <button style={s.nudgeLink} onClick={onNavigateToPlanner}>Go to the Agenda Planner</button> to choose what to attend in each time slot.</span>
        </div>
      )}

      {syncMsg && (
        <div className="no-print" style={{ fontSize: "11px", color: syncType==="ok"?"#166534":syncType==="err"?"#dc2626":"#64748b", marginBottom: "12px" }}>
          {syncMsg}
        </div>
      )}

      {/* ── DAY-BY-DAY ITINERARY ── */}
      {electiveOnly && totalSelected === 0 && (
        <div className="no-print" style={s.electiveEmptyState}>
          You haven't selected any elective sessions yet. Uncheck the box above to see the fixed conference schedule, or head to the Planner to make picks.
        </div>
      )}
      {DAYS.map(day => {
        const daySessions = selectedSessions.filter(s => s.day === day);
        const dayFixed = electiveOnly ? [] : FIXED_EVENTS.filter(e => e.day === day);

        // Group selected sessions by time so 2-picks-per-slot render side by side
        const sessionsByTime = {};
        daySessions.forEach(s => {
          if (!sessionsByTime[s.time]) sessionsByTime[s.time] = [];
          sessionsByTime[s.time].push(s);
        });

        let timeline = [
          ...Object.entries(sessionsByTime).map(([time, group]) => ({ kind: "session-group", time, sessions: group })),
          ...dayFixed.map(e => ({ kind: "fixed", ...e })),
        ];

        // Always show empty placeholders for elective slots with nothing picked
        // yet — mirrors the Planner's grey "no selection" state.
        const allElectiveTimes = [...new Set(
          SESSIONS.filter(sess => sess.day === day && sess.sp.length > 0).map(sess => sess.time)
        )];
        allElectiveTimes.forEach(time => {
          if (!sessionsByTime[time]) {
            timeline.push({ kind: "empty-slot", time });
          }
        });

        timeline.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

        if (timeline.length === 0) return null;

        return (
          <div key={day} style={s.daySection}>
            <div style={s.dayHeader}>{DAY_LABELS[day]}</div>
            {timeline.map(item => {
              if (item.kind === "empty-slot") {
                return (
                  <div key={`empty-${item.time}`} style={s.emptySlotRow}>
                    <div style={s.emptySlotTime}>{item.time}</div>
                    <div style={s.emptySlotLabel}>
                      <span style={s.emptySlotDot} />
                      No selection yet
                    </div>
                  </div>
                );
              }
              if (item.kind === "fixed") {
                const style = EVENT_TYPE_STYLE[item.type] || EVENT_TYPE_STYLE.general;
                return (
                  <div key={item.id} style={{ ...s.timelineRow, background: style.bg, border: `1px solid ${style.border}` }}>
                    <div style={{ ...s.timelineTime, color: style.text }}>{item.time}</div>
                    <div style={{ ...s.timelineContent, color: style.text, fontWeight: "600" }}>
                      <span style={{ marginRight: "6px" }}>{style.icon}</span>{item.title}
                    </div>
                    <span className="no-print" style={{ fontSize: "9px", fontWeight: "700", color: style.text, opacity: 0.65, marginLeft: "auto", whiteSpace: "nowrap" }}>
                      ALL ATTENDEES
                    </span>
                  </div>
                );
              }

              // session-group: 1 or 2 sessions sharing this time slot
              const group = item.sessions;
              const isPair = group.length > 1;

              return (
                <div key={item.time} style={{ display: "flex", gap: "14px", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div style={{ ...s.timelineTime, color: "#2563eb", paddingTop: "13px" }}>{item.time}</div>
                  <div style={{ display: "flex", gap: "10px", flex: 1, flexDirection: isPair ? "row" : "column" }}>
                    {group.map(sess => (
                      <div key={sess.id} style={{
                        ...s.sessionCard,
                        flex: isPair ? 1 : "none",
                        minWidth: 0,
                        ...(isPair ? { padding: "10px 12px" } : {}),
                      }}>
                        <div style={s.sessionMeta}>
                          <span style={s.sid}>{sess.id}</span>
                          {!isPair && <span style={s.trackTag}>{sess.track}</span>}
                          {sess.live && <span style={s.liveTag}>📡 Live</span>}
                        </div>
                        <div style={{ ...s.sessionTitle, ...(isPair ? { fontSize: "12px" } : {}) }}>{sess.title}</div>
                        {sess.sp.length > 0 && (
                          <div style={s.speakerRow}>
                            {sess.sp.map(name => {
                              const d = SPEAKERS[name] ?? {};
                              return (
                                <button
                                  key={name}
                                  className="no-print"
                                  style={{ ...s.speakerBtn, ...(isPair ? { fontSize: "10.5px" } : {}) }}
                                  onClick={() => onBioClick?.(name)}
                                  title={d.role && d.co ? `${d.role}, ${d.co}` : ""}
                                >
                                  {name}
                                </button>
                              );
                            })}
                            <span className="print-only" style={s.speakerPrintText}>
                              {sess.sp.join(", ")}
                            </span>
                          </div>
                        )}
                        {!isPair && sess.desc && sess.desc.length > 0 && (
                          <ul style={s.descList}>
                            {sess.desc.map((line, i) => <li key={i} style={s.descItem}>{line}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

const s = {
  root: { fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", padding: "24px 28px", maxWidth: "900px", margin: "0 auto" },

  printHeader: { display: "none" },

  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px", marginBottom: "16px" },
  h1: { margin: "0 0 4px", fontSize: "22px", fontWeight: "800", color: "#0f172a" },
  sub: { margin: 0, fontSize: "12px", color: "#64748b" },
  actions: { display: "flex", gap: "8px", flexWrap: "wrap" },
  actionBtn: { border: "none", color: "#fff", padding: "9px 16px", fontSize: "12px", fontWeight: "700", borderRadius: "6px", cursor: "pointer" },

  shareMenuOverlay: { position: "fixed", inset: 0, zIndex: 998 },
  shareMenu: {
    position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 999,
    background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)", padding: "6px", minWidth: "260px",
  },
  shareMenuItem: {
    display: "flex", alignItems: "flex-start", gap: "10px", width: "100%",
    background: "none", border: "none", padding: "9px 10px", borderRadius: "7px",
    cursor: "pointer", textAlign: "left",
  },
  shareMenuIcon: { fontSize: "16px", flexShrink: 0, marginTop: "1px" },
  shareMenuTitle: { fontSize: "12.5px", fontWeight: "700", color: "#0f172a" },
  shareMenuSub: { fontSize: "10.5px", color: "#64748b", marginTop: "1px" },

  emptyState: { textAlign: "center", padding: "80px 24px", maxWidth: "440px", margin: "0 auto" },
  emptyTitle: { fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: "0 0 8px" },
  emptySub:   { fontSize: "13px", color: "#64748b", lineHeight: "1.6", margin: "0 0 20px" },
  ctaBtn:     { background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", padding: "11px 22px", fontSize: "13px", fontWeight: "700", cursor: "pointer" },
  nudgeBanner:{ display: "flex", alignItems: "center", gap: "10px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "10px 16px", fontSize: "12px", color: "#1e40af", marginBottom: "20px" },
  electiveRow: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid #e2e8f0" },
  electiveLabel: { display: "flex", alignItems: "center", gap: "7px", fontSize: "12.5px", fontWeight: "700", color: "#0f172a", cursor: "pointer" },
  electiveHint: { fontSize: "11px", color: "#94a3b8" },
  electiveEmptyState: { textAlign: "center", padding: "48px 24px", fontSize: "12.5px", color: "#64748b", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" },
  nudgeLink:  { background: "none", border: "none", padding: 0, color: "#2563eb", fontWeight: "700", textDecoration: "underline", cursor: "pointer", fontSize: "inherit" },

  daySection: { marginBottom: "28px" },
  dayHeader:  { fontSize: "15px", fontWeight: "800", color: "#0f172a", marginBottom: "10px", paddingBottom: "8px", borderBottom: "2px solid #2563eb" },

  timelineRow: { display: "flex", gap: "14px", alignItems: "flex-start", borderRadius: "8px", padding: "12px 16px", marginBottom: "8px" },
  emptySlotRow: { display: "flex", gap: "14px", alignItems: "center", borderRadius: "8px", padding: "12px 16px", marginBottom: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderLeft: "4px solid #cbd5e1" },
  emptySlotTime: { fontSize: "11px", fontWeight: "800", color: "#94a3b8", minWidth: "120px", flexShrink: 0 },
  emptySlotLabel: { fontSize: "12px", fontWeight: "700", color: "#64748b", display: "flex", alignItems: "center", gap: "8px" },
  emptySlotDot: { width: "9px", height: "9px", borderRadius: "50%", background: "#94a3b8", flexShrink: 0, boxShadow: "0 0 0 3px #e2e8f0" },
  timelineTime: { fontSize: "11px", fontWeight: "800", minWidth: "120px", flexShrink: 0, paddingTop: "1px" },
  timelineContent: { fontSize: "13px", flex: 1 },

  sessionCard: { flex: 1, background: "#fff", border: "1px solid #e2e8f0", borderLeft: "4px solid #2563eb", borderRadius: "8px", padding: "12px 16px" },
  sessionMeta: { display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "5px" },
  sid: { background: "#eff6ff", color: "#2563eb", fontWeight: "700", fontSize: "10px", padding: "2px 7px", borderRadius: "4px", textTransform: "uppercase" },
  trackTag: { fontSize: "10px", fontWeight: "600", background: "#f1f5f9", color: "#475569", padding: "2px 7px", borderRadius: "4px", textTransform: "uppercase" },
  liveTag: { fontSize: "10px", fontWeight: "700", background: "#dcfce7", color: "#166534", padding: "2px 7px", borderRadius: "4px" },
  sessionTitle: { fontSize: "13.5px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" },
  speakerRow: { display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "6px" },
  speakerBtn: { background: "none", border: "none", padding: 0, fontSize: "11.5px", fontWeight: "600", color: "#2563eb", textDecoration: "underline", cursor: "pointer" },
  speakerPrintText: { fontSize: "11px", color: "#333" },
  descList: { margin: "6px 0 0", paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "3px" },
  descItem: { fontSize: "11px", color: "#475569", lineHeight: "1.45" },
};
