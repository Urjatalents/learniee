"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, Inbox, Send } from "lucide-react";

import ErrorBanner from "@/features/shared/components/ErrorBanner";
import ComplaintDepartmentField, {
  COMPLAINT_DEPARTMENT_ICONS,
} from "@/features/shared/components/ComplaintDepartmentField";
import { getComplaintStatusStyle } from "@/features/shared/utils/complaintStatus";
import {
  COMPLAINT_DEPARTMENT_LABELS,
  type ComplaintDepartmentValue,
} from "@/features/shared/utils/complaintDepartment";

/**
 * Shared body of `/parent/complain` and `/teacher/complain` — the two pages
 * were near-identical copies. Form on the left, history on the right
 * (stacked on small screens). Data comes in through props from the
 * role-specific hooks (`useParentComplaints` / `useTeacherComplaints`).
 */

export interface ComplaintItem {
  id: string;
  subject: string;
  description: string;
  department: ComplaintDepartmentValue | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Awaiting admin",
  IN_PROGRESS: "Being looked into",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const DEPARTMENT_CHIP: Record<ComplaintDepartmentValue, string> = {
  ACCOUNTS: "bg-emerald-50 text-emerald-700",
  HR: "bg-sky-50 text-sky-700",
  IT: "bg-orange-50 text-orange-700",
};

type Filter = "ALL" | "OPEN" | "DONE";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "DONE", label: "Resolved" },
];

const SUBJECT_MAX = 150;
const DESCRIPTION_MAX = 2000;

function isOpen(status: string) {
  return status === "OPEN" || status === "IN_PROGRESS";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ComplaintsView({
  eyebrow = "Support",
  complaints,
  loading,
  error,
  submitting,
  submit,
}: {
  eyebrow?: string;
  complaints: ComplaintItem[];
  loading: boolean;
  error: string;
  submitting: boolean;
  submit: (input: {
    subject: string;
    description: string;
    department: string;
  }) => Promise<boolean>;
}) {
  const [department, setDepartment] = useState<ComplaintDepartmentValue | "">("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

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
      setFormError("Describe the issue so we can help.");
      return;
    }

    const ok = await submit({
      subject: subject.trim(),
      description: description.trim(),
      department,
    });

    if (ok) {
      setDepartment("");
      setSubject("");
      setDescription("");
    }
  }

  const openCount = complaints.filter((c) => isOpen(c.status)).length;
  const visible = complaints.filter((c) =>
    filter === "ALL" ? true : filter === "OPEN" ? isOpen(c.status) : !isOpen(c.status),
  );

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-wider text-brand">{eyebrow}</p>
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-gray-800 mt-1 flex items-center gap-2">
          <AlertCircle size={20} className="text-brand" />
          Complain
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Send your issue to the right department. For anything urgent, call the number on the
          department card.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        {/* ---- New complaint ---- */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6"
        >
          <section>
            <h2 className="font-heading text-base font-bold text-gray-800 flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full bg-brand text-white text-xs flex items-center justify-center">
                1
              </span>
              Who should look at this?
            </h2>
            <ComplaintDepartmentField value={department} onChange={setDepartment} />
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-base font-bold text-gray-800 flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-brand text-white text-xs flex items-center justify-center">
                2
              </span>
              What happened?
            </h2>

            <label className="block text-xs font-semibold text-gray-600">
              <span className="flex justify-between">
                Subject
                <span className="font-normal text-gray-400">
                  {subject.length}/{SUBJECT_MAX}
                </span>
              </span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Short summary of the issue"
                maxLength={SUBJECT_MAX}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 outline-none text-sm text-gray-800 focus:border-brand"
                required
              />
            </label>

            <label className="block text-xs font-semibold text-gray-600">
              <span className="flex justify-between">
                Description
                <span className="font-normal text-gray-400">
                  {description.length}/{DESCRIPTION_MAX}
                </span>
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us what happened, and what you'd like done about it"
                rows={5}
                maxLength={DESCRIPTION_MAX}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 outline-none text-sm text-gray-800 focus:border-brand resize-none"
                required
              />
            </label>
          </section>

          {(formError || error) && (
            <ErrorBanner size="compact" spacing={false}>
              {formError || error}
            </ErrorBanner>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand text-white text-sm font-bold px-6 py-2.5 rounded-full hover:opacity-90 disabled:opacity-50 transition"
            >
              <Send size={14} />
              {submitting ? "Submitting..." : "Submit complaint"}
            </button>
          </div>
        </form>

        {/* ---- History ---- */}
        <section className="lg:sticky lg:top-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-heading text-base font-bold text-gray-800">
              Your complaints
              {openCount > 0 && (
                <span className="ml-2 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                  {openCount} open
                </span>
              )}
            </h2>

            <div className="inline-flex rounded-full bg-violet-50 p-0.5">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={`text-xs font-semibold px-3 py-1 rounded-full transition ${
                    filter === f.value ? "bg-brand text-white" : "text-gray-500 hover:text-brand"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto lg:pr-1">
            {loading ? (
              [...Array(2)].map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-violet-50 animate-pulse" />
              ))
            ) : visible.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-8 text-center">
                <Inbox size={24} className="mx-auto text-violet-300 mb-2" />
                <p className="text-sm text-gray-500">
                  {complaints.length === 0
                    ? "You haven't raised any complaints yet."
                    : "Nothing here for this filter."}
                </p>
              </div>
            ) : (
              visible.map((c) => {
                const DeptIcon = c.department ? COMPLAINT_DEPARTMENT_ICONS[c.department] : null;

                return (
                  <article
                    key={c.id}
                    className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      {c.department && DeptIcon ? (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${DEPARTMENT_CHIP[c.department]}`}
                        >
                          <DeptIcon size={11} />
                          {COMPLAINT_DEPARTMENT_LABELS[c.department]}
                        </span>
                      ) : (
                        <span />
                      )}

                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${getComplaintStatusStyle(
                          c.status,
                        )}`}
                      >
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </div>

                    <p className="font-heading text-sm font-bold text-gray-800">{c.subject}</p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-3 break-words">
                      {c.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Raised {formatDate(c.createdAt)}</p>

                    {c.adminNote && (
                      <div className="mt-3 rounded-xl bg-violet-50 px-3 py-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
                          Reply
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5 break-words">{c.adminNote}</p>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
