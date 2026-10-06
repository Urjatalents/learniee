import "server-only";

import { ClassSessionStatus, type Prisma } from "@prisma/client";

import { rankOrganizers } from "@/features/shared/utils/meetOrganizerPool";
import { prisma } from "@/lib/prisma";
import {
  createMeetSpace,
  ensureMeetCoHost,
  getMeetOrganizers,
  isGoogleMeetEnabled,
} from "@/lib/googleMeet";

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
 *
 * Organizer pool (Oct 6, 2026): rooms are spread over several Workspace
 * accounts. A new room goes to a FREE account (none owns a room whose
 * class overlaps this one); if all are busy, to the least recently used.
 * If Google refuses the chosen account, the next one is tried. The owner
 * is stored on the session (`meetOrganizerEmail`) because every later
 * call about the room (co-host, members) must be made as its owner.
 * Rooms from before the pool have no owner stored: they belong to the
 * first/default organizer.
 */

export interface CohostSyncOptions {
  /** Re-check with Google even if the session is already marked confirmed. */
  force?: boolean;
}

interface CohostSession {
  id: string;
  meetSpaceName: string | null;
  meetOrganizerEmail: string | null;
  meetCohostEmail: string | null;
  teacher: { email: string | null };
}

/** The account that owns this session's room. */
function organizerOf(session: { meetOrganizerEmail: string | null }): string | null {
  return session.meetOrganizerEmail ?? getMeetOrganizers()[0] ?? null;
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

  const organizer = organizerOf(session);

  if (!organizer) return false;

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

    const result = await ensureMeetCoHost(session.meetSpaceName, teacherEmail, organizer);

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
  startsAt: true,
  endsAt: true,
  meetSpaceName: true,
  meetingUri: true,
  meetOrganizerEmail: true,
  meetCohostEmail: true,
  teacher: { select: { email: true } },
} as const;

/**
 * Chooses the organizer for a new room and notes the choice on the
 * session. Returns the full preference list (best first) so the caller
 * can fall over to the next account. With one account there is nothing
 * to decide. The decision runs under a database-wide advisory lock so
 * two classes starting in the same moment don't both pick the same
 * "free" account.
 */
async function chooseOrganizers(session: {
  id: string;
  startsAt: Date | null;
  endsAt: Date | null;
}): Promise<string[]> {
  const organizers = getMeetOrganizers();

  if (organizers.length <= 1) return organizers;

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('learniee-meet-organizer-allocation'))`;

    // Accounts that already own a room for an overlapping class.
    const overlapping =
      session.startsAt && session.endsAt
        ? await tx.classSession.findMany({
            where: {
              id: { not: session.id },
              status: ClassSessionStatus.SCHEDULED,
              meetingUri: { not: null },
              startsAt: { lt: session.endsAt },
              endsAt: { gt: session.startsAt },
            },
            select: { meetOrganizerEmail: true },
          })
        : [];

    const busy = new Set<string>(
      overlapping.map((row: { meetOrganizerEmail: string | null }) =>
        (row.meetOrganizerEmail ?? organizers[0]).toLowerCase(),
      ),
    );

    // When each account was last given a room.
    const usage = await tx.classSession.groupBy({
      by: ["meetOrganizerEmail"],
      where: { meetOrganizerEmail: { in: organizers } },
      _max: { meetOrganizerAssignedAt: true },
    });

    const lastUsedMs = new Map<string, number>();

    for (const row of usage as Array<{
      meetOrganizerEmail: string | null;
      _max: { meetOrganizerAssignedAt: Date | null };
    }>) {
      if (row.meetOrganizerEmail && row._max.meetOrganizerAssignedAt) {
        lastUsedMs.set(row.meetOrganizerEmail, row._max.meetOrganizerAssignedAt.getTime());
      }
    }

    const order = rankOrganizers({ organizers, busy, lastUsedMs });

    // Note the pick straight away (inside the lock) so the next
    // allocation sees this account as the most recently used.
    await tx.classSession.update({
      where: { id: session.id },
      data: { meetOrganizerEmail: order[0], meetOrganizerAssignedAt: new Date() },
    });

    return order;
  });
}

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

    const candidates = await chooseOrganizers(session);

    if (candidates.length === 0) {
      console.error("Google Meet is enabled but no organizer account is configured.");

      return null;
    }

    // Try the preferred account first; if Google refuses it (rate limit,
    // an account that isn't authorised yet, ...) fall over to the next.
    let space: Awaited<ReturnType<typeof createMeetSpace>> | null = null;
    let organizer = candidates[0];
    let lastError: unknown = null;

    for (const candidate of candidates) {
      try {
        space = await createMeetSpace(candidate);
        organizer = candidate;
        break;
      } catch (err) {
        lastError = err;
        console.warn(
          `Meet room creation failed with organizer ${candidate} for session ${session.id}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    if (!space) throw lastError ?? new Error("No Meet organizer could create a room.");

    // Conditional write: if Start and Join raced, the first one wins
    // and the other adopts its link (the extra empty space is harmless).
    const claimed = await prisma.classSession.updateMany({
      where: { id: session.id, meetingUri: null },
      data: {
        meetSpaceName: space.name,
        meetingUri: space.meetingUri,
        meetOrganizerEmail: organizer,
        meetOrganizerAssignedAt: new Date(),
      },
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
