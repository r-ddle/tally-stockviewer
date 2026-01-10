"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Package, LayoutDashboard, Database, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ownerHeaders, useOwner } from "@/lib/owner"
import { useEffect, useState } from "react"

export function AppHeader() {
  const pathname = usePathname()
  const owner = useOwner()
  const [serverMode, setServerMode] = useState<"owner" | "viewer" | null>(null)
  const [serverConfigured, setServerConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/auth/mode", { cache: "no-store", headers: ownerHeaders(owner.token) })
        type ModeResponse =
          | { ok: true; mode: "owner" | "viewer"; configured: boolean }
          | { ok: false; error?: string }
        const body = (await res.json().catch(() => null)) as ModeResponse | null
        if (cancelled) return
        if (body?.ok) {
          setServerMode(body.mode)
          setServerConfigured(body.configured)
        } else {
          setServerMode(null)
          setServerConfigured(null)
        }
      } catch {
        if (cancelled) return
        setServerMode(null)
        setServerConfigured(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [owner.token])

  const effectiveMode = serverMode ?? (owner.isOwner ? "owner" : "viewer")

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="hidden md:flex mx-auto h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
            <Database className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold tracking-tight text-foreground">Tally Stock</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Inventory Viewer</span>
          </div>
        </Link>

        {/* Navigation + mode */}
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              pathname === "/"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <Link
            href="/products"
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              pathname?.startsWith("/products")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Products</span>
          </Link>
          </nav>

          <Sheet>
            <SheetTrigger
              render={
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Shield className="h-4 w-4" />
                  {effectiveMode === "owner" ? "Owner" : "Viewer"}
                </Button>
              }
            />
            <SheetContent className="w-[420px] sm:w-[460px]">
              <SheetHeader>
                <SheetTitle>Access Mode</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="text-sm text-muted-foreground">
                  Viewer mode is read-only. Owner mode enables imports and price edits.
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Server mode:</span>{" "}
                  <span className="font-semibold">{effectiveMode === "owner" ? "Owner" : "Viewer"}</span>
                  {serverConfigured === false ? (
                    <span className="ml-2 text-muted-foreground">(OWNER_TOKEN not set)</span>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner-token">Owner token</Label>
                  <Input
                    id="owner-token"
                    placeholder="Enter owner token…"
                    value={owner.token ?? ""}
                    onChange={(e) => owner.setToken(e.target.value)}
                  />
                  {serverMode === "viewer" && owner.token ? (
                    <div className="text-sm text-destructive">
                      Token doesn't match the server. Check `OWNER_TOKEN` in `.env` and restart `npm run dev`.
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="secondary" onClick={() => owner.clear()}>
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="md:hidden flex items-center justify-center h-14 px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Database className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">Tally Stock</span>
        </Link>
      </div>
    </header>
  )
}

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-inset-bottom">
      <div className="flex items-stretch justify-around h-20 px-4">
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center justify-center gap-1 flex-1 rounded-2xl mx-1 my-2 transition-all active:scale-95",
            pathname === "/" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground active:bg-muted",
          )}
        >
          <LayoutDashboard className="h-7 w-7" strokeWidth={pathname === "/" ? 2.5 : 2} />
          <span className="text-sm font-semibold">Home</span>
        </Link>
        <Link
          href="/products"
          className={cn(
            "flex flex-col items-center justify-center gap-1 flex-1 rounded-2xl mx-1 my-2 transition-all active:scale-95",
            pathname?.startsWith("/products")
              ? "bg-primary text-primary-foreground shadow-lg"
              : "text-muted-foreground active:bg-muted",
          )}
        >
          <Package className="h-7 w-7" strokeWidth={pathname?.startsWith("/products") ? 2.5 : 2} />
          <span className="text-sm font-semibold">Products</span>
        </Link>
      </div>
    </nav>
  )
}
