"use client";

import { useCoursesList } from "@/features/admin/hooks/useCoursesList";
import CourseApprovalCard from "@/features/admin/components/CourseApprovalCard";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
} from "@/features/admin/components/ui/primitives";

export default function AdminCoursesPage() {
  const { courses, loading, error, updateApproval } = useCoursesList();

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Approvals" }]}
        title="Course approvals"
        description="Review courses submitted by teachers."
      />

      <AdminError>{error}</AdminError>

      {loading ? (
        <AdminLoading message="Loading courses…" />
      ) : courses.length === 0 ? (
        <AdminEmpty message="No courses are waiting for approval." />
      ) : (
        <div className="flex flex-col gap-5">
          {courses.map((course) => (
            <CourseApprovalCard
              key={course.id}
              course={course}
              onApprove={(id) => updateApproval(id, "APPROVED")}
              onReject={(id) => updateApproval(id, "REJECTED")}
            />
          ))}
        </div>
      )}
    </AdminPage>
  );
}
