import { useState, useMemo, useRef } from "react";
import { SPEAKERS, SESSIONS } from "../data/sessions";

// ── Derive location + industry from SCCE data where possible ─────────────────
// These are inferred from bio text / known info; will be enriched from LinkedIn CSV
const SPEAKER_META = {
  "Shannon Jamison":          { location: "Fort Collins, CO",         industry: "Healthcare & Medical Devices" },
  "Virginia MacSuibhne":      { location: "Santa Clara, CA",          industry: "Healthcare / Tech (Independent)" },
  "Deena King Holdaway":      { location: "Utah",                     industry: "Higher Education / Government" },
  "E. Gates Garrity-Rokous":  { location: "Columbus, OH",             industry: "Higher Education" },
  "Jennifer L. Ward":         { location: "Washington, DC",           industry: "Government / Federal" },
  "John Hanson":              { location: "Washington, DC",           industry: "Consulting / Forensic Accounting" },
  "Lorraine Luciano":         { location: "Washington, DC",           industry: "Government / Non-Profit" },
  "Felipe Maldonado Garcia":  { location: "South Florida, FL",        industry: "Technology / SaaS" },
  "Hemma Lomax":              { location: "Washington, DC",           industry: "Technology / SaaS" },
  "Roxanne Petraeus":         { location: "New York, NY",             industry: "Technology / SaaS" },
  "Mary Shirley":             { location: "Louisville, KY",           industry: "Healthcare" },
  "Matt Kelly":               { location: "Boston, MA",               industry: "Media / Publishing" },
  "Kara Benedict":            { location: "TBD",                      industry: "Consulting / Healthcare" },
  "Jessica Beane":            { location: "San Francisco Bay Area",   industry: "Technology / SaaS" },
  "Mor Wetzler":              { location: "San Francisco Bay Area",   industry: "Technology / SaaS" },
  "Debbie Trokus":            { location: "Louisville, KY",           industry: "Consulting" },
  "Sheryl Vacca":             { location: "TBD",                      industry: "Consulting / Healthcare" },
  "Dustin Eaton":             { location: "TBD",                      industry: "Technology" },
  "Mitchell Boyd":            { location: "Milwaukee, WI",            industry: "Manufacturing / Automotive" },
  "Megan Zwiebel":            { location: "New York, NY",             industry: "Consulting / Publishing" },
  "Nicole Di Schino":         { location: "New York, NY",             industry: "Consulting / Technology" },
  "Tobias Sturesson":         { location: "TBD",                      industry: "Consulting / Culture" },
  "Courtney Sander":          { location: "TBD",                      industry: "Consulting" },
  "Harper Wells":             { location: "TBD",                      industry: "Technology / E-Learning" },
  "Mikhail Belov":            { location: "TBD",                      industry: "Consulting / Accounting" },
  "Alexa Stone":              { location: "TBD",                      industry: "Consulting / Financial Services" },
  "Stefany Samp":             { location: "TBD",                      industry: "Consulting" },
  "Barbara Petitti":          { location: "TBD",                      industry: "Telecommunications" },
  "Ellen Hunt":               { location: "Chicago, IL",              industry: "Real Estate / Healthcare" },
  "Teri Quimby":              { location: "Michigan",                 industry: "Consulting / Governance" },
  "William Cameron":          { location: "TBD",                      industry: "Energy / Nuclear" },
  "Kristine Coy-Foster":      { location: "San Francisco Bay Area",   industry: "Retail / Fashion" },
  "Adam Balfour":             { location: "Nashville, TN",            industry: "Manufacturing / Automotive" },
  "Jannica Houben":           { location: "Barcelona, Spain",         industry: "Technology Distribution" },
  "Tanja Gromadzki":          { location: "Florida",                  industry: "Technology Distribution" },
  "J. Veronica Xu":           { location: "Cleveland, OH",            industry: "Healthcare / Long-Term Care" },
  "Robin Rohmer":             { location: "TBD",                      industry: "Consulting" },
  "Wendy Evans":              { location: "Orlando, FL",              industry: "Aerospace & Defense" },
  "Devon Jackson":            { location: "Washington",               industry: "Government / Energy" },
  "Jason Bostic":             { location: "Washington",               industry: "Government / Energy" },
  "Colin Flood":              { location: "TBD",                      industry: "Consulting / Forensic Accounting" },
  "Joseph Pugh":              { location: "Washington, DC",           industry: "Non-Profit" },
  "Stephanie Kandel":         { location: "Ellicott City, MD",        industry: "Non-Profit / Retail" },
  "Nick Gallo":               { location: "TBD",                      industry: "Technology / Compliance" },
  "Kasturi Venkatesh":        { location: "Berkeley, CA",             industry: "Automotive / Technology" },
  "Laurence Hamel":           { location: "Montreal, Canada",         industry: "Engineering / Consulting" },
  "Kasey Ingram":             { location: "TBD",                      industry: "Chemical / Manufacturing" },
  "Rebecca Walker":           { location: "Santa Monica, CA",         industry: "Legal / Consulting" },
  "Majid Charania":           { location: "Canada",                   industry: "Government / Regulatory" },
  "Patricia Marinho":         { location: "TBD",                      industry: "Financial Services / AML" },
  "Travis Waugh":             { location: "Atlanta, GA",              industry: "Higher Education" },
  "Renata Muzzi":             { location: "São Paulo, Brazil",        industry: "Legal" },
  "Shin Jae Kim":             { location: "São Paulo, Brazil",        industry: "Legal" },
  "Bruce Bruski":             { location: "TBD",                      industry: "Telecommunications" },
  "James Tillen":             { location: "Washington, DC",           industry: "Legal" },
  "Kathryn Nickerson":        { location: "Washington, DC",           industry: "Government / Legal" },
  "Frank Ruelas":             { location: "Phoenix, AZ",              industry: "Healthcare" },
  "Heather Smith":            { location: "TBD",                      industry: "Consulting / Technology" },
  "Helen Eisner":             { location: "TBD",                      industry: "Automotive / Technology" },
  "Jeffrey Brown":            { location: "Santa Monica, CA",         industry: "Gaming / Entertainment" },
  "Caleb Janski":             { location: "Kentucky",                 industry: "Healthcare / Long-Term Care" },
  "Ian Moolman":              { location: "UAE",                      industry: "Mining / Commodities" },
  "Kelly Willenberg":         { location: "South Carolina",           industry: "Healthcare" },
  "Alphons Iacobelli":        { location: "TBD",                      industry: "Consulting / Academic" },
  "James Jefferis":           { location: "Pennsylvania",             industry: "Retail" },
  "Michelle Ackerman":        { location: "TBD",                      industry: "Retail" },
  "Jonathan Armstrong":       { location: "London, UK",               industry: "Legal / Technology" },
  "Kortney Nordrum":          { location: "Minneapolis, MN",          industry: "Financial Services / Tech" },
  "Troy Bienstock":           { location: "New York, NY",             industry: "Consulting / Accounting" },
  "Steven Gyeszly":           { location: "TBD",                      industry: "Energy / Offshore" },
  "Sanghamitra Saha":         { location: "TBD",                      industry: "Legal / Consulting" },
  "Andrew McBride":           { location: "TBD",                      industry: "Consulting / Mining" },
  "Gregory Bates":            { location: "Washington, DC",           industry: "Technology / Legal" },
  "Ken Winfield":             { location: "New York, NY",             industry: "Construction" },
  "Bonnie Green":             { location: "Arizona",                  industry: "Healthcare" },
  "Katrina Campbell":         { location: "TBD",                      industry: "Consulting" },
  "Britni Jennings":          { location: "TBD",                      industry: "Agriculture / Manufacturing" },
};

