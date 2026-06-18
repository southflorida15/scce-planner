// api/agenda.js
// Vercel serverless function — SCCE CEI 2026 agenda persistence
// Uses Vercel KV (Upstash Redis under the hood).
// Env vars injected automatically when you connect a KV store in the Vercel dashboard:
//   KV_REST_API_URL, KV_REST_API_TOKEN
//
// Routes:
//   GET    ?action=load&uid=<uuid>   → { uid, selections: ["101","203",...] }
//   POST   ?action=save              → body { uid, selections: [...] } → { ok, count }
//   DELETE ?action=clear&uid=<uuid>  → { ok }

import { kv } from "@vercel/kv";

const KEY = (uid) => `scce:agenda:${uid}`;
const TTL = 60 * 60 * 24 * 180; // 180 days

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action, uid } = req.query;

  try {
    // ── LOAD ──────────────────────────────────────────────────────────────────
    if (req.method === "GET" && action === "load") {
      if (!uid) return res.status(400).json({ error: "uid required" });
      const data = await kv.get(KEY(uid));
      return res.status(200).json({ uid, selections: data ?? [] });
    }

    // ── SAVE ──────────────────────────────────────────────────────────────────
    if (req.method === "POST" && action === "save") {
      const { uid: bodyUid, selections } = req.body ?? {};
      const id = bodyUid || uid;
      if (!id) return res.status(400).json({ error: "uid required" });
      if (!Array.isArray(selections)) return res.status(400).json({ error: "selections must be array" });
      await kv.set(KEY(id), selections, { ex: TTL });
      return res.status(200).json({ ok: true, uid: id, count: selections.length });
    }

    // ── CLEAR ─────────────────────────────────────────────────────────────────
    if (req.method === "DELETE" && action === "clear") {
      if (!uid) return res.status(400).json({ error: "uid required" });
      await kv.del(KEY(uid));
      return res.status(200).json({ ok: true, uid });
    }

    return res.status(400).json({ error: "Unknown action or method" });
  } catch (err) {
    console.error("[agenda.js]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
