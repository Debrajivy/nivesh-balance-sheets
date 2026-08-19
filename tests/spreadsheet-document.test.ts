import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { xlsxToDocumentText } from "../lib/spreadsheet-document";

describe("Excel financial document conversion", () => {
  it("preserves worksheet names, exact cells, dates, and formula results", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Balance Sheet FY25-26");
    sheet.getCell("A1").value = "Liabilities";
    sheet.getCell("B1").value = new Date("2026-03-31T00:00:00.000Z");
    sheet.getCell("C2").value = { formula: "SUM(C3:C4)", result: 125000 };
    const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());

    const text = await xlsxToDocumentText(bytes);

    expect(text).toContain("WORKSHEET: Balance Sheet FY25-26");
    expect(text).toContain("A1=Liabilities");
    expect(text).toContain("B1=2026-03-31");
    expect(text).toContain("C2=125000 [formula: SUM(C3:C4)]");
  });
});