// Build session participation map
const SPEAKER_SESSIONS = {};
SESSIONS.forEach(s => {
  s.sp.forEach(name => {
    if (!SPEAKER_SESSIONS[name]) SPEAKER_SESSIONS[name] = [];
    SPEAKER_SESSIONS[name].push(s.id);
  });
});

// All unique industries for filter
const ALL_INDUSTRIES = [...new Set(
  Object.values(SPEAKER_META).map(m => m.industry).filter(i => i && i !== "TBD")
)].sort();

const LinkedInIcon = ({ size = 14 }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor">
    <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/>
  </svg>
);

function parseLinkedInCSV(text) {
  // LinkedIn connections CSV format:
  // First Name,Last Name,Email Address,Company,Position,Connected On
  const lines = text.trim().split("\n");
  const connections = new Set();
  // Skip header rows (LinkedIn includes a few note lines before the actual header)
  let dataStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("First Name") && lines[i].includes("Last Name")) {
      dataStart = i + 1;
      break;
    }
  }
  for (let i = dataStart; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length >= 2) {
      const firstName = cols[0].replace(/"/g, "").trim();
      const lastName  = cols[1].replace(/"/g, "").trim();
      if (firstName && lastName) {
        connections.add(`${firstName} ${lastName}`.toLowerCase());
      }
    }
  }
  return connections;
}

