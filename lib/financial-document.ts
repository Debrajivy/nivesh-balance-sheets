export const PRD_ACCOUNT_HEADS = {
  "1": { section: "ASSETS", name: "Bank and cash" },
  "2": { section: "ASSETS", name: "Listed investments" },
  "3": { section: "ASSETS", name: "Unlisted and private holdings" },
  "4": { section: "ASSETS", name: "Real estate" },
  "5": { section: "ASSETS", name: "Retirement and small savings" },
  "6": { section: "ASSETS", name: "Physical and other" },
  "7": { section: "ASSETS", name: "Loans and advances given" },
  "8": { section: "ASSETS", name: "Foreign assets" },
  "9": { section: "LIABILITIES", name: "Home and property loans" },
  "10": { section: "LIABILITIES", name: "Loans against securities and personal loans" },
  "11": { section: "LIABILITIES", name: "Business and director liabilities" },
  "12": { section: "LIABILITIES", name: "Taxes and dues payable" },
} as const;

export type AccountHeadId = keyof typeof PRD_ACCOUNT_HEADS;
export type Direction = "DEBIT" | "CREDIT";
export type PostingEffect = "INCREASE" | "DECREASE";
export type MappingStatus = "MAPPED" | "REVIEW_REQUIRED";

export type LedgerTransaction = {
  source_line_id: string;
  transaction_date: string;
  original_narration: string;
  reference_number: string;
  counterparty: string;
  amount: number;
  direction: Direction;
  transaction_type: string;
  target_section: "ASSETS" | "LIABILITIES" | "";
  target_head_id: AccountHeadId | "";
  target_head_name: string;
  target_subhead_id: "";
  target_subhead_name: "";
  posting_effect: PostingEffect;
  mapping_status: MappingStatus;
  confidence_score: number;
  mapping_reason: string;
};

export type LedgerValidation = {
  source_transaction_count: number;
  output_transaction_count: number;
  total_debits: number;
  total_credits: number;
  reconciled: boolean;
  errors: string[];
};

export type LedgerDocument = {
  document_id: string;
  transactions: LedgerTransaction[];
  unmapped_transactions: LedgerTransaction[];
  validation: LedgerValidation;
};

type ModelLedgerDocument = Omit<LedgerDocument, "document_id" | "unmapped_transactions"> & {
  document_id?: string;
  unmapped_transactions?: LedgerTransaction[];
};

const roundMoney = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;

/**
 * Treat model output as untrusted. Account names/sections are sourced from the
 * PRD table above, totals are recomputed, and unsupported mappings are held.
 */
export function normalizeLedgerDocument(documentId: string, input: ModelLedgerDocument): LedgerDocument {
  const errors = [...(Array.isArray(input.validation?.errors) ? input.validation.errors.map(String) : [])];
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  const transactions = (Array.isArray(input.transactions) ? input.transactions : []).map((raw, index): LedgerTransaction => {
    const sourceLineId = String(raw.source_line_id || `UNLOCATED-${index + 1}`);
    if (seen.has(sourceLineId)) duplicates.add(sourceLineId);
    seen.add(sourceLineId);

    const requestedId = String(raw.target_head_id || "") as AccountHeadId | "";
    const head = requestedId ? PRD_ACCOUNT_HEADS[requestedId as AccountHeadId] : undefined;
    const amount = Number(raw.amount);
    const invalidAmount = !Number.isFinite(amount) || amount < 0;
    const invalidDate = !/^\d{4}-\d{2}-\d{2}$/.test(String(raw.transaction_date || ""));
    const unsupportedSubhead = Boolean(raw.target_subhead_id || raw.target_subhead_name);
    const confidence = Math.max(0, Math.min(1, Number(raw.confidence_score) || 0));
    const material = !invalidAmount && amount > 2_500_000;
    const lowConfidence = confidence < 0.85;
    const mustReview = raw.mapping_status !== "MAPPED" || !head || invalidAmount || invalidDate || unsupportedSubhead || lowConfidence || material;
    const reasons = [String(raw.mapping_reason || "")];
    if (!head) reasons.push("No exact PRD account head was established.");
    if (unsupportedSubhead) reasons.push("The PRD defines no subhead IDs; the supplied subhead was rejected.");
    if (invalidAmount) reasons.push("The extracted amount is invalid.");
    if (invalidDate) reasons.push("The transaction date is missing or invalid.");
    if (lowConfidence) reasons.push("Confidence is below the PRD's 85% acceptance threshold.");
    if (material) reasons.push("Amount exceeds the PRD's INR 25 lakh materiality threshold.");

    return {
      source_line_id: sourceLineId,
      transaction_date: String(raw.transaction_date || ""),
      original_narration: String(raw.original_narration || ""),
      reference_number: String(raw.reference_number || ""),
      counterparty: String(raw.counterparty || ""),
      amount: invalidAmount ? 0 : roundMoney(amount),
      direction: raw.direction === "CREDIT" ? "CREDIT" : "DEBIT",
      transaction_type: String(raw.transaction_type || "unclassified"),
      target_section: head?.section || "",
      target_head_id: head ? requestedId : "",
      target_head_name: head?.name || "",
      target_subhead_id: "",
      target_subhead_name: "",
      posting_effect: raw.posting_effect === "INCREASE" ? "INCREASE" : "DECREASE",
      mapping_status: mustReview ? "REVIEW_REQUIRED" : "MAPPED",
      confidence_score: confidence,
      mapping_reason: reasons.filter(Boolean).join(" "),
    };
  });

  if (duplicates.size) errors.push(`Duplicate source_line_id values: ${[...duplicates].join(", ")}`);
  const sourceCount = Math.max(0, Math.trunc(Number(input.validation?.source_transaction_count) || 0));
  // More outputs than source rows can be legitimate evidence-backed splits.
  // Fewer outputs always means at least one source row was omitted.
  if (sourceCount > transactions.length) {
    errors.push(`Source count ${sourceCount} does not match output count ${transactions.length}.`);
  }
  const totalDebits = roundMoney(transactions.filter((row) => row.direction === "DEBIT").reduce((sum, row) => sum + row.amount, 0));
  const totalCredits = roundMoney(transactions.filter((row) => row.direction === "CREDIT").reduce((sum, row) => sum + row.amount, 0));

  return {
    document_id: documentId,
    transactions,
    unmapped_transactions: transactions.filter((row) => row.mapping_status === "REVIEW_REQUIRED"),
    validation: {
      source_transaction_count: sourceCount,
      output_transaction_count: transactions.length,
      total_debits: totalDebits,
      total_credits: totalCredits,
      reconciled: Boolean(input.validation?.reconciled) && errors.length === 0,
      errors,
    },
  };
}

export const accountHeadPrompt = Object.entries(PRD_ACCOUNT_HEADS)
  .map(([id, head]) => `${id} | ${head.section} | ${head.name}`)
  .join("\n");

export function isOpeningBalancePosition(row: { category?: unknown; name?: unknown; sourceLocation?: unknown; positionRole?: unknown }) {
  if (row.positionRole === "opening") return true;
  if (Number(row.category) !== 1) return false;
  return /\bopening\b[\s\S]*\bbalance\b|\bbalance\b[\s\S]*\bopening\b/i.test(`${String(row.name || "")} ${String(row.sourceLocation || "")}`);
}
