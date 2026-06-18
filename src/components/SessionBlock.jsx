import { SPEAKERS } from "../data/sessions";

const LinkedInIcon = () => (
  <svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor">
    <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/>
  </svg>
);

export default function SessionBlock({ session, isSelected, isDisabled, onToggle, onSpeakerClick }) {
  const { id, time, track, title, sp, live } = session;

  return (
    <div style={{ ...s.block, opacity: isDisabled ? 0.35 : 1 }}>
      {/* Header row */}
      <div style={s.headerRow}>
        <div style={s.meta}>
          <span style={s.sid}>{id}</span>
          <span style={s.time}>{time}</span>
          <span style={s.track}>{track}</span>
          {live && <span style={s.live}>📡 Live</span>}
        </div>
        <label style={{ ...s.chkLabel, pointerEvents: isDisabled ? "none" : "auto" }}>
          <input
            type="checkbox"
            checked={isSelected}
            disabled={isDisabled}
            onChange={() => onToggle(id)}
            style={{ cursor: "pointer" }}
          />
          {isSelected ? "✓ Selected" : "Add to Agenda"}
        </label>
      </div>

      {/* Title */}
      <div style={s.title}>{title}</div>

      {/* Speakers */}
      {sp.length === 0 ? (
        <div style={s.tbd}>Speaker(s) TBD</div>
      ) : (
        <div style={s.spGrid}>
          {sp.map((name) => {
            const d = SPEAKERS[name] ?? {};
            return (
              <div key={name} style={s.spCard}>
                <button style={s.spName} onClick={() => onSpeakerClick(name)}>
                  {name}
                </button>
                <div style={{ ...s.spCo, color: d.v ? "#0f172a" : "#92400e" }}>
                  {d.co || "TBD"}
                  {!d.v && <span style={s.unv}> ⚠ unverified</span>}
                </div>
                <div style={s.spRole}>{d.role || ""}</div>
                {d.li && (
                  <a href={d.li} target="_blank" rel="noopener noreferrer" style={s.liLink}>
                    <span style={s.liIcon}><LinkedInIcon /></span>
                    LinkedIn
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

const s = {
  block: {
    background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0",
    padding: "18px", marginBottom: "14px",
  },
  headerRow: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "10px",
  },
  meta:  { display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" },
  sid:   { background: "#eff6ff", color: "#2563eb", fontWeight: "700", fontSize: "11px", padding: "3px 9px", borderRadius: "4px", textTransform: "uppercase" },
  time:  { fontSize: "11px", color: "#64748b", fontWeight: "500" },
  track: { fontSize: "10px", fontWeight: "600", background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "4px", textTransform: "uppercase" },
  live:  { fontSize: "10px", fontWeight: "700", background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "4px" },
  chkLabel: {
    display: "flex", alignItems: "center", gap: "6px",
    fontSize: "12px", fontWeight: "700", color: "#2563eb",
    cursor: "pointer", background: "#eff6ff", padding: "5px 11px",
    borderRadius: "6px", userSelect: "none", whiteSpace: "nowrap",
  },
  title: { fontSize: "15px", fontWeight: "700", color: "#0f172a", marginBottom: "14px" },
  tbd:   { fontSize: "12px", fontStyle: "italic", color: "#64748b" },
  spGrid:{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: "10px" },
  spCard:{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "12px" },
  spName:{
    background: "none", border: "none", padding: 0, margin: "0 0 3px",
    fontSize: "13px", fontWeight: "700", color: "#2563eb",
    textDecoration: "underline", cursor: "pointer", display: "block", textAlign: "left",
  },
  spCo:  { fontSize: "12px", fontWeight: "700", marginBottom: "2px" },
  spRole:{ fontSize: "11px", color: "#64748b", marginBottom: "6px" },
  unv:   { fontSize: "10px", fontStyle: "italic", fontWeight: "400" },
  liLink:{
    display: "inline-flex", alignItems: "center", gap: "4px",
    fontSize: "11px", color: "#0077b5", textDecoration: "none",
  },
  liIcon:{
    background: "#0077b5", color: "#fff", borderRadius: "2px",
    width: "16px", height: "16px", display: "inline-flex",
    alignItems: "center", justifyContent: "center",
  },
};
