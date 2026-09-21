"use client";

import Link from "next/link";

import { useParentEnrollments } from "@/features/parent/hooks/useEnrollments";
import MyClassCard from "@/features/parent/components/my-classes/MyClassCard";
import EnrollmentStatusCard from "@/features/parent/components/enrollments/EnrollmentStatusCard";
import { usesClassView } from "@/features/parent/utils/classView";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

/**
 * My Classes (Part 2C) — one page per enrolled course, replacing the
 * separate Enrollments, Homework and Chat entries. Cycle-model
 * enrollments open the new class page; legacy enrollments (and
 * cycle ones still awaiting approval) keep the old status card.
 */
export default function ParentMyClassesPage() {
  const { enrollments, loading, error, respondToRevision } = useParentEnrollments(
    "/api/parent/my-classes",
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-violet-900">My Classes</h1>
        <p className="text-gray-500 mt-1">
          Your courses in one place — join classes, see how each cycle is going, check homework and
          chat with your teacher.
        </p>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <p className="text-gray-500">Loading your classes…</p>
      ) : enrollments.length === 0 ? (
        <div className="bg-white border rounded-xl p-8 text-center">
          <p className="text-gray-500">
            No classes yet —{" "}
            <Link href="/parent/courses" className="text-brand font-semibold hover:underline">
              browse courses
            </Link>{" "}
            to enroll your child.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {enrollments.map((enrollment) =>
            usesClassView(enrollment) ? (
              <MyClassCard key={enrollment.id} enrollment={enrollment} />
            ) : (
              <EnrollmentStatusCard
                key={enrollment.id}
                enrollment={enrollment}
                onConfirmRevision={(id) => respondToRevision(id, "CONFIRM")}
                onDeclineRevision={(id) => respondToRevision(id, "DECLINE")}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
