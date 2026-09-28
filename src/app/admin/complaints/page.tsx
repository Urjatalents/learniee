"use client";

import ComplaintsBoard from "@/features/shared/components/ComplaintsBoard";

/** Admin sees every department's complaints and can act on any of them. */
export default function AdminComplaintsPage() {
  return <ComplaintsBoard apiBase="/api/staff/complaints" />;
}
