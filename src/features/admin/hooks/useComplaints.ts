"use client";

import { useEffect, useState } from "react";

export interface AdminComplaint {
  id: string;
  raiserId: string;
  raiserRole: "PARENT" | "TEACHER";
  raiserName: string | null;
  raiserEmail: string | null;
  subject: string;
  description: string;
  department: "ACCOUNTS" | "HR" | "IT" | null;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

/**
 * `apiBase` defaults to the Admin routes; department staff (Accounts/HR/IT)
 * and the Admin board use `/api/staff/complaints`, which scopes by role.
 */
export function useAdminComplaints(apiBase = "/api/admin/complaints") {
  const [complaints, setComplaints] = useState<AdminComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);

      const res = await fetch(apiBase);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch complaints");
      }

      setComplaints(data.complaints);
    } catch (err) {
      console.error(err);
      setError("Unable to load complaints.");
    } finally {
      setLoading(false);
    }
  }

  async function respond(
    complaintId: string,
    status: "IN_PROGRESS" | "RESOLVED" | "CLOSED",
    adminNote?: string,
  ) {
    try {
      const res = await fetch(`${apiBase}/${complaintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update complaint");
      }

      setComplaints((current) =>
        current.map((c) => (c.id === complaintId ? { ...c, ...data.complaint } : c)),
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update complaint.");
    }
  }

  return {
    complaints,
    loading,
    error,
    markInProgress: (id: string) => respond(id, "IN_PROGRESS"),
    resolve: (id: string, adminNote?: string) => respond(id, "RESOLVED", adminNote),
    close: (id: string, adminNote?: string) => respond(id, "CLOSED", adminNote),
  };
}
