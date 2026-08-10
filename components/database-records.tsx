"use client";

/* eslint-disable react-hooks/set-state-in-effect -- authenticated fetch after hydration */
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const pages: Record<string, { page: string; label: string }> = {
  "/balance-sheet": { page: "Balance sheet", label: "Balance sheet entries" },
  "/documents": { page: "Documents", label: "Source documents" },
  "/inbox": { page: "Email inbox", label: "Inbox documents" },
  "/processing": { page: "AI processing", label: "Processing documents" },
  "/review": { page: "Review queue", label: "Review entries" },
  "/refresh": { page: "Refresh worklist", label: "Refresh entries" },
  "/tax": { page: "Tax observations", label: "Tax observations" },
  "/obligations": { page: "Alerts & obligations", label: "Obligations" },
  "/forecast": { page: "90-day cash forecast", label: "Forecast obligations" },
  "/snapshots": { page: "Snapshots & net worth", label: "Saved snapshots" },
  "/families": { page: "Client families", label: "Client families" },
};

function recordName(row: Record<string, unknown>) {
  return String(row.name || row.title || row.filename || "Untitled record");
}

function recordDetail(row: Record<string, unknown>) {
  if (row.amount !== undefined) return `INR ${Number(row.amount).toLocaleString("en-IN")}`;
  if (row.netWorth !== undefined) return `Net worth: INR ${Number(row.netWorth).toLocaleString("en-IN")}`;
  return String(row.status || row.freshnessState || "Saved");
}

export function DatabaseRecords() {
  const config = pages[usePathname()];
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!config) return;
    const response = await fetch(`/api/demo-records?page=${encodeURIComponent(config.page)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not load records");
      return;
    }
    setError("");
    setRows(data);
  }, [config]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 2500);
    return () => clearInterval(timer);
  }, [load]);

  if (!config) return null;
  return <aside className="db-records">
    <button onClick={() => setOpen(!open)}>{config.label} <b>{rows.length}</b></button>
    {open && <div>
      <header><strong>{config.label}</strong><button aria-label="Close" onClick={() => setOpen(false)}>x</button></header>
      {error ? <p>{error}</p> : rows.length === 0 ? <p>No {config.label.toLowerCase()} have been added yet.</p> : rows.map((row, index) => <article key={String(row._id || index)}>
        <b>{recordName(row)}</b><span>{recordDetail(row)}</span>
        <small>{row.asAtDate ? new Date(String(row.asAtDate)).toLocaleDateString("en-IN") : row.createdAt ? new Date(String(row.createdAt)).toLocaleString("en-IN") : ""}</small>
      </article>)}
    </div>}
  </aside>;
}
