import "server-only";

import { prisma } from "@/lib/prisma";
import { EnrollmentStatus } from "@prisma/client";

import { notifyEnrollmentDueDateReminder } from "@/features/shared/server/notificationTriggers.service";

/**
 * Enrollment due-date payment reminder (04-BUILD-PLAN-TIMELINE.md
 * Week 4 scope / MVP "Done" checklist item 8: "Reminder fires 5
 * days before due date"). `export.service.ts`'s Tuition Ledger
 * export has flagged since it was written that this was only a
 * visual `isDueSoon` flag on that report, not a real reminder — this
 * file is that missing piece.
 *
 * Scope: only `ACTIVE` enrollments — `dueDate` isn't a meaningful
 * "payment coming up" signal for an enrollment still mid
 * dual-approval, already rejected/cancelled, or already lapsed.
 * Mirrors `enrollmentAutoLapse.service.ts`'s status scoping.
 *
 * Window, not an exact-day match: a daily cron can't reliably land
 * on the literal calendar day 5 days out (time-of-day drift), so a
 * row is due for its reminder once `dueDate` falls at or inside the
 * `REMINDER_LEAD_DAYS`-day window from "now" and hasn't passed yet.
 * `dueDateReminderSentAt` is set the moment the notification is
 * sent, so re-running the sweep (a retried cron tick, a manual
 * trigger) never double-sends for the same row — same idempotency
 * pattern as `ClassSession.reminderSentAt` /
 * `Enrollment.lastClassAt`-based auto-lapse.
 *
 * `dueDate` is currently set once at Enrollment creation (or by a
 * Teacher's approval-time revision) and is never advanced by any
 * recurring-billing job (03-DATA-MODEL.md — no such job exists yet),
 * so this fires at most once per Enrollment today. If a future
 * cycle-renewal feature starts advancing `dueDate` forward, it
 * should also clear `dueDateReminderSentAt` so the next cycle's due
 * date gets its own reminder.
 */

export const REMINDER_LEAD_DAYS = 5;
const REMINDER_LEAD_MS = REMINDER_LEAD_DAYS * 24 * 60 * 60 * 1000;

export interface DueDateReminderResult {
  checked: number;
  reminded: number;
  remindedEnrollmentIds: string[];
}

/**
 * Scans every `ACTIVE` enrollment with no reminder sent yet and
 * notifies the ones whose `dueDate` is now within
 * `REMINDER_LEAD_DAYS` days. Safe to call repeatedly and safe to
 * call from a cron or manually. Each row is handled independently so
 * one bad row can't block the rest.
 */
export async function runDueDateReminderCheck(now: Date = new Date()): Promise<DueDateReminderResult> {
  const windowEnd = new Date(now.getTime() + REMINDER_LEAD_MS);

  const candidates = await prisma.enrollment.findMany({
    where: {
      status: EnrollmentStatus.ACTIVE,
      dueDateReminderSentAt: null,
      dueDate: { gte: now, lte: windowEnd },
    },
    select: { id: true, dueDate: true },
  });

  const remindedEnrollmentIds: string[] = [];

  for (const enrollment of candidates) {
    try {
      // Re-check inside the update itself so two overlapping runs
      // (e.g. a manual trigger during a scheduled one) can't both
      // "win" and double-send for the same row.
      const updated = await prisma.enrollment.updateMany({
        where: { id: enrollment.id, dueDateReminderSentAt: null },
        data: { dueDateReminderSentAt: now },
      });

      if (updated.count === 0) {
        continue;
      }

      const daysUntilDue = Math.max(
        1,
        Math.ceil((enrollment.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
      );

      await notifyEnrollmentDueDateReminder(enrollment.id, daysUntilDue);

      remindedEnrollmentIds.push(enrollment.id);
    } catch (err) {
      // One enrollment's failure must never stop the sweep from
      // checking the rest — same reasoning as notifyX()'s safe()
      // wrapper in notificationTriggers.service.ts.
      console.error(`Due-date reminder failed for enrollment ${enrollment.id}:`, err);
    }
  }

  return {
    checked: candidates.length,
    reminded: remindedEnrollmentIds.length,
    remindedEnrollmentIds,
  };
}
