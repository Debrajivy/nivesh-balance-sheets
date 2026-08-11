import { NextResponse } from "next/server";
import { connectDB } from "@/lib/server/db";
import { requireCapability } from "@/lib/server/auth";
import { AccessLog, Document, Entity, LineItem, Obligation } from "@/lib/server/models";

export const runtime = "nodejs";
const allowed = new Set(["application/pdf", "image/png", "image/jpeg", "text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);

type ExtractedItem = { name?: string; amount?: number; category?: number; basis?: "cost" | "fair_value" | "declared"; confidence?: number; asAtDate?: string; sourceLocation?: string };
type ExtractedObligation={title?:string;amount?:number;dueDate?:string;category?:string;consequence?:string;sourceLocation?:string};
type Extraction = { documentType?: string; summary?: string; entityName?: string; accountNumberMasked?: string; statementFrom?: string; statementTo?: string; lineItems?: ExtractedItem[]; obligations?:ExtractedObligation[] };

function outputText(response: Record<string, unknown>) {
  const direct = response.output_text;
  if (typeof direct === "string") return direct;
  const output = Array.isArray(response.output) ? response.output : [];
  return output.flatMap((item) => typeof item === "object" && item && Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: Array<{ text?: string }> }).content.map((content) => content.text || "") : []).join("");
}

async function extract(file: File, base64: string): Promise<Extraction> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      input: [{ role: "user", content: [
        { type: "input_file", filename: file.name, file_data: `data:${file.type};base64,${base64}`, detail: file.type === "application/pdf" ? "high" : undefined },
        { type: "input_text", text: "Read this Indian financial document accurately. Return ONLY valid JSON with keys: documentType, summary, entityName, accountNumberMasked, statementFrom, statementTo, lineItems, obligations. Each line item must contain name, amount as an absolute INR number, category integer 1-12, basis cost|fair_value|declared, confidence 0-100, asAtDate ISO date, and sourceLocation with page/table/row. Include uncertain visible values with a lower confidence so a human can review them; never invent a value. Each obligation must contain title, amount, dueDate ISO date, category, consequence, and exact sourceLocation. Only include dates and flows explicitly supported by the document." },
      ] }],
      text: { format: { type: "json_object" } },
    }),
  });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof data.error === "object" && data.error ? String((data.error as { message?: unknown }).message || "OpenAI processing failed") : "OpenAI processing failed");
  return JSON.parse(outputText(data)) as Extraction;
}

export async function POST(request: Request) {
  try {
    const { membership, user, familyId } = await requireCapability("upload");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a document to upload" }, { status: 400 });
    if (!allowed.has(file.type)) return NextResponse.json({ error: "Upload a PDF, PNG, JPG, CSV, XLS, or XLSX file" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File size must not exceed 10 MB" }, { status: 400 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "AI document processing is not configured. Add OPENAI_API_KEY to .env.local and restart the server." }, { status: 503 });
    await connectDB();
    if (!familyId) return NextResponse.json({ error: "No client family is assigned" }, { status: 400 });
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const document = await Document.create({ familyOfficeId: membership.familyOfficeId, familyId, filename: file.name, mimeType: file.type, size: file.size, source: "upload", status: "processing", contentBase64: base64, uploadedBy: user._id });
    try {
      const result = await extract(file, base64);
      const entityName = result.entityName || String(form.get("entity") || "Rajiv Malhotra");
      let entity = await Entity.findOne({ familyOfficeId: membership.familyOfficeId, familyId, name: entityName });
      if (!entity) entity = await Entity.create({ familyOfficeId: membership.familyOfficeId, familyId, name: entityName, type: "individual", excludeFromConsolidation: false });
      const created = [];
      for (const item of result.lineItems || []) {
        if (!item.name || !Number.isFinite(Number(item.amount)) || !item.sourceLocation) continue;
        const confidence = Math.max(0, Math.min(100, Number(item.confidence || 0)));
        const amount = Number(item.amount);
        created.push(await LineItem.create({ familyOfficeId: membership.familyOfficeId, familyId, entityId: entity._id, category: Math.max(1, Math.min(12, Number(item.category || 1))), name: item.name, amount, costAmount: amount, basis: item.basis || "declared", confidence, asAtDate: new Date(item.asAtDate || Date.now()), freshnessState: "fresh", sourceDocumentId: document._id, sourceLocation: item.sourceLocation, confirmed: false, held: confidence < 85 || Math.abs(amount) > 2500000 }));
      }
      let obligationCount=0;for(const item of result.obligations||[]){if(!item.title||!item.dueDate||!item.sourceLocation||!Number.isFinite(Number(item.amount)))continue;await Obligation.create({familyOfficeId:membership.familyOfficeId,familyId,entityId:entity._id,title:item.title,amount:Number(item.amount),dueDate:new Date(item.dueDate),category:item.category||"other",consequence:item.consequence||"",sourceDocumentId:document._id,sourceLocation:item.sourceLocation,acknowledged:false});obligationCount++}
      await Document.findByIdAndUpdate(document._id, { status: created.length ? "needs_confirmation" : "clean", aiSummary: result.summary, documentType: result.documentType, accountNumberMasked: result.accountNumberMasked, statementFrom: result.statementFrom ? new Date(result.statementFrom) : undefined, statementTo: result.statementTo ? new Date(result.statementTo) : undefined, extractedData: result });
      await AccessLog.create({ familyOfficeId: membership.familyOfficeId, familyId, userId: user._id, action: "upload_and_extract", target: `document:${document._id}`, metadata: { filename: file.name, extractedItems: created.length,extractedObligations:obligationCount } });
      return NextResponse.json({ ok: true, documentId: document._id, extractedItems: created.length, extractedObligations:obligationCount,summary: result.summary }, { status: 201 });
    } catch (processingError) {
      await Document.findByIdAndUpdate(document._id, { status: "failed", processingError: processingError instanceof Error ? processingError.message : "AI processing failed" });
      return NextResponse.json({ error: processingError instanceof Error ? processingError.message : "AI processing failed", documentId: document._id }, { status: 502 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
