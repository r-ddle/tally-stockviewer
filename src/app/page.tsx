"use client"

import { ImportControls } from "@/components/import-controls"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Package, CheckCircle2, XCircle, AlertTriangle, Clock, FileText } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

type Summary = {
  total: number
  inStock: number
  outOfStock: number
  negative: number
  unknown: number
  lastImportAt: number | null
}

type DefaultInfo =
  | { path: string; exists: true; ext: string; mtimeMs: number; size: number }
  | { path: string; exists: false; error?: string }

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" })
  return (await res.json()) as T
}

export default function Home() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [defaultInfo, setDefaultInfo] = useState<DefaultInfo | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [lastAutoLoad, setLastAutoLoad] = useState<string>("—")
  const [loading, setLoading] = useState(true)

  const lastImport = summary?.lastImportAt ? new Date(summary.lastImportAt).toLocaleString() : "Never"

  const refresh = useCallback(async () => {
    const s = await getJson<Summary>("/api/summary")
    setSummary(s)
  }, [])

  const maybeAutoLoad = useCallback(async (info: DefaultInfo) => {
    if (!info.exists) return
    const prev = Number(localStorage.getItem("tally:lastDefaultMtimeMs") ?? 0)
    if (!info.mtimeMs || info.mtimeMs <= prev) return

    setStatus("Auto-loading latest export…")
    const res = await fetch("/api/import/auto", { method: "POST" })
    const body = (await res.json()) as { ok: boolean; error?: string; fileMtimeMs?: number }
    if (!body.ok) {
      setStatus(body.error ?? "Auto-load failed.")
      return
    }
    if (typeof body.fileMtimeMs === "number") {
      localStorage.setItem("tally:lastDefaultMtimeMs", String(body.fileMtimeMs))
      const now = Date.now()
      localStorage.setItem("tally:lastAutoLoadAt", String(now))
      setLastAutoLoad(new Date(now).toLocaleString())
    }
    setStatus(null)
  }, [])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const v = localStorage.getItem("tally:lastAutoLoadAt")
      const ms = v ? Number(v) : 0
      if (ms) setLastAutoLoad(new Date(ms).toLocaleString())

      const info = await getJson<DefaultInfo>("/api/import/default-info")
      setDefaultInfo(info)
      await maybeAutoLoad(info)
      await refresh()
      setLoading(false)
    })().catch((e) => {
      setStatus(e instanceof Error ? e.message : "Failed to load dashboard.")
      setLoading(false)
    })
  }, [maybeAutoLoad, refresh])

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-8">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Import your daily Tally "Godown Summary" and manage product prices.</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Products"
          value={loading ? "—" : (summary?.total ?? 0)}
          icon={Package}
          variant="default"
        />
        <StatCard
          title="In Stock"
          value={loading ? "—" : (summary?.inStock ?? 0)}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Out of Stock"
          value={loading ? "—" : (summary?.outOfStock ?? 0)}
          icon={XCircle}
          variant="muted"
        />
        <StatCard
          title="Negative Stock"
          value={loading ? "—" : (summary?.negative ?? 0)}
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Import section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Import Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImportControls
            onImported={() => {
              refresh().catch(() => {})
            }}
          />

          {/* Status message */}
          {status && (
            <p
              className={
                status.toLowerCase().includes("fail") ? "text-sm text-destructive" : "text-sm text-muted-foreground"
              }
            >
              {status}
            </p>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm border-t border-border pt-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Last import:</span>
              <span className="font-medium text-foreground">{lastImport}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Auto-load:</span>
              <span className="font-medium text-foreground">{lastAutoLoad}</span>
            </div>
          </div>

          {/* Default path info */}
          {defaultInfo && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <span className="font-medium">Default path:</span> {defaultInfo.path}{" "}
              {defaultInfo.exists ? (
                <span className="text-success">
                  • {defaultInfo.ext} • {new Date(defaultInfo.mtimeMs).toLocaleString()}
                </span>
              ) : (
                <span className="text-destructive">• Not found</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick action */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-semibold">Browse Products</h3>
              <p className="text-sm text-muted-foreground">
                Search, filter, and manage dealer prices for all your products.
              </p>
            </div>
            <Button asChild className="gap-2 shrink-0">
              <Link href="/products">
                Open Products
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
