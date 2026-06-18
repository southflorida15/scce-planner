import { useEffect } from "react";
import { SPEAKERS } from "../data/sessions";

const LinkedInIcon = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
    <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/>
  </svg>
);

export default function BioModal({ name, onClose }) {
  const sp = name ? (SPEAKERS[name] ?? {}) : {};

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!name) return null;

  return (
    <div
      style={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={styles.modal}>
        <button style={styles.close} onClick={onClose} aria-label="Close">&times;</button>

        <h2 style={styles.name}>{name}</h2>
        <div style={styles.company}>{sp.co || "Unknown"}</div>
        <div style={styles.role}>{sp.role || ""}</div>

        {sp.li && (
          <a href={sp.li} target="_blank" rel="noopener noreferrer" style={styles.liLink}>
            <span style={styles.liIcon}><LinkedInIcon /></span>
            View LinkedIn Profile
          </a>
        )}

        <p style={styles.bio}>
          {sp.bio || "Biographical profile not yet available for this speaker."}
        </p>

        {!sp.v && (
          <div style={styles.warning}>
            ⚠ Company and role have not yet been verified against LinkedIn.
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(15,23,42,0.65)",
    backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999, padding: "16px",
  },
  modal: {
    background: "#fff", borderRadius: "12px",
    width: "100%", maxWidth: "600px",
    padding: "32px", position: "relative",
    maxHeight: "88vh", overflowY: "auto",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  },
  close: {
    position: "absolute", top: "16px", right: "16px",
    background: "#f1f5f9", border: "none", borderRadius: "50%",
    width: "30px", height: "30px", fontSize: "16px", fontWeight: "700",
    color: "#64748b", cursor: "pointer", display: "flex",
    alignItems: "center", justifyContent: "center", lineHeight: 1,
  },
  name:    { margin: "0 0 4px", fontSize: "20px", fontWeight: "800", color: "#0f172a" },
  company: { fontSize: "13px", fontWeight: "700", color: "#2563eb", marginBottom: "2px" },
  role:    { fontSize: "12px", color: "#64748b", paddingBottom: "14px", borderBottom: "1px solid #e2e8f0", marginBottom: "14px" },
  liLink:  {
    display: "inline-flex", alignItems: "center", gap: "6px",
    fontSize: "12px", color: "#0077b5", textDecoration: "none",
    marginBottom: "14px",
  },
  liIcon:  {
    background: "#0077b5", color: "#fff", borderRadius: "3px",
    width: "18px", height: "18px", display: "inline-flex",
    alignItems: "center", justifyContent: "center",
  },
  bio:     { margin: 0, fontSize: "13px", lineHeight: "1.65", color: "#334155" },
  warning: {
    marginTop: "14px", fontSize: "12px", fontStyle: "italic",
    color: "#92400e", background: "#fffbeb",
    border: "1px solid #fde68a", borderRadius: "6px", padding: "8px 12px",
  },
};
