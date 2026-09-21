"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";

import { useStudentProfile } from "@/features/parent/hooks/useStudentProfile";
import { useParentCalendar } from "@/features/parent/hooks/useCalendar";
import ChildAvatar from "@/features/parent/components/ChildAvatar";
import MonthCalendar from "@/features/shared/components/calendar/MonthCalendar";
import StudentCertificates from "@/features/parent/components/StudentCertificates";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * A child's profile hub - everything for one Student in one place.
 * Today that's just their info + the ability to remove the
 * profile. Enrollment/Classes/Homework aren't modeled yet (see
 * 03-DATA-MODEL.md), so those sections are placeholders for now -
 * this page is the intended home for them once they exist, rather
 * than a one-off "view details" screen.
 */
export default function StudentProfilePage() {
  const params = useParams<{ studentId: string }>();
  const router = useRouter();
  const { student, loading, removing, error, removeStudent } =
    useStudentProfile(params.studentId);

  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [month, setMonth] = useState(currentMonthKey());
  const { occurrences, loading: calendarLoading } = useParentCalendar(
    month,
    params.studentId,
  );

  async function handleConfirmRemove() {
    const ok = await removeStudent();
    if (ok) {
      router.push("/parent");
    }
  }

  if (loading) {
    return <p className="p-8 text-gray-500">Loading...</p>;
  }

  if (!student) {
    return (
      <div className="p-8">
        <p className="text-red-600 mb-4">
          {error || "Student profile not found."}
        </p>
        <Link href="/parent" className="text-violet-600 underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const displayName =
    student.visibleName || `${student.firstName} ${student.lastName}`;

  return (
    <div className="max-w-3xl mx-auto p-5 sm:p-8">
      <Link
        href="/parent"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      {/* PROFILE HEADER */}
      <div className="bg-white border rounded-2xl p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start mb-8">
        <ChildAvatar src={student.photoViewUrl} name={displayName} size="lg" />

        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-xl font-bold text-gray-800">{displayName}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {[
              student.age != null ? `Age ${student.age}` : null,
              student.standard,
              student.board,
            ]
              .filter(Boolean)
              .join(" · ") || "No details set yet"}
          </p>
        </div>
      </div>

      {/* DETAILS */}
      <div className="bg-white border rounded-2xl p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Details
        </h2>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <DetailRow label="Gender" value={student.gender} />
          <DetailRow label="Age" value={student.age?.toString() ?? null} />
          <DetailRow label="Standard / Grade" value={student.standard} />
          <DetailRow label="Board" value={student.board} />
          <DetailRow label="School" value={student.currentSchoolName} />
          <DetailRow
            label="Learning difficulties"
            value={student.learningDifficulties}
          />
        </dl>
      </div>

      {/* CERTIFICATES - only renders once this Student has at least
          one ISSUED certificate; see StudentCertificates.tsx. */}
      <StudentCertificates studentId={params.studentId} />

      {/* SCHEDULE - one calendar scoped to this child, expanded from
          their ACTIVE/LAPSED enrollments' recurring schedule (see
          scheduleOccurrences.service.ts). Empty until an enrollment
          for this child reaches ACTIVE. */}
      <div className="bg-white border rounded-2xl p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {displayName}&apos;s Schedule
        </h2>

        <MonthCalendar
          month={month}
          occurrences={occurrences}
          loading={calendarLoading}
          onPrevMonth={() => setMonth((m) => shiftMonth(m, -1))}
          onNextMonth={() => setMonth((m) => shiftMonth(m, 1))}
          colorBy="course"
          emptyMessage={`No classes scheduled for ${student.firstName} this month.`}
        />

        <Link
          href="/parent/courses"
          className="inline-block text-sm bg-violet-600 text-white px-4 py-2 rounded mt-4"
        >
          Browse courses
        </Link>
      </div>

      {/* DANGER ZONE */}
      <div className="border border-red-200 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-3">
          Remove profile
        </h2>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        {!confirmingRemove ? (
          <button
            onClick={() => setConfirmingRemove(true)}
            className="inline-flex items-center gap-2 text-sm text-red-600 border border-red-300 px-4 py-2 rounded hover:bg-red-50"
          >
            <Trash2 size={16} /> Remove {displayName}&apos;s profile
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              This permanently removes {displayName}&apos;s profile. This
              can&apos;t be undone. Are you sure?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmRemove}
                disabled={removing}
                className="text-sm bg-red-600 text-white px-4 py-2 rounded disabled:opacity-60"
              >
                {removing ? "Removing..." : "Yes, remove"}
              </button>
              <button
                onClick={() => setConfirmingRemove(false)}
                disabled={removing}
                className="text-sm border px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-gray-400 text-xs">{label}</dt>
      <dd className="text-gray-800">{value || "-"}</dd>
    </div>
  );
}
