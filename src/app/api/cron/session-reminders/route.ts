import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { ClassSessionStatus } from "@prisma/client";
import { notifyClassSessionStartingSoon } from "@/features/shared/server/notificationTriggers.service";
import { PLATFORM_UTC_OFFSET_MINUTES } from "@/lib/platformConfig";

/**
 * GET /api/cron/session-reminders
 *
 * "Lecture will start in X" — this is the one notification type
 * that can't be triggered from a request handler, since nothing a
 * user does causes a class to be "about to start." It has to run on
 * a timer instead. Wired up as a Vercel Cron job (see vercel.json)
 * hitting this route every 5 minutes.
 *
 * IMPORTANT — confirm two things with Aman before relying on this in
 * production, both flagged rather than silently assumed:
 *
 * 1. Vercel Cron frequency is plan-gated. Hobby plan crons run at
 *    most once a day, which makes a "30 minutes before class"
 *    reminder useless in practice — you need at least a Pro plan for
 *    a 5-minute cadence. If still on Hobby, this route still works
 *    when hit manually/by an external scheduler, it just won't fire
 *    on its own on a useful cadence yet.
 * 2. Timezone: `08-PROJECT-KNOWLEDGE-BASE.md` §3 explicitly flags
 *    the platform timezone as "not yet explicitly decided — likely
 *    IST, confirm before hardcoding." This route DOES hardcode IST
 *    (UTC+5:30) to interpret `ClassSession.scheduledTime` (e.g.
 *    "16:00"), because there's no code path anywhere else in the
 *    repo that resolves this ambiguity either. If the real
 *    intended timezone turns out to be something else, only this
 *    file's `IST_OFFSET_MINUTES` needs to change — but it should be
 *    confirmed, not left as a silent assumption.
 *
 * Auth: expects `Authorization: Bearer ${CRON_SECRET}`. Vercel
 * automatically sends this header on Vercel Cron-triggered requests
 * once `CRON_SECRET` is set in the project's environment variables
 * — see https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs.
 */

const REMINDER_LEAD_MINUTES = 30;
// Single platform timezone — see src/lib/platformConfig.ts.
const IST_OFFSET_MINUTES = PLATFORM_UTC_OFFSET_MINUTES;

function computeSessionStartUtc(scheduledDate: Date, scheduledTime: string | null): Date | null {
  if (!scheduledTime) {
    return null;
  }

  const match = /^(\d{1,2}):(\d{2})$/.exec(scheduledTime.trim());
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }

  // scheduledDate is stored as local-midnight-of-the-calendar-date
  // (see classSession.service.ts's startOfDay()); read via UTC
  // getters since the Vercel runtime's local timezone is UTC.
  const year = scheduledDate.getUTCFullYear();
  const month = scheduledDate.getUTCMonth();
  const day = scheduledDate.getUTCDate();

  const wallClockAsUtcMillis = Date.UTC(year, month, day, hours, minutes);
  return new Date(wallClockAsUtcMillis - IST_OFFSET_MINUTES * 60_000);
}

export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const authHeader = req.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
    }

    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_LEAD_MINUTES * 60_000);

    // Bound the query to "today or tomorrow" first (scheduledDate is
    // indexed) — the exact minute-level check happens in JS below,
    // since scheduledTime is a plain string, not comparable in SQL.
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayEnd = new Date(dayStart.getTime() + 2 * 24 * 60 * 60 * 1000);

    const candidates = await prisma.classSession.findMany({
      where: {
        status: ClassSessionStatus.SCHEDULED,
        reminderSentAt: null,
        scheduledDate: { gte: dayStart, lt: dayEnd },
        scheduledTime: { not: null },
      },
      select: { id: true, scheduledDate: true, scheduledTime: true },
    });

    const due = candidates.filter((session) => {
      const startsAt = computeSessionStartUtc(session.scheduledDate, session.scheduledTime);
      return startsAt !== null && startsAt >= now && startsAt <= windowEnd;
    });

    for (const session of due) {
      const startsAt = computeSessionStartUtc(session.scheduledDate, session.scheduledTime)!;
      const minutesUntil = Math.max(1, Math.round((startsAt.getTime() - now.getTime()) / 60_000));

      await notifyClassSessionStartingSoon(session.id, minutesUntil);

      // Marked immediately after sending (not batched at the end) so
      // a mid-run crash still leaves already-sent sessions correctly
      // deduped on the next run.
      await prisma.classSession.update({
        where: { id: session.id },
        data: { reminderSentAt: new Date() },
      });
    }

    return NextResponse.json({ success: true, remindersSent: due.length });
  } catch (error) {
    console.error("Session reminder cron error:", error);

    return NextResponse.json(
      { error: "Failed to run session reminder job." },
      { status: 500 },
    );
  }
}
