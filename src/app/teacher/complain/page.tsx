"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle } from "lucide-react";

import { useTeacherComplaints } from "@/features/teacher/hooks/useComplaints";
import { getComplaintStatusStyle } from "@/features/shared/utils/complaintStatus";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import ComplaintDepartmentField from "@/features/shared/components/ComplaintDepartmentField";
import {
  COMPLAINT_DEPARTMENT_LABELS,
  type ComplaintDepartmentValue,
} from "@/features/shared/utils/complaintDepartment";

/**
 * "Complain" sidebar entry (new — `TeacherSidebar.tsx`). A Teacher
 * raises a support issue with a subject + description; it's OPEN
 * until Admin responds (`/admin/complaints`) — single-step, Admin
 * only, same shape as `/teacher/leave`. See `complaint.service.ts`.
 */

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Awaiting admin",
  IN_PROGRESS: "Being looked into",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function TeacherComplainPage() {
  const { complaints, loading, error, submitting, submit } = useTeacherComplaints();

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState<ComplaintDepartmentValue | "">("");
  const [formError, setFormError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!department) {
      setFormError("Choose which department your issue is for.");
      return;
    }

    if (!subject.trim()) {
      setFormError("Give your issue a short subject.");
      return;
    }

    if (!description.trim()) {
      setFormError("Describe the issue so Admin can help.");
      return;
    }

    const ok = await submit({
      subject: subject.trim(),
      description: description.trim(),
      department,
    });

    if (ok) {
      setSubject("");
      setDescription("");
      setDepartment("");
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-wider text-brand">Schedule</p>
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-gray-800 mt-1 flex items-center gap-2">
          <AlertCircle size={20} className="text-brand" />
          Complain
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Pick the right department, raise your issue and we will get back to you here. For anything urgent, call the number shown for that department.
        </p>
      </div>

      {/* New complaint form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 shadow-sm mb-8 space-y-4"
      >
        <h2 className="font-heading text-base font-bold text-gray-800">Raise a complaint</h2>

        <ComplaintDepartmentField value={department} onChange={setDepartment} />

        <label className="block text-xs font-semibold text-gray-600">
          Subject
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Short summary of the issue"
            maxLength={150}
            className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 outline-none text-sm text-gray-800 focus:border-brand"
            required
          />
        </label>

        <label className="block text-xs font-semibold text-gray-600">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us what happened, and what you'd like done about it"
            rows={4}
            maxLength={2000}
            className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 outline-none text-sm text-gray-800 focus:border-brand resize-none"
            required
          />
        </label>

        {(formError || error) && <ErrorBanner size="compact">{formError || error}</ErrorBanner>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-brand text-white text-sm font-bold px-5 py-2.5 rounded-full hover:opacity-90 disabled:opacity-50 transition"
        >
          {submitting ? "Submitting..." : "Submit complaint"}
        </button>
      </form>

      {/* History */}
      <div>
        <h2 className="font-heading text-base font-bold text-gray-800 mb-3">
          Your complaints
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-violet-50 animate-pulse" />
            ))}
          </div>
        ) : complaints.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-8 text-center">
            <p className="text-gray-500">You haven&apos;t raised any complaints yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <div key={c.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {c.department && (
                      <p className="text-[11px] font-bold uppercase tracking-wide text-brand mb-0.5">
                        {COMPLAINT_DEPARTMENT_LABELS[c.department]}
                      </p>
                    )}
                    <p className="font-heading text-sm font-bold text-gray-800">{c.subject}</p>
                    <p className="text-sm text-gray-500 mt-1">{c.description}</p>
                    <p className="text-xs text-gray-400 mt-1">Raised {formatDate(c.createdAt)}</p>
                    {c.adminNote && (
                      <p className="text-xs text-gray-400 mt-1">Admin note: {c.adminNote}</p>
                    )}
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${getComplaintStatusStyle(
                      c.status,
                    )}`}
                  >
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
