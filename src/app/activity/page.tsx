"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityTable, type ActivityItem } from "@/components/activity-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { CalendarClock, Filter, RefreshCcw, Search, X } from "lucide-react"

type ChangeTypeFilter = "all" | ActivityItem["changeType"]
type TimeRange = "7" | "14" | "30" | "90" | "all"

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" })
  return (await res.json()) as T
}

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [changeType, setChangeType] = useState<ChangeTypeFilter>("all")
  const [timeRange, setTimeRange] = useState<TimeRange>("30")

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const body = await getJson<{ items: ActivityItem[] }>("/api/changes?limit=300")
      setItems(body.items ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh().catch(() => {})
  }, [refresh])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const now = Date.now()
    const sinceMs = timeRange === "all" ? null : now - Number(timeRange) * 24 * 60 * 60 * 1000

    return items
      .filter((item) => {
        if (sinceMs && item.createdAt < sinceMs) return false
        if (changeType !== "all" && item.changeType !== changeType) return false
        if (!q) return true
        return `${item.name} ${item.brand ?? ""}`.toLowerCase().includes(q)
      })
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [changeType, items, search, timeRange])

  const hasFilters = search || changeType !== "all" || timeRange !== "30"

  const calendarDays = useMemo(() => {
    const counts = new Map<string, number>()
    items.forEach((it) => {
      const day = new Date(it.createdAt)
      day.setHours(0, 0, 0, 0)
      const key = day.toISOString().slice(0, 10)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })

    const days: Array<{ key: string; label: string; count: number; isToday: boolean }> = []
    const formatter = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" })
    for (let i = 0; i < 14; i += 1) {
      const day = new Date()
      day.setHours(0, 0, 0, 0)
      day.setDate(day.getDate() - i)
      const key = day.toISOString().slice(0, 10)
      days.push({
        key,
        label: formatter.format(day),
        count: counts.get(key) ?? 0,
        isToday: i === 0,
      })
    }
    return days
  }, [items])

  const resetFilters = () => {
    setSearch("")
    setChangeType("all")
    setTimeRange("30")
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 md:py-12 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">Activity</h1>
          <p className="mt-1 text-muted-foreground">Track stock and price updates across products.</p>
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

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Filters */}
      <Card className="border border-border bg-card p-4 md:p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by product or brand"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters:</span>
            </div>

            <Select value={changeType} onValueChange={(v) => setChangeType(v as ChangeTypeFilter)}>
              <SelectTrigger className="w-[170px] h-9 rounded-lg">
                <SelectValue>Change type</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="NEW_PRODUCT">New product</SelectItem>
                <SelectItem value="STOCK_DROP">Stock drop</SelectItem>
                <SelectItem value="OUT_OF_STOCK">Out of stock</SelectItem>
                <SelectItem value="PRICE_CHANGE">Price change</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-[150px] h-9 rounded-lg">
                <SelectValue>Time range</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-9 px-3 rounded-lg text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {search && (
              <Badge variant="secondary" className="gap-1.5 rounded-full px-3">
                {search}
                <button onClick={() => setSearch("")}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {changeType !== "all" && (
              <Badge variant="secondary" className="gap-1.5 rounded-full px-3">
                {changeType.replace(/_/g, " ")}
                <button onClick={() => setChangeType("all")}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {timeRange !== "30" && (
              <Badge variant="secondary" className="gap-1.5 rounded-full px-3">
                {timeRange === "all" ? "All time" : `Last ${timeRange} days`}
                <button onClick={() => setTimeRange("30")}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing <span className="font-medium text-foreground">{filtered.length.toLocaleString("en-IN")}</span>
            {filtered.length !== items.length && (
              <span>
                {" "}of {items.length.toLocaleString("en-IN")}
              </span>
            )} changes
          </span>
          <span className="flex items-center gap-2 text-xs sm:text-sm">
            <CalendarClock className="h-4 w-4" />
            Updated days shown below
          </span>
        </div>
      </Card>

      {/* Update cadence */}
      <Card className="border border-border bg-card p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Update cadence</h2>
            <p className="text-sm text-muted-foreground">Last 14 days of stock or price updates.</p>
          </div>
          <Badge variant="outline" className="rounded-full">
            {calendarDays.filter((d) => d.count > 0).length} / 14 days updated
          </Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
          {calendarDays.map((day) => (
            <div
              key={day.key}
              className={cn(
                "rounded-xl border p-3 space-y-2 transition-colors",
                day.count > 0 ? "border-primary/40 bg-primary/5" : "border-border"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", day.count > 0 ? "bg-primary" : "bg-muted-foreground/40")}></span>
                  <span className="text-sm font-medium">
                    {day.label}
                    {day.isToday ? " · Today" : ""}
                  </span>
                </div>
                <Badge variant={day.count > 0 ? "secondary" : "outline"} className="rounded-full px-2">
                  {day.count}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {day.count > 0 ? "Updates logged" : "No updates captured"}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Activity table */}
      <Card className="border border-border bg-card overflow-hidden">
        <ActivityTable items={filtered} loading={loading} />
      </Card>
    </div>
  )
}
