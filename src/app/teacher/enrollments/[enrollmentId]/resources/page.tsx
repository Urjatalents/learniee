"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import TeacherResourcePanel from "@/features/teacher/components/resources/TeacherResourcePanel";

export default function TeacherEnrollmentResourcesPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { enrollmentId } = use(params);

  return (
    <div className="p-5 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/teacher/resources"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={14} /> Back to resources
        </Link>

        <h1 className="text-2xl font-bold text-purple-600 mb-1">Resources</h1>
        <p className="text-gray-500 mb-6">
          Share files or links with your student — once shared, they stay on the student&apos;s
          page for good.
        </p>

        <TeacherResourcePanel enrollmentId={enrollmentId} />
      </div>
    </div>
  );
}
