"use client";

import { useTeacherEnrollments } from "@/features/teacher/hooks/useEnrollments";
import EnrollmentApprovalCard from "@/features/teacher/components/enrollments/EnrollmentApprovalCard";
import StudentRosterPanel from "@/features/teacher/components/enrollments/StudentRosterPanel";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

const NEEDS_ACTION_STATUSES = new Set([
  "PENDING_TEACHER_APPROVAL",
  "PENDING_PARENT_RECONFIRMATION",
  "PENDING_ADMIN_APPROVAL",
]);

function SectionTitle({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500">{children}</h2>
      <span className="text-[11px] font-bold text-purple-700 bg-purple-100 rounded-full px-2 py-0.5">
        {count}
      </span>
    </div>
  );
}

/**
 * "My Classes" for the Teacher side — one place for every enrollment
 * (grouped: needs your action, active classes, completed), plus a
 * searchable student roster up top so managing many students doesn't
 * mean scrolling through the whole class list to find one parent's
 * number or a course's chat room.
 */
export default function TeacherEnrollmentsPage() {
  const {
    enrollments,
    loading,
    error,
    approve,
    reject,
    revise,
    setSchedule,
    syncEnrollment,
  } = useTeacherEnrollments();

  const needsAction = enrollments.filter((e) => NEEDS_ACTION_STATUSES.has(e.status));
  const activeClasses = enrollments.filter(
    (e) => e.status === "ACTIVE" || e.status === "LAPSED",
  );
  const completed = enrollments.filter((e) => e.status === "COMPLETED");

  function renderCard(enrollment: (typeof enrollments)[number]) {
    return (
      <EnrollmentApprovalCard
        key={enrollment.id}
        enrollment={enrollment}
        onApprove={approve}
        onReject={reject}
        onRevise={revise}
        onSetSchedule={setSchedule}
        onSessionMarked={(patch) => syncEnrollment(enrollment.id, patch)}
      />
    );
  }

  return (
    <div className="p-5 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-purple-600">My Classes</h1>
          <p className="text-gray-500 mt-1">
            Every student and enrollment in one place — review new requests, keep an
            eye on active cycles, and manage your students from here.
          </p>
        </div>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        {loading ? (
          <p className="text-gray-600">Loading your classes…</p>
        ) : enrollments.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center">
            <p className="text-gray-500">No enrollments yet.</p>
          </div>
        ) : (
          <>
            <StudentRosterPanel enrollments={enrollments} />

            {needsAction.length > 0 && (
              <section className="mb-8">
                <SectionTitle count={needsAction.length}>Needs your action</SectionTitle>
                <div className="space-y-4">{needsAction.map(renderCard)}</div>
              </section>
            )}

            {activeClasses.length > 0 && (
              <section className="mb-8">
                <SectionTitle count={activeClasses.length}>Active classes</SectionTitle>
                <div className="space-y-4">{activeClasses.map(renderCard)}</div>
              </section>
            )}

            {completed.length > 0 && (
              <section>
                <SectionTitle count={completed.length}>Completed</SectionTitle>
                <div className="space-y-4">{completed.map(renderCard)}</div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
