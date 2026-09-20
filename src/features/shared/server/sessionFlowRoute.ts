import "server-only";

import { NextResponse } from "next/server";

import { SessionFlowError } from "@/features/shared/server/sessionFlow.service";

/**
 * Shared catch-block for the session-flow routes (`/api/teacher/
 * class-sessions/[id]/{start,end,cancel}`, `/api/parent/class-
 * sessions/[id]/{join,cancel}` and the two state GETs) — turns a
 * `SessionFlowError` into its own status/message and anything else
 * into a logged 500.
 */
export function sessionFlowErrorResponse(error: unknown, label: string, fallback: string) {
  if (error instanceof SessionFlowError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(`${label} error:`, error);

  return NextResponse.json({ error: fallback }, { status: 500 });
}
