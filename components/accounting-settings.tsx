"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Notice } from "./ui";
import { PRD_ACCOUNT_HEADS } from "@/lib/financial-document";

type Row = Record<string, unknown>;
type RuleSetPayload = { version: string; effectiveDate: string; rules: unknown };

const entityTypes = ["individual", "huf", "company", "trust"];
const freshnessLabels = Object.fromEntries(Object.entries(PRD_ACCOUNT_HEADS).map(([id, head]) => [`category_${id}`, `${id}. ${head.name}`])) as Record<string, string>;

function asText(value: unknown) {
  return value == null ? "" : String(value);
}

function asDateInput(value: unknown) {
  const text = asText(value);
  return text ? new Date(text).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

async function readJson(response: Response) {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body;
}

export function EntityWorkspace({ canEdit }: { canEdit: boolean }) {
  const [entities, setEntities] = useState<Row[]>([]);
  const [status, setStatus] = useState("");

  async function load() {
    setEntities(await readJson(await fetch("/api/resources/entities")));
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const rows = await readJson(await fetch("/api/resources/entities"));
        if (!cancelled) setEntities(rows);
      } catch (error) {
        if (!cancelled) setStatus(error instanceof Error ? error.message : "Could not load entities");
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const type = asText(form.get("type"));
    const payload = {
      name: asText(form.get("name")).trim(),
      type,
      taxId: asText(form.get("taxId")).trim(),
      excludeFromConsolidation: form.get("excludeFromConsolidation") === "on" || type === "company"
    };
    setStatus("Saving entity...");
    await readJson(await fetch("/api/resources/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }));
    event.currentTarget.reset();
    await load();
    setStatus("Entity saved in MongoDB.");
  }

  async function update(id: unknown, patch: Row) {
    setStatus("Updating entity...");
    await readJson(await fetch(`/api/resources/entities/${asText(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    }));
    await load();
    setStatus("Entity updated.");
  }

  return <div className="settings-stack">
    <section className="card">
      <header className="card-head"><div><h2>Legal owners / entities</h2><span>Individual, HUF, company or trust. Companies can be excluded from consolidated totals.</span></div></header>
      <div className="table-wrap"><table>
        <thead><tr><th>Name</th><th>Type</th><th>Tax ID / PAN</th><th>Consolidation</th><th>Action</th></tr></thead>
        <tbody>{entities.map(entity => <tr key={asText(entity._id)}>
          <td><b>{asText(entity.name)}</b></td>
          <td><Badge>{asText(entity.type)}</Badge></td>
          <td>{asText(entity.taxId) || "Not entered"}</td>
          <td>{entity.excludeFromConsolidation ? <Badge tone="amber">Excluded</Badge> : <Badge tone="green">Included</Badge>}</td>
          <td>{canEdit ? <button className="action secondary" onClick={() => update(entity._id, { excludeFromConsolidation: !entity.excludeFromConsolidation })}>Toggle</button> : "View only"}</td>
        </tr>)}</tbody>
      </table></div>
    </section>
    {canEdit && <section className="card">
      <header className="card-head"><div><h2>Add entity</h2><span>Required before owner-specific assets, liabilities, obligations or foreign holdings.</span></div></header>
      <form className="settings-form" onSubmit={save}>
        <label>Entity name<input name="name" required placeholder="e.g. Debraj, Family HUF, Pvt Ltd"/></label>
        <div className="form-grid">
          <label>Entity type<select name="type" required>{entityTypes.map(type => <option key={type}>{type}</option>)}</select></label>
          <label>Tax ID / PAN<input name="taxId" placeholder="PAN, TAN or internal reference"/></label>
        </div>
        <label className="check-row"><input name="excludeFromConsolidation" type="checkbox"/> Exclude from consolidated balance sheet</label>
        <button className="action">Save entity</button>
      </form>
    </section>}
    {status && <Notice title="Entities">{status}</Notice>}
  </div>;
}

export function DeliveryRulesWorkspace({ canEdit }: { canEdit: boolean }) {
  const [delivery, setDelivery] = useState<RuleSetPayload | null>(null);
  const [freshness, setFreshness] = useState<RuleSetPayload | null>(null);
  const [tax, setTax] = useState<RuleSetPayload | null>(null);
  const [status, setStatus] = useState("");

  async function load() {
    const [deliveryRules, freshnessRules, taxRules] = await Promise.all([
      readJson(await fetch("/api/rules/delivery")),
      readJson(await fetch("/api/rules/freshness")),
      readJson(await fetch("/api/rules/tax"))
    ]);
    setDelivery(deliveryRules);
    setFreshness(freshnessRules);
    setTax(taxRules);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const [deliveryRules, freshnessRules, taxRules] = await Promise.all([
          readJson(await fetch("/api/rules/delivery")),
          readJson(await fetch("/api/rules/freshness")),
          readJson(await fetch("/api/rules/tax"))
        ]);
        if (!cancelled) {
          setDelivery(deliveryRules);
          setFreshness(freshnessRules);
          setTax(taxRules);
        }
      } catch (error) {
        if (!cancelled) setStatus(error instanceof Error ? error.message : "Could not load rules");
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const deliveryRules = (delivery?.rules || {}) as Row;
  const channels = (deliveryRules.channels || {}) as Row;
  const leadTimes = (deliveryRules.leadTimes || {}) as Row;
  const freshnessRules = (freshness?.rules || {}) as Row;
  const taxRows = useMemo(() => Array.isArray(tax?.rules) ? tax?.rules as Row[] : [], [tax]);

  async function saveRules(kind: string, payload: RuleSetPayload) {
    setStatus(`Saving ${kind} rules...`);
    await readJson(await fetch(`/api/rules/${kind}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }));
    await load();
    setStatus(`${kind} rules saved to MongoDB.`);
  }

  async function saveDelivery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await saveRules("delivery", {
      version: asText(form.get("version")),
      effectiveDate: asText(form.get("effectiveDate")),
      rules: {
        channels: {
          email: form.get("email") === "on",
          webPush: form.get("webPush") === "on",
          calendarIcs: form.get("calendarIcs") === "on",
          inApp: true
        },
        leadTimes: {
          statutory: asText(form.get("statutory")),
          insurance: asText(form.get("insurance")),
          debt: asText(form.get("debt")),
          investment: asText(form.get("investment")),
          dues: asText(form.get("dues"))
        },
        escalateAfterHours: Number(form.get("escalateAfterHours") || 48)
      }
    });
  }

  async function saveFreshness(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rules = Object.fromEntries(Object.keys(freshnessLabels).map(key => [key, Number(form.get(key) || 30)]));
    await saveRules("freshness", { version: asText(form.get("version")), effectiveDate: asText(form.get("effectiveDate")), rules });
  }

  async function saveTax(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rules = taxRows.map((_, index) => ({
      id: asText(form.get(`id-${index}`)),
      title: asText(form.get(`title-${index}`)),
      severity: asText(form.get(`severity-${index}`)),
      enabled: form.get(`enabled-${index}`) === "on"
    }));
    await saveRules("tax", { version: asText(form.get("version")), effectiveDate: asText(form.get("effectiveDate")), rules });
  }

  if (!delivery || !freshness || !tax) return <p className="loading-state">Loading rules from MongoDB...</p>;

  return <div className="settings-stack">
    <section className="card">
      <header className="card-head"><div><h2>Alert channels and lead times</h2><span>Email, installed web push, calendar invite and in-app delivery.</span></div></header>
      <form className="settings-form" onSubmit={saveDelivery}>
        <div className="form-grid">
          <label>Version<input name="version" defaultValue={delivery.version} readOnly={!canEdit}/></label>
          <label>Effective date<input name="effectiveDate" type="date" defaultValue={asDateInput(delivery.effectiveDate)} readOnly={!canEdit}/></label>
        </div>
        <div className="channel-grid">
          {["email", "webPush", "calendarIcs"].map(key => <label className="check-row" key={key}><input name={key} type="checkbox" defaultChecked={Boolean(channels[key])} disabled={!canEdit}/> {key === "calendarIcs" ? "Calendar .ics" : key === "webPush" ? "Web push" : "Email"}</label>)}
          <label className="check-row"><input checked readOnly type="checkbox"/> In-app</label>
        </div>
        <div className="form-grid">
          <label>Statutory days<input name="statutory" defaultValue={asText(leadTimes.statutory)} readOnly={!canEdit}/></label>
          <label>Insurance days<input name="insurance" defaultValue={asText(leadTimes.insurance)} readOnly={!canEdit}/></label>
          <label>Debt / EMI days<input name="debt" defaultValue={asText(leadTimes.debt)} readOnly={!canEdit}/></label>
          <label>Investment days<input name="investment" defaultValue={asText(leadTimes.investment)} readOnly={!canEdit}/></label>
          <label>Dues days<input name="dues" defaultValue={asText(leadTimes.dues)} readOnly={!canEdit}/></label>
          <label>Escalate after hours<input name="escalateAfterHours" type="number" min="1" defaultValue={Number(deliveryRules.escalateAfterHours || 48)} readOnly={!canEdit}/></label>
        </div>
        {canEdit && <button className="action">Save delivery rules</button>}
      </form>
      <Notice title="iPhone install check">Web push is only shown as usable for an installed PWA. In a Safari tab, users see Add to Home Screen guidance.</Notice>
    </section>
    <section className="card">
      <header className="card-head"><div><h2>Freshness thresholds</h2><span>Controls when a line becomes ageing or stale in the refresh worklist.</span></div></header>
      <form className="settings-form" onSubmit={saveFreshness}>
        <div className="form-grid">
          <label>Version<input name="version" defaultValue={freshness.version} readOnly={!canEdit}/></label>
          <label>Effective date<input name="effectiveDate" type="date" defaultValue={asDateInput(freshness.effectiveDate)} readOnly={!canEdit}/></label>
        </div>
        <div className="rules-grid">{Object.entries(freshnessLabels).map(([key, label]) => <label key={key}>{label}<input name={key} type="number" min="1" defaultValue={Number(freshnessRules[key] || 30)} readOnly={!canEdit}/></label>)}</div>
        {canEdit && <button className="action">Save freshness rules</button>}
      </form>
    </section>
    <section className="card">
      <header className="card-head"><div><h2>Dated tax rules table</h2><span>Editable without code changes; observations cite these versions.</span></div></header>
      <form className="settings-form" onSubmit={saveTax}>
        <div className="form-grid">
          <label>Version<input name="version" defaultValue={tax.version} readOnly={!canEdit}/></label>
          <label>Effective date<input name="effectiveDate" type="date" defaultValue={asDateInput(tax.effectiveDate)} readOnly={!canEdit}/></label>
        </div>
        <div className="table-wrap"><table>
          <thead><tr><th>ID</th><th>Title</th><th>Severity</th><th>Enabled</th></tr></thead>
          <tbody>{taxRows.map((rule, index) => <tr key={`${asText(rule.id)}-${index}`}>
            <td><input name={`id-${index}`} defaultValue={asText(rule.id)} readOnly={!canEdit}/></td>
            <td><input name={`title-${index}`} defaultValue={asText(rule.title)} readOnly={!canEdit}/></td>
            <td><select name={`severity-${index}`} defaultValue={asText(rule.severity)} disabled={!canEdit}><option>compliance</option><option>opportunity</option><option>watch</option></select></td>
            <td><input name={`enabled-${index}`} type="checkbox" defaultChecked={Boolean(rule.enabled)} disabled={!canEdit}/></td>
          </tr>)}</tbody>
        </table></div>
        {canEdit && <button className="action">Save tax rules</button>}
      </form>
    </section>
    {status && <Notice title="Settings">{status}</Notice>}
  </div>;
}