export default function SpeakersTab({ onSessionClick }) {
  const [connections, setConnections]     = useState(null); // Set of lowercase names
  const [csvError, setCsvError]           = useState("");
  const [searchText, setSearchText]       = useState("");
  const [filterIndustry, setFilterIndustry] = useState("ALL");
  const [filterVerified, setFilterVerified] = useState("ALL");
  const [filterConnected, setFilterConnected] = useState("ALL");
  const [filterMultiSession, setFilterMultiSession] = useState(false);
  const [filterLocation, setFilterLocation] = useState("");
  const [sortBy, setSortBy]               = useState("name");
  const [bioOpen, setBioOpen]             = useState(null);
  const fileRef = useRef();

  function handleCSVUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseLinkedInCSV(ev.target.result);
        if (parsed.size === 0) throw new Error("No connections found — check the file format.");
        setConnections(parsed);
        setCsvError("");
      } catch (err) {
        setCsvError(err.message);
      }
    };
    reader.readAsText(file);
  }

  // Build speaker list
  const allSpeakers = useMemo(() => {
    return Object.entries(SPEAKERS).map(([name, data]) => {
      const meta = SPEAKER_META[name] ?? { location: "TBD", industry: "TBD" };
      const sessions = SPEAKER_SESSIONS[name] ?? [];
      const isConnected = connections ? connections.has(name.toLowerCase()) : null;
      return { name, ...data, ...meta, sessions, isConnected };
    });
  }, [connections]);

  // Filter + sort
  const filtered = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    return allSpeakers
      .filter(sp => {
        if (q && !sp.name.toLowerCase().includes(q) &&
            !sp.co.toLowerCase().includes(q) &&
            !(sp.location||"").toLowerCase().includes(q)) return false;
        if (filterIndustry !== "ALL" && sp.industry !== filterIndustry) return false;
        if (filterVerified === "yes" && !sp.v) return false;
        if (filterVerified === "no"  &&  sp.v) return false;
        if (filterConnected === "yes" && sp.isConnected !== true)  return false;
        if (filterConnected === "no"  && sp.isConnected !== false) return false;
        if (filterMultiSession && sp.sessions.length <= 1) return false;
        if (filterLocation && !(sp.location||"").toLowerCase().includes(filterLocation.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name")    return a.name.localeCompare(b.name);
        if (sortBy === "company") return a.co.localeCompare(b.co);
        if (sortBy === "location")return (a.location||"").localeCompare(b.location||"");
        if (sortBy === "sessions")return b.sessions.length - a.sessions.length;
        return 0;
      });
  }, [allSpeakers, searchText, filterIndustry, filterVerified, filterConnected, filterMultiSession, filterLocation, sortBy]);

  const connectedCount  = connections ? allSpeakers.filter(s => s.isConnected).length : 0;
  const verifiedCount   = allSpeakers.filter(s => s.v).length;
  const multiCount      = allSpeakers.filter(s => s.sessions.length > 1).length;

  return (
    <div style={s.root}>

      {/* ── HEADER ── */}
      <div style={s.header}>
        <div>
          <h2 style={s.h2}>Speakers Directory</h2>
          <p style={s.sub}>All {allSpeakers.length} confirmed speakers · SCCE CEI 2026</p>
        </div>
        <div style={s.statsRow}>
          <button
            style={{ ...s.stat, ...(filterVerified === "yes" ? s.statActive : {}) }}
            onClick={() => setFilterVerified(filterVerified === "yes" ? "ALL" : "yes")}
          >
            <span style={s.statN}>{verifiedCount}</span><span style={s.statL}>Verified</span>
          </button>
          <button
            style={{ ...s.stat, ...(filterVerified === "no" ? s.statActive : {}) }}
            onClick={() => setFilterVerified(filterVerified === "no" ? "ALL" : "no")}
          >
            <span style={s.statN}>{allSpeakers.length - verifiedCount}</span><span style={s.statL}>Pending</span>
          </button>
          <button
            style={{ ...s.stat, ...(filterMultiSession ? s.statActive : {}) }}
            onClick={() => setFilterMultiSession(v => !v)}
          >
            <span style={s.statN}>{multiCount}</span><span style={s.statL}>Multi-Session</span>
          </button>
          {connections && (
            <button
              style={{ ...s.stat, background: "#f0fdf4", border: "1px solid #bbf7d0", ...(filterConnected === "yes" ? { boxShadow: "0 0 0 2px rgba(22,163,74,0.2)" } : {}) }}
              onClick={() => setFilterConnected(filterConnected === "yes" ? "ALL" : "yes")}
            >
              <span style={{ ...s.statN, color: "#166534" }}>{connectedCount}</span>
              <span style={s.statL}>Connected</span>
            </button>
          )}
        </div>
      </div>

      {/* ── LINKEDIN CONNECT BANNER ── */}
      {!connections && (
        <div style={s.linkedInBanner}>
          <div style={s.bannerLeft}>
            <span style={s.liIconWrap}><LinkedInIcon size={20} /></span>
            <div>
              <div style={s.bannerTitle}>Connect your LinkedIn to see who you already know</div>
              <div style={s.bannerSub}>
                Export your connections from LinkedIn → Settings & Privacy → Data Privacy → Get a copy of your data → select <strong>Connections</strong> → upload the CSV here.
              </div>
            </div>
          </div>
          <div style={s.bannerRight}>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={handleCSVUpload}
            />
            <button style={s.uploadBtn} onClick={() => fileRef.current.click()}>
              Upload Connections.csv
            </button>
            {csvError && <div style={s.csvError}>{csvError}</div>}
          </div>
        </div>
      )}

      {connections && (
        <div style={s.connectedBanner}>
          <span style={{ fontSize: "16px" }}>✅</span>
          <span>LinkedIn connected — <strong>{connectedCount} speakers</strong> are in your network</span>
          <button style={s.disconnectBtn} onClick={() => { setConnections(null); if(fileRef.current) fileRef.current.value=""; }}>
            Remove
          </button>
        </div>
      )}

      {/* ── FILTERS ── */}
      <div style={s.filters}>
        <input style={s.fInput} value={searchText} onChange={e => setSearchText(e.target.value)}
          placeholder="🔍 Search name, company, location…" />
        <input style={s.fInput} value={filterLocation} onChange={e => setFilterLocation(e.target.value)}
          placeholder="📍 Filter by location…" />
        <select style={s.fInput} value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)}>
          <option value="ALL">All Industries</option>
          {ALL_INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <select style={s.fInput} value={filterVerified} onChange={e => setFilterVerified(e.target.value)}>
          <option value="ALL">All Speakers</option>
          <option value="yes">✅ Verified Only</option>
          <option value="no">⚠ Pending Verification</option>
        </select>
        {connections && (
          <select style={s.fInput} value={filterConnected} onChange={e => setFilterConnected(e.target.value)}>
            <option value="ALL">All Connections</option>
            <option value="yes">🤝 Connected on LinkedIn</option>
            <option value="no">Not Connected</option>
          </select>
        )}
        <select style={s.fInput} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="name">Sort: Name A–Z</option>
          <option value="company">Sort: Company</option>
          <option value="location">Sort: Location</option>
          <option value="sessions">Sort: Most Sessions</option>
        </select>
        <div style={s.resultsCount}>{filtered.length} of {allSpeakers.length} speakers</div>
      </div>

      {/* ── SPEAKERS GRID ── */}
      <div style={s.grid}>
        {filtered.map(sp => (
          <div key={sp.name} style={{
            ...s.card,
            borderTop: sp.isConnected === true ? "3px solid #2563eb"
                     : sp.isConnected === false ? "3px solid #e2e8f0"
                     : "3px solid #e2e8f0",
          }}>
            {/* Connection badge */}
            {sp.isConnected === true && (
              <div style={s.connectedBadge}>🤝 Connected</div>
            )}

            {/* Name + verified */}
            <div style={s.cardNameRow}>
              <button style={s.cardName} onClick={() => setBioOpen(sp.name)}>
                {sp.name}
              </button>
              <span style={{
                background: sp.v ? "#dcfce7" : "#fef9c3",
                color: sp.v ? "#166534" : "#854d0e",
                border: sp.v ? "1px solid #bbf7d0" : "1px solid #fde68a",
                fontSize: "10px", fontWeight: "700", padding: "2px 8px",
                borderRadius: "10px", whiteSpace: "nowrap",
              }}>
                {sp.v ? "Verified" : "Pending"}
              </span>
            </div>

            {/* Role */}
            <div style={s.cardRole}>{sp.role !== "TBD" ? sp.role : <span style={{ color: "#94a3b8" }}>Role TBD</span>}</div>

            {/* Company */}
            <div style={s.cardCompany}>{sp.co !== "TBD" ? sp.co : <span style={{ color: "#94a3b8" }}>Company TBD</span>}</div>

            {/* Industry */}
            {sp.industry && sp.industry !== "TBD" && (
              <div style={s.industryTag}>{sp.industry}</div>
            )}

            {/* Location */}
            <div style={s.cardLocation}>
              📍 {sp.location && sp.location !== "TBD" ? sp.location : <span style={{ color: "#94a3b8" }}>Location TBD</span>}
            </div>

            {/* Sessions */}
            <div style={s.sessionPills}>
              {sp.sessions.map(id => (
                <button
                  key={id}
                  style={{ ...s.sessionPill, cursor: "pointer", border: "none" }}
                  onClick={() => onSessionClick?.(id)}
                  title={`View ${id} in the agenda planner`}
                >
                  {id}
                </button>
              ))}
            </div>

            {/* LinkedIn */}
            <a
              href={sp.li || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(sp.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...s.liLink, opacity: sp.li ? 1 : 0.5 }}
              title={sp.li ? "View LinkedIn profile" : "Search on LinkedIn (URL not yet confirmed)"}
            >
              <span style={s.liIconSmall}><LinkedInIcon size={10} /></span>
              {sp.li ? "LinkedIn" : "Search LinkedIn ↗"}
            </a>
          </div>
        ))}
      </div>

      {/* ── BIO MODAL ── */}
      {bioOpen && (() => {
        const sp = SPEAKERS[bioOpen] ?? {};
        const meta = SPEAKER_META[bioOpen] ?? {};
        const sessions = SPEAKER_SESSIONS[bioOpen] ?? [];
        const isConnected = connections ? connections.has(bioOpen.toLowerCase()) : null;
        return (
          <div style={s.overlay} onClick={() => setBioOpen(null)}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>
              <button style={s.modalClose} onClick={() => setBioOpen(null)}>&times;</button>
              <div style={s.modalHeader}>
                <h2 style={s.modalName}>{bioOpen}</h2>
                {isConnected === true && <span style={s.connectedBadge}>🤝 Connected</span>}
              </div>
              <div style={s.modalCo}>{sp.co}</div>
              <div style={s.modalRole}>{sp.role}</div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
                {meta.location && meta.location !== "TBD" && (
                  <span style={s.modalChip}>📍 {meta.location}</span>
                )}
                {meta.industry && meta.industry !== "TBD" && (
                  <span style={s.modalChip}>🏢 {meta.industry}</span>
                )}
                {sessions.length > 0 && (
                  <span style={s.modalChip}>
                    🎤 Sessions: {sessions.map((id, i) => (
                      <span key={id}>
                        {i > 0 && ", "}
                        <button
                          style={{ background: "none", border: "none", padding: 0, color: "#2563eb", fontWeight: "700", cursor: "pointer", fontSize: "inherit", textDecoration: "underline" }}
                          onClick={() => { setBioOpen(null); onSessionClick?.(id); }}
                        >
                          {id}
                        </button>
                      </span>
                    ))}
                  </span>
                )}
              </div>
              <a
                href={sp.li || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(bioOpen)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...s.liLink, marginBottom: "14px", display: "inline-flex", opacity: sp.li ? 1 : 0.55 }}
                title={sp.li ? "View LinkedIn profile" : "Search on LinkedIn (URL not yet confirmed)"}
              >
                <span style={s.liIconSmall}><LinkedInIcon size={10} /></span>
                {sp.li ? "View LinkedIn Profile" : "Search on LinkedIn ↗"}
              </a>
              <p style={s.modalBio}>
                {sp.bio || "Biographical profile not yet available."}
              </p>
              {!sp.v && (
                <div style={s.modalWarn}>⚠ Company and role not yet verified against LinkedIn.</div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const s = {
  root:           { fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", padding: "24px 28px", maxWidth: "1400px", margin: "0 auto" },
  header:         { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" },
  h2:             { margin: "0 0 4px", fontSize: "20px", fontWeight: "800", color: "#0f172a" },
  sub:            { margin: 0, fontSize: "12px", color: "#64748b" },
  statsRow:       { display: "flex", gap: "10px", flexWrap: "wrap" },
  stat:           { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 16px", textAlign: "center", minWidth: "80px", cursor: "pointer", transition: "all .15s" },
  statActive:     { background: "#eff6ff", border: "1px solid #93c5fd", boxShadow: "0 0 0 2px rgba(37,99,235,0.15)" },
  statN:          { display: "block", fontSize: "18px", fontWeight: "800", color: "#2563eb", lineHeight: 1 },
  statL:          { display: "block", fontSize: "10px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", marginTop: "3px" },

  // LinkedIn banner
  linkedInBanner: { background: "#f0f7ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "16px 20px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" },
  bannerLeft:     { display: "flex", alignItems: "flex-start", gap: "14px", flex: 1 },
  liIconWrap:     { background: "#0077b5", color: "#fff", borderRadius: "4px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bannerTitle:    { fontSize: "13px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" },
  bannerSub:      { fontSize: "11px", color: "#475569", lineHeight: "1.5" },
  bannerRight:    { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" },
  uploadBtn:      { background: "#0077b5", color: "#fff", border: "none", borderRadius: "7px", padding: "9px 18px", fontSize: "12px", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap" },
  csvError:       { fontSize: "11px", color: "#dc2626" },
  connectedBanner:{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "10px 16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#166534" },
  disconnectBtn:  { marginLeft: "auto", background: "none", border: "1px solid #bbf7d0", borderRadius: "5px", color: "#166534", fontSize: "11px", padding: "3px 10px", cursor: "pointer" },

  // Filters
  filters:        { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px 18px", marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" },
  fInput:         { padding: "7px 11px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", background: "#f8fafc", outline: "none", minWidth: "160px", flex: 1 },
  resultsCount:   { fontSize: "11px", color: "#64748b", whiteSpace: "nowrap", marginLeft: "auto" },

  // Grid
  grid:           { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "14px" },
  card:           { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", position: "relative", transition: "box-shadow .15s" },
  connectedBadge: { display: "inline-flex", alignItems: "center", gap: "4px", background: "#eff6ff", color: "#2563eb", fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "10px", marginBottom: "6px" },
  cardNameRow:    { display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" },
  cardName:       { background: "none", border: "none", padding: 0, fontSize: "13px", fontWeight: "700", color: "#2563eb", textDecoration: "underline", cursor: "pointer", textAlign: "left" },
  verifiedDot:    { fontSize: "11px", flexShrink: 0 },
  unverifiedDot:  { fontSize: "11px", flexShrink: 0, opacity: 0.6 },
  cardRole:       { fontSize: "11px", color: "#475569", marginBottom: "2px", lineHeight: "1.3" },
  cardCompany:    { fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" },
  industryTag:    { display: "inline-block", background: "#f1f5f9", color: "#475569", fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "4px", textTransform: "uppercase", marginBottom: "6px" },
  cardLocation:   { fontSize: "11px", color: "#64748b", marginBottom: "8px" },
  sessionPills:   { display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" },
  sessionPill:    { background: "#eff6ff", color: "#2563eb", fontSize: "10px", fontWeight: "700", padding: "1px 7px", borderRadius: "4px" },
  liLink:         { display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#0077b5", textDecoration: "none" },
  liIconSmall:    { background: "#0077b5", color: "#fff", borderRadius: "2px", width: "16px", height: "16px", display: "inline-flex", alignItems: "center", justifyContent: "center" },

  // Bio modal
  overlay:        { position: "fixed", inset: 0, background: "rgba(15,23,42,.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px" },
  modal:          { background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "600px", padding: "30px", position: "relative", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 40px rgba(0,0,0,.2)" },
  modalClose:     { position: "absolute", top: "16px", right: "16px", background: "#f1f5f9", border: "none", borderRadius: "50%", width: "30px", height: "30px", fontSize: "16px", fontWeight: "700", color: "#64748b", cursor: "pointer" },
  modalHeader:    { display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" },
  modalName:      { margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a" },
  modalCo:        { fontSize: "13px", fontWeight: "700", color: "#2563eb", marginBottom: "2px" },
  modalRole:      { fontSize: "11px", color: "#64748b", marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid #e2e8f0" },
  modalChip:      { background: "#f1f5f9", color: "#475569", fontSize: "11px", padding: "3px 10px", borderRadius: "5px" },
  modalBio:       { fontSize: "12px", lineHeight: "1.65", color: "#334155", margin: "0" },
  modalWarn:      { marginTop: "12px", fontSize: "11px", fontStyle: "italic", color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "5px", padding: "8px 12px" },
};
