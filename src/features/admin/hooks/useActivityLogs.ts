"use client";

import { useCallback, useEffect, useState } from "react";

export type ActivityAction =
  | "AUTH_LOGIN"
  | "AUTH_LOGOUT"
  | "CLASS_SESSION_COMPLETED"
  | "PAYMENT_ENROLLMENT"
  | "PAYMENT_DEMO_BOOKING"
  | "PAYMENT_WALLET_TOPUP"
  | "WALLET_CREDITED_MANUAL"
  | "LEAVE_REQUEST_APPROVED"
  | "LEAVE_REQUEST_REJECTED"
  | "ENROLLMENT_TEACHER_APPROVED"
  | "ENROLLMENT_ADMIN_APPROVED"
  | "ENROLLMENT_REJECTED"
  | "TEACHER_APPROVED"
  | "TEACHER_REJECTED"
  | "COURSE_APPROVED"
  | "COURSE_REJECTED"
  | "USER_DELETED"
  | "BLOG_SUBMITTED"
  | "BLOG_PUBLISHED"
  | "BLOG_REJECTED"
  | "GENERIC";

export type ActivityActorRole = "PARENT" | "TEACHER" | "ADMIN" | "ACCOUNTS" | "HR" | "SYSTEM";

export interface ActivityLogRow {
  id: string;
  action: ActivityAction;
  actorRole: ActivityActorRole;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ActivityLogFiltersState {
  action: ActivityAction | "";
  actorRole: ActivityActorRole | "";
  q: string;
  from: string; // yyyy-mm-dd
  to: string; // yyyy-mm-dd
}

export const EMPTY_FILTERS: ActivityLogFiltersState = {
  action: "",
  actorRole: "",
  q: "",
  from: "",
  to: "",
};

function buildQuery(filters: ActivityLogFiltersState, page: number, pageSize: number) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (filters.action) params.set("action", filters.action);
  if (filters.actorRole) params.set("actorRole", filters.actorRole);
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return params.toString();
}

export function useActivityLogs(pageSize = 50) {
  const [filters, setFilters] = useState<ActivityLogFiltersState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ActivityLogRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/admin/activity-logs?${buildQuery(filters, page, pageSize)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load the activity log.");
      }

      setItems(data.items);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load the activity log.");
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  function applyFilters(next: ActivityLogFiltersState) {
    setFilters(next);
    setPage(1);
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  function downloadUrl() {
    return `/api/admin/activity-logs/export?${buildQuery(filters, 1, pageSize)}`;
  }

  return {
    filters,
    applyFilters,
    resetFilters,
    page,
    setPage,
    totalPages,
    total,
    items,
    loading,
    error,
    reload: load,
    downloadUrl,
  };
}
