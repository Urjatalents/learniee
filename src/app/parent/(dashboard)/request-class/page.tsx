"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";

import { getStandardPrice } from "@/features/courses/utils/coursePricing";
import { WEEKDAY_LABELS, formatSchedule } from "@/features/shared/utils/weekdays";

import { useParentClassRequests } from "@/features/class-requests/hooks/useClassRequests";
import { useStudents } from "@/features/parent/hooks/useStudents";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import SelectField from "@/features/shared/components/SelectField";
import {
  BOARD_OPTIONS,
  GRADE_OPTIONS,
  LANGUAGE_OPTIONS,
} from "@/features/courses/constants/courseOptions";
import {
  CLASS_REQUEST_STATUS_LABELS,
  formatClassRequestDate,
  getClassRequestStatusStyle,
} from "@/features/shared/utils/classRequestStatus";

/**
 * "Request Class" sidebar entry. A Parent asks for a class that isn't in the
 * course list; Admin vets it and circulates it to teachers; a teacher who
 * accepts lists a course, which then appears under Courses. See
 * `classRequest.service.ts`.
 */

const emptyForm = {
  studentId: "",
  title: "",
  subject: "",
  grade: "",
  board: "",
  language: "",
  preferredDays: [] as number[],
  preferredTime: "",
  description: "",
};

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 outline-none text-sm text-gray-800 focus:border-purple-400";

