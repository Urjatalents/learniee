import { ImageOff, TriangleAlert } from "lucide-react";

import type { AdminCourse } from "@/features/admin/types/course";
import {
  AdminPanel,
  AdminPill,
  adminButtonClass,
} from "@/features/admin/components/ui/primitives";

interface Props {
  course: AdminCourse;
  onApprove: (courseId: string) => void;
  onReject: (courseId: string) => void;
}

export default function CourseApprovalCard({ course, onApprove, onReject }: Props) {
  const fields: Array<{ label: string; value: string }> = [
    { label: "Subject", value: course.subject || "-" },
    { label: "Grade", value: course.grade || "-" },
    { label: "Board", value: course.board || "-" },
    { label: "Type", value: course.type || "-" },
    { label: "Duration", value: course.duration || "-" },
    { label: "Language", value: course.language || "-" },
    { label: "Frequency", value: course.frequency || "-" },
    {
      label: "Price",
      value: `${course.price || "-"}${course.isIITian ? " (IITian)" : ""}`,
    },
  ];

  return (
    <AdminPanel padded>
      <article className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-admin-surface">
            {course.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.thumbnailUrl}
                alt={course.courseTitle || "Course thumbnail"}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-admin-muted">
                <ImageOff className="size-5" aria-hidden="true" />
                <span className="text-xs font-bold">No thumbnail</span>
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="font-heading text-2xl font-bold">
              {course.courseTitle || "Untitled Course"}
            </h2>
            <span className="text-[15px] text-admin-muted">
              {course.teacher.firstName} {course.teacher.lastName}{" "}
              <span aria-hidden="true">·</span> {course.teacher.email}
            </span>
          </div>

          <AdminPill tone="warn">Under review</AdminPill>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-y border-admin-line-soft py-5 md:grid-cols-4">
          {fields.map((field) => (
            <div key={field.label} className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-admin-muted">
                {field.label}
              </dt>
              <dd className="text-base font-bold break-words">{field.value}</dd>
            </div>
          ))}
        </dl>

        {course.isPriceCustomized && (
          <div
            role="note"
            className="flex gap-3 rounded-[14px] border border-[#f4c01e] bg-[#fff8dc] px-4 py-3"
          >
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[#8a6500]" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-[15px] font-extrabold">Non-standard price</span>
              <span className="text-sm text-admin-muted">
                The standard rate for this course{course.isIITian ? " (IITian listing)" : ""} is ₹
                {course.standardPrice} a session, but the teacher has set it to ₹{course.price} a
                session.
              </span>
            </div>
          </div>
        )}

        {(course.objective || course.description) && (
          <div className="flex flex-col gap-4">
            {course.objective && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-admin-muted">
                  Objective
                </span>
                <span className="text-base">{course.objective}</span>
              </div>
            )}
            {course.description && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-admin-muted">
                  Description
                </span>
                <span className="text-base">{course.description}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-admin-line-soft pt-5">
          <button
            type="button"
            onClick={() => onApprove(course.id)}
            className={adminButtonClass("primary")}
          >
            Approve course
          </button>
          <button
            type="button"
            onClick={() => onReject(course.id)}
            className={adminButtonClass("secondary", "text-red-700")}
          >
            Reject
          </button>
        </div>
      </article>
    </AdminPanel>
  );
}
