import { useState, useEffect, useCallback, useRef } from "react";
import { SESSIONS, TRACKS, DAY_ORDER, DAY_LABELS } from "../data/sessions";
import SessionBlock from "./SessionBlock";
import BioModal from "./BioModal";

// ── UID — identity token stored in localStorage ────────────────────────────
function getOrCreateUID() {
  let uid = localStorage.getItem("scce_uid");
  if (!uid) { uid = crypto.randomUUID(); localStorage.setItem("scce_uid", uid); }
  return uid;
}

// ── Per-slot conflict detection ────────────────────────────────────────────
function slotKey(s) { return `${s.day}|${s.time}`; }

export default function PlannerTab() {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bioName, setBioName]         = useState(null);
  const [syncMsg, setSyncMsg]         = useState("");
  const [syncType, setSyncType]       = useState(""); // "ok" | "err" | "busy"
  const [filterName, setFilterName]   = useState("");
  const [filterCo, setFilterCo]       = useState("");
  const [filterDay, setFilterDay]     = useState("ALL");
  const [filterTrack, setFilterTrack] = useState("ALL");
  const [filterLive, setFilterLive]   = useState("ALL");
  const saveTimer = useRef(null);
  const UID = useRef(getOrCreateUID()).current;

  // ── Sync helpers ──────────────────────────────────────────────────────────
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
      setSync("✓ Saved to cloud", "ok");
    } catch {
      setSync("⚠ Saved locally — cloud sync failed", "err");
    }
  }, [UID]);

  function debouncedSave(ids) {
    clearTimeout(saveTimer.current);
    setSync("Saving…", "busy", false);
    saveTimer.current = setTimeout(() => saveToServer(ids), 800);
  }

  // ── Load on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setSync("Loading your picks…", "busy", false);
      try {
        const r = await fetch(`/api/agenda?action=load&uid=${UID}`);
        if (!r.ok) throw new Error(r.status);
        const data = await r.json();
        setSelectedIds(new Set(data.selections || []));
        setSync("✓ Picks loaded", "ok");
      } catch {
        setSync("⚠ Couldn't reach server — showing cached picks", "err");
        const cache = localStorage.getItem("scce_cache");
        if (cache) setSelectedIds(new Set(JSON.parse(cache)));
      }
    }
    load();
  }, [UID]);

  // ── Toggle ────────────────────────────────────────────────────────────────
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
      setSync("✓ All picks cleared", "ok");
    } catch {
      setSync("Cleared locally — server clear failed", "err");
    }
  }

  // ── Filtered sessions ─────────────────────────────────────────────────────
  const qN  = filterName.toLowerCase().trim();
  const qC  = filterCo.toLowerCase().trim();

  const filtered = SESSIONS.filter(s => {
    if (filterDay   !== "ALL" && s.day   !== filterDay)   return false;
    if (filterTrack !== "ALL" && s.track !== filterTrack) return false;
    if (filterLive  === "yes" && !s.live)  return false;
    if (filterLive  === "no"  &&  s.live)  return false;
    if (!qN && !qC) return true;
    return s.sp.some(n => {
      const sp = { co: "", ...(window._speakers?.[n] ?? {}) };
      return (!qN || n.toLowerCase().includes(qN)) &&
             (!qC || sp.co.toLowerCase().includes(qC));
    });
  });

  // ── Analytics ─────────────────────────────────────────────────────────────
  const spCount = {};
  SESSIONS.forEach(s => s.sp.forEach(n => { spCount[n] = (spCount[n] || 0) + 1; }));
  const multiSpeakers = Object.entries(spCount).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);

  // ── Conflict map: which slots are taken by a different session ────────────
  const takenSlots = {};
  selectedIds.forEach(id => {
    const s = SESSIONS.find(x => x.id === id);
    if (s) takenSlots[slotKey(s)] = id;
  });

  // ── Sidebar items (sorted by day/time) ────────────────────────────────────
  const sidebarItems = [...selectedIds]
    .map(id => SESSIONS.find(s => s.id === id))
    .filter(Boolean)
    .sort((a, b) => DAY_ORDER[a.day] - DAY_ORDER[b.day] || a.time.localeCompare(b.time));

  // ── Export CSV ────────────────────────────────────────────────────────────
  function exportCSV() {
    if (!sidebarItems.length) { alert("No sessions selected."); return; }
    const rows = [["ID","Day","Time","Track","Title","Speakers","Live"]];
    sidebarItems.forEach(s => rows.push([
      s.id, s.day, s.time, s.track,
      `"${s.title.replace(/"/g, '""')}"`,
      `"${s.sp.join("; ")}"`,
      s.live ? "Yes" : "No",
    ]));
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "SCCE_CEI_2026_MyAgenda.csv";
    a.click();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  let currentDay = "";

  return (
    <div style={s.root}>
      {/* ── HEADER ── */}
      <div style={s.header}>
        <div>
          <h1 style={s.h1}>SCCE CEI 2026 — Agenda Planner</h1>
          <p style={s.sub}>25th Annual Compliance &amp; Ethics Institute · Sept 27–30, 2026 · Rosen Shingle Creek, Orlando FL</p>
          <p style={s.disc}>Unofficial tool · not affiliated with SCCE</p>
        </div>
        <div style={s.uidBox}>
          <div style={s.uidLabel}>Your Persistent ID</div>
          <div style={s.uidRow}>
            <span style={s.uidVal}>{UID}</span>
            <button style={s.uidCopy} onClick={() => { navigator.clipboard.writeText(UID); setSync("UID copied", "ok"); }}>
              Copy
            </button>
          </div>
          {syncMsg && (
            <div style={{ ...s.syncMsg, color: syncType === "ok" ? "#166534" : syncType === "err" ? "#dc2626" : "#64748b" }}>
              {syncMsg}
            </div>
          )}
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={s.statsRow}>
        <div style={s.statChip}><div style={s.statN}>{Object.keys(spCount).length}</div><div style={s.statL}>Speakers</div></div>
        <div style={s.statChip}><div style={s.statN}>{SESSIONS.filter(x => x.sp.length > 0).length}</div><div style={s.statL}>Sessions</div></div>
        <div style={s.statChip}><div style={{ ...s.statN, color: "#0f172a" }}>{selectedIds.size}</div><div style={s.statL}>Selected</div></div>
        <div style={s.multiCard}>
          <div style={s.multiTitle}>Multi-Session Speakers</div>
          {multiSpeakers.length === 0
            ? <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>None detected.</div>
            : multiSpeakers.map(([n, c]) => (
              <div key={n} style={s.multiTag}>
                <span style={{ fontSize: "12px", fontWeight: "600" }}>{n}</span>
                <span style={s.multiBadge}>{c}×</span>
              </div>
            ))}
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div style={s.filters}>
        {[
          { label: "Speaker Name", type: "text",   val: filterName,  set: setFilterName,  ph: "e.g. Mary, Felipe…" },
          { label: "Company / Org",type: "text",   val: filterCo,    set: setFilterCo,    ph: "e.g. BDO, Salesforce…" },
        ].map(({ label, val, set, ph }) => (
          <div key={label} style={s.fg}>
            <label style={s.fLabel}>{label}</label>
            <input style={s.fInput} value={val} onChange={e => set(e.target.value)} placeholder={ph} />
          </div>
        ))}
        <div style={s.fg}>
          <label style={s.fLabel}>Day</label>
          <select style={s.fInput} value={filterDay} onChange={e => setFilterDay(e.target.value)}>
            <option value="ALL">All Days</option>
            {Object.keys(DAY_LABELS).map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
          </select>
        </div>
        <div style={s.fg}>
          <label style={s.fLabel}>Track</label>
          <select style={s.fInput} value={filterTrack} onChange={e => setFilterTrack(e.target.value)}>
            <option value="ALL">All Tracks</option>
            {TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={s.fg}>
          <label style={s.fLabel}>Broadcast</label>
          <select style={s.fInput} value={filterLive} onChange={e => setFilterLive(e.target.value)}>
            <option value="ALL">All Sessions</option>
            <option value="yes">📡 Live Broadcast Only</option>
            <option value="no">In-Person Only</option>
          </select>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div style={s.layout}>
        {/* Sessions list */}
        <div>
          {filtered.length === 0 && (
            <div style={s.noResults}>No sessions match your filters.</div>
          )}
          {filtered.map(session => {
            const dayHdr = session.day !== currentDay
              ? (() => { currentDay = session.day; return session.day; })()
              : null;
            const sk = slotKey(session);
            const isSelected = selectedIds.has(session.id);
            const isDisabled = !isSelected && !!takenSlots[sk];

            return (
              <div key={session.id}>
                {dayHdr && <div style={s.dayHdr}>{DAY_LABELS[dayHdr]}</div>}
                <SessionBlock
                  session={session}
                  isSelected={isSelected}
                  isDisabled={isDisabled}
                  onToggle={toggle}
                  onSpeakerClick={setBioName}
                />
              </div>
            );
          })}
        </div>

        {/* Sidebar */}
        <div style={s.sidebar}>
          <div style={s.sidebarTitle}>📋 My Agenda</div>
          <div style={s.sidebarItems}>
            {sidebarItems.length === 0
              ? <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>No sessions selected yet.</div>
              : sidebarItems.map(s => (
                <div key={s.id} style={st.si}>
                  <div style={st.siTime}>{s.day} · {s.time} [{s.id}]</div>
                  <div style={st.siTitle}>{s.title}</div>
                </div>
              ))}
          </div>
          <button style={{ ...st.btn, background: "#2563eb" }} onClick={exportCSV}>⬇ Export CSV</button>
          <button style={{ ...st.btn, background: "#dc2626", marginTop: "8px" }} onClick={clearAll}>✕ Clear All</button>
        </div>
      </div>

      {/* Bio modal */}
      {bioName && <BioModal name={bioName} onClose={() => setBioName(null)} />}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  root:        { padding: "32px 24px", maxWidth: "1300px", margin: "0 auto", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" },
  header:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "24px", paddingBottom: "18px", borderBottom: "2px solid #e2e8f0" },
  h1:          { fontSize: "24px", fontWeight: "800", color: "#0f172a", margin: "0 0 4px", letterSpacing: "-0.5px" },
  sub:         { fontSize: "13px", color: "#64748b", margin: "0 0 3px" },
  disc:        { fontSize: "11px", fontStyle: "italic", color: "#b91c1c", margin: 0 },
  uidBox:      { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 16px", minWidth: "280px" },
  uidLabel:    { fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "5px" },
  uidRow:      { display: "flex", alignItems: "center", gap: "8px" },
  uidVal:      { fontFamily: "monospace", fontSize: "11px", color: "#0f172a", flex: 1, wordBreak: "break-all" },
  uidCopy:     { background: "#1e293b", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap" },
  syncMsg:     { fontSize: "11px", marginTop: "6px" },
  statsRow:    { display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "22px" },
  statChip:    { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 18px", textAlign: "center", minWidth: "100px" },
  statN:       { fontSize: "22px", fontWeight: "800", color: "#2563eb", lineHeight: 1 },
  statL:       { fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "#64748b", marginTop: "3px" },
  multiCard:   { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 18px", flex: 1, minWidth: "220px" },
  multiTitle:  { fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.5px", marginBottom: "8px" },
  multiTag:    { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "4px 10px", borderRadius: "5px", marginBottom: "5px" },
  multiBadge:  { background: "#2563eb", color: "#fff", fontSize: "10px", padding: "2px 7px", borderRadius: "10px" },
  filters:     { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "18px", marginBottom: "24px", display: "flex", flexWrap: "wrap", gap: "12px" },
  fg:          { display: "flex", flexDirection: "column", minWidth: "160px", flex: 1 },
  fLabel:      { fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "#64748b", marginBottom: "5px", letterSpacing: "0.3px" },
  fInput:      { padding: "8px 11px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px", background: "#fff", outline: "none" },
  layout:      { display: "grid", gridTemplateColumns: "1fr 300px", gap: "24px", alignItems: "start" },
  dayHdr:      { fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: "24px 0 12px", paddingBottom: "7px", borderBottom: "2px solid #2563eb" },
  noResults:   { textAlign: "center", padding: "48px", color: "#64748b", fontSize: "14px" },
  sidebar:     { background: "#fff", border: "2px solid #1e293b", borderRadius: "8px", padding: "18px", position: "sticky", top: "16px" },
  sidebarTitle:{ fontSize: "15px", fontWeight: "800", borderBottom: "2px solid #e2e8f0", paddingBottom: "8px", marginBottom: "14px" },
  sidebarItems:{ marginBottom: "8px" },
};

const st = {
  si:     { fontSize: "12px", borderLeft: "3px solid #2563eb", paddingLeft: "9px", marginBottom: "12px" },
  siTime: { fontWeight: "700", color: "#64748b", fontSize: "10px" },
  siTitle:{ fontWeight: "600", color: "#0f172a", marginTop: "2px", lineHeight: "1.3" },
  btn:    { width: "100%", border: "none", padding: "10px", fontSize: "12px", fontWeight: "700", borderRadius: "6px", cursor: "pointer", color: "#fff", marginTop: "8px" },
};
