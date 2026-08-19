"use client";

/* eslint-disable react-hooks/set-state-in-effect -- initial authenticated database fetch */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Notice } from "./ui";

type DocumentRow = { _id: string; filename: string; source?: string; status?: string; size?: number; documentType?: string; aiSummary?: string; createdAt?: string };
const NETLIFY_UPLOAD_LIMIT = 4 * 1024 * 1024;

async function responseBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text) as Record<string, unknown>; } catch { return { error: text.startsWith("<") ? "The production server ended document processing unexpectedly." : text }; }
}

export function DocumentsWorkspace({ compactButton = false, sourceFilter, processingOnly = false }: { compactButton?: boolean; sourceFilter?: "upload" | "email"; processingOnly?: boolean }) {
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
    const hostedOnNetlify = location.hostname.endsWith("netlify.app") || location.hostname === "nivesh-balance-sheets.netlify.app";
    if (hostedOnNetlify && file.size > NETLIFY_UPLOAD_LIMIT) {
      setMessage(`This file is ${(file.size / 1048576).toFixed(1)} MB. Netlify accepts financial uploads up to 4 MB. Compress or split the document and upload each part.`);
      if (input.current) input.current.value = "";
      return;
    }
    setUploading(true); setMessage(`Uploading and reading ${file.name}...`);
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/documents/upload", { method: "POST", body: form });
      const data = await responseBody(response);
      const productionFailure = response.status === 502 ? "Production processing exceeded the hosting limit. Try an XLSX file or split/compress the PDF into smaller parts." : "Upload failed";
      setMessage(response.ok ? `Uploaded successfully. AI extracted ${Array.isArray(data.transactions) ? data.transactions.length : 0} transaction(s); ${Array.isArray(data.unmapped_transactions) ? data.unmapped_transactions.length : 0} need review. Reconciled: ${(data.validation as Record<string, unknown> | undefined)?.reconciled ? "yes" : "no"}.` : String(data.error || productionFailure));
    } catch {
      setMessage("The production server could not complete this upload. Check your connection, then retry with a file under 4 MB.");
    } finally {
      setUploading(false); await load();
      if (input.current) input.current.value = "";
    }
  }

  const filtered = useMemo(() => documents.filter((document) => (!sourceFilter || document.source === sourceFilter) && (!processingOnly || ["queued", "processing", "needs_confirmation", "failed"].includes(String(document.status))) && (status === "all" || document.status === status) && `${document.filename} ${document.documentType || ""} ${document.aiSummary || ""}`.toLowerCase().includes(search.toLowerCase())), [documents, processingOnly, search, sourceFilter, status]);
  const button = <><input ref={input} hidden type="file" accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx" onChange={(event) => upload(event.target.files?.[0])} /><button className="action" disabled={uploading} onClick={() => input.current?.click()}>{uploading ? "Reading document..." : "+ Upload financial document"}</button></>;
  if (compactButton) return button;
  return <>{button}{message && <Notice tone={message.includes("successfully") ? "blue" : "amber"} title="Document processing">{message}</Notice>}<div className="toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search filename, type or AI summary..."/><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="processing">Processing</option><option value="clean">Clean</option><option value="needs_confirmation">Needs confirmation</option><option value="failed">Failed</option></select></div><section className="card"><header className="card-head"><div><h2>Uploaded source documents</h2><span>{filtered.length} of {documents.length} shown</span></div></header><div className="table-wrap"><table><thead><tr>{["Document", "Type", "Source", "Size", "Status", "Uploaded"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{filtered.map((document) => <tr key={document._id}><td><div className="primary-cell"><b>{document.filename}</b><a>{document.aiSummary || "Awaiting AI summary"}</a></div></td><td>{document.documentType || "Financial document"}</td><td>{document.source || "upload"}</td><td>{Math.max(1, Math.round(Number(document.size || 0) / 1024))} KB</td><td><Badge tone={document.status === "failed" ? "red" : document.status === "clean" ? "green" : "amber"}>{String(document.status || "queued").replaceAll("_", " ")}</Badge></td><td>{document.createdAt ? new Date(document.createdAt).toLocaleString("en-IN") : "-"}</td></tr>)}</tbody></table></div></section></>;
}
