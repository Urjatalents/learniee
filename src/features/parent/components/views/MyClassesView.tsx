"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";

import type { ParentEnrollment } from "@/features/parent/hooks/useEnrollments";
import { useStudents } from "@/features/parent/hooks/useStudents";
import HomeLearnerSwitcher from "@/features/parent/components/home/HomeLearnerSwitcher";
import { inKid, type LearnerFilter } from "@/features/parent/components/home/homeLogic";
import PdClassRow, { ClassRowsHeader } from "@/features/parent/components/my-classes/PdClassRow";
import { toHomeKids } from "@/features/parent/components/my-classes/pdClassesUi";
import EnrollmentStatusCard from "@/features/parent/components/enrollments/EnrollmentStatusCard";
import { PD_BTN_PRI, PD_BTN_SEC_SM, GridSkeleton, PdEmpty } from "@/features/parent/components/courses/pdUi";
import { usesClassView } from "@/features/parent/utils/classView";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

/** Enrollments waiting for approval (shown as "Waiting for approval" rows). */
const WAITING = new Set(["PENDING_APPROVAL", "PENDING_TEACHER_APPROVAL", "PENDING_ADMIN_APPROVAL", "APPROVED"]);

/** Soonest next class first; courses with nothing scheduled go last. */
function byNextClass(a: ParentEnrollment, b: ParentEnrollment) {
  const aNext = a.classSummary?.nextClass?.startsAt;
  const bNext = b.classSummary?.nextClass?.startsAt;

  if (aNext && bNext) return new Date(aNext).getTime() - new Date(bNext).getTime();
  if (aNext) return -1;
  if (bNext) return 1;

  return 0;
}

interface Props {
  enrollments: ParentEnrollment[];
  loading: boolean;
  error: string;
  onConfirmRevision: (id: string) => void;
  onDeclineRevision: (id: string) => void;
}

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 font-heading text-[19px] font-semibold text-pd-ink">
        {title} <span className="text-xs font-medium text-pd-ink3">{count}</span>
      </h2>
      {children}
    </section>
  );
}

/**
 * My Classes > Classes tab (Parent design). Active classes, classes
 * waiting for approval, and a toggle for completed ones. Enrollments
 * that need the parent's answer (revised by the teacher) or that keep
 * the old legacy view stay on the existing status card.
 */
export default function MyClassesView({
  enrollments,
  loading,
  error,
  onConfirmRevision,
  onDeclineRevision,
}: Props) {
  const { students } = useStudents();
  const [filter, setFilter] = useState<LearnerFilter>("all");
  const [showDone, setShowDone] = useState(false);
  const [now] = useState(() => new Date());

  const kids = toHomeKids(students);
  const mine = enrollments.filter((e) => inKid(filter, e.student.id));

  const active = mine.filter((e) => usesClassView(e) && e.status === "ACTIVE").sort(byNextClass);
  const waiting = mine.filter((e) => !e.isLegacy && WAITING.has(e.status));
  const done = mine.filter((e) => usesClassView(e) && e.status === "COMPLETED");
  const others = mine.filter(
    (e) => !usesClassView(e) && !(!e.isLegacy && WAITING.has(e.status)),
  );

  return (
    <div>
      <div className="mb-[18px] mt-[22px] flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-pd-ink3">Everything your children are enrolled in.</p>
        <div className="[&>div]:mt-0!">
          <HomeLearnerSwitcher kids={kids} active={filter} onSelect={setFilter} />
        </div>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <GridSkeleton count={3} height={72} />
      ) : (
        <>
          {active.length > 0 && (
            <Group title="Active" count={active.length}>
              <div className="overflow-hidden rounded-2xl border border-pd-line bg-white">
                <ClassRowsHeader />
                {active.map((e) => (
                  <PdClassRow key={e.id} enrollment={e} kind="enrolled" kids={kids} now={now} />
                ))}
              </div>
            </Group>
          )}

          {waiting.length > 0 && (
            <Group title="Waiting for approval" count={waiting.length}>
              <div className="overflow-hidden rounded-2xl border border-pd-line bg-white">
                {active.length === 0 && <ClassRowsHeader />}
                {waiting.map((e) => (
                  <PdClassRow key={e.id} enrollment={e} kind="pending" kids={kids} now={now} />
                ))}
              </div>
            </Group>
          )}

          {others.length > 0 && (
            <Group title="Other enrollments" count={others.length}>
              <div className="max-w-3xl space-y-4">
                {others.map((e) => (
                  <EnrollmentStatusCard
                    key={e.id}
                    enrollment={e}
                    onConfirmRevision={onConfirmRevision}
                    onDeclineRevision={onDeclineRevision}
                  />
                ))}
              </div>
            </Group>
          )}

          {active.length === 0 && waiting.length === 0 && others.length === 0 && (
            <div className="rounded-2xl border border-pd-line bg-white">
              <PdEmpty
                icon={BookOpen}
                title="No active classes"
                text="Find a course to get started."
                action={
                  <Link href="/parent/courses" className={PD_BTN_PRI}>
                    Find a course
                  </Link>
                }
              />
            </div>
          )}

          {done.length > 0 && (
            <div className="mt-6">
              <button
                type="button"
                aria-expanded={showDone}
                onClick={() => setShowDone((v) => !v)}
                className={PD_BTN_SEC_SM}
              >
                {showDone ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                {showDone ? "Hide" : "Show"} completed classes ({done.length})
              </button>

              {showDone && (
                <Group title="Completed" count={done.length}>
                  <div className="overflow-hidden rounded-2xl border border-pd-line bg-white">
                    {done.map((e) => (
                      <PdClassRow key={e.id} enrollment={e} kind="completed" kids={kids} now={now} />
                    ))}
                  </div>
                </Group>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
