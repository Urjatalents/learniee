"use client";

import { useEffect, useState } from "react";

export interface ParentComplaint {
  id: string;
  subject: string;
  description: string;
  department: "ACCOUNTS" | "HR" | "IT" | null;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export function useParentComplaints() {
  const [complaints, setComplaints] = useState<ParentComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);

      const res = await fetch("/api/parent/complaints");
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

  async function submit(input: { subject: string; description: string; department: string }) {
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/parent/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit complaint");
      }

      setComplaints((current) => [data.complaint, ...current]);
      return true;
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to submit complaint.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return { complaints, loading, error, submitting, submit };
}
