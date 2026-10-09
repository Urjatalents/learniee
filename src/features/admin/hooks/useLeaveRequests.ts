"use client";

import { useEffect, useState } from "react";

export interface AdminLeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  adminNote: string | null;
  respondedAt: string | null;
  createdAt: string;
  /** Leave starts in under 24 hours from when it was submitted. */
  isEmergency: boolean;
  /** Pending only: what approving would do. Null if it could not be worked out. */
  impact: { moving: number; cancelling: number; tooSoon: number } | null;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    visibleName: string | null;
    email: string;
  };
}

export function useAdminLeaveRequests() {
  const [requests, setRequests] = useState<AdminLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/leave-requests");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch leave requests");
      }

      setRequests(data.requests);
    } catch (err) {
      console.error(err);
      setError("Unable to load leave requests.");
    } finally {
      setLoading(false);
    }
  }

  async function respond(requestId: string, action: "APPROVE" | "REJECT", adminNote?: string) {
    try {
      const res = await fetch(`/api/admin/leave-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNote }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update leave request");
      }

      setRequests((current) =>
        current.map((r) => (r.id === requestId ? { ...r, ...data.request, impact: null } : r)),
      );

      // Approving moves classes, which changes what other pending leaves would do.
      if (action === "APPROVE") await load();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update leave request.");
    }
  }

  return { requests, loading, error, approve: (id: string) => respond(id, "APPROVE"), reject: (id: string, note?: string) => respond(id, "REJECT", note) };
}
