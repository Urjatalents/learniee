"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import ParentHomeworkPanel from "@/features/parent/components/homework/ParentHomeworkPanel";

export default function ParentEnrollmentHomeworkPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { enrollmentId } = use(params);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link
        href="/parent/homework-tests"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={14} /> Back to Homework
      </Link>

      <h1 className="text-2xl font-bold text-violet-900 mb-1">Homework</h1>
      <p className="text-gray-500 mb-6">Upload your child&apos;s work for each assignment.</p>

      <ParentHomeworkPanel enrollmentId={enrollmentId} />
    </div>
  );
}
