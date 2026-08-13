import { describe, expect, it } from "vitest";
import { isOpeningBalancePosition, normalizeLedgerDocument, type LedgerTransaction } from "../lib/financial-document";

const transaction: LedgerTransaction = {
  source_line_id: "p1-row1",
  transaction_date: "2026-08-01",
  original_narration: "SALARY CREDIT ACME LTD",
  reference_number: "UTR123",
  counterparty: "ACME LTD",
  amount: 100000,
  direction: "CREDIT",
  transaction_type: "salary",
  target_section: "ASSETS",
  target_head_id: "1",
  target_head_name: "Bank and cash",
  target_subhead_id: "",
  target_subhead_name: "",
  posting_effect: "INCREASE",
  personal_section: "INCOME",
  personal_head_id: "salary_income",
  personal_head_name: "Salary income",
  mapping_status: "MAPPED",
  confidence_score: 0.98,
  mapping_reason: "Salary credited to the documented bank account.",
};

describe("financial document ledger normalization", () => {
  it("identifies current and legacy opening bank positions for exclusion", () => {
    expect(isOpeningBalancePosition({ category: 1, positionRole: "opening", name: "Balance" })).toBe(true);
    expect(isOpeningBalancePosition({ category: 1, name: "Opening bank balance", sourceLocation: "Page 1" })).toBe(true);
    expect(isOpeningBalancePosition({ category: 1, positionRole: "closing", name: "Closing bank balance" })).toBe(false);
    expect(isOpeningBalancePosition({ category: 20, name: "Opening loan balance" })).toBe(false);
  });
  it("uses the authoritative PRD account name and recomputes totals", () => {
    const result = normalizeLedgerDocument("doc-1", {
      transactions: [{ ...transaction, target_head_name: "Invented cash head" }],
      validation: { source_transaction_count: 1, output_transaction_count: 99, total_debits: 999, total_credits: 999, reconciled: true, errors: [] },
    });
    expect(result.transactions[0].target_head_name).toBe("Bank and cash");
    expect(result.validation.output_transaction_count).toBe(1);
    expect(result.validation.total_credits).toBe(100000);
    expect(result.validation.total_debits).toBe(0);
    expect(result.validation.reconciled).toBe(true);
  });

  it("rejects invented heads and subheads instead of guessing", () => {
    const result = normalizeLedgerDocument("doc-2", {
      transactions: [{ ...transaction, target_head_id: "99" as "1", target_subhead_id: "BANK-SAVINGS" as "" }],
      validation: { source_transaction_count: 1, output_transaction_count: 1, total_debits: 0, total_credits: 100000, reconciled: true, errors: [] },
    });
    expect(result.transactions[0].mapping_status).toBe("REVIEW_REQUIRED");
    expect(result.transactions[0].target_head_id).toBe("");
    expect(result.transactions[0].target_subhead_id).toBe("");
    expect(result.unmapped_transactions).toHaveLength(1);
  });

  it("keeps expense classification separate from balance-sheet mapping", () => {
    const result = normalizeLedgerDocument("doc-expense", {
      transactions: [{
        ...transaction,
        direction: "DEBIT",
        original_narration: "SWIGGY FOOD ORDER",
        amount: 1250,
        transaction_type: "food",
        posting_effect: "DECREASE",
        personal_section: "EXPENSE",
        personal_head_id: "food_dining",
        personal_head_name: "Food and dining",
        mapping_reason: "Food debit reduces the bank account and belongs to food expense analysis."
      }],
      validation: { source_transaction_count: 1, output_transaction_count: 1, total_debits: 1250, total_credits: 0, reconciled: true, errors: [] },
    });
    expect(result.transactions[0].target_head_id).toBe("1");
    expect(result.transactions[0].target_head_name).toBe("Bank and cash");
    expect(result.transactions[0].personal_section).toBe("EXPENSE");
    expect(result.transactions[0].personal_head_name).toBe("Food and dining");
  });

  it("fails reconciliation for omitted or duplicate source rows", () => {
    const result = normalizeLedgerDocument("doc-3", {
      transactions: [transaction, { ...transaction, amount: 500 }],
      validation: { source_transaction_count: 3, output_transaction_count: 2, total_debits: 0, total_credits: 100500, reconciled: true, errors: [] },
    });
    expect(result.validation.reconciled).toBe(false);
    expect(result.validation.errors.join(" ")).toContain("Duplicate source_line_id");
    expect(result.validation.errors.join(" ")).toContain("Source count 3");
  });

  it("holds low-confidence and material transactions for review", () => {
    const result = normalizeLedgerDocument("doc-4", {
      transactions: [{ ...transaction, confidence_score: 0.84 }, { ...transaction, source_line_id: "p1-row2", amount: 2_500_001 }],
      validation: { source_transaction_count: 2, output_transaction_count: 2, total_debits: 0, total_credits: 2_600_001, reconciled: true, errors: [] },
    });
    expect(result.unmapped_transactions).toHaveLength(2);
    expect(result.transactions.every((row) => row.mapping_status === "REVIEW_REQUIRED")).toBe(true);
  });
});
