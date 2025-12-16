"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Package, CheckCircle2, XCircle, AlertTriangle, RefreshCcw } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type Summary = {
  total: number
  inStock: number
  outOfStock: number
  negative: number
  unknown: number
  lastImportAt: number | null
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" })
  return (await res.json()) as T
}

export default function Home() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const lastImport = summary?.lastImportAt
    ? new Date(summary.lastImportAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Never"

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const s = await getJson<Summary>("/api/summary")
      setSummary(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh().catch(() => {})
  }, [refresh])

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 md:py-12">
      {/* Header section */}
      <div className="mb-8 md:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="mt-1 text-muted-foreground">
              Last updated: <span className="font-medium text-foreground">{lastImport}</span>
            </p>
          </div>
          <Button
            variant="outline"
            onClick={refresh}
            disabled={loading}
            className="gap-2 h-10 rounded-xl"
          >
            <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-8 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
        <StatCard
          label="Total Products"
          value={loading ? "—" : summary?.total ?? 0}
          icon={Package}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          label="In Stock"
          value={loading ? "—" : summary?.inStock ?? 0}
          icon={CheckCircle2}
          iconColor="text-success"
          iconBg="bg-success/10"
        />
        <StatCard
          label="Out of Stock"
          value={loading ? "—" : summary?.outOfStock ?? 0}
          icon={XCircle}
          iconColor="text-muted-foreground"
          iconBg="bg-muted"
        />
        <StatCard
          label="Negative"
          value={loading ? "—" : summary?.negative ?? 0}
          icon={AlertTriangle}
          iconColor="text-destructive"
          iconBg="bg-destructive/10"
        />
      </div>

      {/* Quick action */}
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-lg md:text-xl font-semibold text-foreground">
              Browse Products
            </h2>
            <p className="text-muted-foreground">
              Search, filter, and view pricing for all inventory items.
            </p>
          </div>
          <Button asChild size="lg" className="rounded-xl gap-2 font-medium shrink-0">
            <Link href="/products">
              View Products
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
}: {
  label: string
  value: number | string
  icon: typeof Package
  iconColor: string
  iconBg: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl md:text-3xl font-semibold tabular-nums">
            {typeof value === "number" ? value.toLocaleString("en-IN") : value}
          </p>
        </div>
        <div className={cn("p-2 rounded-lg shrink-0", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  )
}
