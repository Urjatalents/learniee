import { Star } from "lucide-react";

import type { ParentCourseDetail } from "@/features/parent/types/courseDetail";

interface Props {
  course: ParentCourseDetail;
}

export default function CourseInfoSection({ course }: Props) {
  const chips = [
    course.subject,
    course.grade,
    course.board,
    course.type,
    course.language,
    course.frequency,
    course.duration,
  ].filter((value): value is string => Boolean(value));

  const tags = course.courseTags
    ? course.courseTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="bg-white border border-violet-100 rounded-3xl shadow-sm p-5 sm:p-6">
      <div className="flex flex-wrap gap-2 mb-3">
        {chips.map((chip, i) => (
          <span
            key={i}
            className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-violet-50 text-brand"
          >
            {chip}
          </span>
        ))}
      </div>

      <h1 className="font-heading text-xl sm:text-2xl font-bold text-gray-800 leading-snug">
        {course.courseTitle || "Untitled Course"}
      </h1>

      {/* Rating — the teacher's own overall average across every
          review they've received. "Not yet rated" when they have
          none, instead of hiding the line or showing a fake score. */}
      <div className="flex items-center gap-1.5 mt-2">
        {course.teacher.averageRating != null ? (
          <>
            <Star size={15} className="text-brand-yellow fill-brand-yellow" />
            <span className="text-sm font-semibold text-gray-600">
              {course.teacher.averageRating.toFixed(1)}
            </span>
            <span className="text-xs text-gray-400">
              ({course.teacher.reviewCount})
            </span>
          </>
        ) : (
          <span className="text-xs font-medium text-gray-400">Not yet rated</span>
        )}
      </div>

      {course.objective && (
        <div className="mt-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
            Objective
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {course.objective}
          </p>
        </div>
      )}

      {course.description && (
        <div className="mt-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
            About this course
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {course.description}
          </p>
        </div>
      )}

      {course.modules && (
        <div className="mt-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
            What&apos;s covered
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {course.modules}
          </p>
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-5">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
