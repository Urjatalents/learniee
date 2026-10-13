"use client";

import { useState } from "react";

import { useTeachersList } from "@/features/admin/hooks/useTeachersList";
import TeacherApplicationsTable from "@/features/admin/components/TeacherApplicationsTable";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
  AdminSearch,
  AdminTabs,
} from "@/features/admin/components/ui/primitives";
import type { TeacherApprovalState } from "@/features/admin/types/teacher";

const TABS: Array<{ value: TeacherApprovalState; label: string }> = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
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
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Approvals" }]}
        title="Teacher applications"
        description="Review registrations and approve or reject them."
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <AdminTabs
          label="Application status"
          value={status}
          onChange={setStatus}
          tabs={TABS.map((tab) => ({ ...tab, count: counts[tab.value] }))}
        />
        <AdminSearch
          value={search}
          onChange={setSearch}
          placeholder="Filter by name, email or city"
        />
      </div>

      <AdminError>{error}</AdminError>

      {loading ? (
        <AdminLoading message="Loading teachers…" />
      ) : visible.length === 0 ? (
        <AdminEmpty message={query ? "No teachers match your search." : EMPTY_MESSAGES[status]} />
      ) : (
        <TeacherApplicationsTable
          teachers={visible}
          dateLabel={status === "PENDING" ? "Submitted" : "Last updated"}
        />
      )}
    </AdminPage>
  );
}
