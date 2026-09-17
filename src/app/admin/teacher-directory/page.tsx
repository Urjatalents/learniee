"use client";

import { useTeacherDirectory } from "@/features/admin/hooks/useTeacherDirectory";
import DirectoryStatCard from "@/features/admin/components/DirectoryStatCard";
import TeacherDirectoryTable from "@/features/admin/components/TeacherDirectoryTable";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

export default function AdminTeacherDirectoryPage() {
  const { teachers, summary, search, setSearch, loading, error } = useTeacherDirectory();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-purple-600">Teacher Directory</h1>
          <p className="text-gray-500 mt-1">
            Every teacher on the platform, approval and onboarding status, at a glance.
          </p>
        </div>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <DirectoryStatCard label="Total Teachers" value={summary.total} />
            <DirectoryStatCard label="Approved" value={summary.approvalStatus.approved} />
            <DirectoryStatCard label="Pending Approval" value={summary.approvalStatus.pending} />
            <DirectoryStatCard label="Rejected" value={summary.approvalStatus.rejected} />
            <DirectoryStatCard label="Onboarding Complete" value={summary.onboarding.completed} />
          </div>
        )}

        <input
          type="text"
          placeholder="Search by name, email, or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md mb-4 px-4 py-2 border rounded-lg"
        />

        {loading ? (
          <p className="text-gray-500">Loading teachers…</p>
        ) : (
          <TeacherDirectoryTable teachers={teachers} />
        )}
      </div>
    </div>
  );
}
