/**
 * Teacher launch link for Google Meet. Pure string logic, no secrets,
 * safe on server and client.
 *
 * Meet decides who is co-host by the Google account that is signed in
 * on the tab. With several accounts in one Chrome, a plain link opens
 * with whichever account is "first" and the teacher joins without host
 * controls or auto-recording.
 *
 * The link built here pins the account inside the Meet URL itself
 * (`https://meet.google.com/abc-defg-hij?authuser=<email>`). Tested with
 * several Google accounts signed in to one Chrome: the room opens
 * directly as that account, and a registered co-host gets host controls
 * and recording. (Sending the teacher through Google's AccountChooser
 * first was tried and dropped: it resolved to an account by position
 * and could land on the wrong one.)
 *
 * Only the teacher gets this link; parents and students keep the plain
 * Meet link (they join as guests or with any account).
 */

/** The Meet link with `authuser=<email>` added (replaces an existing one). */
export function withMeetAuthUser(meetingUri: string, email: string): string {
  try {
    const url = new URL(meetingUri);

    url.searchParams.set("authuser", email);

    return url.toString();
  } catch {
    // Not a parseable URL: fall back to plain concatenation.
    return `${meetingUri}${meetingUri.includes("?") ? "&" : "?"}authuser=${encodeURIComponent(email)}`;
  }
}

/**
 * The link the teacher opens: the Meet room pinned to the teacher's
 * Google account. Falls back to the plain Meet link when there is no email.
 */
export function buildTeacherLaunchUrl(meetingUri: string, email: string | null): string {
  const cleanEmail = email?.trim();

  if (!cleanEmail) return meetingUri;

  return withMeetAuthUser(meetingUri, cleanEmail);
}
