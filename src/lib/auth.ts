"use client";

import { useEffect, useState, useCallback } from "react";

const AUTH_KEY = "tally:auth";
const AUTH_EVENT = "tally:authChanged";

// Account types: owner can import/edit, viewer can only view
export type UserRole = "owner" | "viewer";

// Simple hardcoded credentials for internal use
const VALID_USERS: Array<{ username: string; password: string; role: UserRole }> = [
  { username: "tom", password: "admin786", role: "owner" },
  { username: "ralhum", password: "rtx786", role: "viewer" },
];

export interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  token: string | null;
  role: UserRole | null;
}

interface StoredAuth {
  username: string;
  token: string;
  expiresAt: number;
  role: UserRole;
}

// Token validity: 30 days
const TOKEN_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000;

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function getStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    // Check if expired
    if (parsed.expiresAt < Date.now()) {
      window.localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function findUser(username: string, password: string) {
  return VALID_USERS.find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
  );
}

export function validateCredentials(username: string, password: string): boolean {
  return !!findUser(username, password);
}

export function login(username: string, password: string): { success: boolean; error?: string } {
  const user = findUser(username, password);
  if (!user) {
    return { success: false, error: "Invalid username or password" };
  }

  const token = generateToken();
  const auth: StoredAuth = {
    username: user.username,
    token,
    expiresAt: Date.now() + TOKEN_VALIDITY_MS,
    role: user.role,
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    window.dispatchEvent(new Event(AUTH_EVENT));
  }

  return { success: true };
}

export function logout(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_KEY);
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

export function useAuth(): AuthState & {
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  isLoading: boolean;
  isOwner: boolean;
} {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    username: null,
    token: null,
    role: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(() => {
    const stored = getStoredAuth();
    setState({
      isAuthenticated: !!stored,
      username: stored?.username ?? null,
      token: stored?.token ?? null,
      role: stored?.role ?? null,
    });
  }, []);

  // Initialize auth state on mount (client-side only)
  useEffect(() => {
    refreshAuth();
    setIsLoading(false);
  }, [refreshAuth]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_KEY) refreshAuth();
    };
    const onAuthEvent = () => refreshAuth();

    window.addEventListener("storage", onStorage);
    window.addEventListener(AUTH_EVENT, onAuthEvent);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_EVENT, onAuthEvent);
    };
  }, [refreshAuth]);

  const doLogin = useCallback((username: string, password: string) => {
    const result = login(username, password);
    if (result.success) {
      refreshAuth();
    }
    return result;
  }, [refreshAuth]);

  const doLogout = useCallback(() => {
    logout();
  }, []);

  return {
    ...state,
    login: doLogin,
    logout: doLogout,
    isLoading,
    isOwner: state.role === "owner",
  };
}
