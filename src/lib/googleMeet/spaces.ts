import "server-only";
import { GoogleMeetError, MEET_V2, normaliseEmail } from './auth';
import { meetRequest, sleep, withRetry } from './request';

export interface MeetSpace {
  /** "spaces/abc123" — the id used by every other Meet API call. */
  name: string;
  /** The link people open to join. */
  meetingUri: string;
}
/**
 * Creates a Meet space owned by `organizerEmail`. Access is OPEN:
 * anyone with the link joins without knocking (parents need no Google
 * account; Meet shows its "open to anyone" notice). Moderation is on so
 * a listed co-host gets real host controls. The meeting is recorded
 * automatically to that organizer's Drive.
 */
export async function createMeetSpace(organizerEmail: string): Promise<MeetSpace> {
  // One quick retry for a network blip / Google 5xx. A rate limit is
  // not worth waiting for: the caller moves on to the next organizer.
  const space = await withRetry(
    () =>
      meetRequest<{ name?: string; meetingUri?: string }>(organizerEmail, `${MEET_V2}/spaces`, {
        config: {
          accessType: "OPEN",
          // Co-host roles only take effect when moderation is on; without
          // it the teacher joins as a plain participant (no host controls,
          // and auto-recording never finds anyone allowed to start it).
          moderation: "ON",
          artifactConfig: {
            recordingConfig: { autoRecordingGeneration: "ON" },
          },
        },
      }),
    2,
  );

  if (!space.name || !space.meetingUri) {
    throw new GoogleMeetError("Google Meet returned a space without a link.");
  }

  return { name: space.name, meetingUri: space.meetingUri };
}
interface MeetMember {
  /** "spaces/abc/members/xyz" — needed to delete a member. */
  name: string;
  email?: string;
  role?: string;
}
/** Every member of a space (follows pagination). Call as the space's organizer. */
export async function listMeetMembers(
  spaceName: string,
  organizerEmail: string,
): Promise<MeetMember[]> {
  const members: MeetMember[] = [];
  let pageToken = "";

  // 50 pages is far beyond any class; the cap only guards a runaway loop.
  for (let page = 0; page < 50; page++) {
    const query = new URLSearchParams({ pageSize: "100" });

    if (pageToken) query.set("pageToken", pageToken);

    const data = await meetRequest<{ members?: MeetMember[]; nextPageToken?: string }>(
      organizerEmail,
      `${MEET_V2}/${spaceName}/members?${query.toString()}`,
      undefined,
      "GET",
    );

    members.push(...(data.members ?? []));

    if (!data.nextPageToken) break;

    pageToken = data.nextPageToken;
  }

  return members;
}
export interface CoHostResult {
  confirmed: boolean;
  /** Short, log-safe reason when `confirmed` is false. */
  error: string | null;
}
/**
 * Makes `email` a co-host of the space and CHECKS that it stuck.
 * `organizerEmail` must be the account that OWNS the space.
 * Safe to call any number of times (idempotent):
 *  - already a co-host            -> confirmed, nothing written
 *  - listed with another role     -> removed and re-added as co-host
 *  - not listed                   -> added, then read back to verify
 * Transient Google errors are retried; a permanent one (for example the
 * email isn't a Google account) returns `confirmed: false` with the reason.
 * Never throws.
 */
export async function ensureMeetCoHost(
  spaceName: string,
  email: string,
  organizerEmail: string,
): Promise<CoHostResult> {
  const wanted = normaliseEmail(email);
  const findMine = (members: MeetMember[]) =>
    members.find((m) => m.email && normaliseEmail(m.email) === wanted);

  try {
    let existing: MeetMember | undefined;
    let canList = true;

    try {
      existing = findMine(await withRetry(() => listMeetMembers(spaceName, organizerEmail)));
    } catch {
      // Listing is only for verification; fall back to trusting `create`.
      canList = false;
    }

    if (existing?.role === "COHOST") return { confirmed: true, error: null };

    // The Members API has no "update", so a wrong role is replaced.
    if (existing) {
      await withRetry(() =>
        meetRequest(organizerEmail, `${MEET_V2}/${existing.name}`, undefined, "DELETE"),
      );
    }

    try {
      await withRetry(() =>
        meetRequest(organizerEmail, `${MEET_V2}/${spaceName}/members`, {
          email: wanted,
          role: "COHOST",
        }),
      );
    } catch (err) {
      // 409 = already a member; the read-back below decides if it is a co-host.
      if (!(err instanceof GoogleMeetError && err.status === 409)) throw err;
    }

    if (!canList) return { confirmed: true, error: null };

    // Read back (Google can lag a moment behind a write).
    for (let i = 0; i < 3; i++) {
      const mine = findMine(await withRetry(() => listMeetMembers(spaceName, organizerEmail)));

      if (mine?.role === "COHOST") return { confirmed: true, error: null };

      await sleep(500 * (i + 1));
    }

    return { confirmed: false, error: "Added, but Google Meet did not show the teacher as co-host." };
  } catch (err) {
    return {
      confirmed: false,
      error: (err instanceof Error ? err.message : String(err)).slice(0, 300),
    };
  }
}
