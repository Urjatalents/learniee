"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard, FileText } from "lucide-react";

import { getStandardPrice } from "@/features/courses/utils/coursePricing";
import {
  BOARD_OPTIONS,
  GRADE_OPTIONS,
  LANGUAGE_OPTIONS,
} from "@/features/courses/constants/courseOptions";
import { useParentClassRequests } from "@/features/class-requests/hooks/useClassRequests";
import { useStudents } from "@/features/parent/hooks/useStudents";
import { KID_PALETTE } from "@/features/parent/components/home/homeLogic";
import { KidAvatar, Tag } from "@/features/parent/components/home/HomeBits";
import PdDialog from "@/features/parent/components/courses/PdDialog";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";
import {
  PD_BTN_DNG,
  PD_BTN_DTXT_SM,
  PD_BTN_PRI,
  PD_BTN_SEC,
  PD_ERR,
  PD_INPUT,
  PD_LABEL,
  PdEmpty,
} from "@/features/parent/components/courses/pdUi";
import {
  CLASS_REQUEST_STATUS_LABELS,
  formatClassRequestDate,
} from "@/features/shared/utils/classRequestStatus";
import { WEEKDAY_LABELS, formatSchedule } from "@/features/shared/utils/weekdays";

/**
 * "Request a class" tab. A Parent asks for a class that isn't in the course
 * list; Admin vets it and circulates it to teachers; a teacher who accepts
 * lists a course, which then appears under Courses (`classRequest.service.ts`).
 */

const DEFAULT_LANGUAGE = LANGUAGE_OPTIONS[0];
const MAX_DESC = 500;

const emptyForm = {
  studentId: "",
  title: "",
  subject: "",
  grade: "",
  board: "CBSE",
  language: DEFAULT_LANGUAGE as string,
  preferredDays: [] as number[],
  preferredTime: "",
  description: "",
};
type Form = typeof emptyForm;
type Errors = Partial<Record<"title" | "subject" | "grade" | "days" | "time" | "description", string>>;

const inList = (list: readonly string[], v: string) => list.includes(v);

/** Optional prefill from public class pages (`?title=…&subject=…&grade=Grade 5&board=CBSE`). */
function initialForm(params: URLSearchParams): Form {
  const grade = params.get("grade") ?? "";
  const board = params.get("board") ?? "";
  return {
    ...emptyForm,
    title: (params.get("title") ?? "").slice(0, 120),
    subject: (params.get("subject") ?? "").slice(0, 80),
    grade: inList(GRADE_OPTIONS, grade) ? grade : "",
    board: inList(BOARD_OPTIONS, board) ? board : emptyForm.board,
  };
}

