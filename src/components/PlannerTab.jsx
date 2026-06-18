import { useState, useEffect, useCallback, useRef } from "react";
import { SESSIONS, TRACKS, DAY_ORDER, DAY_LABELS } from "../data/sessions";
import SessionBlock from "./SessionBlock";
import BioModal from "./BioModal";

function getOrCreateUID() {
  let uid = localStorage.getItem("scce_uid");
  if (!uid) { uid = crypto.randomUUID(); localStorage.setItem("scce_uid", uid); }
  return uid;
}

function slotKey(s) { return `${s.day}|${s.time}`; }

const DAYS = ["All Days", "Sunday", "Monday", "Tuesday", "Wednesday"];
const DAY_SUBTITLES = {
  "All Days":  "Full conference · Sept 27–30",
  "Sunday":    "September 27 · Pre-Conference",
  "Monday":    "September 28",
  "Tuesday":   "September 29",
  "Wednesday": "September 30 · Workshops",
};

export default function PlannerTab() {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bioName, setBioName]         = useState(null);
  const [syncMsg, setSyncMsg]         = useState("");
  const [syncType, setSyncType]       = useState("");
  const [activeDay, setActiveDay]     = useState("All Days");
  const [filterName, setFilterName]   = useState("");
  const [filterCo, setFilterCo]       = useState("");
  const [filterTrack, setFilterTrack] = useState("ALL");
  const [filterLive, setFilterLive]   = useState("ALL");
  const [showSidebar, setShowSidebar] = useState(true);
  const saveTimer = useRef(null);
  const UID = useRef(getOrCreateUID()).current;

  function setSync(msg, type, autoClear = true) {
    setSyncMsg(msg); setSyncType(type);
    if (autoClear && type !== "busy") setTimeout(() => { setSyncMsg(""); setSyncType(""); }, 3000);
  }

  const saveToServer = useCallback(async (ids) => {
    const arr = [...ids];
    localStorage.setItem("scce_cache", JSON.stringify(arr));
    try {
      const r = await fetch(`/api/agenda?action=save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: UID, selections: arr }),
      });
      if (!r.ok) throw new Error(r.status);
      setSync("✓ Saved", "ok");
    } catch {
      setSync("⚠ Saved locally only", "err");
    }
  }, [UID]);

  function debouncedSave(ids) {
    clearTimeout(saveTimer.current);
    setSync("Saving…", "busy", false);
    saveTimer.current = setTimeout(() => saveToServer(ids), 800);
  }

  useEffect(() => {
    async function load() {
      setSync("Loading…", "busy", false);
      try {
        const r = await fetch(`/api/agenda?action=load&uid=${UID}`);
        if (!r.ok) throw new Error(r.status);
        const data = await r.json();
        setSelectedIds(new Set(data.selections || []));
        setSync("✓ Loaded", "ok");
      } catch {
        setSync("⚠ Offline — showing cached picks", "err");
        const cache = localStorage.getItem("scce_cache");
        if (cache) setSelectedIds(new Set(JSON.parse(cache)));
      }
    }
    load();
  }, [UID]);

  function toggle(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      debouncedSave(next);
      return next;
    });
  }

  async function clearAll() {
    if (!confirm("Clear all your picks? This cannot be undone.")) return;
    setSelectedIds(new Set());
    localStorage.removeItem("scce_cache");
    try {
      await fetch(`/api/agenda?action=clear&uid=${UID}`, { method: "DELETE" });
      setSync("✓ Cleared", "ok");
    } catch {
      setSync("Cleared locally", "err");
    }
  }

  // ── Filter ────────────────────────────────────────────────────────────────
  const qN = filterName.toLowerCase().trim();
  const qC = filterCo.toLowerCase().trim();

  const filtered = SESSIONS.filter(s => {
    if (activeDay !== "All Days" && s.day !== activeDay) return false;
    if (filterTrack !== "ALL" && s.track !== filterTrack) return false;
    if (filterLive === "yes" && !s.live)  return false;
    if (filterLive === "no"  &&  s.live)  return false;
    if (!qN && !qC) return true;
    return s.sp.some(n => {
      const { co = "" } = (window.__spkr?.[n] ?? {});
      return (!qN || n.toLowerCase().includes(qN)) &&
             (!qC || co.toLowerCase().includes(qC));
    });
  });

  // ── Analytics ─────────────────────────────────────────────────────────────
  const spCount = {};
  SESSIONS.forEach(s => s.sp.forEach(n => { spCount[n] = (spCount[n] || 0) + 1; }));
  const multiSpeakers = Object.entries(spCount).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);

  const takenSlots = {};
  selectedIds.forEach(id => {
    const s = SESSIONS.find(x => x.id === id);
    if (s) takenSlots[slotKey(s)] = id;
  });

  const sidebarItems = [...selectedIds]
    .map(id => SESSIONS.find(s => s.id === id))
    .filter(Boolean)
    .sort((a, b) => DAY_ORDER[a.day] - DAY_ORDER[b.day] || a.time.localeCompare(b.time));

  function exportCSV() {
    if (!sidebarItems.length) { alert("No sessions selected."); return; }
    const rows = [["ID","Day","Time","Track","Title","Speakers","Live"]];
    sidebarItems.forEach(s => rows.push([
      s.id, s.day, s.time, s.track,
      `"${s.title.replace(/"/g,'""')}"`,
      `"${s.sp.join("; ")}"`,
      s.live ? "Yes" : "No",
    ]));
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "SCCE_CEI_2026_MyAgenda.csv"; a.click();
  }

  // group sessions by time slot within the current view
  const byTime = {};
  filtered.forEach(s => {
    const k = `${s.day}||${s.time}`;
    if (!byTime[k]) byTime[k] = { day: s.day, time: s.time, sessions: [] };
    byTime[k].sessions.push(s);
  });
  const timeSlots = Object.values(byTime).sort((a, b) =>
    DAY_ORDER[a.day] - DAY_ORDER[b.day] || a.time.localeCompare(b.time)
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>

      {/* ── TOP HEADER ── */}
      <div style={s.topBar}>
        <div>
          <h1 style={s.h1}>SCCE CEI 2026</h1>
          <p style={s.sub}>25th Annual Compliance &amp; Ethics Institute · Rosen Shingle Creek, Orlando FL</p>
        </div>
        <div style={s.uidBox}>
          <div style={s.uidLabel}>Your ID
            <button style={s.uidCopy} onClick={() => { navigator.clipboard.writeText(UID); setSync("Copied!", "ok"); }}>
              Copy
            </button>
          </div>
          <div style={s.uidVal}>{UID.slice(0, 18)}…</div>
          {syncMsg && (
            <div style={{ fontSize: "11px", marginTop: "3px", color: syncType === "ok" ? "#166534" : syncType === "err" ? "#dc2626" : "#64748b" }}>
              {syncMsg}
            </div>
          )}
        </div>
      </div>

      {/* ── DAY TABS ── */}
      <div style={s.dayTabsWrap}>
        <div style={s.dayTabs}>
          {DAYS.map(day => (
            <button
              key={day}
              style={{ ...s.dayTab, ...(activeDay === day ? s.dayTabActive : {}) }}
              onClick={() => setActiveDay(day)}
            >
              <span style={s.dayTabName}>{day === "All Days" ? "All Days" : day}</span>
              <span style={{ ...s.dayTabSub, ...(activeDay === day ? { color: "#93c5fd" } : {}) }}>
                {day === "All Days" ? `${SESSIONS.filter(x => x.sp.length > 0).length} sessions` : DAY_SUBTITLES[day]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── STATS STRIP ── */}
      <div style={s.statsStrip}>
        <div style={s.statItem}><strong>{Object.keys(spCount).length}</strong> speakers</div>
        <div style={s.statDivider} />
        <div style={s.statItem}><strong>{SESSIONS.filter(x => x.sp.length > 0).length}</strong> sessions</div>
        <div style={s.statDivider} />
        <div style={s.statItem}><strong style={{ color: "#2563eb" }}>{selectedIds.size}</strong> selected</div>
        <div style={s.statDivider} />
        {multiSpeakers.slice(0, 3).map(([n, c]) => (
          <div key={n} style={s.statItem}>
            <span style={{ fontSize: "11px", color: "#64748b" }}>{n.split(" ").pop()}</span>
            <span style={s.multiBadge}>{c}×</span>
          </div>
        ))}
        {multiSpeakers.length > 3 && (
          <div style={{ ...s.statItem, color: "#64748b", fontSize: "11px" }}>+{multiSpeakers.length - 3} more multi-session</div>
        )}
      </div>

      {/* ── FILTERS ── */}
      <div style={s.filtersRow}>
        <input style={s.fInput} value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="🔍 Search speaker…" />
        <input style={s.fInput} value={filterCo}   onChange={e => setFilterCo(e.target.value)}   placeholder="🏢 Search company…" />
        <select style={s.fInput} value={filterTrack} onChange={e => setFilterTrack(e.target.value)}>
          <option value="ALL">All Tracks</option>
          {TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select style={s.fInput} value={filterLive} onChange={e => setFilterLive(e.target.value)}>
          <option value="ALL">All Sessions</option>
          <option value="yes">📡 Live Broadcast Only</option>
          <option value="no">In-Person Only</option>
        </select>
        {(filterName || filterCo || filterTrack !== "ALL" || filterLive !== "ALL") && (
          <button style={s.clearFilters} onClick={() => { setFilterName(""); setFilterCo(""); setFilterTrack("ALL"); setFilterLive("ALL"); }}>
            ✕ Clear filters
          </button>
        )}
        <button style={{ ...s.clearFilters, marginLeft: "auto", background: selectedIds.size ? "#1e293b" : "#e2e8f0", color: selectedIds.size ? "#fff" : "#94a3b8" }}
          onClick={() => setShowSidebar(v => !v)}>
          {showSidebar ? "Hide" : "Show"} Agenda ({selectedIds.size})
        </button>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div style={{ ...s.layout, gridTemplateColumns: showSidebar ? "1fr 290px" : "1fr" }}>

        {/* Sessions */}
        <div>
          {filtered.length === 0 && (
            <div style={s.noResults}>No sessions match your filters.</div>
          )}

          {timeSlots.map(({ day, time, sessions }) => (
            <div key={`${day}||${time}`}>
              {/* Time slot header */}
              <div style={s.timeSlotHdr}>
                {activeDay === "All Days" && (
                  <span style={s.timeSlotDay}>{DAY_LABELS[day]}</span>
                )}
                <span style={s.timeSlotTime}>{time}</span>
                <span style={s.timeSlotCount}>{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Session grid — side by side if multiple at same time */}
              <div style={{
                display: "grid",
                gridTemplateColumns: sessions.length > 1 ? "repeat(auto-fill, minmax(340px, 1fr))" : "1fr",
                gap: "12px",
                marginBottom: "8px",
              }}>
                {sessions.map(session => {
                  const isSelected = selectedIds.has(session.id);
                  const isDisabled = !isSelected && !!takenSlots[slotKey(session)];
                  return (
                    <SessionBlock
                      key={session.id}
                      session={session}
                      isSelected={isSelected}
                      isDisabled={isDisabled}
                      onToggle={toggle}
                      onSpeakerClick={setBioName}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div style={s.sidebar}>
            <div style={s.sidebarTitle}>📋 My Agenda
              <span style={{ fontSize: "12px", fontWeight: "400", color: "#64748b", marginLeft: "6px" }}>
                {selectedIds.size} session{selectedIds.size !== 1 ? "s" : ""}
              </span>
            </div>

            {sidebarItems.length === 0
              ? <div style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic", padding: "8px 0" }}>No sessions selected yet.</div>
              : (
                // Group sidebar by day
                Object.keys(DAY_LABELS).map(day => {
                  const dayItems = sidebarItems.filter(x => x.day === day);
                  if (!dayItems.length) return null;
                  return (
                    <div key={day} style={{ marginBottom: "14px" }}>
                      <div style={s.sbDayLabel}>{day}</div>
                      {dayItems.map(item => (
                        <div key={item.id} style={s.sbItem}>
                          <div style={s.sbTime}>{item.time} · {item.id}</div>
                          <div style={s.sbTitle}>{item.title}</div>
                        </div>
                      ))}
                    </div>
                  );
                })
              )
            }

            <div style={{ borderTop: "1px solid #e2e8f0", marginTop: "12px", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <button style={{ ...s.btn, background: "#2563eb" }} onClick={exportCSV}>⬇ Export CSV</button>
              <button style={{ ...s.btn, background: "#dc2626" }} onClick={clearAll}>✕ Clear All</button>
            </div>
          </div>
        )}
      </div>

      {bioName && <BioModal name={bioName} onClose={() => setBioName(null)} />}
    </div>
  );
}

const s = {
  root:       { fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", minHeight: "100vh", background: "#f8fafc" },

  // top bar
  topBar:     { background: "#1e293b", color: "#fff", padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" },
  h1:         { margin: 0, fontSize: "20px", fontWeight: "800", letterSpacing: "-0.5px" },
  sub:        { margin: "3px 0 0", fontSize: "12px", color: "#94a3b8" },
  uidBox:     { fontSize: "11px", textAlign: "right" },
  uidLabel:   { color: "#94a3b8", marginBottom: "2px", display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" },
  uidVal:     { fontFamily: "monospace", color: "#cbd5e1", fontSize: "10px" },
  uidCopy:    { background: "#334155", color: "#cbd5e1", border: "none", borderRadius: "3px", padding: "2px 8px", fontSize: "10px", cursor: "pointer" },

  // day tabs
  dayTabsWrap:{ background: "#0f172a", padding: "0 28px", overflowX: "auto" },
  dayTabs:    { display: "flex", gap: "2px", minWidth: "max-content" },
  dayTab:     { background: "none", border: "none", borderBottom: "3px solid transparent", color: "#94a3b8", padding: "14px 20px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px", transition: "color .15s" },
  dayTabActive:{ borderBottomColor: "#3b82f6", color: "#fff" },
  dayTabName: { fontSize: "13px", fontWeight: "700" },
  dayTabSub:  { fontSize: "10px", color: "#64748b" },

  // stats strip
  statsStrip: { background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "10px 28px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  statItem:   { fontSize: "12px", color: "#0f172a", display: "flex", alignItems: "center", gap: "4px" },
  statDivider:{ width: "1px", height: "16px", background: "#e2e8f0" },
  multiBadge: { background: "#eff6ff", color: "#2563eb", fontSize: "10px", padding: "1px 6px", borderRadius: "8px", fontWeight: "700" },

  // filters
  filtersRow: { background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 28px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" },
  fInput:     { padding: "7px 11px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", background: "#f8fafc", outline: "none", minWidth: "140px" },
  clearFilters:{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", background: "#f8fafc", cursor: "pointer", color: "#475569", whiteSpace: "nowrap" },

  // layout
  layout:     { display: "grid", gap: "0", alignItems: "start", padding: "0" },

  // time slot header
  timeSlotHdr:{ display: "flex", alignItems: "baseline", gap: "10px", padding: "20px 28px 8px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", position: "sticky", top: 0, zIndex: 10 },
  timeSlotDay:{ fontSize: "13px", fontWeight: "800", color: "#1e293b" },
  timeSlotTime:{ fontSize: "16px", fontWeight: "800", color: "#2563eb" },
  timeSlotCount:{ fontSize: "11px", color: "#94a3b8", marginLeft: "auto" },

  noResults:  { textAlign: "center", padding: "64px 28px", color: "#94a3b8", fontSize: "14px" },

  // sidebar
  sidebar:    { background: "#fff", borderLeft: "1px solid #e2e8f0", padding: "20px", position: "sticky", top: 0, height: "100vh", overflowY: "auto" },
  sidebarTitle:{ fontSize: "14px", fontWeight: "800", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px", marginBottom: "14px", display: "flex", alignItems: "baseline" },
  sbDayLabel: { fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "#94a3b8", letterSpacing: "0.5px", marginBottom: "6px" },
  sbItem:     { borderLeft: "3px solid #2563eb", paddingLeft: "8px", marginBottom: "10px" },
  sbTime:     { fontSize: "10px", fontWeight: "700", color: "#64748b" },
  sbTitle:    { fontSize: "12px", fontWeight: "600", color: "#0f172a", lineHeight: "1.3", marginTop: "2px" },
  btn:        { width: "100%", border: "none", padding: "9px", fontSize: "12px", fontWeight: "700", borderRadius: "6px", cursor: "pointer", color: "#fff" },
};
