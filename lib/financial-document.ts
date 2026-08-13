export const PRD_ACCOUNT_HEADS = {
  "1": { section: "ASSETS", name: "Bank and cash" },
  "2": { section: "ASSETS", name: "Listed equity and securities" },
  "3": { section: "ASSETS", name: "Mutual funds and managed investments" },
  "4": { section: "ASSETS", name: "Bonds and fixed income" },
  "5": { section: "ASSETS", name: "Real estate" },
  "6": { section: "ASSETS", name: "Private / unlisted businesses" },
  "7": { section: "ASSETS", name: "Retirement and pension" },
  "8": { section: "ASSETS", name: "Insurance-linked assets" },
  "9": { section: "ASSETS", name: "Gold and precious metals" },
  "10": { section: "ASSETS", name: "Vehicles and personal property" },
  "11": { section: "ASSETS", name: "Jewellery, art and collectibles" },
  "12": { section: "ASSETS", name: "Loans and advances given" },
  "13": { section: "ASSETS", name: "Foreign assets" },
  "14": { section: "ASSETS", name: "Tax receivables" },
  "15": { section: "ASSETS", name: "Income receivables" },
  "16": { section: "ASSETS", name: "Business / professional assets" },
  "17": { section: "ASSETS", name: "Intellectual property" },
  "18": { section: "ASSETS", name: "Digital assets" },
  "19": { section: "ASSETS", name: "Other assets" },
  "20": { section: "LIABILITIES", name: "Home and property loans" },
  "21": { section: "LIABILITIES", name: "Personal loans" },
  "22": { section: "LIABILITIES", name: "Loans against investments" },
  "23": { section: "LIABILITIES", name: "Credit cards and short-term debt" },
  "24": { section: "LIABILITIES", name: "Business liabilities" },
  "25": { section: "LIABILITIES", name: "Taxes and statutory dues" },
  "26": { section: "LIABILITIES", name: "Property-related payables" },
  "27": { section: "LIABILITIES", name: "Investment-related payables" },
  "28": { section: "LIABILITIES", name: "Family / related-party payables" },
  "29": { section: "LIABILITIES", name: "Other payables" },
  "30": { section: "CONTINGENT", name: "Guarantees" },
  "31": { section: "CONTINGENT", name: "Litigation" },
  "32": { section: "CONTINGENT", name: "Tax disputes" },
  "33": { section: "CONTINGENT", name: "Other potential exposures" },
} as const;

export type AccountHeadId = keyof typeof PRD_ACCOUNT_HEADS;
export type AccountSection = typeof PRD_ACCOUNT_HEADS[AccountHeadId]["section"];
export type Direction = "DEBIT" | "CREDIT";
export type PostingEffect = "INCREASE" | "DECREASE";
export type MappingStatus = "MAPPED" | "REVIEW_REQUIRED";
export const PERSONAL_TRANSACTION_HEADS = {
  salary_income: { section: "INCOME", name: "Salary income" },
  business_income: { section: "INCOME", name: "Business / professional income" },
  interest_dividend_income: { section: "INCOME", name: "Interest and dividend income" },
  rental_income: { section: "INCOME", name: "Rental income" },
  refund_reimbursement: { section: "INCOME", name: "Refunds and reimbursements" },
  household_expense: { section: "EXPENSE", name: "Household expense" },
  food_dining: { section: "EXPENSE", name: "Food and dining" },
  groceries: { section: "EXPENSE", name: "Groceries" },
  shopping: { section: "EXPENSE", name: "Shopping" },
  travel: { section: "EXPENSE", name: "Travel" },
  medical_health: { section: "EXPENSE", name: "Medical and health" },
  education: { section: "EXPENSE", name: "Education" },
  utilities: { section: "EXPENSE", name: "Utilities" },
  rent_maintenance: { section: "EXPENSE", name: "Rent, society and maintenance" },
  insurance: { section: "EXPENSE", name: "Insurance premium" },
  tax_payment: { section: "EXPENSE", name: "Tax payment" },
  emi_loan_payment: { section: "EXPENSE", name: "EMI / loan payment" },
  fees_charges: { section: "EXPENSE", name: "Bank fees and charges" },
  gifts_donations: { section: "EXPENSE", name: "Gifts and donations" },
  cash_withdrawal: { section: "TRANSFER", name: "Cash withdrawal" },
  own_account_transfer: { section: "TRANSFER", name: "Own account transfer" },
  investment_movement: { section: "ASSET_MOVEMENT", name: "Investment purchase / redemption" },
  loan_movement: { section: "LIABILITY_MOVEMENT", name: "Loan drawdown / repayment" },
  other_income: { section: "INCOME", name: "Other income" },
  other_expense: { section: "EXPENSE", name: "Other expense" },
  review_required: { section: "REVIEW", name: "Needs accountant review" }
} as const;

