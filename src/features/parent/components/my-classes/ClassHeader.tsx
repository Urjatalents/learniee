"use client";

import { CalendarClock, Clock, GraduationCap, MapPin } from "lucide-react";

import ChildAvatar from "@/features/parent/components/ChildAvatar";
import type { ClassDetailView } from "@/features/parent/types/myClasses";
import {
  getEnrollmentStatusLabel,
  getEnrollmentStatusStyle,
} from "@/features/shared/utils/enrollmentStatus";
import { formatSchedule } from "@/features/shared/utils/weekdays";

interface Props {
  enrollment: ClassDetailView["enrollment"];
}

const CHIP =
  "inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/15 border border-white/20 rounded-full px-3 py-1.5";

/** Course and teacher info at the top of one class's page (Part 2C §1). */
export default function ClassHeader({ enrollment }: Props) {
  const { teacher } = enrollment;
  const title = enrollment.courseTitle ?? enrollment.subject ?? "Untitled course";

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-violet-800 p-5 sm:p-6 text-white shadow-playful">
      <div className="pointer-events-none absolute inset-0 bg-dot-pattern text-white/10" />
      <div className="pointer-events-none absolute -top-10 -right-10 w-44 h-44 rounded-full bg-brand-yellow/20 blur-2xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-heading text-xl sm:text-2xl font-bold leading-snug">{title}</h1>
            <p className="text-sm text-white/80 mt-0.5">
              {enrollment.subject && enrollment.subject !== title ? `${enrollment.subject} · ` : ""}
              for {enrollment.studentName}
            </p>
          </div>

          <span
            className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${getEnrollmentStatusStyle(
              enrollment.status,
            )}`}
          >
            {getEnrollmentStatusLabel(enrollment.status, "parent")}
          </span>
        </div>

        <div className="flex items-start gap-3 mt-5">
          <ChildAvatar src={teacher.photoUrl} name={teacher.name} size="sm" />

          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/60">
              Your teacher
            </p>
            <p className="text-sm font-bold truncate">{teacher.name}</p>

            {teacher.location && (
              <p className="flex items-center gap-1 text-xs text-white/70">
                <MapPin size={11} />
                {teacher.location}
              </p>
            )}
          </div>
        </div>

        {teacher.aboutMe && (
          <p className="text-xs text-white/75 mt-3 line-clamp-2 whitespace-pre-line max-w-2xl">
            {teacher.aboutMe}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-5">
          <span className={CHIP}>
            <CalendarClock size={13} />
            {formatSchedule(enrollment.scheduleDays, enrollment.scheduleTime)}
          </span>

          {enrollment.sessionLengthMinutes && (
            <span className={CHIP}>
              <Clock size={13} />
              {enrollment.sessionLengthMinutes} min classes
            </span>
          )}

          {enrollment.cyclesCompleted > 0 && (
            <span className={CHIP}>
              <GraduationCap size={13} />
              {enrollment.cyclesCompleted} cycle{enrollment.cyclesCompleted === 1 ? "" : "s"}{" "}
              completed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
