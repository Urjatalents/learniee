import "server-only";

import { ClassSessionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { addMeetCoHost, createMeetSpace, isGoogleMeetEnabled } from "@/lib/googleMeet";

/**
 * The Google Meet room of a cycle-model session. Meet only supplies
 * the room: Start / Join / End and every outcome rule stay exactly as
 * they were (`sessionFlow.service.ts`, `sessionResolve.service.ts`).
 *
 * The room is created lazily on the first Start or Join (never when a
 * cycle's sessions are bulk-created), once per session. Any failure is
 * logged and returns null — a Meet outage must never block a class
 * from being started, joined or ended; the page offers a retry.
 */

/**
 * Returns the session's Meet link, creating the room if it doesn't
 * exist yet. Null when the feature is off, the session isn't a live
 * cycle session, or Google failed.
 */
export async function ensureSessionMeeting(sessionId: string): Promise<string | null> {
  if (!isGoogleMeetEnabled()) return null;

  try {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        cycleId: true,
        meetingUri: true,
        teacher: { select: { email: true } },
      },
    });

    if (!session || session.cycleId === null) return null;
    if (session.meetingUri) return session.meetingUri;
    if (session.status !== ClassSessionStatus.SCHEDULED) return null;

    const space = await createMeetSpace();

    // The teacher joins as co-host. Not every teacher email is a Google
    // account, so this is best-effort and never blocks the link.
    const teacherEmail = session.teacher.email?.trim();

    if (teacherEmail) {
      try {
        await addMeetCoHost(space.name, teacherEmail);
      } catch (err) {
        console.warn(
          `Meet co-host not added for session ${session.id}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    // Conditional write: if Start and Join raced, the first one wins
    // and the other adopts its link (the extra empty space is harmless).
    const claimed = await prisma.classSession.updateMany({
      where: { id: session.id, meetingUri: null },
      data: { meetSpaceName: space.name, meetingUri: space.meetingUri },
    });

    if (claimed.count === 1) return space.meetingUri;

    const winner = await prisma.classSession.findUnique({
      where: { id: session.id },
      select: { meetingUri: true },
    });

    return winner?.meetingUri ?? null;
  } catch (err) {
    console.error(
      `Google Meet room creation failed for session ${sessionId}:`,
      err instanceof Error ? err.message : err,
    );

    return null;
  }
}
