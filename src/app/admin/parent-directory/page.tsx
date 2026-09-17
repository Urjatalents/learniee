"use client";

import { useParentDirectory } from "@/features/admin/hooks/useParentDirectory";
import DirectoryStatCard from "@/features/admin/components/DirectoryStatCard";
import ParentDirectoryTable from "@/features/admin/components/ParentDirectoryTable";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

export default function AdminParentDirectoryPage() {
  const { parents, summary, search, setSearch, loading, error } = useParentDirectory();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-purple-600">Parent Directory</h1>
          <p className="text-gray-500 mt-1">
            Every parent on the platform, onboarding status and activity, at a glance.
          </p>
        </div>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <DirectoryStatCard label="Total Parents" value={summary.total} />
            <DirectoryStatCard label="Onboarding Complete" value={summary.onboarding.completed} />
            <DirectoryStatCard label="Onboarding In Progress" value={summary.onboarding.inProgress} />
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
          <p className="text-gray-500">Loading parents…</p>
        ) : (
          <ParentDirectoryTable parents={parents} />
        )}
      </div>
    </div>
  );
}
