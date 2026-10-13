"use client";

import { useParentDirectory } from "@/features/admin/hooks/useParentDirectory";
import DirectoryStatCard from "@/features/admin/components/DirectoryStatCard";
import ParentDirectoryTable from "@/features/admin/components/ParentDirectoryTable";
import {
  AdminError,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
  AdminSearch,
} from "@/features/admin/components/ui/primitives";

export default function AdminParentDirectoryPage() {
  const { parents, summary, search, setSearch, loading, error } = useParentDirectory();

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "People" }]}
        title="Parent directory"
        description="Every parent on the platform, with onboarding status and activity at a glance."
      />

      <AdminError>{error}</AdminError>

      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <DirectoryStatCard label="Total parents" value={summary.total} />
          <DirectoryStatCard label="Onboarding complete" value={summary.onboarding.completed} />
          <DirectoryStatCard label="Onboarding in progress" value={summary.onboarding.inProgress} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <AdminSearch value={search} onChange={setSearch} placeholder="Search by name, email or city" />
        <span className="text-[15px] font-bold text-admin-muted">{parents.length} shown</span>
      </div>

      {loading ? <AdminLoading message="Loading parents…" /> : <ParentDirectoryTable parents={parents} />}
    </AdminPage>
  );
}
