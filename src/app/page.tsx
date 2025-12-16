"use client";

import { ImportControls } from "@/components/import-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Summary = {
  total: number;
  inStock: number;
  outOfStock: number;
  negative: number;
  unknown: number;
  lastImportAt: number | null;
};

type DefaultInfo =
  | { path: string; exists: true; ext: string; mtimeMs: number; size: number }
  | { path: string; exists: false; error?: string };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  return (await res.json()) as T;
}

export default function Home() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [defaultInfo, setDefaultInfo] = useState<DefaultInfo | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [lastAutoLoad, setLastAutoLoad] = useState<string>("—");

  const lastImport = summary?.lastImportAt
    ? new Date(summary.lastImportAt).toLocaleString()
    : "—";

  const refresh = useCallback(async () => {
    const s = await getJson<Summary>("/api/summary");
    setSummary(s);
  }, []);

  const maybeAutoLoad = useCallback(async (info: DefaultInfo) => {
    if (!info.exists) return;
    const prev = Number(localStorage.getItem("tally:lastDefaultMtimeMs") ?? 0);
    if (!info.mtimeMs || info.mtimeMs <= prev) return;

    setStatus("Auto-loading latest export…");
    const res = await fetch("/api/import/auto", { method: "POST" });
    const body = (await res.json()) as { ok: boolean; error?: string; fileMtimeMs?: number };
    if (!body.ok) {
      setStatus(body.error ?? "Auto-load failed.");
      return;
    }
    if (typeof body.fileMtimeMs === "number") {
      localStorage.setItem("tally:lastDefaultMtimeMs", String(body.fileMtimeMs));
      const now = Date.now();
      localStorage.setItem("tally:lastAutoLoadAt", String(now));
      setLastAutoLoad(new Date(now).toLocaleString());
    }
    setStatus("Auto-load complete.");
  }, []);

  useEffect(() => {
    (async () => {
      const v = localStorage.getItem("tally:lastAutoLoadAt");
      const ms = v ? Number(v) : 0;
      if (ms) setLastAutoLoad(new Date(ms).toLocaleString());

      const info = await getJson<DefaultInfo>("/api/import/default-info");
      setDefaultInfo(info);
      await maybeAutoLoad(info);
      await refresh();
    })().catch((e) => {
      setStatus(e instanceof Error ? e.message : "Failed to load dashboard.");
    });
  }, [maybeAutoLoad, refresh]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Import your daily Tally “Godown Summary” (XLSX or XML) and browse products with
          DB-backed dealer prices.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ImportControls
            onImported={() => {
              refresh().catch(() => {});
            }}
          />
          <div className="text-xs text-muted-foreground">
            Last import: <span className="font-medium text-foreground">{lastImport}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Last auto-load:{" "}
            <span className="font-medium text-foreground">{lastAutoLoad}</span>
          </div>
          {defaultInfo ? (
            <div className="text-xs text-muted-foreground">
              Default path:{" "}
              <span className="font-medium text-foreground">{defaultInfo.path}</span>{" "}
              {defaultInfo.exists ? (
                <span className="text-muted-foreground">
                  - {defaultInfo.ext} -{" "}
                  {new Date(defaultInfo.mtimeMs).toLocaleString()}
                </span>
              ) : (
                <span className="text-rose-600">
                  - Missing ({defaultInfo.error ?? "cannot read"})
                </span>
              )}
            </div>
          ) : null}
          {status ? (
            <div className={status.toLowerCase().includes("fail") ? "text-sm text-rose-600" : "text-sm text-muted-foreground"}>
              {status}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {(summary?.total ?? 0).toLocaleString("en-IN")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {(summary?.inStock ?? 0).toLocaleString("en-IN")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {(summary?.outOfStock ?? 0).toLocaleString("en-IN")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Negative
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {(summary?.negative ?? 0).toLocaleString("en-IN")}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <div>
          <div className="text-sm font-medium">Browse products</div>
          <div className="text-xs text-muted-foreground">
            Search, filter by brand/stock, and open a product drawer.
          </div>
        </div>
        <Button asChild>
          <Link href="/products">
            Open table <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </main>
  );
}
