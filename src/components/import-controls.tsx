"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Upload, FileText, RefreshCcw, ChevronDown, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type ImportResult =
  | { ok: true; parsedCount: number; upserted: number; fileMtimeMs?: number }
  | { ok: false; error: string }

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  return (await res.json()) as T
}

export function ImportControls({
  onImported,
  compact = false,
}: {
  onImported?: (result: ImportResult) => void
  compact?: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState<null | "auto" | "upload" | "sample">(null)
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null)

  const doAuto = async () => {
    setBusy("auto")
    setMessage(null)
    try {
      const result = await postJson<ImportResult & { fileMtimeMs?: number }>("/api/import/auto")
      if (result.ok && typeof result.fileMtimeMs === "number") {
        localStorage.setItem("tally:lastDefaultMtimeMs", String(result.fileMtimeMs))
        localStorage.setItem("tally:lastAutoLoadAt", String(Date.now()))
      }
      onImported?.(result)
      setMessage({
        text: result.ok ? `Imported ${result.parsedCount.toLocaleString("en-IN")} products` : result.error,
        success: result.ok,
      })
    } catch (e) {
      const err = e instanceof Error ? e.message : "Auto import failed."
      setMessage({ text: err, success: false })
      onImported?.({ ok: false, error: err })
    } finally {
      setBusy(null)
    }
  }

  const doSample = async () => {
    setBusy("sample")
    setMessage(null)
    try {
      const result = await postJson<ImportResult>("/api/import/sample")
      onImported?.(result)
      setMessage({
        text: result.ok ? `Imported ${result.parsedCount.toLocaleString("en-IN")} sample products` : result.error,
        success: result.ok,
      })
    } catch (e) {
      const err = e instanceof Error ? e.message : "Sample import failed."
      setMessage({ text: err, success: false })
      onImported?.({ ok: false, error: err })
    } finally {
      setBusy(null)
    }
  }

  const doSampleXlsx = async () => {
    setBusy("sample")
    setMessage(null)
    try {
      const result = await postJson<ImportResult>("/api/import/fixture-xlsx")
      onImported?.(result)
      setMessage({
        text: result.ok ? `Imported ${result.parsedCount.toLocaleString("en-IN")} sample products` : result.error,
        success: result.ok,
      })
    } catch (e) {
      const err = e instanceof Error ? e.message : "Sample XLSX import failed."
      setMessage({ text: err, success: false })
      onImported?.({ ok: false, error: err })
    } finally {
      setBusy(null)
    }
  }

  const doUpload = async (file: File) => {
    setBusy("upload")
    setMessage(null)
    try {
      const form = new FormData()
      form.set("file", file)
      const res = await fetch("/api/import/upload", { method: "POST", body: form })
      const result = (await res.json()) as ImportResult
      onImported?.(result)
      setMessage({
        text: result.ok
          ? `Imported ${result.parsedCount.toLocaleString("en-IN")} products from ${file.name}`
          : result.error,
        success: result.ok,
      })
    } catch (e) {
      const err = e instanceof Error ? e.message : "Upload import failed."
      setMessage({ text: err, success: false })
      onImported?.({ ok: false, error: err })
    } finally {
      setBusy(null)
    }
  }

  const disabled = busy !== null

  return (
    <div className="space-y-3">
      <div className={cn("flex flex-wrap items-center gap-2", compact && "flex-col sm:flex-row")}>
        {/* Primary action */}
        <Button onClick={doAuto} disabled={disabled} className="gap-2">
          {busy === "auto" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          {compact ? "Sync" : "Load Latest Export"}
        </Button>

        {/* Upload button */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xml,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/xml,application/xml"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (!f) return
            doUpload(f).finally(() => {
              if (fileInputRef.current) fileInputRef.current.value = ""
            })
          }}
        />
        <Button variant="secondary" disabled={disabled} onClick={() => fileInputRef.current?.click()} className="gap-2">
          {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload File
        </Button>

        {/* Sample data dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={disabled} className="gap-2 bg-transparent">
              {busy === "sample" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              <span className="hidden sm:inline">Sample Data</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={doSample}>
              <FileText className="mr-2 h-4 w-4" />
              Load Sample XML
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={doSampleXlsx}>
              <FileText className="mr-2 h-4 w-4" />
              Load Sample XLSX
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={cn(
            "flex items-center gap-2 text-sm rounded-lg px-3 py-2",
            message.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
          )}
        >
          {message.success ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}
    </div>
  )
}
