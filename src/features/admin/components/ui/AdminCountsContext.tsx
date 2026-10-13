"use client";

import { createContext, useContext } from "react";

import type { AdminQueueCounts } from "@/features/admin/types/queueCounts";

interface AdminCountsValue {
  counts: AdminQueueCounts | null;
  refresh: () => Promise<void>;
}

export const AdminCountsContext = createContext<AdminCountsValue>({
  counts: null,
  refresh: async () => {},
});

/** Queue counts loaded once by the shell, shared with the dashboard. */
export function useAdminCounts() {
  return useContext(AdminCountsContext);
}
