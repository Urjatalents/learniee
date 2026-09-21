"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useParentEnrollments } from "@/features/parent/hooks/useEnrollments";
import ClassDetail from "@/features/parent/components/my-classes/ClassDetail";
import EnrollmentStatusCard from "@/features/parent/components/enrollments/EnrollmentStatusCard";
import { parseClassTab, usesClassView } from "@/features/parent/utils/classView";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

/**
 * One course's page (Part 2C). Cycle-model enrollments get the full
 * class page; a legacy enrollment (or one not active yet) shows its
 * old status card here, so any old link that lands on this URL
 * still works.
 */
export default function ParentMyClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ enrollmentId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { enrollmentId } = use(params);
  const { tab } = use(searchParams);

  const { enrollments, loading, error, respondToRevision } = useParentEnrollments(
    "/api/parent/my-classes",
  );
  const enrollment = enrollments.find((e) => e.id === enrollmentId);

  const backLink = (
    <Link
      href="/parent/my-classes"
      className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
    >
      <ArrowLeft size={14} /> Back to My Classes
    </Link>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {loading ? (
        <>
          {backLink}
          <p className="text-gray-500">Loading your class…</p>
        </>
      ) : !enrollment ? (
        <>
          {backLink}
          <ErrorBanner>{error || "We couldn't find this enrollment."}</ErrorBanner>
        </>
      ) : usesClassView(enrollment) ? (
        <ClassDetail enrollmentId={enrollment.id} initialTab={parseClassTab(tab)} />
      ) : (
        <>
          {backLink}
          <EnrollmentStatusCard
            enrollment={enrollment}
            onConfirmRevision={(id) => respondToRevision(id, "CONFIRM")}
            onDeclineRevision={(id) => respondToRevision(id, "DECLINE")}
          />
        </>
      )}
    </div>
  );
}
