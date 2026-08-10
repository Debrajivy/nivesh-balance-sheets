"use client";

/* eslint-disable react-hooks/set-state-in-effect -- initial authenticated database fetch */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Notice } from "./ui";

type DocumentRow = { _id: string; filename: string; source?: string; status?: string; size?: number; documentType?: string; aiSummary?: string; createdAt?: string };

export function DocumentsWorkspace({ compactButton = false }: { compactButton?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/resources/documents", { cache: "no-store" });
    if (response.ok) setDocuments(await response.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true); setMessage(`Uploading and reading ${file.name}...`);
    const form = new FormData(); form.append("file", file);
    const response = await fetch("/api/documents/upload", { method: "POST", body: form });
    const data = await response.json();
    setMessage(response.ok ? `Uploaded successfully. AI extracted ${data.extractedItems} accounting item(s). Review them before acceptance.` : data.error || "Upload failed");
    setUploading(false); await load();
    if (input.current) input.current.value = "";
  }

  const filtered = useMemo(() => documents.filter((document) => (status === "all" || document.status === status) && `${document.filename} ${document.documentType || ""} ${document.aiSummary || ""}`.toLowerCase().includes(search.toLowerCase())), [documents, search, status]);
  const button = <><input ref={input} hidden type="file" accept=".pdf,.png,.jpg,.jpeg,.csv,.xls,.xlsx" onChange={(event) => upload(event.target.files?.[0])} /><button className="action" disabled={uploading} onClick={() => input.current?.click()}>{uploading ? "Reading document..." : "+ Upload bank document"}</button></>;
  if (compactButton) return button;
  return <>{button}{message && <Notice tone={message.includes("successfully") ? "blue" : "amber"} title="Document processing">{message}</Notice>}<div className="toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search filename, type or AI summary..."/><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="processing">Processing</option><option value="clean">Clean</option><option value="needs_confirmation">Needs confirmation</option><option value="failed">Failed</option></select></div><section className="card"><header className="card-head"><div><h2>Uploaded source documents</h2><span>{filtered.length} of {documents.length} shown</span></div></header><div className="table-wrap"><table><thead><tr>{["Document", "Type", "Source", "Size", "Status", "Uploaded"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{filtered.map((document) => <tr key={document._id}><td><div className="primary-cell"><b>{document.filename}</b><a>{document.aiSummary || "Awaiting AI summary"}</a></div></td><td>{document.documentType || "Financial document"}</td><td>{document.source || "upload"}</td><td>{Math.max(1, Math.round(Number(document.size || 0) / 1024))} KB</td><td><Badge tone={document.status === "failed" ? "red" : document.status === "clean" ? "green" : "amber"}>{String(document.status || "queued").replaceAll("_", " ")}</Badge></td><td>{document.createdAt ? new Date(document.createdAt).toLocaleString("en-IN") : "-"}</td></tr>)}</tbody></table></div></section></>;
}
