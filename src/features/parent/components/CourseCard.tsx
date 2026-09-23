import { Star, BookOpen } from "lucide-react";
import type { ParentCourse } from "@/features/parent/types/course";

interface Props {
  course: ParentCourse;
}

// A handful of pastel subject-chip colors, picked deterministically
// from the subject string so the same subject always gets the same
// color without needing a fixed subject -> color map to maintain.
const SUBJECT_CHIP_STYLES = [
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
];

function chipStyleFor(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SUBJECT_CHIP_STYLES[Math.abs(hash) % SUBJECT_CHIP_STYLES.length];
}

export default function CourseCard({ course }: Props) {
  const teacherName =
    course.teacher.visibleName ||
    `${course.teacher.firstName} ${course.teacher.lastName}`.trim();

  const teacherInitial = (teacherName || "T").trim().charAt(0).toUpperCase();

  return (
    <div className="group bg-white border border-violet-100 rounded-3xl shadow-sm overflow-hidden flex flex-col shadow-playful-hover">
      {/* THUMBNAIL */}
      <div className="h-32 bg-gradient-to-br from-violet-100 to-violet-50 relative overflow-hidden flex-shrink-0">
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnailUrl}
            alt={course.courseTitle || "Course thumbnail"}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen size={30} className="text-violet-300" strokeWidth={1.5} />
          </div>
        )}

        {course.subject && (
          <span
            className={`absolute top-2.5 left-2.5 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm ${chipStyleFor(
              course.subject
            )}`}
          >
            {course.subject}
          </span>
        )}
      </div>

      {/* CONTENT */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-heading text-sm font-bold text-gray-800 leading-snug line-clamp-2">
          {course.courseTitle || "Untitled Course"}
        </h3>

        {/* Teacher */}
        <div className="flex items-center gap-2 mt-3">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-brand flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
            {teacherInitial}
          </span>

          <div className="leading-tight min-w-0">
            <p className="text-xs font-semibold text-gray-700 truncate">
              {teacherName || "Teacher"}
            </p>
            <p className="text-[11px] text-gray-400">Group Class</p>
          </div>

          {/* Rating — the teacher's own overall average across every
              review they've received (see getTeacherRatingsByIds in
              review.service.ts). A teacher with no reviews yet shows
              "New" instead of a blank or a fake 0-star score. */}
          <div className="ml-auto flex items-center gap-1 flex-shrink-0">
            {course.teacher.averageRating != null ? (
              <>
                <Star size={13} className="text-brand-yellow fill-brand-yellow" />
                <span className="text-xs font-semibold text-gray-600">
                  {course.teacher.averageRating.toFixed(1)}
                </span>
              </>
            ) : (
              <span className="text-[11px] font-semibold text-gray-400">New</span>
            )}
          </div>
        </div>

        {/* Enrollment isn't built yet (Enrollment isn't modeled in
            Prisma — see 03-DATA-MODEL.md / 01-PROJECT-STATUS.md).
            This stays disabled until that's built, matching the
            same disabled/"Coming Soon" pattern used on the Admin
            dashboard's placeholder card. */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-violet-50">
          {course.price ? (
            <span className="text-sm font-bold text-gray-800">
              ₹{course.price}
              <span className="text-[11px] font-medium text-gray-400">/mo</span>
            </span>
          ) : (
            <span />
          )}

          <button
            type="button"
            disabled
            title="Enrollment isn't available yet"
            className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-4 py-1.5 rounded-full cursor-not-allowed"
          >
            JOIN
          </button>
        </div>
      </div>
    </div>
  );
}
