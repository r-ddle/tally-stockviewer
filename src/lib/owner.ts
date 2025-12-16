"use client";

import { useEffect, useMemo, useState } from "react";

const KEY = "tally:ownerToken";
const EVENT = "tally:ownerTokenChanged";

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
  window.dispatchEvent(new Event(EVENT));
}

export function clearOwnerToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function useOwner() {
  const [token, setToken] = useState<string | null>(() => getOwnerToken());

  useEffect(() => {
    const refresh = () => setToken(getOwnerToken());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT, refresh);
    };
  }, []);

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
