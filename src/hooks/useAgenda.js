import { useState, useEffect, useCallback, useRef } from "react";

function getOrCreateUID() {
  let uid = localStorage.getItem("scce_uid");
  if (!uid) { uid = crypto.randomUUID(); localStorage.setItem("scce_uid", uid); }
  return uid;
}

// Single source of truth for the user's agenda selections.
// Instantiate ONCE in App.jsx and pass the returned object down to
// PlannerTab, MyAgendaTab, etc. so they all read/write the same state.
export function useAgenda() {
  const UID = useRef(getOrCreateUID()).current;
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [syncMsg, setSyncMsg]   = useState("");
  const [syncType, setSyncType] = useState(""); // "ok" | "err" | "busy"
  const [loaded, setLoaded]     = useState(false);
  const saveTimer = useRef(null);

  function setSync(msg, type, autoClear = true) {
    setSyncMsg(msg); setSyncType(type);
    if (autoClear && type !== "busy") {
      setTimeout(() => { setSyncMsg(""); setSyncType(""); }, 3000);
    }
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
      setSync("✓ Saved", "ok");
    } catch {
      setSync("⚠ Saved locally only", "err");
    }
  }, [UID]);

  function debouncedSave(ids) {
    clearTimeout(saveTimer.current);
    setSync("Saving…", "busy", false);
    saveTimer.current = setTimeout(() => saveToServer(ids), 800);
  }

  // Initial load from server (once, on mount)
  useEffect(() => {
    async function load() {
      setSync("Loading…", "busy", false);
      try {
        const r = await fetch(`/api/agenda?action=load&uid=${UID}`);
        if (!r.ok) throw new Error(r.status);
        const data = await r.json();
        setSelectedIds(new Set(data.selections || []));
        setSync("✓ Loaded", "ok");
      } catch {
        setSync("⚠ Offline — showing cached picks", "err");
        const cache = localStorage.getItem("scce_cache");
        if (cache) setSelectedIds(new Set(JSON.parse(cache)));
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, [UID]);

  function select(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      debouncedSave(next);
      return next;
    });
  }

  function deselect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      debouncedSave(next);
      return next;
    });
  }

  function toggle(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      debouncedSave(next);
      return next;
    });
  }

  async function clearAll() {
    setSelectedIds(new Set());
    localStorage.removeItem("scce_cache");
    try {
      await fetch(`/api/agenda?action=clear&uid=${UID}`, { method: "DELETE" });
      setSync("✓ Cleared", "ok");
    } catch {
      setSync("Cleared locally", "err");
    }
  }

  function copyUID() {
    navigator.clipboard.writeText(UID);
    setSync("Copied!", "ok");
  }

  return {
    UID, selectedIds, syncMsg, syncType, loaded,
    select, deselect, toggle, clearAll, copyUID,
  };
}
