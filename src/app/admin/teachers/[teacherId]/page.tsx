"use client";

import { useParams } from "next/navigation";

import { useTeacherApplication } from "@/features/admin/hooks/useTeacherApplication";
import TeacherStatusBadge from "@/features/admin/components/TeacherStatusBadge";
import TeacherCompletenessPanel from "@/features/admin/components/TeacherCompletenessPanel";
import TeacherInterviewPanel from "@/features/admin/components/TeacherInterviewPanel";
import TeacherDecisionBar from "@/features/admin/components/TeacherDecisionBar";
import TeacherPersonalSection from "@/features/admin/components/TeacherPersonalSection";
import TeacherProfessionalSection from "@/features/admin/components/TeacherProfessionalSection";
import TeacherDocumentsStatusSection from "@/features/admin/components/TeacherDocumentsStatusSection";
import {
  AdminError,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
} from "@/features/admin/components/ui/primitives";

export default function AdminTeacherApplicationPage() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const {
    teacher,
    loading,
    error,
    notice,
    deciding,
    decide,
    schedulingInterview,
    scheduleInterview,
    cancelInterview,
  } = useTeacherApplication(teacherId);

  const fullName = teacher ? `${teacher.firstName} ${teacher.lastName}`.trim() : "Application";

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[
          { label: "Overview", href: "/admin" },
          { label: "Teacher applications", href: "/admin/teachers" },
          { label: fullName },
        ]}
        title={fullName}
        description={teacher?.email}
      />

      {loading && <AdminLoading message="Loading application…" />}

      <AdminError>{error}</AdminError>

      {notice && (
        <div
          role="status"
          className="rounded-[14px] border border-green-200 bg-green-50 px-4 py-3 text-[15px] font-semibold text-green-800"
        >
          {notice}
        </div>
      )}

      {teacher && (
        <div>
          <AdminPanel padded>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-admin-line-soft pb-6">
              <div>
                {teacher.visibleName && (
                  <p className="text-[15px] text-admin-muted">Visible name: {teacher.visibleName}</p>
                )}
              </div>

              <TeacherStatusBadge
                status={teacher.approvalStatus as "PENDING" | "APPROVED" | "REJECTED"}
              />
            </div>

            {teacher.approvalStatus === "PENDING" && (
              <div className="mt-6">
                <TeacherInterviewPanel
                  interviewScheduledAt={teacher.interviewScheduledAt}
                  interviewDetails={teacher.interviewDetails}
                  busy={schedulingInterview}
                  onSchedule={scheduleInterview}
                  onCancel={cancelInterview}
                />
              </div>
            )}

            {teacher.approvalStatus === "REJECTED" && teacher.reapplyAvailableAt && (
              <p className="mt-6 rounded-[14px] border border-[#f4c01e] bg-[#fff8dc] px-4 py-3 text-[15px]">
                Can appeal after{" "}
                {new Date(teacher.reapplyAvailableAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                .
              </p>
            )}

            {teacher.appealCount > 0 && (
              <p className="mt-3 text-sm text-admin-muted">
                This teacher has appealed {teacher.appealCount} time
                {teacher.appealCount === 1 ? "" : "s"}.
              </p>
            )}

            <div className="mt-6">
              <TeacherCompletenessPanel teacher={teacher} />
            </div>

            <TeacherPersonalSection teacher={teacher} />
            <TeacherProfessionalSection teacher={teacher} />
            <TeacherDocumentsStatusSection teacher={teacher} />
          </AdminPanel>

          <TeacherDecisionBar
            teacherName={`${teacher.firstName} ${teacher.lastName}`}
            status={teacher.approvalStatus as "PENDING" | "APPROVED" | "REJECTED"}
            deciding={deciding}
            onDecide={decide}
          />
        </div>
      )}
    </AdminPage>
  );
}
