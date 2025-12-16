"use client";

import { useEffect, useState, useCallback } from "react";

const AUTH_KEY = "tally:auth";
const AUTH_EVENT = "tally:authChanged";

// Simple hardcoded credentials for internal use
const VALID_CREDENTIALS = {
  username: "ralhum",
  password: "rtx786",
};

export interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  token: string | null;
}

interface StoredAuth {
  username: string;
  token: string;
  expiresAt: number;
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

export function validateCredentials(username: string, password: string): boolean {
  return (
    username.trim().toLowerCase() === VALID_CREDENTIALS.username.toLowerCase() &&
    password === VALID_CREDENTIALS.password
  );
}

export function login(username: string, password: string): { success: boolean; error?: string } {
  if (!validateCredentials(username, password)) {
    return { success: false, error: "Invalid username or password" };
  }

  const token = generateToken();
  const auth: StoredAuth = {
    username: username.trim(),
    token,
    expiresAt: Date.now() + TOKEN_VALIDITY_MS,
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
} {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    username: null,
    token: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(() => {
    const stored = getStoredAuth();
    setState({
      isAuthenticated: !!stored,
      username: stored?.username ?? null,
      token: stored?.token ?? null,
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Read initial auth state
    const stored = getStoredAuth();
    setState({
      isAuthenticated: !!stored,
      username: stored?.username ?? null,
      token: stored?.token ?? null,
    });
    setIsLoading(false);

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
  };
}
