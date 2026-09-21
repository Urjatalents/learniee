"use client";

import Link from "next/link";
import { GraduationCap, Plus } from "lucide-react";

import {
  useParentEnrollments,
  type ParentEnrollment,
} from "@/features/parent/hooks/useEnrollments";
import MyClassCard from "@/features/parent/components/my-classes/MyClassCard";
import MyClassesSummary from "@/features/parent/components/my-classes/MyClassesSummary";
import EnrollmentStatusCard from "@/features/parent/components/enrollments/EnrollmentStatusCard";
import { usesClassView } from "@/features/parent/utils/classView";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

/** Soonest next class first; courses with nothing scheduled go last. */
function byNextClass(a: ParentEnrollment, b: ParentEnrollment) {
  const aNext = a.classSummary?.nextClass?.startsAt;
  const bNext = b.classSummary?.nextClass?.startsAt;

  if (aNext && bNext) return new Date(aNext).getTime() - new Date(bNext).getTime();
  if (aNext) return -1;
  if (bNext) return 1;

  return 0;
}

function SectionTitle({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500">{children}</h2>
      <span className="text-[11px] font-bold text-brand bg-violet-100 rounded-full px-2 py-0.5">
        {count}
      </span>
    </div>
  );
}

/**
 * My Classes (Part 2C) — one card per enrolled course, replacing the
 * separate Enrollments, Homework and Chat entries. Cycle-model
 * enrollments open the new class page; legacy enrollments (and
 * cycle ones still awaiting approval) keep the old status card.
 *
 * The list is grouped: running classes first (soonest next class on
 * top), then anything that still needs an answer or an approval, then
 * finished enrollments.
 */
export default function ParentMyClassesPage() {
  const { enrollments, loading, error, respondToRevision } = useParentEnrollments(
    "/api/parent/my-classes",
  );

  const running = enrollments
    .filter((e) => usesClassView(e) && e.status !== "COMPLETED")
    .sort(byNextClass);
  const finished = enrollments.filter((e) => usesClassView(e) && e.status === "COMPLETED");
  const others = enrollments.filter((e) => !usesClassView(e));

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-2xl bg-violet-100 text-brand flex items-center justify-center flex-shrink-0">
            <GraduationCap size={22} />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold text-violet-900">My Classes</h1>
            <p className="text-sm text-gray-500 mt-0.5 max-w-xl">
              Every course in one place — join classes, see how each cycle is going, check
              homework and chat with your teacher.
            </p>
          </div>
        </div>

        <Link
          href="/parent/courses"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-brand hover:bg-brand-dark px-4 py-2.5 rounded-full shadow-playful transition-colors"
        >
          <Plus size={15} />
          Find a new course
        </Link>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="rounded-3xl border border-violet-100 bg-violet-50/60 animate-pulse h-72"
            />
          ))}
        </div>
      ) : enrollments.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-10 text-center">
          <span className="w-14 h-14 rounded-2xl bg-violet-100 text-brand flex items-center justify-center mx-auto mb-3">
            <GraduationCap size={26} />
          </span>
          <p className="font-heading font-bold text-gray-800">No classes yet</p>
          <p className="text-sm text-gray-500 mt-1">
            <Link href="/parent/courses" className="text-brand font-semibold hover:underline">
              Browse courses
            </Link>{" "}
            and enroll your child to get started.
          </p>
        </div>
      ) : (
        <>
          <MyClassesSummary enrollments={enrollments} />

          {running.length > 0 && (
            <section className="mb-8">
              <SectionTitle count={running.length}>Your classes</SectionTitle>
              <div className="grid gap-5 md:grid-cols-2">
                {running.map((enrollment) => (
                  <MyClassCard key={enrollment.id} enrollment={enrollment} />
                ))}
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section className="mb-8">
              <SectionTitle count={others.length}>Enrollments &amp; approvals</SectionTitle>
              <div className="space-y-4 max-w-3xl">
                {others.map((enrollment) => (
                  <EnrollmentStatusCard
                    key={enrollment.id}
                    enrollment={enrollment}
                    onConfirmRevision={(id) => respondToRevision(id, "CONFIRM")}
                    onDeclineRevision={(id) => respondToRevision(id, "DECLINE")}
                  />
                ))}
              </div>
            </section>
          )}

          {finished.length > 0 && (
            <section>
              <SectionTitle count={finished.length}>Completed</SectionTitle>
              <div className="grid gap-5 md:grid-cols-2">
                {finished.map((enrollment) => (
                  <MyClassCard key={enrollment.id} enrollment={enrollment} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
