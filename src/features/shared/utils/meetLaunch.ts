/**
 * Teacher launch link for Google Meet. Pure string logic, no secrets,
 * safe on server and client.
 *
 * Meet decides who is co-host by the Google account that is signed in
 * on the tab. With several accounts in one Chrome, a plain link opens
 * with whichever account is "first". The link built here:
 *   1. pins the account inside the Meet URL (`authuser=<email>`), and
 *   2. is sent through Google's account chooser with that email
 *      (`AccountChooser?Email=…&continue=…`), so Google selects that
 *      account if it is signed in, or shows the sign-in with the email
 *      filled in if it is not, instead of silently using another one.
 *
 * Only the teacher gets this link; parents and students keep the plain
 * Meet link (they join as guests or with any account).
 */

const ACCOUNT_CHOOSER_URL = "https://accounts.google.com/AccountChooser";

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
 * The link the teacher opens: account chooser -> Meet, with the
 * teacher's Google account pre-selected. Falls back to the plain Meet
 * link when there is no email.
 */
export function buildTeacherLaunchUrl(meetingUri: string, email: string | null): string {
  const cleanEmail = email?.trim();

  if (!cleanEmail) return meetingUri;

  const params = new URLSearchParams({
    Email: cleanEmail,
    continue: withMeetAuthUser(meetingUri, cleanEmail),
  });

  return `${ACCOUNT_CHOOSER_URL}?${params.toString()}`;
}
