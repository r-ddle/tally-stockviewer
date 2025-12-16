"use client"

import { ImportControls } from "@/components/import-controls"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Package, CheckCircle2, XCircle, AlertTriangle, Clock, FileText } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useIsMobile } from "@/lib/use-is-mobile"
import { ownerHeaders, useOwner } from "@/lib/owner"

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

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init })
  return (await res.json()) as T
}

export default function Home() {
  const isMobile = useIsMobile()
  const owner = useOwner()
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
    const res = await fetch("/api/import/auto", { method: "POST", headers: ownerHeaders(owner.token) })
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
  }, [owner.token])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const v = localStorage.getItem("tally:lastAutoLoadAt")
      const ms = v ? Number(v) : 0
      if (ms) setLastAutoLoad(new Date(ms).toLocaleString())

      if (!isMobile && owner.isOwner) {
        const info = await getJson<DefaultInfo>("/api/import/default-info", {
          headers: ownerHeaders(owner.token),
        })
        setDefaultInfo(info)
        await maybeAutoLoad(info)
      } else {
        setDefaultInfo(null)
      }
      await refresh()
      setLoading(false)
    })().catch((e) => {
      setStatus(e instanceof Error ? e.message : "Failed to load dashboard.")
      setLoading(false)
    })
  }, [isMobile, maybeAutoLoad, owner.isOwner, owner.token, refresh])

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 md:py-6 space-y-6 md:space-y-8">
      {/* Page header */}
      <div className="space-y-2 md:space-y-1">
        <h1 className="text-3xl md:text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-lg md:text-base text-muted-foreground">
          View up-to-date Tally product stock and prices at a glance.
        </p>
      </div>

      <div className="grid gap-2 grid-cols-1 lg:grid-cols-4">
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
      <Card className="border-2 md:border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl md:text-base">
            <FileText className="h-6 w-6 md:h-5 md:w-5 text-muted-foreground" />
            Import Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isMobile && owner.isOwner ? (
            <ImportControls
              onImported={() => {
                refresh().catch(() => {})
              }}
            />
          ) : (
            <div className="text-base md:text-sm text-muted-foreground">
              {isMobile ? "Mobile is read-only." : "Viewer mode is read-only."} Open this app on the owner desktop to
              import the daily export and update stock.
            </div>
          )}

          {/* Status message */}
          {status && (
            <p
              className={
                status.toLowerCase().includes("fail")
                  ? "text-base md:text-sm text-destructive font-medium"
                  : "text-base md:text-sm text-muted-foreground"
              }
            >
              {status}
            </p>
          )}

          {/* Metadata - simplified on mobile */}
          <div className="flex flex-col md:flex-row md:flex-wrap items-start md:items-center gap-3 md:gap-x-6 md:gap-y-2 text-base md:text-sm border-t border-border pt-4">
            <div className="flex items-center gap-2 text-muted-foreground w-full md:w-auto justify-between md:justify-start">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5 md:h-4 md:w-4" />
                Last import:
              </span>
              <span className="font-semibold text-foreground">{lastImport}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground w-full md:w-auto justify-between md:justify-start">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5 md:h-4 md:w-4" />
                Auto-load:
              </span>
              <span className="font-semibold text-foreground">{lastAutoLoad}</span>
            </div>
          </div>

          {/* Default path info - hidden on mobile for simplicity */}
          {defaultInfo && (
            <div className="hidden md:block text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <span className="font-medium">Default path:</span> {defaultInfo.path}{" "}
              {defaultInfo.exists ? (
                <span className="text-success">
                  · {defaultInfo.ext} · {new Date(defaultInfo.mtimeMs).toLocaleString()}
                </span>
              ) : (
                <span className="text-destructive">Not found</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 border-primary/20">
        <CardContent className="p-6 md:p-6">
          <div className="flex flex-col gap-4">
            <div className="space-y-2 md:space-y-1">
              <h3 className="text-xl md:text-base font-semibold">Browse Products</h3>
              <p className="text-base md:text-sm text-muted-foreground">
                Search, filter, and manage dealer prices for all your products.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="h-16 md:h-10 text-lg md:text-sm font-semibold rounded-2xl md:rounded-md gap-3 shadow-lg active:scale-[0.98] transition-transform w-full md:w-auto md:self-start"
            >
              <Link href="/products">
                Open Products
                <ArrowRight className="h-6 w-6 md:h-4 md:w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
