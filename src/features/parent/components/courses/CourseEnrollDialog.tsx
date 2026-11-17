"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useDemoCoupons } from "@/features/parent/hooks/useDemoCoupons";
import { useStudents } from "@/features/parent/hooks/useStudents";
import type { ParentCourse } from "@/features/parent/types/course";

import PdDialog from "./PdDialog";
import { PD_BTN_PRI, PD_BTN_SEC, PD_LABEL, coursePrice, rupees, teacherDisplayName } from "./pdUi";

/**
 * "Who is this for?" step before Enroll / demo. The real booking, payment and
 * approval flow lives on the course page, so both buttons hand the chosen
 * learner over via the URL (`?mode=…&studentId=…`, read by BookingPanel).
 */
export default function CourseEnrollDialog({
  course,
  onClose,
}: {
  course: ParentCourse;
  onClose: () => void;
}) {
  const router = useRouter();
  const { students, loading } = useStudents();
  const { balance } = useDemoCoupons();
  const [picked, setPicked] = useState<string | null>(null);

  const studentId = picked ?? students[0]?.id ?? "";
  const name = teacherDisplayName(course.teacher);
  const price = coursePrice(course.price);
  const rating = course.teacher.averageRating;
  const free = (balance?.remainingFree ?? 0) > 0;
  const demoPrice = balance?.paidDemoPrice ?? 100;

  const go = (mode: "enroll" | "demo") => {
    const qs = new URLSearchParams({ mode });
    if (studentId) qs.set("studentId", studentId);
    router.push(`/parent/courses/${course.id}?${qs.toString()}`);
  };

  return (
    <PdDialog
      title={course.courseTitle || "Course"}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={() => go("enroll")} className={`${PD_BTN_PRI} w-full`}>
            Enroll
          </button>
          <button type="button" onClick={() => go("demo")} className={`${PD_BTN_SEC} w-full`}>
            Book a {free ? "free" : rupees(demoPrice)} demo first
          </button>
        </>
      }
    >
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#ebe9f5] text-lg font-semibold text-[#4b4575]">
          {name[0]}
        </span>
        <div>
          <b className="block text-base font-semibold">{name}</b>
          <small className="text-[13px] text-pd-ink3">
            {rating != null ? `★ ${rating.toFixed(1)} · ` : ""}Group class
            {price ? ` · ${rupees(price)} / session` : ""}
          </small>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={PD_LABEL}>Who is this for?</span>
        {loading ? (
          <div className="h-12 animate-pulse rounded-xl bg-[#eeeaf7]" />
        ) : students.length === 0 ? (
          <p className="text-sm text-pd-ink3">
            Add your child in{" "}
            <Link href="/parent/students" className="font-semibold text-pd-brand hover:underline">
              Account → Students
            </Link>{" "}
            to continue.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {students.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-pd-line px-4 py-3 text-sm font-bold hover:border-pd-brand has-checked:border-pd-brand has-checked:bg-pd-b50"
              >
                <input
                  type="radio"
                  name="forkid"
                  value={s.id}
                  checked={studentId === s.id}
                  onChange={() => setPicked(s.id)}
                  className="size-[18px] accent-pd-brand"
                />
                {s.visibleName || `${s.firstName} ${s.lastName}`.trim()}
                {s.standard ? ` · ${s.standard}` : ""}
              </label>
            ))}
          </div>
        )}
      </div>
    </PdDialog>
  );
}
