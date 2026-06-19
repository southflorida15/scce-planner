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
