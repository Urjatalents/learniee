"use client";

import { useTeacherDirectory } from "@/features/admin/hooks/useTeacherDirectory";
import DirectoryStatCard from "@/features/admin/components/DirectoryStatCard";
import TeacherDirectoryTable from "@/features/admin/components/TeacherDirectoryTable";
import {
  AdminError,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
  AdminSearch,
} from "@/features/admin/components/ui/primitives";

export default function AdminTeacherDirectoryPage() {
  const { teachers, summary, search, setSearch, loading, error } = useTeacherDirectory();

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "People" }]}
        title="Teacher directory"
        description="Every teacher on the platform, with approval and onboarding status at a glance."
      />

      <AdminError>{error}</AdminError>

      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <DirectoryStatCard label="Total teachers" value={summary.total} />
          <DirectoryStatCard label="Approved" value={summary.approvalStatus.approved} />
          <DirectoryStatCard label="Pending approval" value={summary.approvalStatus.pending} />
          <DirectoryStatCard label="Rejected" value={summary.approvalStatus.rejected} />
          <DirectoryStatCard label="Onboarding complete" value={summary.onboarding.completed} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <AdminSearch value={search} onChange={setSearch} placeholder="Search by name, email or city" />
        <span className="text-[15px] font-bold text-admin-muted">
          {teachers.length} shown
        </span>
      </div>

      {loading ? <AdminLoading message="Loading teachers…" /> : <TeacherDirectoryTable teachers={teachers} />}
    </AdminPage>
  );
}
