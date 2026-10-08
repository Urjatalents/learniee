"use client";
import {
    type SessionTone
} from "@/features/shared/components/session-flow/sessionFlowText";
import type { SessionFlowState } from "@/features/shared/types/sessionFlow";
import { formatPlatformTime } from "@/lib/platformTime";

export interface Props {
  role: "teacher" | "parent";
  sessionId: string;
  /** Where "Back to home" goes. */
  homeHref: string;
  /** Rendered instead of the panel when the session is a legacy (pre-cycle) one. */
  renderLegacy: (state: SessionFlowState) => React.ReactNode;
}
export const TONE_BADGE: Record<SessionTone, string> = {
  info: "bg-violet-100 text-brand",
  success: "bg-green-100 text-green-600",
  warn: "bg-amber-100 text-amber-600",
  danger: "bg-red-100 text-red-500",
};
const BUTTON_BASE =
  "w-full flex items-center justify-center gap-2 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3.5 rounded-full transition-colors";
export const GREEN_BUTTON = `${BUTTON_BASE} bg-green-600 hover:bg-green-700`;
export const BRAND_BUTTON = `${BUTTON_BASE} bg-brand hover:bg-brand-dark`;
export const HEADER_CHIP =
  "inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/15 border border-white/20 rounded-full px-3 py-1.5";
export const PAGE = "p-4 sm:p-8 max-w-4xl mx-auto";
export function timeOf(iso: string | null) {
  return iso ? formatPlatformTime(new Date(iso)) : "";
}
export interface TimelineStep {
  key: string;
  label: string;
  detail: string;
  done: boolean;
}
