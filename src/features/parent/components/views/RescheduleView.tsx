"use client";

import { useParentRescheduleRequests } from "@/features/parent/hooks/useRescheduleRequests";
import { useParentCalendar } from "@/features/parent/hooks/useCalendar";
import RescheduleRequestCard from "@/features/shared/components/RescheduleRequestCard";
import UpcomingClassPicker from "@/features/shared/components/reschedule/UpcomingClassPicker";
import { isPendingOnViewer } from "@/features/shared/utils/rescheduleStatus";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Sidebar's "Reschedule" entry — the single place for everything
 * reschedule-related, both raising a new request (via
 * UpcomingClassPicker, reading the same `/api/parent/calendar`
 * occurrences the Calendar page uses) and managing existing ones.
 * Requests awaiting the Parent's own response (Teacher-proposed)
 * show first; everything else (raised by the Parent themselves, or
 * already resolved) follows as history.
 */
export default function RescheduleView() {
  const { requests, loading, error, actingId, approve, reject, cancel } =
    useParentRescheduleRequests();
  const { occurrences, loading: occurrencesLoading } = useParentCalendar(
    currentMonthKey(),
  );

  const needsResponse = requests.filter((r) => isPendingOnViewer(r, "PARENT"));
  const others = requests.filter((r) => !isPendingOnViewer(r, "PARENT"));

  return (
    <div className="max-w-2xl pt-6">

      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
          Request a reschedule
        </h2>
        <UpcomingClassPicker
          occurrences={occurrences}
          loading={occurrencesLoading}
          role="parent"
        />
      </section>

      {error && <ErrorBanner size="compact">{error}</ErrorBanner>}

      {!loading && requests.length > 0 && (
        <div className="space-y-6">
          {needsResponse.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                Needs your response
              </h2>
              <div className="space-y-3">
                {needsResponse.map((r) => (
                  <RescheduleRequestCard
                    key={r.id}
                    request={r}
                    viewerRole="PARENT"
                    acting={actingId === r.id}
                    onApprove={(note) => approve(r.id, note)}
                    onReject={(note) => reject(r.id, note)}
                    onCancel={() => cancel(r.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                Other requests
              </h2>
              <div className="space-y-3">
                {others.map((r) => (
                  <RescheduleRequestCard
                    key={r.id}
                    request={r}
                    viewerRole="PARENT"
                    acting={actingId === r.id}
                    onApprove={(note) => approve(r.id, note)}
                    onReject={(note) => reject(r.id, note)}
                    onCancel={() => cancel(r.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
    </div>
  );
}
