"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function download(name: string, type: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function ActionButton({ children, kind = "primary" }: { children: React.ReactNode; kind?: "primary" | "secondary" }) {
  const [done, setDone] = useState(false);
  const router = useRouter();
  const text = typeof children === "string" ? children : "";
  async function act() {
    if (/add documents|upload documents/i.test(text)) { router.push("/documents"); return; }
    if (/copy inbox/i.test(text)) await navigator.clipboard.writeText("malhotras@inbox.nivesh.app");
    else if (/save (today.s )?snapshot/i.test(text)) {
      const response = await fetch("/api/demo-records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page: "Snapshots & net worth", name: "Current net worth", asAt: new Date().toISOString(), assets: 381400000, liabilities: 51900000, netWorth: 329500000 }) });
      if (!response.ok) return;
    }
    else if (text.includes(".ics")) download("nivesh-obligations.ics", "text/calendar", "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260915\r\nSUMMARY:Advance tax Q2 - INR 1.12 Cr\r\nEND:VEVENT\r\nEND:VCALENDAR");
    else if (text.includes("Export PDF / Excel")) download("balance-sheet.csv", "text/csv", "Type,Item,Entity,Cost,Fair Value\nAsset,HDFC Savings,Rajiv,4280900,4280900");
    else {
      const response = await fetch("/api/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: text || "UI action", path: window.location.pathname }) });
      if (!response.ok) return;
    }
    setDone(true);
    setTimeout(() => setDone(false), 1200);
  }
  return <button className={`action ${kind}`} onClick={act}>{done ? "Completed" : children}</button>;
}

export function Toggle({ initial = true }: { initial?: boolean }) {
  const [on, setOn] = useState(initial);
  return <button type="button" aria-label="Toggle" className={on ? "toggle on" : "toggle"} onClick={() => setOn(!on)}><i /></button>;
}

const addablePages = new Set(["Balance sheet", "Review queue", "Refresh worklist", "Tax observations", "Alerts & obligations", "90-day cash forecast", "Snapshots & net worth", "Client families"]);

export function PageHeader({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: React.ReactNode }) {
  const [mode, setMode] = useState<"add" | "manage" | null>(null);
  const [status, setStatus] = useState("");
  const financial = /sheet|review|refresh/i.test(title);
  const obligation = /obligation|forecast/i.test(title);
  const tax = /tax/i.test(title);
  const snapshot = /snapshot/i.test(title);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving...");
    const form = new FormData(event.currentTarget);
    const payload = {
      page: title, name: String(form.get("name") || ""), entity: String(form.get("entity") || "Rajiv Malhotra"),
      asAt: String(form.get("asAt") || ""), notes: String(form.get("notes") || ""), amount: Number(form.get("amount") || 0),
      costAmount: Number(form.get("costAmount") || 0), category: Number(form.get("category") || 1), basis: String(form.get("basis") || "declared"),
      confidence: Number(form.get("confidence") || 100), severity: String(form.get("severity") || "watch"),
      ruleCited: String(form.get("ruleCited") || "MANUAL-1"), assets: Number(form.get("assets") || 0),
      liabilities: Number(form.get("liabilities") || 0), netWorth: Number(form.get("netWorth") || 0),
    };
    const response = await fetch("/api/demo-records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) return setStatus(data.error || "Record could not be added");
    setStatus("Record added successfully. It is now available in this page's record list.");
    setTimeout(() => { setMode(null); setStatus(""); }, 1200);
  }

  return <>
    <div className="page-head"><div><small>{eyebrow}</small><h1>{title}</h1><p>{description}</p></div><div className="head-actions">{children}<button className="action secondary" onClick={() => setMode("manage")}>Manage</button>{addablePages.has(title) && <button className="action" onClick={() => setMode("add")}>+ Add</button>}</div></div>
    {mode && <div className="demo-modal-wrap" onMouseDown={(event) => { if (event.target === event.currentTarget) setMode(null); }}><section className="demo-modal">
      <header><div><small>{mode === "add" ? "NEW RECORD" : "PAGE SETTINGS"}</small><h2>{mode === "add" ? `Add to ${title}` : `Manage ${title}`}</h2></div><button onClick={() => setMode(null)}>x</button></header>
      {mode === "add" ? <form onSubmit={save}>
        <label>Name / title<input name="name" required /></label>
        <div className="form-grid"><label>Entity<select name="entity"><option>Rajiv Malhotra</option><option>Anjali Malhotra</option><option>Malhotra HUF</option><option>MV Pvt Ltd</option></select></label><label>{obligation ? "Due date" : "As-at date"}<input name="asAt" type="date" required defaultValue="2026-08-10" /></label></div>
        {(financial || obligation || tax) && <div className="form-grid"><label>Amount (INR)<input name="amount" type="number" min="0" required /></label><label>Documented cost (INR)<input name="costAmount" type="number" min="0" /></label></div>}
        {financial && <><div className="form-grid"><label>Category<select name="category">{Array.from({ length: 12 }, (_, index) => <option value={index + 1} key={index}>Category {index + 1}</option>)}</select></label><label>Basis<select name="basis"><option value="cost">Cost</option><option value="fair_value">Fair value</option><option value="declared">Declared</option></select></label></div><label>Confidence %<input name="confidence" type="number" min="0" max="100" defaultValue="100" /></label></>}
        {tax && <div className="form-grid"><label>Severity<select name="severity"><option>compliance</option><option>opportunity</option><option>watch</option></select></label><label>Rule cited<input name="ruleCited" required defaultValue="MANUAL-1" /></label></div>}
        {snapshot && <div className="form-grid"><label>Assets<input name="assets" type="number" /></label><label>Liabilities<input name="liabilities" type="number" /></label><label>Net worth<input name="netWorth" type="number" /></label></div>}
        <label>Notes<textarea name="notes" /></label>{status && <div className="form-note">{status}</div>}
        <footer><button type="button" className="action secondary" onClick={() => setMode(null)}>Cancel</button><button className="action">Add record</button></footer>
      </form> : <div className="manage-list"><label><span>Show source references</span><Toggle /></label><label><span>Show freshness labels</span><Toggle /></label><label><span>Compact rows</span><Toggle initial={false} /></label><footer><button className="action" onClick={() => setMode(null)}>Apply</button></footer></div>}
    </section></div>}
  </>;
}

export function Badge({ children, tone = "blue" }: { children: React.ReactNode; tone?: string }) { return <span className={`badge ${tone}`}>{children}</span>; }
export function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone?: string }) { return <div className={`metric ${tone || ""}`}><small>{label}</small><b>{value}</b><span>{note}</span></div>; }
export function Notice({ title, children, tone = "blue" }: { title: string; children: React.ReactNode; tone?: string }) { return <div className={`notice ${tone}`}><i>{tone === "red" ? "!" : "i"}</i><p><b>{title}</b><span>{children}</span></p></div>; }