export type PersonalHeadId = keyof typeof PERSONAL_TRANSACTION_HEADS;
export type PersonalSection = typeof PERSONAL_TRANSACTION_HEADS[PersonalHeadId]["section"];

export type LedgerTransaction = {
  source_line_id: string;
  transaction_date: string;
  original_narration: string;
  reference_number: string;
  counterparty: string;
  amount: number;
  direction: Direction;
  transaction_type: string;
  target_section: AccountSection | "";
  target_head_id: AccountHeadId | "";
  target_head_name: string;
  target_subhead_id: "";
  target_subhead_name: "";
  posting_effect: PostingEffect;
  personal_section: PersonalSection;
  personal_head_id: PersonalHeadId;
  personal_head_name: string;
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
    const requestedPersonalId = String((raw as { personal_head_id?: unknown }).personal_head_id || "review_required") as PersonalHeadId;
    const personalHead = PERSONAL_TRANSACTION_HEADS[requestedPersonalId] || PERSONAL_TRANSACTION_HEADS.review_required;
    const material = !invalidAmount && amount > 2_500_000;
    const lowConfidence = confidence < 0.85;
    const personalReview = !PERSONAL_TRANSACTION_HEADS[requestedPersonalId] || requestedPersonalId === "review_required";
    const mustReview = raw.mapping_status !== "MAPPED" || !head || invalidAmount || invalidDate || unsupportedSubhead || lowConfidence || material || personalReview;
    const reasons = [String(raw.mapping_reason || "")];
    if (!head) reasons.push("No exact PRD account head was established.");
    if (personalReview) reasons.push("No exact personal income/expense/transfer head was established.");
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
      personal_section: personalHead.section,
      personal_head_id: requestedPersonalId in PERSONAL_TRANSACTION_HEADS ? requestedPersonalId : "review_required",
      personal_head_name: personalHead.name,
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

export const accountHeadIds = Object.keys(PRD_ACCOUNT_HEADS).map(Number);
export const maxAccountHeadId = Math.max(...accountHeadIds);
export function accountHeadName(category: unknown) {
  return PRD_ACCOUNT_HEADS[String(category) as AccountHeadId]?.name || "Unknown / needs review";
}
export function accountHeadSection(category: unknown) {
  return PRD_ACCOUNT_HEADS[String(category) as AccountHeadId]?.section || "";
}
export function isAssetCategory(category: unknown) {
  return accountHeadSection(category) === "ASSETS";
}
export function isLiabilityCategory(category: unknown) {
  return accountHeadSection(category) === "LIABILITIES";
}
export function isContingentCategory(category: unknown) {
  return accountHeadSection(category) === "CONTINGENT";
}

export const personalHeadPrompt = Object.entries(PERSONAL_TRANSACTION_HEADS)
  .map(([id, head]) => `${id} | ${head.section} | ${head.name}`)
  .join("\n");

export function isOpeningBalancePosition(row: { category?: unknown; name?: unknown; sourceLocation?: unknown; positionRole?: unknown }) {
  if (row.positionRole === "opening") return true;
  if (Number(row.category) !== 1) return false;
  return /\bopening\b[\s\S]*\bbalance\b|\bbalance\b[\s\S]*\bopening\b/i.test(`${String(row.name || "")} ${String(row.sourceLocation || "")}`);
}
