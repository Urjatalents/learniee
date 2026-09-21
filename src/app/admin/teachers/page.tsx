"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { useTeachersList } from "@/features/admin/hooks/useTeachersList";
import TeacherApplicationsTable from "@/features/admin/components/TeacherApplicationsTable";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import type { TeacherApprovalState } from "@/features/admin/types/teacher";

const TABS: Array<{ status: TeacherApprovalState; label: string }> = [
  { status: "PENDING", label: "Pending" },
  { status: "APPROVED", label: "Approved" },
  { status: "REJECTED", label: "Rejected" },
];

const EMPTY_MESSAGES: Record<TeacherApprovalState, string> = {
  PENDING: "No teachers are waiting for approval.",
  APPROVED: "No approved teachers yet.",
  REJECTED: "No rejected applications.",
};

export default function AdminTeachersPage() {
  const [status, setStatus] = useState<TeacherApprovalState>("PENDING");
  const [search, setSearch] = useState("");

  const { teachers, counts, loading, error } = useTeachersList(status);

  const query = search.trim().toLowerCase();
  const visible = query
    ? teachers.filter((teacher) =>
        [teacher.firstName, teacher.lastName, teacher.visibleName, teacher.email, teacher.city]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query)),
      )
    : teachers;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-purple-600">Teacher Applications</h1>
          <p className="text-gray-500 mt-1">
            Review teacher registrations and approve or reject them.
          </p>
        </div>

        {/* TABS + SEARCH */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex rounded-lg border bg-white p-1">
            {TABS.map((tab) => (
              <button
                key={tab.status}
                onClick={() => setStatus(tab.status)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                  status === tab.status
                    ? "bg-purple-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    status === tab.status ? "bg-white/20" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {counts[tab.status]}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email or city"
              className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-purple-400"
            />
          </div>
        </div>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        {loading ? (
          <div className="bg-white border rounded-xl p-8 text-center">
            <p className="text-gray-500">Loading teachers...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center">
            <p className="text-gray-500">
              {query ? "No teachers match your search." : EMPTY_MESSAGES[status]}
            </p>
          </div>
        ) : (
          <TeacherApplicationsTable
            teachers={visible}
            dateLabel={status === "PENDING" ? "Submitted" : "Last updated"}
          />
        )}
      </div>
    </div>
  );
}
