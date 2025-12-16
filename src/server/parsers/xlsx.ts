import ExcelJS from "exceljs";
import {
  looksLikeBrandHeader,
  normalizeWhitespace,
  parseMaybeNumber,
  parseQty,
  shouldIgnoreRowName,
} from "./common";
import type { ParsedItem } from "./types";

function cellText(cell: ExcelJS.Cell): string {
  return normalizeWhitespace(cell.text ?? "");
}

function cellNumber(cell: ExcelJS.Cell): number | null {
  const v = cell.value as unknown;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object" && "result" in (v as any) && typeof (v as any).result === "number") {
    const n = (v as any).result;
    return Number.isFinite(n) ? n : null;
  }
  return parseMaybeNumber(cell.text);
}

function extractUnitFromNumFmt(numFmt: string | undefined): string | null {
  if (!numFmt) return null;
  // Tally commonly uses formats like:
  // - 0 " nos"
  // - ""0" nos"
  const quoted = Array.from(numFmt.matchAll(/"([^"]*)"/g))
    .map((m) => normalizeWhitespace(m[1] ?? ""))
    .filter((s) => /[a-z]/i.test(s));
  if (quoted.length > 0) return quoted[0] ?? null;

  const tail = numFmt.match(/([A-Za-z][A-Za-z0-9._-]*)\"?\s*$/);
  return tail ? normalizeWhitespace(tail[1] ?? "") || null : null;
}

type TableRow = {
  rowNumber: number;
  name: string;
  qty: number | null;
  unit: string | null;
  rate: number | null;
  value: number | null;
  isBold: boolean;
  totalsNumeric: boolean;
};

function findDataStartRow(rows: TableRow[], defaultStart: number) {
  const candidate = rows.find((r) => r.rowNumber >= defaultStart && r.isBold && r.totalsNumeric && !shouldIgnoreRowName(r.name));
  return candidate ? candidate.rowNumber : defaultStart;
}

function detectStyleAvailable(rows: TableRow[]): boolean {
  // In the real export, brand headers are bold. If we never see a bold row in the table area, styles likely weren't read.
  return rows.some((r) => r.isBold);
}

function computeValidatedBrandRows(rows: TableRow[]): Set<number> {
  // Fallback path when bold styles aren't available:
  // - consider "brand-looking" rows as candidates
  // - validate by ensuring candidate qty == sum of following product qty until next candidate
  const candidates = rows
    .filter((r) => r.totalsNumeric && looksLikeBrandHeader(r.name) && !shouldIgnoreRowName(r.name))
    .map((r) => r.rowNumber);

  const byRow = new Map<number, TableRow>();
  for (const r of rows) byRow.set(r.rowNumber, r);

  const validated = new Set<number>();
  for (let i = 0; i < candidates.length; i += 1) {
    const start = candidates[i]!;
    const end = candidates[i + 1] ?? Number.POSITIVE_INFINITY;
    const header = byRow.get(start);
    if (!header || header.qty == null) continue;

    let sum = 0;
    let productCount = 0;
    for (const r of rows) {
      if (r.rowNumber <= start) continue;
      if (r.rowNumber >= end) break;
      if (!r.name || shouldIgnoreRowName(r.name)) continue;
      if (r.totalsNumeric && looksLikeBrandHeader(r.name)) continue;
      if (r.qty == null) continue;
      sum += r.qty;
      productCount += 1;
    }

    const diff = Math.abs(sum - header.qty);
    if (productCount > 0 && diff < 1e-6) validated.add(start);
  }

  return validated;
}

export async function parseTallyXlsx(buffer: Buffer): Promise<ParsedItem[]> {
  const workbook = new ExcelJS.Workbook();
  // ExcelJS types lag behind Node's Buffer generics in newer @types/node.
  await workbook.xlsx.load(buffer as any);
  const worksheet = workbook.getWorksheet("Feeder Stores") ?? workbook.worksheets[0];
  if (!worksheet) return [];

  const rows: TableRow[] = [];
  let emptyStreak = 0;

  // Pull rows 1..N first, then decide the actual start row.
  for (let r = 1; r <= worksheet.rowCount; r += 1) {
    const row = worksheet.getRow(r);
    const name = cellText(row.getCell(1));
    const qtyCell = row.getCell(2);
    const rateCell = row.getCell(3);
    const valueCell = row.getCell(4);

    const qty = cellNumber(qtyCell);
    const rate = cellNumber(rateCell);
    const value = cellNumber(valueCell);

    let unit = extractUnitFromNumFmt(qtyCell.numFmt);
    if (!unit) {
      const parsed = parseQty(qtyCell.text ?? "");
      unit = parsed.unit;
    }

    const isBold = row.getCell(1).font?.bold === true;
    const totalsNumeric = qty != null && rate != null && value != null;

    if (!name && qty == null && rate == null && value == null) {
      emptyStreak += 1;
      if (emptyStreak >= 30 && r > 30) break;
      continue;
    }
    emptyStreak = 0;

    rows.push({ rowNumber: r, name, qty, unit, rate, value, isBold, totalsNumeric });
  }

  const startRow = findDataStartRow(rows, 13);
  const tableRows = rows.filter((r) => r.rowNumber >= startRow);
  if (tableRows.length === 0) return [];

  const styleAvailable = detectStyleAvailable(tableRows);
  const validatedFallbackBrands = styleAvailable ? new Set<number>() : computeValidatedBrandRows(tableRows);

  const items: ParsedItem[] = [];
  let currentBrand: string | null = null;

  for (const r of tableRows) {
    if (!r.name) continue;

    // Ignore grand totals and other summary rows.
    if (shouldIgnoreRowName(r.name)) {
      if (/^grand\s+total\b/i.test(r.name)) break;
      continue;
    }

    const isBrandHeader = styleAvailable
      ? r.isBold && r.totalsNumeric
      : validatedFallbackBrands.has(r.rowNumber);

    if (isBrandHeader) {
      currentBrand = r.name;
      continue;
    }

    // Product row
    if (r.qty == null) continue;
    if (!currentBrand) continue;

    items.push({
      name: r.name,
      brand: currentBrand,
      qty: r.qty,
      unit: r.unit,
    });
  }

  if (items.length === 0) {
    throw new Error(
      'No products detected in the XLSX. Expected the "Feeder Stores" sheet with a 4-column table starting at row 13 (Particulars, Quantity, Rate, Value).',
    );
  }

  return items;
}
