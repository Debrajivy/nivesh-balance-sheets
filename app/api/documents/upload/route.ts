import { NextResponse } from "next/server";
import { connectDB } from "@/lib/server/db";
import { requireCapability } from "@/lib/server/auth";
import { AccessLog, BankTransaction, Document, Entity, LineItem, Obligation } from "@/lib/server/models";
import { extractFinancialDocument } from "@/lib/server/document-extraction";
import { maxAccountHeadId } from "@/lib/financial-document";

export const runtime = "nodejs";
const allowedExtensions = new Set(["pdf", "png", "jpg", "jpeg", "csv", "xlsx", "xls"]);
const maxUploadBytes = process.env.NETLIFY ? 4 * 1024 * 1024 : 200 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const { membership, user, familyId } = await requireCapability("upload");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a document to upload" }, { status: 400 });
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExtensions.has(extension)) return NextResponse.json({ error: "Upload a PDF, PNG, JPG, CSV, or XLSX file" }, { status: 400 });
    if (extension === "xls") return NextResponse.json({ error: "Legacy .xls files are not supported safely. Open the file in Excel and save it as .xlsx, then upload it again." }, { status: 415 });
    if (file.size > maxUploadBytes) return NextResponse.json({ error: process.env.NETLIFY ? "Netlify accepts uploads up to 4 MB. Compress or split this document and upload each part." : "File size must not exceed 200 MB" }, { status: 413 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "AI document processing is not configured. Add OPENAI_API_KEY to .env.local and restart the server." }, { status: 503 });
    await connectDB();
    if (!familyId) return NextResponse.json({ error: "No client family is assigned" }, { status: 400 });
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const document = await Document.create({ familyOfficeId: membership.familyOfficeId, familyId, filename: file.name, mimeType: file.type, size: file.size, source: "upload", status: "processing", contentBase64: base64, uploadedBy: user._id });
    try {
      const result = await extractFinancialDocument(file, base64, String(document._id));
      const entityName = result.entityName || String(form.get("entity") || "Rajiv Malhotra");
      let entity = await Entity.findOne({ familyOfficeId: membership.familyOfficeId, familyId, name: entityName });
      if (!entity) entity = await Entity.create({ familyOfficeId: membership.familyOfficeId, familyId, name: entityName, type: "individual", excludeFromConsolidation: false });
      const created = [];
      for (const item of result.lineItems) {
        if (!item.name || !Number.isFinite(Number(item.amount)) || !item.sourceLocation) continue;
        // Opening balances are reconciliation evidence, not an additional
        // period-end asset. They remain preserved in Document.extractedData.
        if (item.positionRole === "opening") continue;
        const confidence = Math.max(0, Math.min(100, Number(item.confidence || 0)));
        const amount = Number(item.amount);
        created.push(await LineItem.create({ familyOfficeId: membership.familyOfficeId, familyId, entityId: entity._id, category: Math.max(1, Math.min(maxAccountHeadId, Number(item.category || 19))), name: item.name, amount, costAmount: amount, basis: item.basis || "declared", confidence, asAtDate: new Date(item.asAtDate || Date.now()), freshnessState: "fresh", sourceDocumentId: document._id, sourceLocation: item.sourceLocation, positionRole: item.positionRole, confirmed: false, held: confidence < 85 || Math.abs(amount) > 2500000 }));
      }
      let obligationCount=0;for(const item of result.obligations){if(!item.title||!item.dueDate||!item.sourceLocation||!Number.isFinite(Number(item.amount)))continue;await Obligation.create({familyOfficeId:membership.familyOfficeId,familyId,entityId:entity._id,title:item.title,amount:Number(item.amount),dueDate:new Date(item.dueDate),category:item.category||"other",consequence:item.consequence||"",sourceDocumentId:document._id,sourceLocation:item.sourceLocation,acknowledged:false});obligationCount++}
      const transactionRows=[];for(const txn of result.ledger.transactions){const transactionDate=/^\d{4}-\d{2}-\d{2}$/.test(txn.transaction_date)?new Date(txn.transaction_date):new Date(result.statementTo||Date.now());transactionRows.push({familyOfficeId:membership.familyOfficeId,familyId,entityId:entity._id,sourceDocumentId:document._id,sourceLineId:txn.source_line_id,transactionDate,originalNarration:txn.original_narration,referenceNumber:txn.reference_number,counterparty:txn.counterparty,amount:txn.amount,direction:txn.direction,transactionType:txn.transaction_type,targetSection:txn.target_section,targetHeadId:txn.target_head_id,targetHeadName:txn.target_head_name,postingEffect:txn.posting_effect,personalSection:txn.personal_section,personalHeadId:txn.personal_head_id,personalHeadName:txn.personal_head_name,mappingStatus:txn.mapping_status,confidenceScore:txn.confidence_score,mappingReason:txn.mapping_reason,sourceLocation:txn.source_line_id})}
      if(transactionRows.length)await BankTransaction.insertMany(transactionRows);
      const needsConfirmation = created.length > 0 || result.ledger.unmapped_transactions.length > 0 || !result.ledger.validation.reconciled;
      await Document.findByIdAndUpdate(document._id, { status: needsConfirmation ? "needs_confirmation" : "clean", aiSummary: result.summary, documentType: result.documentType, accountNumberMasked: result.accountNumberMasked, statementFrom: result.statementFrom ? new Date(result.statementFrom) : undefined, statementTo: result.statementTo ? new Date(result.statementTo) : undefined, extractedData: result });
      await AccessLog.create({ familyOfficeId: membership.familyOfficeId, familyId, userId: user._id, action: "upload_and_extract", target: `document:${document._id}`, metadata: { filename: file.name, extractedItems: created.length, extractedObligations: obligationCount, extractedTransactions: result.ledger.transactions.length, reconciled: result.ledger.validation.reconciled } });
      return NextResponse.json(result.ledger, { status: 201 });
    } catch (processingError) {
      await Document.findByIdAndUpdate(document._id, { status: "failed", processingError: processingError instanceof Error ? processingError.message : "AI processing failed" });
      return NextResponse.json({ error: processingError instanceof Error ? processingError.message : "AI processing failed", documentId: document._id }, { status: 502 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
