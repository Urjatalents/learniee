"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Data hooks for the custom class request feature, one per role. They share a
 * tiny fetch helper so each hook is just state + the calls its page needs.
 */

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }

  return data as T;
}

/* ------------------------------ Parent ------------------------------ */

export interface ParentClassRequest {
  id: string;
  title: string;
  subject: string;
  grade: string | null;
  board: string | null;
  language: string | null;
  sessionsPerWeek: number | null;
  preferredSchedule: string | null;
  budgetPerSession: number | null;
  description: string;
  status: "PENDING_REVIEW" | "OPEN" | "REJECTED" | "CLOSED";
  adminNote: string | null;
  studentName: string | null;
  acceptedCount: number;
  liveListings: { courseId: string; courseTitle: string | null }[];
  createdAt: string;
}

export interface ClassRequestFormInput {
  studentId: string;
  title: string;
  subject: string;
  grade: string;
  board: string;
  language: string;
  sessionsPerWeek: string;
  preferredSchedule: string;
  budgetPerSession: string;
  description: string;
}

export function useParentClassRequests() {
  const [requests, setRequests] = useState<ParentClassRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await call<{ requests: ParentClassRequest[] }>("/api/parent/class-requests");
      setRequests(data.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(input: ClassRequestFormInput) {
    setError("");
    setSubmitting(true);

    try {
      await call("/api/parent/class-requests", { method: "POST", body: JSON.stringify(input) });
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit your request.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel(id: string) {
    setError("");

    try {
      await call(`/api/parent/class-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "CANCEL" }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to withdraw your request.");
    }
  }

  return { requests, loading, error, submitting, submit, cancel };
}

/* ------------------------------ Teacher ----------------------------- */

export interface TeacherVacancy {
  id: string;
  title: string;
  subject: string;
  grade: string | null;
  board: string | null;
  language: string | null;
  sessionsPerWeek: number | null;
  preferredSchedule: string | null;
  budgetPerSession: number | null;
  description: string;
  circulatedAt: string | null;
  status: string;
  myResponse: {
    status: "ACCEPTED" | "DECLINED";
    note: string | null;
    respondedAt: string;
    course: { id: string; courseTitle: string | null; status: string } | null;
  } | null;
}

export function useTeacherVacancies() {
  const [vacancies, setVacancies] = useState<TeacherVacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await call<{ vacancies: TeacherVacancy[] }>("/api/teacher/class-requests");
      setVacancies(data.vacancies);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load vacancies.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function respond(id: string, decision: "ACCEPT" | "DECLINE", note?: string) {
    setError("");
    setBusyId(id);

    try {
      await call(`/api/teacher/class-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ decision, note }),
      });
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save your response.");
      // The vacancy may have closed or been answered elsewhere — refresh the list.
      await load();
      return false;
    } finally {
      setBusyId(null);
    }
  }

  return { vacancies, loading, error, busyId, respond };
}

/* ------------------------------- Admin ------------------------------ */

export interface AdminClassRequest extends Omit<ParentClassRequest, "acceptedCount" | "liveListings"> {
  parentName: string;
  parentEmail: string;
  circulatedAt: string | null;
  responses: {
    id: string;
    status: "ACCEPTED" | "DECLINED";
    note: string | null;
    respondedAt: string;
    teacher: { id: string; firstName: string; lastName: string; visibleName: string | null };
    course: { id: string; courseTitle: string | null; status: string } | null;
  }[];
}

export function useAdminClassRequests() {
  const [requests, setRequests] = useState<AdminClassRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await call<{ requests: AdminClassRequest[] }>("/api/admin/class-requests");
      setRequests(data.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load class requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "APPROVE" | "REJECT" | "CLOSE", adminNote?: string) {
    setError("");
    setBusyId(id);

    try {
      await call(`/api/admin/class-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, adminNote }),
      });
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update this request.");
      await load();
      return false;
    } finally {
      setBusyId(null);
    }
  }

  return { requests, loading, error, busyId, act };
}
