import { jsPDF } from "jspdf";
import { FIXED_EVENTS, DAY_LABELS } from "../data/sessions";

function timeToMinutes(timeRange) {
  const start = timeRange.split("–")[0].trim();
  const [timePart, ampm] = start.split(" ");
  let [h, m] = timePart.split(":").map(Number);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

const EVENT_LABELS = {
  meal: "MEAL", break: "BREAK", reception: "RECEPTION", general: "GENERAL SESSION", exam: "EXAM",
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday"];

/**
 * Builds a clean, text-based PDF of the user's agenda.
 * Returns a jsPDF instance — caller decides whether to save(), output as blob, etc.
 */
export function buildAgendaPDF(selectedSessions) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  function ensureSpace(needed) {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  }

  // ── Title ──────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("SCCE CEI 2026 — My Agenda", margin, y);
  y += 20;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Unofficial · September 27–30, 2026 · Rosen Shingle Creek, Orlando FL", margin, y);
  y += 24;

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(1.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  // ── Day-by-day ─────────────────────────────────────────────────────────
  DAYS.forEach(day => {
    const daySessions = selectedSessions.filter(s => s.day === day);
    const dayFixed = FIXED_EVENTS.filter(e => e.day === day);
    if (daySessions.length === 0 && dayFixed.length === 0) return;

    // Group sessions by time (for side-by-side pairs)
    const byTime = {};
    daySessions.forEach(s => {
      if (!byTime[s.time]) byTime[s.time] = [];
      byTime[s.time].push(s);
    });

    const timeline = [
      ...Object.entries(byTime).map(([time, group]) => ({ kind: "group", time, sessions: group })),
      ...dayFixed.map(e => ({ kind: "fixed", ...e })),
    ].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

    ensureSpace(34);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(DAY_LABELS[day], margin, y);
    y += 6;
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;

    timeline.forEach(item => {
      if (item.kind === "fixed") {
        ensureSpace(28);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(100, 70, 10);
        doc.text(item.time, margin, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        doc.text(`[${EVENT_LABELS[item.type] || "EVENT"}]  ${item.title}`, margin + 110, y);
        y += 18;
        return;
      }

      const group = item.sessions;
      ensureSpace(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(37, 99, 235);
      doc.text(item.time, margin, y);
      const startY = y;
      let colX = margin + 110;
      const colWidth = group.length > 1 ? (pageWidth - margin * 2 - 110) / 2 - 8 : pageWidth - margin * 2 - 110;

      group.forEach((sess, idx) => {
        let cy = startY;
        const cx = colX + idx * (colWidth + 16);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`[${sess.id}] ${sess.track}${sess.live ? " · LIVE" : ""}`, cx, cy);
        cy += 12;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        const titleLines = doc.splitTextToSize(sess.title, colWidth);
        doc.text(titleLines, cx, cy);
        cy += titleLines.length * 12 + 2;

        if (sess.sp && sess.sp.length > 0) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8.5);
          doc.setTextColor(80, 80, 80);
          const spLines = doc.splitTextToSize(sess.sp.join(", "), colWidth);
          doc.text(spLines, cx, cy);
          cy += spLines.length * 10 + 2;
        }
        if (cy > y) y = cy;
      });

      y += 12;
    });

    y += 10;
  });

  return doc;
}

/**
 * Returns the PDF as a Blob (for sharing via Web Share API or upload).
 */
export function agendaPDFToBlob(selectedSessions) {
  const doc = buildAgendaPDF(selectedSessions);
  return doc.output("blob");
}

/**
 * Triggers a direct download of the PDF.
 */
export function downloadAgendaPDF(selectedSessions, filename = "SCCE_CEI_2026_MyAgenda.pdf") {
  const doc = buildAgendaPDF(selectedSessions);
  doc.save(filename);
}
