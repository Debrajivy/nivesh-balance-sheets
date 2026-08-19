import ExcelJS from "exceljs";

const MAX_CELLS = 50_000;

function displayCell(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value !== "object") return String(value);
  if ("formula" in value) {
    const result = value.result === undefined ? "" : displayCell(value.result as ExcelJS.CellValue);
    return result ? `${result} [formula: ${value.formula}]` : `[formula: ${value.formula}]`;
  }
  if ("sharedFormula" in value) return displayCell(value.result as ExcelJS.CellValue);
  if ("richText" in value) return value.richText.map((part) => part.text).join("");
  if ("text" in value) return String(value.text);
  if ("error" in value) return String(value.error);
  return JSON.stringify(value);
}

/** Converts an XLSX workbook into compact, location-preserving text for AI extraction. */
export async function xlsxToDocumentText(bytes: Uint8Array): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer);
  let visited = 0;
  const sheets: string[] = [];

  workbook.eachSheet((sheet) => {
    const lines = [`WORKSHEET: ${sheet.name}`];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: false }, (cell) => {
        visited += 1;
        if (visited > MAX_CELLS) return;
        const value = displayCell(cell.value);
        if (value) cells.push(`${cell.address}=${value.replaceAll("\t", " ").replaceAll("\n", " ")}`);
      });
      if (cells.length) lines.push(cells.join("\t"));
    });
    sheets.push(lines.join("\n"));
  });

  if (!workbook.worksheets.length) throw new Error("The Excel workbook contains no worksheets.");
  if (visited > MAX_CELLS) throw new Error(`The Excel workbook is too large to read safely (maximum ${MAX_CELLS.toLocaleString("en-IN")} populated cells).`);
  return sheets.join("\n\n");
}

