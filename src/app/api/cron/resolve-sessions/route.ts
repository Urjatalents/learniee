import { NextResponse } from "next/server";

import { runSessionSweep } from "@/features/shared/server/sessionResolve.service";

/**
 * GET /api/cron/resolve-sessions
 *
 * The backstop sweep for session outcomes (Part 1B): resolves every
 * cycle session still unresolved 15 minutes after its scheduled end,
 * and re-applies the counters for a completed session whose request
 * died half-way. Everything it does is idempotent, and sessions are
 * ALSO resolved when the teacher taps End and whenever one is read
 * after its end time — so this route is a safety net, not a
 * dependency. Call it from whatever scheduler the current host has
 * (Vercel Cron, a system cron `curl`, a GitHub Actions schedule, …)
 * as often as it allows: every 5 minutes is ideal, once a day still
 * bounds how long a forgotten session can sit unresolved.
 *
 * Part 1C: the same sweep also applies any make-up / strike / notice
 * that a request left behind, re-applies approved teacher leave, and
 * closes every cycle that is due (all sessions settled, or day 45
 * passed). All of it is idempotent, and each step is also triggered
 * from the request that causes it, so nothing here needs a
 * host-specific scheduler.
 *
 * Auth: expects `Authorization: Bearer ${CRON_SECRET}`, same
 * convention as the other cron routes.
 */
export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const authHeader = req.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
    }

    const result = await runSessionSweep();

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Resolve sessions cron error:", error);

    return NextResponse.json(
      { error: "Failed to run the session resolve sweep." },
      { status: 500 },
    );
  }
}
