"use client";

import { useMemo, useState } from "react";

const KEY = "tally:ownerToken";

export function getOwnerToken(): string | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(KEY);
  return v && v.trim() ? v.trim() : null;
}

export function setOwnerToken(token: string) {
  if (typeof window === "undefined") return;
  const t = token.trim();
  if (!t) window.localStorage.removeItem(KEY);
  else window.localStorage.setItem(KEY, t);
}

export function clearOwnerToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function useOwner() {
  const [token, setToken] = useState<string | null>(() => getOwnerToken());

  const isOwner = useMemo(() => Boolean(token), [token]);

  return {
    token,
    isOwner,
    setToken: (next: string) => {
      setOwnerToken(next);
      setToken(getOwnerToken());
    },
    clear: () => {
      clearOwnerToken();
      setToken(null);
    },
  };
}

export function ownerHeaders(token?: string | null): Record<string, string> {
  return token ? { "x-owner-token": token } : {};
}
