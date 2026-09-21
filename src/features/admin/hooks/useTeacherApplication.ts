"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminTeacher, TeacherApprovalState } from "@/features/admin/types/teacher";

/** Loads one full teacher application and lets Admin approve / reject it. */
export function useTeacherApplication(teacherId: string) {
  const [teacher, setTeacher] = useState<AdminTeacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/admin/teachers/${teacherId}`, {
        cache: "no-store",
      });

      if (res.status === 404) {
        throw new Error("This teacher application was not found.");
      }

      if (!res.ok) {
        throw new Error("Unable to load this application.");
      }

      const data = await res.json();
      setTeacher(data.teacher);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to load this application.");
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(status: Exclude<TeacherApprovalState, "PENDING">) {
    try {
      setDeciding(true);
      setError("");
      setNotice("");

      const res = await fetch(`/api/admin/teachers/${teacherId}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update approval");
      }

      setTeacher((current) =>
        current ? { ...current, approvalStatus: status } : current,
      );
      setNotice(
        status === "APPROVED"
          ? "Teacher approved. They can now open their dashboard."
          : "Teacher rejected. They will not be able to access the dashboard.",
      );
    } catch (err) {
      console.error(err);
      setError("Failed to update teacher approval status.");
    } finally {
      setDeciding(false);
    }
  }

  return { teacher, loading, error, notice, deciding, decide };
}
