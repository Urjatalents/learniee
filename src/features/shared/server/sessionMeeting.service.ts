import "server-only";

import { ClassSessionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createMeetSpace, ensureMeetCoHost, isGoogleMeetEnabled } from "@/lib/googleMeet";

/**
 * The Google Meet room of a cycle-model session. Meet only supplies
 * the room: Start / Join / End and every outcome rule stay exactly as
 * they were (`sessionFlow.service.ts`, `sessionResolve.service.ts`).
 *
 * The room is created lazily on the first Start or Join (never when a
 * cycle's sessions are bulk-created), once per session. Any failure is
 * logged and returns null — a Meet outage must never block a class
 * from being started, joined or ended; the page offers a retry.
 *
 * Co-host (Oct 6, 2026): the teacher must be a co-host in EVERY class.
 * It is no longer a one-shot, best-effort call at room creation.
 * `syncTeacherCohost()` adds the teacher, reads the member list back
 * to confirm it, retries transient Google errors, and records the
 * confirmed email on the session. It runs whenever a room is created
 * and whenever the teacher taps Start / Rejoin while the session is not
 * yet confirmed (or the teacher's email changed). Idempotent.
 */

export interface CohostSyncOptions {
  /** Re-check with Google even if the session is already marked confirmed. */
  force?: boolean;
}

interface CohostSession {
  id: string;
  meetSpaceName: string | null;
  meetCohostEmail: string | null;
  teacher: { email: string | null };
}

function sameEmail(a: string | null, b: string | null): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** True when Meet has confirmed the teacher's CURRENT email as co-host. */
export function isCohostConfirmed(session: {
  meetCohostEmail: string | null;
  teacher: { email: string | null };
}): boolean {
  return sameEmail(session.meetCohostEmail, session.teacher.email);
}

/** Makes sure the teacher is a confirmed co-host of the session's room. Never throws. */
async function syncTeacherCohost(
  session: CohostSession,
  options: CohostSyncOptions = {},
): Promise<boolean> {
  if (!session.meetSpaceName) return false;

  if (!options.force && isCohostConfirmed(session)) return true;

  const teacherEmail = session.teacher.email?.trim() || null;
  const now = new Date();

  try {
    if (!teacherEmail) {
      await prisma.classSession.update({
        where: { id: session.id },
        data: {
          meetCohostCheckedAt: now,
          meetCohostAttempts: { increment: 1 },
          meetCohostError: "The teacher has no email address on file.",
        },
      });

      return false;
    }

    const result = await ensureMeetCoHost(session.meetSpaceName, teacherEmail);

    await prisma.classSession.update({
      where: { id: session.id },
      data: result.confirmed
        ? {
            meetCohostEmail: teacherEmail,
            meetCohostConfirmedAt: now,
            meetCohostCheckedAt: now,
            meetCohostAttempts: { increment: 1 },
            meetCohostError: null,
          }
        : {
            // A changed email must not keep an old confirmation alive.
            meetCohostEmail: null,
            meetCohostConfirmedAt: null,
            meetCohostCheckedAt: now,
            meetCohostAttempts: { increment: 1 },
            meetCohostError: result.error,
          },
    });

    if (result.confirmed) {
      console.info(`Meet co-host confirmed for session ${session.id}: ${teacherEmail}`);
    } else {
      console.warn(
        `Meet co-host NOT confirmed for session ${session.id} (${teacherEmail}): ${result.error}`,
      );
    }

    return result.confirmed;
  } catch (err) {
    console.error(
      `Meet co-host sync failed for session ${session.id}:`,
      err instanceof Error ? err.message : err,
    );

    return false;
  }
}

const sessionSelect = {
  id: true,
  status: true,
  cycleId: true,
  meetSpaceName: true,
  meetingUri: true,
  meetCohostEmail: true,
  teacher: { select: { email: true } },
} as const;

/**
 * Returns the session's Meet link, creating the room if it doesn't
 * exist yet, and (for a live session) making sure the teacher is a
 * confirmed co-host. Null when the feature is off, the session isn't a
 * live cycle session, or Google failed to create the room. A co-host
 * problem never makes this return null — it is recorded on the session
 * (`meetCohostError`) and shown to the teacher, who can retry.
 */
export async function ensureSessionMeeting(
  sessionId: string,
  options: CohostSyncOptions = {},
): Promise<string | null> {
  if (!isGoogleMeetEnabled()) return null;

  try {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      select: sessionSelect,
    });

    if (!session || session.cycleId === null) return null;

    if (session.meetingUri) {
      if (session.status === ClassSessionStatus.SCHEDULED) {
        await syncTeacherCohost(session, options);
      }

      return session.meetingUri;
    }

    if (session.status !== ClassSessionStatus.SCHEDULED) return null;

    const space = await createMeetSpace();

    // Conditional write: if Start and Join raced, the first one wins
    // and the other adopts its link (the extra empty space is harmless).
    const claimed = await prisma.classSession.updateMany({
      where: { id: session.id, meetingUri: null },
      data: { meetSpaceName: space.name, meetingUri: space.meetingUri },
    });

    // Whoever won, co-host is applied to the room that was kept.
    const kept = await prisma.classSession.findUnique({
      where: { id: session.id },
      select: sessionSelect,
    });

    if (kept?.meetingUri) {
      await syncTeacherCohost(kept, claimed.count === 1 ? { force: true } : options);
    }

    return kept?.meetingUri ?? null;
  } catch (err) {
    console.error(
      `Google Meet room creation failed for session ${sessionId}:`,
      err instanceof Error ? err.message : err,
    );

    return null;
  }
}
