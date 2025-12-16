import * as XLSX from "xlsx";
import {
  looksLikeBrandHeader,
  normalizeWhitespace,
  parseMaybeNumber,
  parseQty,
  shouldIgnoreRowName,
} from "./common";
import type { ParsedItem } from "./types";

const NAME_HEADERS = ["particulars", "stock item", "item", "name", "product"];
const QTY_HEADERS = [
  "closing qty",
  "closing quantity",
  "closing balance",
  "closing",
  "quantity",
  "qty",
  "cl. qty",
  "cl qty",
];
const UNIT_HEADERS = ["unit", "uom"];

function normalizeCell(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return normalizeWhitespace(value).toLowerCase();
  if (typeof value === "number") return String(value);
  return "";
}

function headerMatch(cell: string, headers: string[]): boolean {
  return headers.some((h) => cell === h || cell.includes(h));
}

function combinedHeader(rows: unknown[][], rowStart: number, rowEnd: number, col: number): string {
  const parts: string[] = [];
  for (let r = rowStart; r <= rowEnd; r += 1) {
    const row = rows[r] ?? [];
    const v = normalizeCell(row[col]);
    if (!v) continue;
    parts.push(v);
  }
  return parts.join(" ").trim();
}

function qtySampleScore(rows: unknown[][], dataStartRow: number, qtyCol: number): number {
  const limit = Math.min(rows.length, dataStartRow + 60);
  let score = 0;
  for (let r = dataStartRow; r < limit; r += 1) {
    const row = rows[r] ?? [];
    const v = row[qtyCol];
    if (typeof v === "number" && Number.isFinite(v)) score += 1;
    else if (typeof v === "string") {
      const parsed = parseQty(v);
      if (parsed.qty != null) score += 1;
      else if (parseMaybeNumber(v) != null) score += 1;
    }
  }
  return score;
}

function findHeader(rows: unknown[][]): { headerStartRow: number; headerEndRow: number; nameCol: number; qtyCol: number; unitCol: number | null } | null {
  const limit = Math.min(rows.length, 120);
  let best:
    | { score: number; headerStartRow: number; headerEndRow: number; nameCol: number; qtyCol: number; unitCol: number | null }
    | null = null;

  for (let headerStartRow = 0; headerStartRow < limit; headerStartRow += 1) {
    const startRow = rows[headerStartRow] ?? [];
    const startCells = startRow.map(normalizeCell);

    const nameCol = startCells.findIndex((c) => headerMatch(c, NAME_HEADERS));
    if (nameCol < 0) continue;

    const maxHeaderEnd = Math.min(rows.length - 1, headerStartRow + 10);
    for (let headerEndRow = headerStartRow; headerEndRow <= maxHeaderEnd; headerEndRow += 1) {
      const row = rows[headerEndRow] ?? [];
      const cells = row.map(normalizeCell);

      const qtyCandidates: number[] = [];
      for (let c = 0; c < cells.length; c += 1) {
        if (c === nameCol) continue;
        const cell = cells[c] ?? "";
        if (headerMatch(cell, QTY_HEADERS)) qtyCandidates.push(c);
      }
      if (qtyCandidates.length === 0) continue;

      const unitColRaw = cells.findIndex((c) => headerMatch(c, UNIT_HEADERS));
      const unitCol = unitColRaw >= 0 ? unitColRaw : null;

      for (const qtyCol of qtyCandidates) {
        const hdr = combinedHeader(rows, headerStartRow, headerEndRow, qtyCol);
        const dataStartRow = headerEndRow + 1;
        const sample = qtySampleScore(rows, dataStartRow, qtyCol);

        let score = 0;
        score += 5; // found name column
        score += 3; // found qty label
        if (hdr.includes("closing")) score += 5;
        if (hdr.includes("balance")) score += 2;
        if (hdr.includes("opening")) score -= 4;
        if (hdr.includes("inward") || hdr.includes("outward")) score -= 2;
        if (unitCol != null) score += 1;
        score += Math.min(sample, 50); // prefer columns that look like quantities

        if (!best || score > best.score) {
          best = { score, headerStartRow, headerEndRow, nameCol, qtyCol, unitCol };
        }
      }
    }
  }

  return best
    ? {
        headerStartRow: best.headerStartRow,
        headerEndRow: best.headerEndRow,
        nameCol: best.nameCol,
        qtyCol: best.qtyCol,
        unitCol: best.unitCol,
      }
    : null;
}

export function parseTallyXlsx(buffer: Buffer): ParsedItem[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  if (workbook.SheetNames.length === 0) return [];

  const allItems: ParsedItem[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: "",
      blankrows: true,
    }) as unknown[][];

    const header = findHeader(rows);
    if (!header) continue;

    const dataStartRow = header.headerEndRow + 1;
    const items: ParsedItem[] = [];
    let currentBrand: string | null = null;
    let emptyStreak = 0;

    for (let r = dataStartRow; r < rows.length; r += 1) {
      const row = rows[r] ?? [];
      const nameRaw = row[header.nameCol];
      const name =
        typeof nameRaw === "string"
          ? normalizeWhitespace(nameRaw)
          : normalizeWhitespace(String(nameRaw ?? ""));
      if (!name) {
        emptyStreak += 1;
        if (emptyStreak >= 12) break;
        continue;
      }
      emptyStreak = 0;
      if (shouldIgnoreRowName(name)) continue;

      const qtyCell = row[header.qtyCol];
      const unitCell = header.unitCol != null ? row[header.unitCol] : null;

      let qty: number | null = null;
      let unit: string | null = null;

      if (typeof qtyCell === "string") {
        const parsedQty = parseQty(qtyCell);
        qty = parsedQty.qty;
        unit = parsedQty.unit;
      } else if (typeof qtyCell === "number") {
        qty = Number.isFinite(qtyCell) ? qtyCell : null;
        const u = typeof unitCell === "string" ? normalizeWhitespace(unitCell) : null;
        unit = u || null;
      } else {
        qty = parseMaybeNumber(qtyCell);
        if (qty != null && typeof unitCell === "string") unit = normalizeWhitespace(unitCell) || null;
      }

      if (looksLikeBrandHeader(name)) {
        let nextName: string | null = null;
        for (let look = r + 1; look < Math.min(rows.length, r + 5); look += 1) {
          const nextRow = rows[look] ?? [];
          const nextRaw = nextRow[header.nameCol];
          const candidate =
            typeof nextRaw === "string"
              ? normalizeWhitespace(nextRaw)
              : normalizeWhitespace(String(nextRaw ?? ""));
          if (candidate) {
            nextName = candidate;
            break;
          }
        }
        if (nextName && !looksLikeBrandHeader(nextName)) {
          currentBrand = name;
          continue;
        }
      }

      if (/^(opening|closing)\b/i.test(name)) continue;

      items.push({
        name,
        brand: currentBrand,
        qty,
        unit,
      });
    }

    allItems.push(...items);
  }

  if (allItems.length === 0) {
    throw new Error(
      'Could not detect a usable table in the XLSX. Expected a "Particulars" (name) column and a Closing Balance "Quantity" column.',
    );
  }

  return allItems;
}
