import { useState, useEffect, useRef } from "react";
import { SESSIONS, FIXED_EVENTS, TRACKS, DAY_ORDER, DAY_LABELS, SPEAKERS } from "../data/sessions";
import BioModal from "./BioModal";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday"];
const DAY_SUBTITLES = {
  Sunday:    "Sept 27 · Pre-Conference",
  Monday:    "Sept 28",
  Tuesday:   "Sept 29",
  Wednesday: "Sept 30 · Workshops",
};

// Parse "8:30 AM – 10:00 AM" → minutes since midnight for sorting
function timeToMinutes(timeRange) {
  const start = timeRange.split("–")[0].trim(); // "8:30 AM"
  const [timePart, ampm] = start.split(" ");
  let [h, m] = timePart.split(":").map(Number);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

// Build slot map: { "Sunday|8:30 AM – 10:00 AM": [session, session, ...] }
function buildSlotMap() {
  const map = {};
  SESSIONS.forEach(s => {
    const k = `${s.day}|${s.time}`;
    if (!map[k]) map[k] = { day: s.day, time: s.time, sessions: [] };
    map[k].sessions.push(s);
  });
  return map;
}
const SLOT_MAP = buildSlotMap();

// Ordered list of slots per day
function getSlotsForDay(day) {
  return Object.values(SLOT_MAP)
    .filter(sl => sl.day === day)
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

function getFixedEventsForDay(day) {
  return FIXED_EVENTS.filter(e => e.day === day)
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

// Merge selectable slots and fixed events into one chronological timeline for a day.
// Returns array of { kind: "slot" | "fixed", time, ...data }
function getTimelineForDay(day, slots) {
  const fixed = getFixedEventsForDay(day).map(e => ({ kind: "fixed", ...e }));
  const slotItems = slots.map(sl => ({ kind: "slot", ...sl }));
  return [...fixed, ...slotItems].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

const EVENT_TYPE_STYLE = {
  meal:      { icon: "🍽️", bg: "#fef9c3", border: "#fde047", text: "#854d0e" },
  break:     { icon: "☕",  bg: "#f1f5f9", border: "#cbd5e1", text: "#475569" },
  reception: { icon: "🥂",  bg: "#fae8ff", border: "#e9d5ff", text: "#86198f" },
  general:   { icon: "🎤",  bg: "#dbeafe", border: "#93c5fd", text: "#1e40af" },
  exam:      { icon: "📝",  bg: "#fee2e2", border: "#fecaca", text: "#991b1b" },
};

function FixedEventRow({ event, compact }) {
  const style = EVENT_TYPE_STYLE[event.type] || EVENT_TYPE_STYLE.general;
  return (
    <div style={{ marginBottom: "8px" }}>
      <div style={{
        background: style.bg, border: `1px solid ${style.border}`, borderRadius: "8px",
        padding: compact ? "8px 12px" : "10px 16px",
        display: "flex", alignItems: compact ? "flex-start" : "center", gap: compact ? "8px" : "14px",
        flexDirection: compact ? "column" : "row",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
          <div style={{ fontSize: compact ? "10px" : "11px", fontWeight: "800", color: style.text, minWidth: compact ? "auto" : "130px", flexShrink: 0 }}>
            {event.time}
          </div>
          {compact && (
            <span style={{ marginLeft: "auto", fontSize: "8px", fontWeight: "700", color: style.text, opacity: 0.6 }}>
              ALL ATTENDEES
            </span>
          )}
        </div>
        <div style={{ fontSize: compact ? "12px" : "13px", display: "flex", alignItems: "center", gap: "8px", color: style.text, fontWeight: "600" }}>
          <span>{style.icon}</span>
          {event.title}
        </div>
        {!compact && (
          <span style={{ marginLeft: "auto", fontSize: "10px", fontWeight: "700", color: style.text, opacity: 0.7, whiteSpace: "nowrap" }}>
            Included for all attendees
          </span>
        )}
      </div>
    </div>
  );
}

const LinkedInIcon = () => (
  <svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor">
    <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/>
  </svg>
);

function SessionOption({ session, onSelect, onBioClick }) {
  const { id, track, title, sp, live } = session;
  return (
    <div style={s.option}>
      <div style={s.optionHeader}>
        <div style={s.metaRow}>
          <span style={s.sid}>{id}</span>
          <span style={s.trackTag}>{track}</span>
          {live && <span style={s.liveTag}>📡 Live</span>}
        </div>
        <button style={s.selectBtn} onClick={() => onSelect(id)}>Select →</button>
      </div>
      <div style={s.optionTitle}>{title}</div>
      {session.desc && session.desc.length > 0 && (
        <ul style={s.descList}>
          {session.desc.map((line, i) => <li key={i} style={s.descItem}>{line}</li>)}
        </ul>
      )}
      {sp.length > 0 && (
        <div style={s.spChips}>
          {sp.map(name => {
            const d = SPEAKERS[name] ?? {};
            return (
              <div key={name} style={s.spChip}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button style={s.spChipName} onClick={() => onBioClick(name)}>{name}</button>
                  <div style={{ fontSize: "10px", color: d.v ? "#475569" : "#b45309", lineHeight: "1.3" }}>
                    {d.role && d.role !== "TBD" ? `${d.role}, ` : ""}{d.co || "TBD"}{!d.v && " ⚠"}
                  </div>
                </div>
                {d.li && (
                  <a href={d.li} target="_blank" rel="noopener noreferrer" style={s.liBtn} title="LinkedIn">
                    <span style={s.liIcon}><LinkedInIcon /></span>
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SlotRow({ slot, selectedId, onSelect, onDeselect, onBioClick, highlightSessionId, isMobile }) {
  const [open, setOpen] = useState(false);
  const rowRef = useRef(null);
  const selectedSession = selectedId ? slot.sessions.find(s => s.id === selectedId) : null;
  const isFilled = !!selectedSession;
  const hasSessions = slot.sessions.length > 0;
  const hasOptions = slot.sessions.some(s => s.sp.length > 0); // skip TBD-only slots
  const containsHighlight = highlightSessionId && slot.sessions.some(s => s.id === highlightSessionId);

  useEffect(() => {
    if (containsHighlight) {
      if (!isFilled) setOpen(true);
      setTimeout(() => {
        rowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [containsHighlight]);

  return (
    <div ref={rowRef} style={{
      marginBottom: "8px",
      ...(containsHighlight ? { outline: "2px solid #f59e0b", borderRadius: "10px" } : {}),
    }}>
      {/* ── SLOT CARD ── */}
      <div style={{
        ...s.slotCard,
        ...(isMobile ? { flexDirection: "column", gap: "8px", padding: "12px" } : {}),
        borderLeft: isFilled ? "4px solid #2563eb" : "4px solid #e2e8f0",
        background: isFilled ? "#f0f7ff" : open ? "#fafafa" : "#fff",
      }}>
        {/* Time label */}
        <div style={{ ...s.slotTime, ...(isMobile ? { minWidth: "auto" } : {}) }}>{slot.time}</div>

        {isFilled ? (
          /* FILLED STATE */
          <div style={{ ...s.filledBody, ...(isMobile ? { flexDirection: "column", gap: "8px" } : {}) }}>
            <div style={s.filledLeft}>
              <div style={s.filledMeta}>
                <span style={s.sid}>{selectedSession.id}</span>
                <span style={s.trackTag}>{selectedSession.track}</span>
                {selectedSession.live && <span style={s.liveTag}>📡 Live</span>}
              </div>
              <div style={s.filledTitle}>{selectedSession.title}</div>
              <div style={s.filledSpeakers}>
                {selectedSession.sp.map(name => (
                  <button key={name} style={s.filledSpName} onClick={() => onBioClick(name)}>{name}</button>
                ))}
              </div>
              {selectedSession.desc && selectedSession.desc.length > 0 && (
                <>
                  <button style={s.detailsToggle} onClick={() => setOpen(v => !v)}>
                    {open ? "Hide details ▲" : "Show details ▼"}
                  </button>
                  {open && (
                    <ul style={s.descList}>
                      {selectedSession.desc.map((line, i) => <li key={i} style={s.descItem}>{line}</li>)}
                    </ul>
                  )}
                </>
              )}
            </div>
            <div style={{ ...s.filledActions, ...(isMobile ? { flexDirection: "row" } : {}) }}>
              <button style={s.swapBtn} onClick={() => { onDeselect(selectedId); setOpen(true); }}>
                ⇄ Swap
              </button>
              <button style={s.removeBtn} onClick={() => { onDeselect(selectedId); setOpen(false); }}>
                ✕
              </button>
            </div>
          </div>
        ) : hasOptions ? (
          /* OPEN STATE */
          <div style={s.openBody} onClick={() => setOpen(v => !v)}>
            <div style={s.openLabel}>
              <span style={s.openDot} />
              Open slot
              <span style={s.openCount}>{slot.sessions.filter(s => s.sp.length > 0).length} sessions available</span>
            </div>
            <span style={{ fontSize: "18px", color: "#94a3b8", marginLeft: "auto" }}>{open ? "▲" : "▼"}</span>
          </div>
        ) : (
          /* TBD — no sessions yet */
          <div style={s.tbdBody}>
            <span style={s.openDot} />
            <span style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>Sessions TBD</span>
          </div>
        )}
      </div>

      {/* ── EXPANDED OPTIONS ── */}
      {open && !isFilled && (
        <div style={{ ...s.optionsPanel, ...(isMobile ? { marginLeft: 0, marginTop: "8px" } : {}) }}>
          {slot.sessions
            .filter(s => s.sp.length > 0)
            .map(session => (
              <SessionOption
                key={session.id}
                session={session}
                onSelect={(id) => { onSelect(id); setOpen(false); }}
                onBioClick={onBioClick}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export default function PlannerTab({ agenda, jumpToSessionId, onJumpHandled }) {
  const { UID, selectedIds, select, deselect, clearAll: clearAllShared, syncMsg, syncType, copyUID } = agenda;

  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 860);
  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < 860); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const [mobileAgendaOpen, setMobileAgendaOpen] = useState(false);
  const [bioName, setBioName]           = useState(null);
  const [activeDay, setActiveDay]       = useState("ALL");

  // Jump to the day containing the target session when navigated from Speakers tab
  useEffect(() => {
    if (jumpToSessionId) {
      const target = SESSIONS.find(s => s.id === jumpToSessionId);
      if (target) setActiveDay(target.day);
      const timer = setTimeout(() => onJumpHandled?.(), 4000);
      return () => clearTimeout(timer);
    }
  }, [jumpToSessionId]);
  const [showFilters, setShowFilters]   = useState(true);
  const [filterText, setFilterText]     = useState("");
  const [filterSpeaker, setFilterSpeaker] = useState("ALL");
  const [filterTrack, setFilterTrack]   = useState("ALL");
  const [filterLive, setFilterLive]     = useState("ALL");

  async function clearAll() {
    if (!confirm("Clear all your picks?")) return;
    await clearAllShared();
  }

  function exportCSV() {
    const items = [...selectedIds]
      .map(id => SESSIONS.find(s => s.id === id)).filter(Boolean)
      .sort((a, b) => DAY_ORDER[a.day] - DAY_ORDER[b.day] || timeToMinutes(a.time) - timeToMinutes(b.time));
    if (!items.length) { alert("No sessions selected."); return; }
    const rows = [["ID","Day","Time","Track","Title","Speakers","Live"]];
    items.forEach(s => rows.push([s.id,s.day,s.time,s.track,`"${s.title.replace(/"/g,'""')}"`,`"${s.sp.join("; ")}"`,s.live?"Yes":"No"]));
    const blob = new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="SCCE_CEI_2026_MyAgenda.csv"; a.click();
  }

  const totalSelected = selectedIds.size;

  // All unique speaker names for dropdown
  const allSpeakers = [...new Set(SESSIONS.flatMap(s => s.sp))].sort();

  // Filter sessions based on search/filter state
  function sessionMatchesFilters(session) {
    const qText = filterText.toLowerCase().trim();
    const textMatch = !qText || session.title.toLowerCase().includes(qText) ||
      session.sp.some(n => n.toLowerCase().includes(qText)) ||
      (SPEAKERS[session.sp[0]]?.co || "").toLowerCase().includes(qText);
    const speakerMatch = filterSpeaker === "ALL" || session.sp.includes(filterSpeaker);
    const trackMatch = filterTrack === "ALL" || session.track === filterTrack;
    const liveMatch = filterLive === "ALL" || (filterLive === "yes" ? session.live : !session.live);
    return textMatch && speakerMatch && trackMatch && liveMatch;
  }

  function getFilteredSlotsForDay(day) {
    return getSlotsForDay(day).map(slot => ({
      ...slot,
      sessions: slot.sessions.filter(sessionMatchesFilters),
    })).filter(slot => slot.sessions.length > 0 || slot.sessions.length === 0 && getSlotsForDay(day).find(sl => sl.time === slot.time)?.sessions.length === 0);
  }

  // When filters active, show all matching slots regardless of day tab
  const hasActiveFilters = filterText || filterSpeaker !== "ALL" || filterTrack !== "ALL" || filterLive !== "ALL";
  const activeFiltersCount = [filterText, filterSpeaker !== "ALL", filterTrack !== "ALL", filterLive !== "ALL"].filter(Boolean).length;

  function getSlotsToRender(day) {
    if (!hasActiveFilters) return getSlotsForDay(day);
    return getSlotsForDay(day).map(slot => ({
      ...slot,
      sessions: slot.sessions.filter(sessionMatchesFilters),
    }));
  }

  const slots = getSlotsToRender(activeDay);

  return (
    <div style={s.root}>

      {/* ── TOP BAR ── */}
      <div style={{ ...s.topBar, ...(isMobile ? s.topBarMobile : {}) }}>
        <div>
          <h1 style={{ ...s.h1, ...(isMobile ? { fontSize: "16px" } : {}) }}>SCCE CEI 2026</h1>
          {!isMobile && <p style={s.sub}>25th Annual Compliance &amp; Ethics Institute · Rosen Shingle Creek, Orlando FL</p>}
        </div>
        <div style={{ ...s.uidBox, ...(isMobile ? { fontSize: "10px" } : {}) }}>
          {!isMobile && <span style={s.uidLabel}>Your ID </span>}
          <span style={s.uidVal}>{UID.slice(0, isMobile ? 8 : 14)}…</span>
          <button style={s.uidCopy} onClick={copyUID}>Copy</button>
          {syncMsg && !isMobile && <span style={{ marginLeft: "10px", fontSize: "11px", color: syncType==="ok"?"#86efac":syncType==="err"?"#fca5a5":"#94a3b8" }}>{syncMsg}</span>}
        </div>
      </div>

      {/* ── DAY TABS ── */}
      <div style={{ ...s.tabsBar, ...(isMobile ? s.tabsBarMobile : {}) }}>
        {/* All Days tab — first */}
        <button style={{ ...s.tab, ...(isMobile ? s.tabMobile : {}), ...(activeDay === "ALL" ? s.tabActive : {}) }} onClick={() => setActiveDay("ALL")}>
          <span style={s.tabDay}>All Days</span>
          {!isMobile && <span style={{ ...s.tabSub, ...(activeDay==="ALL"?{color:"#93c5fd"}:{}) }}>Full schedule</span>}
          <span style={{ ...s.tabPill, background: totalSelected > 0 ? "#2563eb" : "#334155", color: totalSelected > 0 ? "#fff" : "#64748b" }}>
            {totalSelected}
          </span>
        </button>
        {DAYS.map(day => {
          const daySlots = getSlotsForDay(day);
          const filled = daySlots.filter(sl => sl.sessions.some(s => selectedIds.has(s.id))).length;
          const total  = daySlots.filter(sl => sl.sessions.some(s => s.sp.length > 0)).length;
          const isActive = activeDay === day;
          return (
            <button key={day} style={{ ...s.tab, ...(isMobile ? s.tabMobile : {}), ...(isActive ? s.tabActive : {}) }} onClick={() => setActiveDay(day)}>
              <span style={s.tabDay}>{isMobile ? day.slice(0,3) : day}</span>
              {!isMobile && <span style={{ ...s.tabSub, ...(isActive?{color:"#93c5fd"}:{}) }}>{DAY_SUBTITLES[day]}</span>}
              <span style={{ ...s.tabPill, background: filled > 0 ? "#2563eb" : "#334155", color: filled > 0 ? "#fff" : "#64748b" }}>
                {filled}/{total}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── FILTER PANEL ── */}
      <div style={{ ...s.filterPanel, ...(isMobile ? s.filterPanelMobile : {}) }}>
        <div style={s.filterPanelHeader}>
          {!isMobile && <span style={s.filterPanelTitle}>Search and Filter Schedule Items</span>}
          <button style={s.filterToggle} onClick={() => setShowFilters(v => !v)}>
            {showFilters ? (isMobile ? "Filters ▲" : "Hide Filters ▲") : (isMobile ? "Filters ▼" : "Show Filters ▼")}
          </button>
          {activeFiltersCount > 0 && (
            <button style={s.clearFiltersBtn} onClick={() => { setFilterText(""); setFilterSpeaker("ALL"); setFilterTrack("ALL"); setFilterLive("ALL"); }}>
              Clear ({activeFiltersCount})
            </button>
          )}
        </div>
        {showFilters && (
          <div style={s.filterGrid}>
            <div style={s.filterGroup}>
              {!isMobile && <label style={s.filterLabel}>Schedule Item Search</label>}
              <div style={s.searchWrap}>
                <span style={s.searchIcon}>🔍</span>
                <input style={s.searchInput} value={filterText} onChange={e => setFilterText(e.target.value)} placeholder="Search title, speaker, company…" />
                {filterText && <button style={s.searchClear} onClick={() => setFilterText("")}>✕</button>}
              </div>
            </div>
            <div style={{ ...s.filterRow, ...(isMobile ? { flexDirection: "column" } : {}) }}>
              <div style={s.filterGroup}>
                <label style={s.filterLabel}>Speaker</label>
                <select style={s.filterSelect} value={filterSpeaker} onChange={e => setFilterSpeaker(e.target.value)}>
                  <option value="ALL">No Speaker Selected</option>
                  {allSpeakers.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div style={s.filterGroup}>
                <label style={s.filterLabel}>Track</label>
                <select style={s.filterSelect} value={filterTrack} onChange={e => setFilterTrack(e.target.value)}>
                  <option value="ALL">No Track Selected</option>
                  {TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={s.filterGroup}>
                <label style={s.filterLabel}>Broadcast</label>
                <select style={s.filterSelect} value={filterLive} onChange={e => setFilterLive(e.target.value)}>
                  <option value="ALL">All Sessions</option>
                  <option value="yes">📡 Live Broadcast</option>
                  <option value="no">In-Person Only</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ ...s.content, ...(isMobile ? s.contentMobile : {}) }}>
        <div style={{ ...s.slotList, ...(isMobile ? { paddingRight: 0, paddingBottom: "76px" } : {}) }}>

          {activeDay === "ALL" ? (
            // ── ALL DAYS VIEW ──
            DAYS.map(day => (
              <div key={day}>
                <div style={s.allDayHdr}>{DAY_LABELS[day]}</div>
                {getTimelineForDay(day, getSlotsToRender(day)).map(item => {
                  if (item.kind === "fixed") {
                    return <FixedEventRow key={item.id} event={item} compact={isMobile} />;
                  }
                  const selectedId = item.sessions.find(s => selectedIds.has(s.id))?.id ?? null;
                  return (
                    <SlotRow key={`${item.day}|${item.time}`} slot={item} selectedId={selectedId}
                      onSelect={select} onDeselect={deselect} onBioClick={setBioName}
                      highlightSessionId={jumpToSessionId} isMobile={isMobile} />
                  );
                })}
              </div>
            ))
          ) : (
            // ── SINGLE DAY VIEW ──
            (() => {
              const timeline = getTimelineForDay(activeDay, slots);
              if (timeline.length === 0) {
                return <div style={{ textAlign:"center", padding:"48px 20px", color:"#94a3b8", fontSize:"14px" }}>No sessions match your filters.</div>;
              }
              return timeline.map(item => {
                if (item.kind === "fixed") {
                  return <FixedEventRow key={item.id} event={item} compact={isMobile} />;
                }
                const selectedId = item.sessions.find(s => selectedIds.has(s.id))?.id ?? null;
                return (
                  <SlotRow key={`${item.day}|${item.time}`} slot={item} selectedId={selectedId}
                    onSelect={select} onDeselect={deselect} onBioClick={setBioName}
                    highlightSessionId={jumpToSessionId} isMobile={isMobile} />
                );
              });
            })()
          )}
        </div>

        {/* ── SIDEBAR (desktop) ── */}
        {!isMobile && (
          <div style={s.sidebar}>
            <div style={s.sbHead}>My Agenda
              <span style={s.sbCount}>{totalSelected} session{totalSelected !== 1 ? "s" : ""}</span>
            </div>
            {totalSelected === 0
              ? <p style={s.sbEmpty}>Open a time slot and select a session to build your agenda.</p>
              : DAYS.map(day => {
                  const dayItems = [...selectedIds]
                    .map(id => SESSIONS.find(s => s.id === id))
                    .filter(s => s?.day === day)
                    .sort((a,b) => timeToMinutes(a.time) - timeToMinutes(b.time));
                  if (!dayItems.length) return null;
                  return (
                    <div key={day} style={{ marginBottom: "16px" }}>
                      <div style={s.sbDayLabel}>{day}</div>
                      {dayItems.map(item => (
                        <div key={item.id} style={s.sbItem}>
                          <div style={s.sbItemTime}>{item.time}</div>
                          <div style={s.sbItemTitle}>{item.title}</div>
                          <button style={s.sbRemove} onClick={() => deselect(item.id)}>✕</button>
                        </div>
                      ))}
                    </div>
                  );
                })
            }
            <div style={s.sbActions}>
              <button style={{ ...s.btn, background: "#2563eb" }} onClick={exportCSV}>⬇ Export CSV</button>
              {totalSelected > 0 && <button style={{ ...s.btn, background: "#dc2626" }} onClick={clearAll}>✕ Clear All</button>}
            </div>
          </div>
        )}
      </div>

      {/* ── MOBILE: sticky bottom bar + slide-up agenda drawer ── */}
      {isMobile && (
        <>
          <button style={s.mobileFab} onClick={() => setMobileAgendaOpen(true)}>
            📋 My Agenda
            <span style={s.mobileFabBadge}>{totalSelected}</span>
          </button>

          {mobileAgendaOpen && (
            <div style={s.mobileDrawerOverlay} onClick={() => setMobileAgendaOpen(false)}>
              <div style={s.mobileDrawer} onClick={e => e.stopPropagation()}>
                <div style={s.mobileDrawerHandle} />
                <div style={s.sbHead}>My Agenda
                  <span style={s.sbCount}>{totalSelected} session{totalSelected !== 1 ? "s" : ""}</span>
                  <button style={s.mobileDrawerClose} onClick={() => setMobileAgendaOpen(false)}>✕</button>
                </div>
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {totalSelected === 0
                    ? <p style={s.sbEmpty}>Open a time slot and select a session to build your agenda.</p>
                    : DAYS.map(day => {
                        const dayItems = [...selectedIds]
                          .map(id => SESSIONS.find(s => s.id === id))
                          .filter(s => s?.day === day)
                          .sort((a,b) => timeToMinutes(a.time) - timeToMinutes(b.time));
                        if (!dayItems.length) return null;
                        return (
                          <div key={day} style={{ marginBottom: "16px" }}>
                            <div style={s.sbDayLabel}>{day}</div>
                            {dayItems.map(item => (
                              <div key={item.id} style={s.sbItem}>
                                <div style={s.sbItemTime}>{item.time}</div>
                                <div style={s.sbItemTitle}>{item.title}</div>
                                <button style={s.sbRemove} onClick={() => deselect(item.id)}>✕</button>
                              </div>
                            ))}
                          </div>
                        );
                      })
                  }
                </div>
                <div style={s.sbActions}>
                  <button style={{ ...s.btn, background: "#2563eb" }} onClick={exportCSV}>⬇ Export CSV</button>
                  {totalSelected > 0 && <button style={{ ...s.btn, background: "#dc2626" }} onClick={clearAll}>✕ Clear All</button>}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {bioName && <BioModal name={bioName} onClose={() => setBioName(null)} />}
    </div>
  );
}

const s = {
  root:      { fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", minHeight:"100vh", background:"#f1f5f9" },

  // top bar
  topBar:    { background:"#0f172a", color:"#fff", padding:"14px 28px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"10px" },
  h1:        { margin:0, fontSize:"18px", fontWeight:"800", letterSpacing:"-0.5px" },
  sub:       { margin:"2px 0 0", fontSize:"11px", color:"#64748b" },
  uidBox:    { display:"flex", alignItems:"center", gap:"6px", fontSize:"11px" },
  uidLabel:  { color:"#64748b" },
  uidVal:    { fontFamily:"monospace", color:"#94a3b8" },
  uidCopy:   { background:"#1e293b", color:"#94a3b8", border:"none", borderRadius:"3px", padding:"2px 8px", fontSize:"10px", cursor:"pointer" },

  // tabs
  tabsBar:   { background:"#0f172a", borderBottom:"1px solid #1e293b", padding:"0 28px", display:"flex", gap:"2px", overflowX:"auto" },
  tab:       { background:"none", border:"none", borderBottom:"3px solid transparent", color:"#64748b", padding:"12px 16px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"flex-start", gap:"2px", minWidth:"100px" },
  tabActive: { borderBottomColor:"#3b82f6", color:"#fff" },
  tabDay:    { fontSize:"13px", fontWeight:"700" },
  tabSub:    { fontSize:"10px", color:"#475569" },
  tabPill:   { fontSize:"10px", fontWeight:"700", padding:"1px 7px", borderRadius:"10px", marginTop:"2px" },

  // layout
  content:   { display:"grid", gridTemplateColumns:"1fr 280px", gap:"0", alignItems:"start", maxWidth:"1300px", margin:"0 auto", padding:"20px 20px 40px" },
  slotList:  { paddingRight:"20px" },

  // all days header
  allDayHdr: { fontSize:"15px", fontWeight:"800", color:"#0f172a", margin:"24px 0 10px", paddingBottom:"8px", borderBottom:"2px solid #2563eb" },

  // slot card
  slotCard:  { background:"#fff", borderRadius:"8px", border:"1px solid #e2e8f0", padding:"14px 16px", display:"flex", alignItems:"flex-start", gap:"14px", cursor:"default" },
  slotTime:  { fontSize:"12px", fontWeight:"800", color:"#2563eb", minWidth:"130px", paddingTop:"2px", flexShrink:0 },

  // filled state
  filledBody:   { flex:1, display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"12px" },
  filledLeft:   { flex:1 },
  filledMeta:   { display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"5px" },
  filledTitle:  { fontSize:"13px", fontWeight:"700", color:"#0f172a", marginBottom:"5px" },
  filledSpeakers:{ display:"flex", flexWrap:"wrap", gap:"6px" },
  filledSpName: { background:"none", border:"none", padding:0, fontSize:"11px", fontWeight:"600", color:"#2563eb", textDecoration:"underline", cursor:"pointer" },
  filledActions:{ display:"flex", flexDirection:"column", gap:"4px", flexShrink:0 },
  swapBtn:      { background:"#eff6ff", color:"#2563eb", border:"1px solid #bfdbfe", borderRadius:"5px", padding:"4px 10px", fontSize:"11px", fontWeight:"700", cursor:"pointer", whiteSpace:"nowrap" },
  removeBtn:    { background:"#fef2f2", color:"#dc2626", border:"1px solid #fecaca", borderRadius:"5px", padding:"4px 10px", fontSize:"11px", fontWeight:"700", cursor:"pointer" },

  // open state
  openBody:  { flex:1, display:"flex", alignItems:"center", gap:"10px", cursor:"pointer", padding:"2px 0" },
  openLabel: { display:"flex", alignItems:"center", gap:"8px", fontSize:"12px", color:"#64748b" },
  openDot:   { width:"8px", height:"8px", borderRadius:"50%", background:"#e2e8f0", flexShrink:0 },
  openCount: { fontSize:"11px", color:"#94a3b8" },
  tbdBody:   { flex:1, display:"flex", alignItems:"center", gap:"8px" },

  // options panel
  optionsPanel:{ marginLeft:"144px", marginTop:"4px", display:"flex", flexDirection:"column", gap:"8px" },
  option:       { background:"#fff", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"14px 16px", borderLeft:"3px solid #e2e8f0" },
  optionHeader: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"6px" },
  metaRow:      { display:"flex", gap:"6px", flexWrap:"wrap", alignItems:"center" },
  optionTitle:  { fontSize:"13px", fontWeight:"700", color:"#0f172a", marginBottom:"10px" },
  selectBtn:    { background:"#2563eb", color:"#fff", border:"none", borderRadius:"6px", padding:"5px 14px", fontSize:"12px", fontWeight:"700", cursor:"pointer", whiteSpace:"nowrap" },
  spChips:      { display:"flex", flexDirection:"column", gap:"5px" },
  spChip:       { display:"flex", alignItems:"center", gap:"8px", background:"#f8fafc", borderRadius:"5px", padding:"5px 10px" },
  spChipName:   { background:"none", border:"none", padding:0, fontSize:"12px", fontWeight:"700", color:"#2563eb", textDecoration:"underline", cursor:"pointer" },
  liBtn:        { display:"inline-flex", alignItems:"center", marginLeft:"auto" },
  liIcon:       { background:"#0077b5", color:"#fff", borderRadius:"3px", width:"18px", height:"18px", display:"inline-flex", alignItems:"center", justifyContent:"center" },
  descList:     { margin:"8px 0 10px", paddingLeft:"18px", display:"flex", flexDirection:"column", gap:"4px" },
  descItem:     { fontSize:"11.5px", color:"#475569", lineHeight:"1.45" },
  detailsToggle:{ background:"none", border:"none", color:"#2563eb", fontSize:"11px", fontWeight:"600", cursor:"pointer", padding:"4px 0", textAlign:"left" },

  // shared tags
  sid:      { background:"#eff6ff", color:"#2563eb", fontWeight:"700", fontSize:"10px", padding:"2px 7px", borderRadius:"4px", textTransform:"uppercase" },
  trackTag: { fontSize:"10px", fontWeight:"600", background:"#f1f5f9", color:"#475569", padding:"2px 7px", borderRadius:"4px", textTransform:"uppercase" },
  liveTag:  { fontSize:"10px", fontWeight:"700", background:"#dcfce7", color:"#166534", padding:"2px 7px", borderRadius:"4px" },

  // sidebar
  sidebar:     { background:"#fff", border:"1px solid #e2e8f0", borderRadius:"10px", padding:"18px", position:"sticky", top:"20px", maxHeight:"calc(100vh - 140px)", overflowY:"auto" },
  sbHead:      { fontSize:"14px", fontWeight:"800", borderBottom:"2px solid #e2e8f0", paddingBottom:"10px", marginBottom:"14px", display:"flex", alignItems:"baseline", gap:"6px" },
  sbCount:     { fontSize:"12px", fontWeight:"400", color:"#64748b" },
  sbEmpty:     { fontSize:"12px", color:"#94a3b8", fontStyle:"italic", lineHeight:"1.5" },
  sbDayLabel:  { fontSize:"10px", fontWeight:"700", textTransform:"uppercase", color:"#94a3b8", letterSpacing:"0.5px", marginBottom:"6px" },
  sbItem:      { display:"flex", alignItems:"flex-start", gap:"8px", borderLeft:"3px solid #2563eb", paddingLeft:"8px", marginBottom:"10px" },
  sbItemTime:  { fontSize:"10px", fontWeight:"700", color:"#64748b", whiteSpace:"nowrap", paddingTop:"2px" },
  sbItemTitle: { fontSize:"11px", fontWeight:"600", color:"#0f172a", lineHeight:"1.3", flex:1 },
  sbRemove:    { background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:"12px", padding:"0 2px", flexShrink:0 },
  sbActions:   { borderTop:"1px solid #e2e8f0", paddingTop:"12px", marginTop:"8px", display:"flex", flexDirection:"column", gap:"6px" },
  btn:         { width:"100%", border:"none", padding:"9px", fontSize:"12px", fontWeight:"700", borderRadius:"6px", cursor:"pointer", color:"#fff" },

  // filter panel
  filterPanel:       { background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"16px 24px" },
  filterPanelHeader: { display:"flex", alignItems:"center", gap:"12px", marginBottom:"12px" },
  filterPanelTitle:  { fontSize:"14px", fontWeight:"700", color:"#0f172a" },
  filterToggle:      { background:"none", border:"none", color:"#2563eb", fontSize:"12px", cursor:"pointer", padding:0 },
  clearFiltersBtn:   { background:"none", border:"1px solid #e2e8f0", borderRadius:"5px", color:"#64748b", fontSize:"11px", padding:"3px 10px", cursor:"pointer", marginLeft:"auto" },
  filterGrid:        { display:"flex", flexDirection:"column", gap:"12px" },
  filterRow:         { display:"flex", gap:"16px", flexWrap:"wrap" },
  filterGroup:       { display:"flex", flexDirection:"column", gap:"5px", flex:1, minWidth:"160px" },
  filterLabel:       { fontSize:"11px", fontWeight:"700", color:"#374151", textTransform:"uppercase", letterSpacing:"0.4px" },
  searchWrap:        { display:"flex", alignItems:"center", border:"1px solid #d1d5db", borderRadius:"6px", background:"#fff", overflow:"hidden" },
  searchIcon:        { padding:"0 10px", fontSize:"14px", color:"#9ca3af" },
  searchInput:       { flex:1, border:"none", outline:"none", padding:"8px 0", fontSize:"13px", color:"#0f172a" },
  searchClear:       { background:"none", border:"none", color:"#9ca3af", cursor:"pointer", padding:"0 10px", fontSize:"14px" },
  filterSelect:      { padding:"8px 10px", border:"1px solid #d1d5db", borderRadius:"6px", fontSize:"12px", color:"#0f172a", background:"#fff", outline:"none" },

  // ── MOBILE OVERRIDES ──────────────────────────────────────────────────────
  topBarMobile:      { padding: "10px 14px" },
  tabsBarMobile:      { padding: "0 8px", overflowX: "auto", WebkitOverflowScrolling: "touch" },
  tabMobile:          { padding: "10px 12px", minWidth: "auto" },
  filterPanelMobile:  { padding: "10px 14px" },
  contentMobile:      { gridTemplateColumns: "1fr", padding: "12px 12px 0", maxWidth: "100%" },

  // mobile floating action button
  mobileFab: {
    position: "fixed", bottom: "16px", left: "50%", transform: "translateX(-50%)",
    background: "#1e293b", color: "#fff", border: "none", borderRadius: "999px",
    padding: "12px 22px", fontSize: "13px", fontWeight: "700", cursor: "pointer",
    display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
    zIndex: 500,
  },
  mobileFabBadge: {
    background: "#2563eb", color: "#fff", fontSize: "11px", fontWeight: "800",
    padding: "1px 8px", borderRadius: "10px", minWidth: "20px", textAlign: "center",
  },

  // mobile drawer
  mobileDrawerOverlay: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
    zIndex: 999, display: "flex", alignItems: "flex-end",
  },
  mobileDrawer: {
    background: "#fff", width: "100%", maxHeight: "80vh",
    borderTopLeftRadius: "16px", borderTopRightRadius: "16px",
    padding: "10px 18px 18px", display: "flex", flexDirection: "column",
    boxShadow: "0 -8px 30px rgba(0,0,0,0.2)",
  },
  mobileDrawerHandle: {
    width: "40px", height: "4px", background: "#e2e8f0", borderRadius: "2px",
    margin: "0 auto 12px",
  },
  mobileDrawerClose: {
    marginLeft: "auto", background: "#f1f5f9", border: "none", borderRadius: "50%",
    width: "26px", height: "26px", fontSize: "12px", color: "#64748b", cursor: "pointer",
  },
};