export default function ParentRequestClassPage() {
  const router = useRouter();
  const { requests, loading, error, submitting, submit, cancel } = useParentClassRequests();
  const { students } = useStudents();
  const [form, setForm] = useState(emptyForm);

  function update(name: Exclude<keyof typeof emptyForm, "preferredDays">, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleDay(day: number) {
    setForm((current) => ({
      ...current,
      preferredDays: current.preferredDays.includes(day)
        ? current.preferredDays.filter((d) => d !== day)
        : [...current.preferredDays, day].sort((a, b) => a - b),
    }));
  }

  const fixedPrice = getStandardPrice(form.grade || null, false);

  function pickStudent(studentId: string) {
    const student = students.find((s) => s.id === studentId);

    setForm((current) => ({
      ...current,
      studentId,
      // Convenience prefill only, and only when it matches the lists used for courses.
      grade:
        student?.standard && (GRADE_OPTIONS as readonly string[]).includes(student.standard)
          ? student.standard
          : current.grade,
      board:
        student?.board && (BOARD_OPTIONS as readonly string[]).includes(student.board)
          ? student.board
          : current.board,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (await submit(form)) {
      setForm(emptyForm);
    }
  }

  return (
    <div className="p-5 sm:p-8 max-w-6xl mx-auto">
      <p className="text-xs font-bold uppercase tracking-wider text-purple-500">Custom classes</p>
      <h1 className="text-3xl font-bold text-purple-600">Request a Class</h1>
      <p className="text-gray-500 mt-1 mb-8 max-w-2xl">
        Can&apos;t find the class your child needs? Tell us what you&apos;re looking for. Our team
        reviews it and shares it with teachers; once one accepts, a course is listed here for you to
        join.
      </p>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 bg-white border rounded-2xl p-6 shadow-sm space-y-4 h-fit"
        >
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <PlusCircle size={18} className="text-purple-500" /> New request
          </h2>

          <label className="block text-xs font-semibold text-gray-600">
            For which child (optional)
            <select
              value={form.studentId}
              onChange={(e) => pickStudent(e.target.value)}
              className={`${inputClass} mt-1`}
            >
              <option value="">Not specified</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.visibleName || `${s.firstName} ${s.lastName}`.trim()}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-gray-600">
            Title *
            <input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              maxLength={120}
              required
              placeholder="e.g. Chess for beginners"
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="block text-xs font-semibold text-gray-600">
            Subject / topic *
            <input
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              maxLength={80}
              required
              placeholder="e.g. Chess, Vedic Maths, Python"
              className={`${inputClass} mt-1`}
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SelectField name="grade" value={form.grade} onChange={(e) => update("grade", e.target.value)} placeholder="Grade *" options={GRADE_OPTIONS} required />
            <SelectField name="board" value={form.board} onChange={(e) => update("board", e.target.value)} placeholder="Board" options={BOARD_OPTIONS} />
            <SelectField name="language" value={form.language} onChange={(e) => update("language", e.target.value)} placeholder="Language" options={LANGUAGE_OPTIONS} />
          </div>

          <div className="rounded-lg bg-purple-50 px-3 py-2 text-xs text-purple-700">
            {fixedPrice != null
              ? `Fixed price for ${form.grade}: ₹${fixedPrice} per class. It is set by grade and can't be changed.`
              : "Select a grade to see the fixed price per class."}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Days for the classes *</p>
            <div className="flex gap-1.5 flex-wrap">
              {WEEKDAY_LABELS.map((label, day) => {
                const active = form.preferredDays.includes(day);

                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                      active
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-gray-500 border-gray-200 hover:border-purple-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {form.preferredDays.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {form.preferredDays.length} class{form.preferredDays.length === 1 ? "" : "es"} per week
              </p>
            )}
          </div>

          <label className="block text-xs font-semibold text-gray-600">
            Class time (IST) *
            <input
              type="time"
              value={form.preferredTime}
              onChange={(e) => update("preferredTime", e.target.value)}
              required
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="block text-xs font-semibold text-gray-600">
            What do you need? *
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              maxLength={2000}
              required
              rows={5}
              placeholder="Current level, goals, anything the teacher should know. Please don't include phone numbers or addresses."
              className={`${inputClass} mt-1 resize-none`}
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-lg disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit request"}
          </button>
        </form>

        <section className="lg:col-span-3 space-y-4">
          <h2 className="font-semibold text-gray-800">Your requests</h2>

          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : requests.length === 0 ? (
            <div className="border border-dashed rounded-2xl p-8 text-center text-sm text-gray-500">
              You haven&apos;t requested a class yet.
            </div>
          ) : (
            requests.map((r) => (
              <article key={r.id} className="bg-white border rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">{r.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[r.subject, r.grade, r.board, r.language].filter(Boolean).join(" · ")}
                      {r.studentName ? ` · for ${r.studentName}` : ""}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${getClassRequestStatusStyle(r.status)}`}>
                    {CLASS_REQUEST_STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mt-3 whitespace-pre-line">{r.description}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {[
                    r.preferredDays.length > 0 ? formatSchedule(r.preferredDays, r.preferredTime) : r.preferredSchedule,
                    r.pricePerSession ? `₹${r.pricePerSession} per class` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="text-xs text-gray-400 mt-1">Requested {formatClassRequestDate(r.createdAt)}</p>

                {r.adminNote && (
                  <p className="mt-3 text-sm bg-gray-50 rounded-lg p-3 text-gray-600">
                    <span className="font-semibold">Note from our team: </span>
                    {r.adminNote}
                  </p>
                )}

                {r.status === "OPEN" && (
                  <p className="mt-3 text-sm text-gray-600">
                    {r.acceptedCount > 0
                      ? `${r.acceptedCount} teacher${r.acceptedCount === 1 ? "" : "s"} accepted. A course will appear in Courses once it's approved.`
                      : "Shared with teachers. We'll notify you when one accepts."}
                  </p>
                )}

                {r.liveListings.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.liveListings.map((l) => (
                      <button
                        key={l.courseId}
                        type="button"
                        onClick={() => router.push(`/parent/courses/${l.courseId}`)}
                        className="text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg"
                      >
                        View course: {l.courseTitle ?? "Course"}
                      </button>
                    ))}
                  </div>
                )}

                {(r.status === "PENDING_REVIEW" || r.status === "OPEN") && (
                  <button
                    type="button"
                    onClick={() => cancel(r.id)}
                    className="mt-3 text-xs font-semibold text-gray-500 hover:text-red-600"
                  >
                    Withdraw request
                  </button>
                )}
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
