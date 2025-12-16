"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useAuth, type AuthState } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (auth.isLoading) return;

    // Redirect unauthenticated users to login
    if (!auth.isAuthenticated && pathname !== "/login") {
      router.replace("/login");
    }

    // Redirect authenticated users away from login
    if (auth.isAuthenticated && pathname === "/login") {
      router.replace("/");
    }
  }, [auth.isAuthenticated, auth.isLoading, pathname, router]);

  // Show nothing while loading to prevent flash
  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
