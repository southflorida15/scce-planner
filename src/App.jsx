import { useState, useEffect } from "react";
import PlannerTab from "./components/PlannerTab";
import SpeakersTab from "./components/SpeakersTab";

const TABS = [
  { id: "planner",  label: "📋 Agenda Planner",     short: "📋 Agenda" },
  { id: "speakers", label: "👥 Speakers Directory", short: "👥 Speakers" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("planner");
  const [jumpToSessionId, setJumpToSessionId] = useState(null);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 860);

  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < 860); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function goToSession(sessionId) {
    setJumpToSessionId(sessionId);
    setActiveTab("planner");
  }

  return (
    <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", minHeight: "100vh", background: "#f8fafc" }}>
      {/* Top nav */}
      <div style={{ background: "#0f172a", padding: isMobile ? "0 10px" : "0 28px", display: "flex", gap: "2px", borderBottom: "1px solid #1e293b" }}>
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
            }}
          >
            {isMobile ? tab.short : tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "planner"  && <PlannerTab jumpToSessionId={jumpToSessionId} onJumpHandled={() => setJumpToSessionId(null)} />}
      {activeTab === "speakers" && <SpeakersTab onSessionClick={goToSession} />}
    </div>
  );
}
