"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import ParentHomeworkPanel from "@/features/parent/components/homework/ParentHomeworkPanel";
import { useParentEnrollments } from "@/features/parent/hooks/useEnrollments";
import { usesClassView } from "@/features/parent/utils/classView";

export default function ParentEnrollmentHomeworkPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { enrollmentId } = use(params);
  const router = useRouter();

  // Part 2C: a cycle-model enrollment's homework lives on its My
  // Classes page. Legacy enrollments keep this page as it was.
  const { enrollments, loading } = useParentEnrollments();
  const enrollment = enrollments.find((e) => e.id === enrollmentId);
  const opensInMyClasses = !!enrollment && usesClassView(enrollment);

  useEffect(() => {
    if (opensInMyClasses) {
      router.replace(`/parent/my-classes/${enrollmentId}?tab=homework`);
    }
  }, [opensInMyClasses, enrollmentId, router]);

  if (loading || opensInMyClasses) {
    return <p className="p-6 text-gray-500">Loading homework…</p>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link
        href="/parent/my-classes"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={14} /> Back to My Classes
      </Link>

      <h1 className="text-2xl font-bold text-violet-900 mb-1">Homework</h1>
      <p className="text-gray-500 mb-6">Upload your child&apos;s work for each assignment.</p>

      <ParentHomeworkPanel enrollmentId={enrollmentId} />
    </div>
  );
}
