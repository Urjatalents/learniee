"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { useTeacherApplication } from "@/features/admin/hooks/useTeacherApplication";
import TeacherStatusBadge from "@/features/admin/components/TeacherStatusBadge";
import TeacherCompletenessPanel from "@/features/admin/components/TeacherCompletenessPanel";
import TeacherDecisionBar from "@/features/admin/components/TeacherDecisionBar";
import TeacherPersonalSection from "@/features/admin/components/TeacherPersonalSection";
import TeacherProfessionalSection from "@/features/admin/components/TeacherProfessionalSection";
import TeacherDocumentsStatusSection from "@/features/admin/components/TeacherDocumentsStatusSection";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

export default function AdminTeacherApplicationPage() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const { teacher, loading, error, notice, deciding, decide } =
    useTeacherApplication(teacherId);

  return (
    <div className="min-h-screen bg-gray-50 px-8 pt-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/teachers"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-purple-600"
        >
          <ArrowLeft className="size-4" />
          Back to applications
        </Link>

        {loading && (
          <div className="bg-white border rounded-xl p-8 text-center">
            <p className="text-gray-500">Loading application...</p>
          </div>
        )}

        {error && <ErrorBanner>{error}</ErrorBanner>}

        {notice && (
          <div className="mb-6 rounded-lg bg-green-100 p-4 text-green-700">{notice}</div>
        )}

        {teacher && (
          <>
            <div className="bg-white border rounded-2xl shadow-sm p-8">
              {/* HEADER */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    {teacher.firstName} {teacher.lastName}
                  </h1>
                  <p className="text-gray-500">{teacher.email}</p>
                  {teacher.visibleName && (
                    <p className="mt-1 text-sm text-gray-400">
                      Visible name: {teacher.visibleName}
                    </p>
                  )}
                </div>

                <TeacherStatusBadge
                  status={teacher.approvalStatus as "PENDING" | "APPROVED" | "REJECTED"}
                />
              </div>

              <div className="mt-6">
                <TeacherCompletenessPanel teacher={teacher} />
              </div>

              <TeacherPersonalSection teacher={teacher} />
              <TeacherProfessionalSection teacher={teacher} />
              <TeacherDocumentsStatusSection teacher={teacher} />
            </div>

            <TeacherDecisionBar
              teacherName={`${teacher.firstName} ${teacher.lastName}`}
              status={teacher.approvalStatus as "PENDING" | "APPROVED" | "REJECTED"}
              deciding={deciding}
              onDecide={decide}
            />
          </>
        )}
      </div>
    </div>
  );
}
