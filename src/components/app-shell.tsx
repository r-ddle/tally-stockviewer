"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/components/auth-provider";
import { Package, LayoutDashboard, LogOut, User, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { isAuthenticated, username, logout } = useAuthContext();

  // Don't show navigation on login page
  if (pathname === "/login" || !isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header - Desktop */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                <Package className="h-5 w-5" />
              </div>
              <div className="hidden sm:block">
                <span className="font-semibold text-foreground">Tally Stock</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <NavLink href="/" active={pathname === "/"}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </NavLink>
              <NavLink href="/products" active={pathname?.startsWith("/products")}>
                <Package className="h-4 w-4" />
                Products
              </NavLink>
              <NavLink href="/activity" active={pathname?.startsWith("/activity")}>
                <Activity className="h-4 w-4" />
                Activity
              </NavLink>
            </nav>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" className="h-10 gap-2 px-3 rounded-xl">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  Signed in as <span className="font-medium text-foreground">{username}</span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border/40 safe-area-pb">
        <div className="flex items-stretch h-16 px-6">
          <MobileNavLink href="/" active={pathname === "/"}>
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-xs font-medium">Home</span>
          </MobileNavLink>
          <MobileNavLink href="/products" active={pathname?.startsWith("/products")}>
            <Package className="h-5 w-5" />
            <span className="text-xs font-medium">Products</span>
          </MobileNavLink>
          <MobileNavLink href="/activity" active={pathname?.startsWith("/activity")}>
            <Activity className="h-5 w-5" />
            <span className="text-xs font-medium">Activity</span>
          </MobileNavLink>
        </div>
      </nav>
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      {children}
    </Link>
  );
}
