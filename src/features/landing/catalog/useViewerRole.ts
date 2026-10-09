"use client";

import { useSyncExternalStore } from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

/**
 * Who is looking at a public page, read from the same `idToken` cookie the
 * app already sets at login. UI-only: it decides which link to show. It is
 * NOT a security check — /parent/* is still gated by middleware and the APIs.
 *
 * `null` = not known yet (server render / first paint) — treat as anonymous.
 */
export type ViewerRole = "anonymous" | "parent" | "other";

interface TokenPayload {
  exp?: number;
  "custom:role"?: string;
}

function readRole(): ViewerRole {
  const token = Cookies.get("idToken");
  if (!token) return "anonymous";

  try {
    const decoded = jwtDecode<TokenPayload>(token);
    if (typeof decoded.exp !== "number" || decoded.exp * 1000 <= Date.now()) return "anonymous";
    return decoded["custom:role"] === "parent" ? "parent" : "other";
  } catch {
    return "anonymous";
  }
}

const subscribe = () => () => {};
const getServerSnapshot = (): ViewerRole | null => null;

export function useViewerRole(): ViewerRole | null {
  return useSyncExternalStore(subscribe, readRole, getServerSnapshot);
}
