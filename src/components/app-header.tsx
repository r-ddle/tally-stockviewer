"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Package, LayoutDashboard, Database } from "lucide-react"

export function AppHeader() {
  const pathname = usePathname()

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

        {/* Navigation */}
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
