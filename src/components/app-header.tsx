"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Tally Stock Viewer
        </Link>
        <nav className="ml-auto flex items-center gap-2 text-sm">
          <Link
            href="/"
            className={cn(
              "rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground",
              pathname === "/" && "bg-muted text-foreground",
            )}
          >
            Dashboard
          </Link>
          <Link
            href="/products"
            className={cn(
              "rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground",
              pathname?.startsWith("/products") && "bg-muted text-foreground",
            )}
          >
            Products
          </Link>
        </nav>
      </div>
    </header>
  );
}

