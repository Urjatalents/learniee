"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useTeacherVacancies } from "@/features/class-requests/hooks/useClassRequests";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import { formatClassRequestDate } from "@/features/shared/utils/classRequestStatus";

/**
 * "Vacancy" sidebar entry. Classes parents asked for that aren't in the course
 * list, vetted and circulated by Admin. A teacher accepts or declines (final);
 * accepting leads to creating the course listing so new parents can join. No
 * parent details are shown. See `classRequest.service.ts`.
 */
export default function TeacherVacancyPage() {
  const router = useRouter();
  const { vacancies, loading, error, busyId, respond } = useTeacherVacancies();
  const [declining, setDeclining] = useState<string | null>(null);
  const [note, setNote] = useState("");

  async function decline(id: string) {
    if (await respond(id, "DECLINE", note.trim() || undefined)) {
      setDeclining(null);
      setNote("");
    }
  }

  return (
    <div className="p-5 sm:p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-purple-600">Vacancy</h1>
      <p className="text-gray-500 mt-1 mb-8 max-w-2xl">
        Classes families are looking for. Accept one you can teach, then create a course listing for
        it so parents can join. Your response is final.
      </p>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : vacancies.length === 0 ? (
        <div className="border border-dashed rounded-2xl p-10 text-center text-sm text-gray-500">
          No open vacancies right now. You&apos;ll be notified when a new one is posted.
        </div>
      ) : (
        <div className="space-y-4">
          {vacancies.map((v) => {
            const mine = v.myResponse;
            const busy = busyId === v.id;

            return (
              <article key={v.id} className="bg-white border rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-gray-800">{v.title}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[v.subject, v.grade, v.board, v.language].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {mine && (
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                        mine.status === "ACCEPTED" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {mine.status === "ACCEPTED" ? "Accepted" : "Declined"}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mt-3 whitespace-pre-line">{v.description}</p>

                <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                  {v.sessionsPerWeek && <div>{v.sessionsPerWeek} class(es) / week</div>}
                  {v.preferredSchedule && <div>Timings: {v.preferredSchedule}</div>}
                  {v.budgetPerSession && <div>Budget: ₹{v.budgetPerSession} / class</div>}
                  <div>Posted {formatClassRequestDate(v.circulatedAt)}</div>
                </dl>

                {!mine && v.status === "OPEN" && (
                  <div className="mt-4">
                    {declining === v.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          maxLength={500}
                          rows={2}
                          placeholder="Reason (optional)"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-sm outline-none focus:border-purple-400 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => decline(v.id)}
                            className="text-sm font-bold text-white bg-gray-700 hover:bg-gray-800 px-4 py-2 rounded-lg disabled:opacity-60"
                          >
                            Confirm decline
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeclining(null);
                              setNote("");
                            }}
                            className="text-sm font-semibold text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => respond(v.id, "ACCEPT")}
                          className="text-sm font-bold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg disabled:opacity-60"
                        >
                          {busy ? "Saving..." : "Accept"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setDeclining(v.id)}
                          className="text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {mine?.status === "ACCEPTED" && (
                  <div className="mt-4">
                    {mine.course ? (
                      <p className="text-sm text-gray-600">
                        Listing created: <span className="font-semibold">{mine.course.courseTitle}</span>{" "}
                        ({mine.course.status === "APPROVED" ? "live" : "awaiting approval"}).
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => router.push(`/teacher/course-management/new?classRequestId=${v.id}`)}
                        className="text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg"
                      >
                        Create course listing
                      </button>
                    )}
                  </div>
                )}

                {mine?.status === "DECLINED" && mine.note && (
                  <p className="mt-3 text-xs text-gray-500">Your note: {mine.note}</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