function timeText(t: string): string {
  const [h, m] = t.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

const STATUS_TONE = { PENDING_REVIEW: "amber", OPEN: "green", REJECTED: "red", CLOSED: "gray" } as const;
const STATUS_STEP: Record<string, number> = { PENDING_REVIEW: 2, OPEN: 3 };

function Step({ n, title, sub, children }: { n: number; title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-pd-line p-6 first:border-t-0 max-sm:px-4 max-sm:py-5">
      <header className="flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-pd-b100 text-[13px] font-bold text-pd-brand-d">
          {n}
        </span>
        <div>
          <h2 className="font-heading text-[17px] font-semibold">{title}</h2>
          <p className="text-[13px] text-pd-ink3">{sub}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

const chipSpan =
  "flex h-[46px] items-center gap-2 rounded-full border border-pd-line2 bg-white pl-[7px] pr-4 text-sm font-semibold text-pd-ink2 transition-colors peer-checked:border-pd-brand peer-checked:bg-pd-b50 peer-checked:text-pd-brand-d peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-pd-brand";

// useSearchParams() needs a Suspense boundary or `next build` fails on static prerender.
export default function RequestClassView() {
  return <RequestClassContent />;
}

function RequestClassContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { requests, loading, error, submitting, submit, cancel } = useParentClassRequests();
  const { students } = useStudents();
  const { toast, toastNode } = usePdToast();

  const [form, setForm] = useState<Form>(() => initialForm(searchParams));
  const [errors, setErrors] = useState<Errors>({});
  const [withdrawId, setWithdrawId] = useState<string | null>(null);

  const set = <K extends keyof Form>(name: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [name]: value }));
  const clearErr = (k: keyof Errors) => setErrors((e) => ({ ...e, [k]: undefined }));

  function toggleDay(day: number) {
    clearErr("days");
    set(
      "preferredDays",
      form.preferredDays.includes(day)
        ? form.preferredDays.filter((d) => d !== day)
        : [...form.preferredDays, day].sort((a, b) => a - b),
    );
  }

  function pickStudent(studentId: string) {
    const s = students.find((x) => x.id === studentId);
    setForm((f) => ({
      ...f,
      studentId,
      // Convenience prefill, only with values the lists accept.
      grade: s?.standard && inList(GRADE_OPTIONS, s.standard) ? s.standard : f.grade,
      board: s?.board && inList(BOARD_OPTIONS, s.board) ? s.board : f.board,
    }));
    if (s?.standard) clearErr("grade");
  }

  const fixedPrice = getStandardPrice(form.grade || null, false);
  const n = form.preferredDays.length;
  const summary = `${n} class${n === 1 ? "" : "es"} per week${
    n
      ? ` · ${form.preferredDays.map((d) => WEEKDAY_LABELS[d]).join(", ")}${
          form.preferredTime ? ` · ${timeText(form.preferredTime)}` : ""
        }`
      : ""
  }`;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (form.title.trim().length < 3) next.title = "Please add a title.";
    if (form.subject.trim().length < 2) next.subject = "Please add a subject.";
    if (!form.grade) next.grade = "Please select a grade.";
    if (!n) next.days = "Pick at least one day.";
    if (!form.preferredTime) next.time = "Please choose a time.";
    if (form.description.trim().length < 10) next.description = "Please write at least 10 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;

    if (await submit({ ...form, title: form.title.trim(), subject: form.subject.trim(), description: form.description.trim() })) {
      setForm(emptyForm);
      toast("Request submitted — we’ll review it shortly");
    }
  }

  const err = (k: keyof Errors) => (errors[k] ? <span className={PD_ERR}>{errors[k]}</span> : null);

  return (
    <div className="mt-5">
      {error && (
        <p className="mb-4 rounded-xl bg-pd-red-bg px-4 py-3 text-sm font-semibold text-pd-red">{error}</p>
      )}

      <div className="grid grid-cols-1 items-start gap-6 min-[1180px]:grid-cols-[minmax(0,1fr)_340px]">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="overflow-hidden rounded-2xl border border-pd-line bg-white"
        >
          <Step n={1} title="What should we teach?" sub="A short name and the topic or subject.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="rq-title" className={PD_LABEL}>
                  Class title <i className="not-italic text-pd-red">*</i>
                </label>
                <input
                  id="rq-title"
                  value={form.title}
                  maxLength={120}
                  placeholder="e.g. Chess for beginners"
                  aria-invalid={errors.title ? true : undefined}
                  onChange={(e) => {
                    set("title", e.target.value);
                    clearErr("title");
                  }}
                  className={PD_INPUT}
                />
                {err("title")}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="rq-subj" className={PD_LABEL}>
                  Subject / topic <i className="not-italic text-pd-red">*</i>
                </label>
                <input
                  id="rq-subj"
                  value={form.subject}
                  maxLength={80}
                  placeholder="e.g. Chess"
                  aria-invalid={errors.subject ? true : undefined}
                  onChange={(e) => {
                    set("subject", e.target.value);
                    clearErr("subject");
                  }}
                  className={PD_INPUT}
                />
                {err("subject")}
              </div>
            </div>
          </Step>

          <Step n={2} title="Who is it for?" sub="We use grade and board to match the right teacher.">
            <div role="radiogroup" aria-label="Learner" className="flex flex-wrap gap-2">
              {students.map((s, i) => {
                const first = s.visibleName || s.firstName;
                return (
                  <label key={s.id} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="rqkid"
                      checked={form.studentId === s.id}
                      onChange={() => pickStudent(s.id)}
                      className="peer absolute inset-0 cursor-pointer opacity-0"
                    />
                    <span className={chipSpan}>
                      <KidAvatar name={first} color={KID_PALETTE[i % KID_PALETTE.length]} />
                      {first}
                      {s.standard && (
                        <small className="text-[13px] text-pd-ink3">
                          {s.standard.replace(/^Grade\s*/i, "Gr ")}
                        </small>
                      )}
                    </span>
                  </label>
                );
              })}
              <label className="relative cursor-pointer">
                <input
                  type="radio"
                  name="rqkid"
                  checked={form.studentId === ""}
                  onChange={() => set("studentId", "")}
                  className="peer absolute inset-0 cursor-pointer opacity-0"
                />
                <span className={`${chipSpan} pl-4`}>Not specified</span>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="rq-grade" className={PD_LABEL}>
                  Grade <i className="not-italic text-pd-red">*</i>
                </label>
                <select
                  id="rq-grade"
                  value={form.grade}
                  aria-invalid={errors.grade ? true : undefined}
                  onChange={(e) => {
                    set("grade", e.target.value);
                    clearErr("grade");
                  }}
                  className={PD_INPUT}
                >
                  <option value="">Select</option>
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                {err("grade")}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="rq-board" className={PD_LABEL}>
                  Board
                </label>
                <select
                  id="rq-board"
                  value={form.board}
                  onChange={(e) => set("board", e.target.value)}
                  className={PD_INPUT}
                >
                  {BOARD_OPTIONS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="rq-lang" className={PD_LABEL}>
                Language of teaching
              </label>
              <select
                id="rq-lang"
                value={form.language}
                onChange={(e) => set("language", e.target.value)}
                className={PD_INPUT}
              >
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl bg-pd-b50 px-3.5 py-2.5 text-[13px] font-semibold text-pd-brand-d">
              <CreditCard size={18} className="shrink-0" />
              <span>
                {fixedPrice != null
                  ? `Fixed price: ₹${fixedPrice} per hour, set by grade.`
                  : "Pick a grade to see the fixed hourly price."}
              </span>
            </div>
          </Step>

          <Step n={3} title="When should classes happen?" sub="Pick the days and a start time. All times are IST.">
            <div className="flex flex-col gap-2">
              <span className={PD_LABEL}>
                Days <i className="not-italic text-pd-red">*</i>
              </span>
              <div role="group" aria-label="Days" className="flex flex-wrap gap-1.5">
                {WEEKDAY_LABELS.map((label, day) => (
                  <label key={label} className="relative cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.preferredDays.includes(day)}
                      onChange={() => toggleDay(day)}
                      className="peer absolute inset-0 opacity-0"
                    />
                    <span className="grid h-10 min-w-12 place-items-center rounded-full border border-pd-line2 px-3 text-[13px] font-semibold text-pd-ink2 transition-colors peer-checked:border-pd-brand peer-checked:bg-pd-brand peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-pd-brand">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
              {err("days")}
            </div>

            <div className="flex max-w-[240px] flex-col gap-2">
              <label htmlFor="rq-time" className={PD_LABEL}>
                Class time (IST) <i className="not-italic text-pd-red">*</i>
              </label>
              <input
                id="rq-time"
                type="time"
                value={form.preferredTime}
                aria-invalid={errors.time ? true : undefined}
                onChange={(e) => {
                  set("preferredTime", e.target.value);
                  clearErr("time");
                }}
                className={PD_INPUT}
              />
              {err("time")}
            </div>

            <p className="rounded-xl bg-pd-bg px-3.5 py-2.5 text-[13px] font-semibold text-pd-ink2">{summary}</p>
          </Step>

          <Step n={4} title="Tell us more" sub="Your child’s level and what you want them to achieve.">
            <div className="flex flex-col gap-2">
              <label htmlFor="rq-desc" className="sr-only">
                Description
              </label>
              <textarea
                id="rq-desc"
                value={form.description}
                maxLength={MAX_DESC}
                placeholder="e.g. Knows the basic moves and wants to learn openings and simple tactics. Please don’t include phone numbers or addresses."
                aria-invalid={errors.description ? true : undefined}
                onChange={(e) => {
                  set("description", e.target.value);
                  clearErr("description");
                }}
                className="min-h-24 w-full resize-y rounded-xl border border-pd-line2 bg-white p-3 text-sm outline-none focus:border-pd-brand focus:ring-4 focus:ring-pd-b100 aria-invalid:border-pd-red"
              />
              <span className="text-right text-xs text-pd-ink3">
                {form.description.length}/{MAX_DESC}
              </span>
              {err("description")}
            </div>
          </Step>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-pd-line bg-pd-bg px-6 py-4 max-sm:px-4">
            <p className="flex-[1_1_220px] text-[13px] text-pd-ink3">
              Our team reviews every request before teachers see it.
            </p>
            <button type="submit" disabled={submitting} className={`${PD_BTN_PRI} max-sm:w-full`}>
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </form>

        <aside className="flex min-w-0 flex-col gap-5 min-[1180px]:sticky min-[1180px]:top-[80px]">
          <section aria-labelledby="rq-how" className="rounded-2xl border border-pd-line bg-white p-5">
            <h2 id="rq-how" className="mb-2 font-heading text-base font-semibold">
              How it works
            </h2>
            {[
              "Tell us what you need",
              "Our team reviews it",
              "Teachers see it and one accepts",
              "A course is listed here for you to join",
            ].map((x, i) => (
              <div key={x} className="flex items-start gap-3 py-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-pd-b100 text-[13px] font-semibold text-pd-brand-d">
                  {i + 1}
                </span>
                <span className="text-sm">{x}</span>
              </div>
            ))}
          </section>

          <section aria-labelledby="rq-list">
            <h2 id="rq-list" className="mb-3 font-heading text-base font-semibold">
              Your requests <span className="text-xs font-medium text-pd-ink3">{requests.length}</span>
            </h2>

            {loading ? (
              <div className="h-40 animate-pulse rounded-2xl bg-[#eeeaf7]" />
            ) : requests.length === 0 ? (
              <div className="rounded-2xl border border-pd-line bg-white">
                <PdEmpty icon={FileText} title="No requests yet" text="Your custom class requests will appear here." />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {requests.map((r) => {
                  const step = STATUS_STEP[r.status] ?? 0;
                  const when = [
                    r.preferredDays.length > 0 ? formatSchedule(r.preferredDays, r.preferredTime) : r.preferredSchedule,
                    r.pricePerSession ? `₹${r.pricePerSession} per hour` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  const active = r.status === "PENDING_REVIEW" || r.status === "OPEN";

                  return (
                    <article key={r.id} className="flex flex-col gap-2 rounded-2xl border border-pd-line bg-white p-5">
                      <div className="flex items-start justify-between gap-2">
                        <b className="text-[15px] font-semibold leading-[1.35]">{r.title}</b>
                        <Tag tone={STATUS_TONE[r.status] ?? "gray"}>
                          {CLASS_REQUEST_STATUS_LABELS[r.status] ?? r.status}
                        </Tag>
                      </div>
                      <small className="text-[13px] text-pd-ink3">
                        {[r.subject, r.grade, r.board, r.language].filter(Boolean).join(" · ")}
                        {r.studentName ? ` · for ${r.studentName}` : ""}
                      </small>
                      <p className="whitespace-pre-line text-sm text-pd-ink2">{r.description}</p>
                      <small className="text-[13px] text-pd-ink3">
                        {when ? `${when} · ` : ""}Requested {formatClassRequestDate(r.createdAt)}
                      </small>

                      {step > 0 && (
                        <div aria-hidden="true" className="mt-1 grid grid-cols-3 gap-1">
                          {[1, 2, 3].map((i) => (
                            <i
                              key={i}
                              className={`h-[5px] rounded-full ${i <= step ? "bg-pd-brand" : "bg-pd-line2"}`}
                            />
                          ))}
                        </div>
                      )}

                      <small className="text-[13px] text-pd-ink3">
                        {r.status === "PENDING_REVIEW"
                          ? "With our team for review."
                          : r.status === "OPEN"
                            ? r.acceptedCount > 0
                              ? `${r.acceptedCount} teacher${r.acceptedCount === 1 ? "" : "s"} accepted. A course will appear in Courses once it’s approved.`
                              : "Shared with teachers. We’ll notify you when one accepts."
                            : r.status === "CLOSED"
                              ? "This request is closed."
                              : ""}
                      </small>

                      {r.adminNote && (
                        <p className="rounded-xl bg-pd-bg p-3 text-sm text-pd-ink2">
                          <b className="font-semibold">Note from our team: </b>
                          {r.adminNote}
                        </p>
                      )}

                      {r.liveListings.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {r.liveListings.map((l) => (
                            <button
                              key={l.courseId}
                              type="button"
                              onClick={() => router.push(`/parent/courses/${l.courseId}`)}
                              className="rounded-[10px] bg-pd-b50 px-3 py-1.5 text-[13px] font-semibold text-pd-brand-d hover:bg-pd-b100"
                            >
                              View course: {l.courseTitle ?? "Course"}
                            </button>
                          ))}
                        </div>
                      )}

                      {active && (
                        <button
                          type="button"
                          onClick={() => setWithdrawId(r.id)}
                          className={`${PD_BTN_DTXT_SM} -ml-2 self-start`}
                        >
                          Withdraw request
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </aside>
      </div>

      {withdrawId && (
        <PdDialog
          title="Withdraw this request?"
          onClose={() => setWithdrawId(null)}
          inlineFooter
          footer={
            <>
              <button type="button" className={PD_BTN_SEC} onClick={() => setWithdrawId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={PD_BTN_DNG}
                onClick={async () => {
                  const id = withdrawId;
                  setWithdrawId(null);
                  await cancel(id);
                  toast("Request withdrawn");
                }}
              >
                Withdraw
              </button>
            </>
          }
        >
          <p className="text-sm">
            Teachers will no longer see it. You can submit a new request any time.
          </p>
        </PdDialog>
      )}

      {toastNode}
    </div>
  );
}
