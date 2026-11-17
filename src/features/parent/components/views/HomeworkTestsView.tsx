"use client";

import Link from "next/link";
import { ChevronRight, ClipboardList } from "lucide-react";

import type { ParentEnrollment } from "@/features/parent/hooks/useEnrollments";
import { useOpenHomeworkCounts } from "@/features/parent/hooks/useClassListExtras";
import { useStudents } from "@/features/parent/hooks/useStudents";
import { KidAvatar, Tag } from "@/features/parent/components/home/HomeBits";
import { kidColor } from "@/features/parent/components/home/homeLogic";
import { toHomeKids, firstWord } from "@/features/parent/components/my-classes/pdClassesUi";
import { GridSkeleton, PdEmpty } from "@/features/parent/components/courses/pdUi";
import { displayName } from "@/features/shared/utils/displayName";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

// Enrollments that can have homework: running or finished ones.
const HOMEWORK_STATUSES = new Set(["ACTIVE", "COMPLETED", "LAPSED"]);

interface Props {
  enrollments: ParentEnrollment[];
  loading: boolean;
  error: string;
}

/** My Classes > Homework tab: one row per course with how much is still due. */
export default function HomeworkTestsView({ enrollments, loading, error }: Props) {
  const { counts } = useOpenHomeworkCounts();
  const { students } = useStudents();
  const kids = toHomeKids(students);
  const list = enrollments.filter((e) => HOMEWORK_STATUSES.has(e.status));

  return (
    <div>
      <p className="mb-3 mt-[22px] text-[13px] text-pd-ink3">
        Pick a course to see and submit your child&apos;s homework.
      </p>

      {error && <ErrorBanner spacing={false}>{error}</ErrorBanner>}

      {loading ? (
        <GridSkeleton count={3} height={64} />
      ) : list.length === 0 ? (
        <div className="max-w-[820px] rounded-2xl border border-pd-line bg-white">
          <PdEmpty
            icon={ClipboardList}
            title="No homework yet"
            text="It appears here once a class is active."
          />
        </div>
      ) : (
        <div className="max-w-[820px] overflow-hidden rounded-2xl border border-pd-line bg-white">
          {list.map((e) => {
            const open = counts[e.id] ?? 0;
            const kidName = firstWord(displayName(e.student));

            return (
              <Link
                key={e.id}
                href={`/parent/enrollments/${e.id}/homework`}
                className="flex w-full items-center gap-3 border-t border-pd-line px-5 py-3.5 text-left transition-colors first:border-t-0 hover:bg-pd-b50"
              >
                <KidAvatar name={kidName} color={kidColor(kids, e.student.id)} />
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-sm font-medium">{e.course.courseTitle ?? "Untitled course"}</b>
                  <small className="block truncate text-[13px] text-pd-ink3">
                    {kidName} · {displayName(e.teacher)}
                  </small>
                </div>
                {open > 0 ? (
                  <Tag tone="amber">{open} due</Tag>
                ) : (
                  <Tag tone="gray">{e.status === "COMPLETED" ? "Completed" : "All done"}</Tag>
                )}
                <ChevronRight size={18} className="text-pd-ink3" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
