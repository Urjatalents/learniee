"use client";

import { useAdminEnrollments } from "@/features/admin/hooks/useEnrollments";
import EnrollmentApprovalCard from "@/features/admin/components/EnrollmentApprovalCard";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
} from "@/features/admin/components/ui/primitives";

export default function AdminEnrollmentsPage() {
  const { enrollments, loading, error, updateApproval } = useAdminEnrollments();

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Approvals" }]}
        title="Enrollment approvals"
        description="Enrollments the teacher has already approved. This is the final step before a student is active."
      />

      <AdminError>{error}</AdminError>

      {loading ? (
        <AdminLoading message="Loading enrollments…" />
      ) : enrollments.length === 0 ? (
        <AdminEmpty message="No enrollments are waiting for approval." />
      ) : (
        <div className="flex flex-col gap-5">
          {enrollments.map((enrollment) => (
            <EnrollmentApprovalCard
              key={enrollment.id}
              enrollment={enrollment}
              onApprove={(id) => updateApproval(id, "APPROVE")}
              onReject={(id, reason) => updateApproval(id, "REJECT", reason)}
            />
          ))}
        </div>
      )}
    </AdminPage>
  );
}
