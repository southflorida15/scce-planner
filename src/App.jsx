import { useState, useEffect } from "react";
import PlannerTab from "./components/PlannerTab";
import SpeakersTab from "./components/SpeakersTab";
import MyAgendaTab from "./components/MyAgendaTab";
import BioModal from "./components/BioModal";
import { useAgenda } from "./hooks/useAgenda";

const TABS = [
  { id: "planner",  label: "📋 Agenda Planner",     short: "📋 Planner" },
  { id: "myagenda", label: "✅ My Agenda",          short: "✅ My Agenda" },
  { id: "speakers", label: "👥 Speakers Directory", short: "👥 Speakers" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("planner");
  const [jumpToSessionId, setJumpToSessionId] = useState(null);
  const [bioName, setBioName] = useState(null);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 860);

  // Single shared agenda state — selections, sync status, UID — used by all tabs
  const agenda = useAgenda();

  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < 860); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function goToSession(sessionId) {
    setJumpToSessionId(sessionId);
    setActiveTab("planner");
  }

  // Badge count for the "My Agenda" tab
  const agendaCount = agenda.selectedIds.size;

  return (
    <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", minHeight: "100vh", background: "#f8fafc" }}>
      {/* Title + UID bar */}
      <div className="no-print" style={{
        background: "#0f172a", color: "#fff",
        padding: isMobile ? "10px 14px" : "14px 28px",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px",
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? "16px" : "18px", fontWeight: "800", letterSpacing: "-0.5px" }}>
            SCCE CEI 2026
          </h1>
          {!isMobile && (
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b" }}>
              25th Annual Compliance &amp; Ethics Institute · Rosen Shingle Creek, Orlando FL
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: isMobile ? "10px" : "11px" }}>
          {!isMobile && <span style={{ color: "#64748b" }}>Your ID </span>}
          <span style={{ fontFamily: "monospace", color: "#94a3b8" }}>
            {agenda.UID.slice(0, isMobile ? 8 : 14)}…
          </span>
          <button
            style={{ background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: "3px", padding: "2px 8px", fontSize: "10px", cursor: "pointer" }}
            onClick={agenda.copyUID}
          >
            Copy
          </button>
          {agenda.syncMsg && !isMobile && (
            <span style={{ marginLeft: "10px", fontSize: "11px", color: agenda.syncType === "ok" ? "#86efac" : agenda.syncType === "err" ? "#fca5a5" : "#94a3b8" }}>
              {agenda.syncMsg}
            </span>
          )}
        </div>
      </div>

      {/* Top nav */}
      <div className="no-print" style={{ background: "#0f172a", padding: isMobile ? "0 10px" : "0 28px", display: "flex", gap: "2px", borderBottom: "1px solid #1e293b", overflowX: "auto" }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: "none", border: "none",
              borderBottom: activeTab === tab.id ? "3px solid #3b82f6" : "3px solid transparent",
              color: activeTab === tab.id ? "#fff" : "#64748b",
              padding: isMobile ? "12px 14px" : "14px 20px",
              fontSize: isMobile ? "12px" : "13px",
              fontWeight: "700",
              cursor: "pointer", whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            {isMobile ? tab.short : tab.label}
            {tab.id === "myagenda" && agendaCount > 0 && (
              <span style={{
                background: activeTab === "myagenda" ? "#3b82f6" : "#334155",
                color: "#fff", fontSize: "10px", fontWeight: "800",
                padding: "1px 6px", borderRadius: "10px",
              }}>
                {agendaCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "planner" && (
        <PlannerTab
          agenda={agenda}
          jumpToSessionId={jumpToSessionId}
          onJumpHandled={() => setJumpToSessionId(null)}
        />
      )}
      {activeTab === "myagenda" && (
        <MyAgendaTab
          agenda={agenda}
          onNavigateToPlanner={() => setActiveTab("planner")}
          onBioClick={setBioName}
        />
      )}
      {activeTab === "speakers" && (
        <SpeakersTab onSessionClick={goToSession} />
      )}

      {bioName && <BioModal name={bioName} onClose={() => setBioName(null)} />}
    </div>
  );
}
