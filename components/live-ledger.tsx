"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Metric, Notice, PageHeader } from "./ui";

type Row = Record<string, unknown>;
type Accounting = { entities: Row[]; transactions: Row[] };

const money = (value: unknown) => Number(value || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const date = (value: unknown) => value ? new Date(String(value)).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

export function LiveLedger({ canReview }: { canReview: boolean }) {
  const [data, setData] = useState<Accounting | null>(null);
  const [error, setError] = useState("");
  const [entity, setEntity] = useState("all");
  const [section, setSection] = useState("all");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const response = await fetch("/api/accounting", { cache: "no-store" });
      const body = await response.json();
      if (cancelled) return;
      if (!response.ok) setError(body.error || "Ledger unavailable");
      else setData(body);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const base = data?.transactions || [];
    return base.filter(row => (entity === "all" || String(row.entityId) === entity) && (section === "all" || String(row.personalSection) === section));
  }, [data, entity, section]);

  if (error) return <Notice tone="red" title="Ledger unavailable">{error}</Notice>;
  if (!data) return <p className="loading-state">Loading transaction ledger...</p>;

  const expenses = rows.filter(row => row.personalSection === "EXPENSE" && row.direction === "DEBIT");
  const income = rows.filter(row => row.personalSection === "INCOME" && row.direction === "CREDIT");
  const transfers = rows.filter(row => row.personalSection === "TRANSFER");
  const review = rows.filter(row => row.mappingStatus === "REVIEW_REQUIRED");
  const expenseTotal = expenses.reduce((sum, row) => sum + Number(row.amount), 0);
  const incomeTotal = income.reduce((sum, row) => sum + Number(row.amount), 0);
  const breakdown = Object.entries(expenses.reduce<Record<string, number>>((acc, row) => {
    const key = String(row.personalHeadName || "Other expense");
    acc[key] = (acc[key] || 0) + Number(row.amount);
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);

  async function markMapped(row: Row) {
    if (!canReview) return;
    const response = await fetch(`/api/resources/transactions/${String(row._id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mappingStatus: "MAPPED" })
    });
    if (response.ok) {
      const body = await fetch("/api/accounting", { cache: "no-store" }).then(res => res.json());
      setData(body);
    }
  }

  return <>
    <PageHeader eyebrow="BANK STATEMENT LEDGER" title="Ledger & expenses" description="Every bank-statement row is classified separately. The balance sheet uses closing balances; this page explains the movement.">
      <a className="action secondary" href="/documents">Upload statement</a>
    </PageHeader>
    <div className="entity-tabs">
      <button className={entity === "all" ? "active" : ""} onClick={() => setEntity("all")}>Everything</button>
      {data.entities.map(item => <button className={entity === String(item._id) ? "active" : ""} onClick={() => setEntity(String(item._id))} key={String(item._id)}>{String(item.name)}</button>)}
    </div>
    <div className="sheet-tabs">
      {["all", "EXPENSE", "INCOME", "TRANSFER", "REVIEW"].map(item => <button key={item} className={section === item ? "active" : ""} onClick={() => setSection(item)}>{item === "all" ? "All transactions" : item.replace("_", " ")}</button>)}
    </div>
    <div className="metrics four">
      <Metric label="EXPENSES" value={money(expenseTotal)} note={`${expenses.length} debit rows`} tone="red"/>
      <Metric label="INCOME" value={money(incomeTotal)} note={`${income.length} credit rows`} tone="green"/>
      <Metric label="TRANSFERS" value={String(transfers.length)} note="Excluded from expense"/>
      <Metric label="NEEDS REVIEW" value={String(review.length)} note="Low confidence / unclear" tone={review.length ? "amber" : undefined}/>
    </div>
    <section className="card">
      <header className="card-head"><div><h2>Expense breakdown</h2><span>Food, shopping, travel and other personal heads from bank narration</span></div></header>
      <div className="allocation ledger-allocation">
        {breakdown.length ? breakdown.map(([name, value]) => {
          const pct = expenseTotal ? value / expenseTotal * 100 : 0;
          return <div key={name}><span>{name}</span><i><b style={{ width: `${pct}%` }}/></i><em>{pct.toFixed(0)}%</em><strong>{money(value)}</strong></div>;
        }) : <p className="empty-state">No expense rows available yet.</p>}
      </div>
    </section>
    <section className="card">
      <header className="card-head"><div><h2>Transaction rows</h2><span>{rows.length} stored rows, not aggregated closing balance</span></div></header>
      <div className="table-wrap"><table>
        <thead><tr><th>Date</th><th>Narration</th><th>Direction</th><th>Personal head</th><th>Balance-sheet effect</th><th className="rt">Amount</th><th>Status</th><th>Source</th><th></th></tr></thead>
        <tbody>{rows.map(row => {
          const source = row.source as Row | undefined;
          return <tr key={String(row._id)}>
            <td>{date(row.transactionDate)}</td>
            <td><div className="primary-cell"><b>{String(row.counterparty || row.transactionType || "Transaction")}</b><a>{String(row.originalNarration)}</a></div></td>
            <td><Badge tone={row.direction === "DEBIT" ? "red" : "green"}>{String(row.direction)}</Badge></td>
            <td>{String(row.personalHeadName)}<br/><small>{String(row.personalSection)}</small></td>
            <td>{String(row.targetHeadName || "Review")} · {String(row.postingEffect).toLowerCase()}</td>
            <td className="rt"><strong>{money(row.amount)}</strong></td>
            <td><Badge tone={row.mappingStatus === "MAPPED" ? "green" : "amber"}>{String(row.mappingStatus).replace("_", " ")}</Badge></td>
            <td>{source ? <a href={`/api/documents/${String(row.sourceDocumentId)}/content`} target="_blank" rel="noreferrer">{String(source.filename)}</a> : String(row.sourceLocation)}</td>
            <td>{row.mappingStatus === "REVIEW_REQUIRED" && canReview ? <button className="action secondary" onClick={() => markMapped(row)}>Accept</button> : null}</td>
          </tr>;
        })}</tbody>
      </table></div>
    </section>
  </>;
}
