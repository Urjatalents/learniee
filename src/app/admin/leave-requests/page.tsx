"use client";

import { useState } from "react";

import { useAdminLeaveRequests } from "@/features/admin/hooks/useLeaveRequests";
import LeaveRequestCard from "@/features/admin/components/LeaveRequestCard";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
  AdminTabs,
} from "@/features/admin/components/ui/primitives";

type View = "pending" | "all";

export default function AdminLeaveRequestsPage() {
  const { requests, loading, error, approve, reject } = useAdminLeaveRequests();
  const [view, setView] = useState<View>("pending");

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const visible = view === "all" ? requests : requests.filter((r) => r.status === "PENDING");

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Classes and safety" }]}
        title="Leave requests"
        description="Approve or reject teacher leave. Approving moves their classes to new slots."
      />

      <div>
        <AdminTabs
          label="Leave history"
          value={view}
          onChange={setView}
          tabs={[
            { value: "pending", label: "Pending", count: pendingCount },
            { value: "all", label: "All history" },
          ]}
        />
      </div>

      <AdminError>{error}</AdminError>

      {loading ? (
        <AdminLoading message="Loading leave requests…" />
      ) : visible.length === 0 ? (
        <AdminEmpty
          message={view === "all" ? "No leave requests yet." : "Nothing waiting on your approval."}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((request) => (
            <LeaveRequestCard
              key={request.id}
              request={request}
              onApprove={approve}
              onReject={reject}
            />
          ))}
        </div>
      )}
    </AdminPage>
  );
}
