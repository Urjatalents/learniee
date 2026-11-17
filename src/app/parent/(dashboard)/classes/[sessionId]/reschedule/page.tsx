import { redirect } from "next/navigation";

/**
 * Kept so old links ("Reschedule" on a class, notifications, bookmarks) keep working.
 * Requesting a reschedule now happens in the dialog on the Reschedule page, started on
 * this class.
 */
export default async function ParentProposeRescheduleRedirectPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  redirect(`/parent/calendar?tab=reschedule&new=${encodeURIComponent(sessionId)}`);
}
