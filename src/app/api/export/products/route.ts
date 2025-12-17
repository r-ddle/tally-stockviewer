import ExcelJS from "exceljs"
import { NextRequest } from "next/server"
import { db } from "@/server/db"
import { computeDerivedPrices } from "@/lib/pricing"

export const runtime = "nodejs"

function sanitizeSheetName(name: string): string {
  const invalid = /[\\\/:\?\*\[\]]/g
  let s = name.replace(invalid, " ").trim()
  if (!s) s = "Sheet"
  // Excel limits sheet name to 31 chars
  if (s.length > 31) s = s.slice(0, 31)
  return s
}

function uniqueSheetName(base: string, used: Set<string>): string {
  let name = sanitizeSheetName(base)
  if (!used.has(name)) {
    used.add(name)
    return name
  }
  for (let i = 2; i < 1000; i++) {
    const candidate = sanitizeSheetName(`${base}`.slice(0, 28) + ` ${i}`)
    if (!used.has(candidate)) {
      used.add(candidate)
      return candidate
    }
  }
  // Fallback
  const fallback = `Sheet ${used.size + 1}`
  used.add(fallback)
  return fallback
}

export async function GET(_req: NextRequest) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Tally Stockviewer"
  workbook.created = new Date()

  // Build list of brand buckets, including unbranded if present
  const brands = await db.listBrands()

  // Determine if there are any unbranded products; if so, add a bucket
  const unbranded = await db.listProducts({ brand: "__unknown__", limit: 1 })
  const brandBuckets = [...brands]
  if (unbranded.length > 0) brandBuckets.unshift("(No Brand)")

  const usedNames = new Set<string>()

  // Helper to format columns
  const applyColumnStyles = (ws: ExcelJS.Worksheet) => {
    ws.views = [{ state: "frozen", ySplit: 1 }]
    ws.getColumn(1).width = 48 // Product
    ws.getColumn(2).width = 12 // Qty
    ws.getColumn(3).width = 10 // Unit
    ws.getColumn(4).width = 14 // Status
    ws.getColumn(5).width = 14 // Dealer
    ws.getColumn(6).width = 14 // Retail
    ws.getColumn(7).width = 14 // Daraz

    ws.getColumn(2).numFmt = "#,##0.###"
    ws.getColumn(5).numFmt = '"LKR" #,##0'
    ws.getColumn(6).numFmt = '"LKR" #,##0'
    ws.getColumn(7).numFmt = '"LKR" #,##0'

    ws.getColumn(2).alignment = { horizontal: "right" }
    ws.getColumn(5).alignment = { horizontal: "right" }
    ws.getColumn(6).alignment = { horizontal: "right" }
    ws.getColumn(7).alignment = { horizontal: "right" }
  }

  for (const brand of brandBuckets) {
    const isUnbranded = brand === "(No Brand)"
    const rows = await db.listProducts({ brand: isUnbranded ? "__unknown__" : brand, limit: 20000 })
    if (rows.length === 0) continue

    const sheetName = uniqueSheetName(isUnbranded ? "Unbranded" : brand, usedNames)
    const ws = workbook.addWorksheet(sheetName)

    // Prepare table data
    const dataRows = rows.map((r) => {
      const { retailPrice, darazPrice } = computeDerivedPrices(r.dealerPrice)
      return [
        r.name,
        r.stockQty ?? null,
        r.unit ?? "",
        r.availability.replaceAll("_", " "),
        r.dealerPrice ?? null,
        retailPrice ?? null,
        darazPrice ?? null,
      ]
    })

    ws.addTable({
      name: `tbl_${sheetName.replaceAll(/[^A-Za-z0-9_]/g, "_")}`.slice(0, 28),
      ref: "A1",
      headerRow: true,
      style: { theme: "TableStyleMedium9", showRowStripes: true },
      columns: [
        { name: "Product" },
        { name: "Qty" },
        { name: "Unit" },
        { name: "Status" },
        { name: "Dealer" },
        { name: "Retail" },
        { name: "Daraz" },
      ],
      rows: dataRows,
    })

    applyColumnStyles(ws)
  }

  // If no sheets were added (empty DB), add a placeholder
  if (workbook.worksheets.length === 0) {
    const ws = workbook.addWorksheet("Products")
    ws.addRow(["No products found"]).font = { italic: true, color: { argb: "FF777777" } }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `tally-products-${new Date().toISOString().slice(0, 10)}.xlsx`
  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
