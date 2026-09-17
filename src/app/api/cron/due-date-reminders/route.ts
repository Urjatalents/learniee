import { NextResponse } from "next/server";

import { runDueDateReminderCheck } from "@/features/shared/server/dueDateReminder.service";

/**
 * GET /api/cron/due-date-reminders
 *
 * Daily sweep that notifies a Parent 5 days before their
 * Enrollment's `dueDate` (04-BUILD-PLAN-TIMELINE.md Week 4 /
 * MVP "Done" checklist item 8). Wired up as a Vercel Cron job (see
 * vercel.json) — like `/api/cron/enrollment-auto-lapse`, a 5-day
 * lead time has no need for tight cadence, so this runs once a day
 * and works unchanged on the Hobby plan.
 *
 * Auth: expects `Authorization: Bearer ${CRON_SECRET}`, same
 * convention as the other cron routes. Vercel sends this header
 * automatically on Vercel Cron-triggered requests once `CRON_SECRET`
 * is set in the project's environment variables — see
 * https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs.
 * Can also be triggered manually (e.g. `curl` with the same header)
 * for testing, or by an external scheduler if still on a plan/host
 * where Vercel Cron isn't available.
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

    const result = await runDueDateReminderCheck();

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Due-date reminder cron error:", error);

    return NextResponse.json(
      { error: "Failed to run due-date reminder job." },
      { status: 500 },
    );
  }
}
