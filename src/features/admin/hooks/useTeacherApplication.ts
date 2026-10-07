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
  const [schedulingInterview, setSchedulingInterview] = useState(false);

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

  async function scheduleInterview(scheduledAtIso: string, details: string) {
    try {
      setSchedulingInterview(true);
      setError("");
      setNotice("");

      const res = await fetch(`/api/admin/teachers/${teacherId}/interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: scheduledAtIso, details }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to schedule interview.");
      }

      setTeacher((current) =>
        current
          ? {
              ...current,
              interviewScheduledAt: data.interviewScheduledAt,
              interviewDetails: data.interviewDetails,
            }
          : current,
      );
      setNotice("Interview scheduled. The teacher has been notified.");
      return true;
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to schedule interview.");
      return false;
    } finally {
      setSchedulingInterview(false);
    }
  }

  async function cancelInterview() {
    try {
      setSchedulingInterview(true);
      setError("");
      setNotice("");

      const res = await fetch(`/api/admin/teachers/${teacherId}/interview`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to cancel interview.");
      }

      setTeacher((current) =>
        current ? { ...current, interviewScheduledAt: null, interviewDetails: null } : current,
      );
      setNotice("Interview cancelled.");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to cancel interview.");
    } finally {
      setSchedulingInterview(false);
    }
  }

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
        current
          ? {
              ...current,
              approvalStatus: status,
              reapplyAvailableAt: data.teacher?.reapplyAvailableAt ?? null,
            }
          : current,
      );
      setNotice(
        status === "APPROVED"
          ? "Teacher approved. They can now open their dashboard."
          : "Teacher rejected. They cannot open the dashboard and can appeal after the waiting period.",
      );
    } catch (err) {
      console.error(err);
      setError("Failed to update teacher approval status.");
    } finally {
      setDeciding(false);
    }
  }

  return {
    teacher,
    loading,
    error,
    notice,
    deciding,
    decide,
    schedulingInterview,
    scheduleInterview,
    cancelInterview,
  };
}
