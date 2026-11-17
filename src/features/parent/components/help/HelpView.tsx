"use client";

import { useState, type FormEvent } from "react";
import { Check, Phone } from "lucide-react";

import {
  PD_BTN_PRI,
  PD_ERR,
  PD_INPUT,
  PD_LABEL,
  PdEmpty,
  pillFilter,
} from "@/features/parent/components/courses/pdUi";
import { Tag } from "@/features/parent/components/home/HomeBits";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";
import {
  PD_CARD,
  PD_PGRID,
  PD_SECTION_H,
  PdBanner,
  PdSkeleton,
  dLong,
} from "@/features/parent/components/payments/paymentsUi";
import { useParentComplaints } from "@/features/parent/hooks/useComplaints";
import {
  COMPLAINT_DEPARTMENTS,
  toTelHref,
  type ComplaintDepartmentValue,
} from "@/features/shared/utils/complaintDepartment";

/**
 * Parent "Help & support" page (design: 11-parent-help). Department radio cards +
 * subject / description form on the left, "Your complaints" history on the right.
 * Data: /api/parent/complaints via `useParentComplaints` (live-refreshing).
 */

const SUBJECT_MAX = 150;
const DESCRIPTION_MAX = 2000;

type Filter = "all" | "open" | "resolved";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "resolved", label: "Resolved" },
];

const isResolved = (status: string) => status === "RESOLVED" || status === "CLOSED";

function statusTag(status: string) {
  if (status === "RESOLVED") return <Tag tone="green">Resolved</Tag>;
  if (status === "CLOSED") return <Tag tone="gray">Closed</Tag>;
  if (status === "IN_PROGRESS") return <Tag tone="violet">Being looked into</Tag>;
  return <Tag tone="amber">Awaiting admin</Tag>;
}

function deptLabel(value: ComplaintDepartmentValue | null) {
  return COMPLAINT_DEPARTMENTS.find((d) => d.value === value)?.label ?? "General";
}

export default function HelpView() {
  const { complaints, loading, error, submitting, submit } = useParentComplaints();
  const { toast, toastNode } = usePdToast();

  // The design pre-selects the first department (Accounts).
  const [department, setDepartment] = useState<ComplaintDepartmentValue>(
    COMPLAINT_DEPARTMENTS[0].value,
  );
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ subject?: string; description?: string }>({});
  const [filter, setFilter] = useState<Filter>("all");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const s = subject.trim();
    const d = description.trim();
    const next = {
      subject: s.length < 5 ? "Please add a short subject (5+ characters)." : undefined,
      description: d.length < 10 ? "Please describe the issue (10+ characters)." : undefined,
    };
    setErrors(next);
    if (next.subject || next.description) return;

    const ok = await submit({ subject: s, description: d, department });
    if (ok) {
      setSubject("");
      setDescription("");
      setFilter("all");
      toast("Complaint sent — we’ll get back to you");
    }
  }

  const openCount = complaints.filter((c) => !isResolved(c.status)).length;
  const visible = complaints.filter((c) =>
    filter === "all" ? true : filter === "open" ? !isResolved(c.status) : isResolved(c.status),
  );

  return (
    <div className={PD_PGRID}>
      <form onSubmit={handleSubmit} noValidate className={`${PD_CARD} flex flex-col gap-5`}>
        <h2 className="font-heading text-lg font-semibold text-pd-ink">1 · Who should look at this?</h2>
        <div role="radiogroup" aria-label="Report to" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {COMPLAINT_DEPARTMENTS.map((d) => (
            <label
              key={d.value}
              className={`relative flex cursor-pointer flex-col gap-0.5 rounded-xl border bg-white p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-pd-brand ${
                department === d.value
                  ? "border-pd-brand bg-pd-b50 shadow-[0_0_0_3px_var(--color-pd-b100)]"
                  : "border-pd-line hover:border-pd-brand"
              }`}
            >
              <input
                type="radio"
                name="dept"
                value={d.value}
                checked={department === d.value}
                onChange={() => setDepartment(d.value)}
                className="absolute opacity-0"
              />
              <b className="text-[15px] font-semibold">{d.label}</b>
              <small className="text-[13px] text-pd-ink3">{d.handles}</small>
              <a
                href={toTelHref(d.phone)}
                onClick={(e) => e.stopPropagation()}
                className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-semibold text-pd-brand"
              >
                <Phone size={12} aria-hidden />
                {d.phone}
              </a>
            </label>
          ))}
        </div>

        <h2 className="mt-2 font-heading text-lg font-semibold text-pd-ink">2 · What happened?</h2>

        <div className="flex flex-col gap-2">
          <label htmlFor="help-subject" className={PD_LABEL}>
            Subject
          </label>
          <input
            id="help-subject"
            value={subject}
            maxLength={SUBJECT_MAX}
            onChange={(e) => setSubject(e.target.value)}
            aria-invalid={!!errors.subject}
            className={PD_INPUT}
          />
          <span className="text-right text-xs text-pd-ink3">
            {subject.length}/{SUBJECT_MAX}
          </span>
          {errors.subject && <span className={PD_ERR}>{errors.subject}</span>}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="help-description" className={PD_LABEL}>
            Description
          </label>
          <textarea
            id="help-description"
            value={description}
            maxLength={DESCRIPTION_MAX}
            onChange={(e) => setDescription(e.target.value)}
            aria-invalid={!!errors.description}
            className="min-h-[140px] w-full resize-y rounded-xl border border-pd-line2 p-3 text-sm outline-none focus:border-pd-brand focus:ring-4 focus:ring-pd-b100 aria-invalid:border-pd-red"
          />
          <span className="text-right text-xs text-pd-ink3">
            {description.length}/{DESCRIPTION_MAX}
          </span>
          {errors.description && <span className={PD_ERR}>{errors.description}</span>}
        </div>

        {error && <PdBanner tone="red">{error}</PdBanner>}

        <button type="submit" disabled={submitting} className={`${PD_BTN_PRI} self-start`}>
          {submitting ? "Submitting…" : "Submit complaint"}
        </button>
      </form>

      <section aria-labelledby="help-history">
        <h2 id="help-history" className={`${PD_SECTION_H} flex items-center justify-between gap-3`}>
          <span className="flex items-center gap-2">
            Your complaints
            {openCount > 0 && <Tag tone="amber">{openCount} open</Tag>}
          </span>
        </h2>

        <div role="group" aria-label="Filter complaints" className="mb-3 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={pillFilter(filter === f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {loading ? (
            <>
              <PdSkeleton height={110} />
              <PdSkeleton height={110} />
            </>
          ) : visible.length === 0 ? (
            <div className={PD_CARD}>
              <PdEmpty icon={Check} title="Nothing here" text="No complaints in this view." />
            </div>
          ) : (
            visible.map((c) => (
              <article key={c.id} className={`${PD_CARD} flex flex-col gap-1.5`}>
                <div className="flex justify-between gap-2">
                  <Tag tone="gray">{deptLabel(c.department)}</Tag>
                  {statusTag(c.status)}
                </div>
                <b className="break-words font-semibold">{c.subject}</b>
                <p className="break-words text-sm text-pd-ink2">{c.description}</p>
                <span className="text-[13px] text-pd-ink3">Raised {dLong(c.createdAt)}</span>
                {c.adminNote && (
                  <div className="rounded-lg bg-pd-b50 p-3 text-sm text-pd-ink">
                    <small className="mb-0.5 block text-xs font-bold text-pd-ink3">Reply</small>
                    <span className="break-words">{c.adminNote}</span>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </section>

      {toastNode}
    </div>
  );
}
