"use client";

import { CalendarClock, Clock, MapPin } from "lucide-react";

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

/** Course and teacher info at the top of one class's page (Part 2C §1). */
export default function ClassHeader({ enrollment }: Props) {
  const { teacher } = enrollment;
  const title = enrollment.courseTitle ?? enrollment.subject ?? "Untitled course";

  return (
    <div className="bg-white border border-violet-100 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-bold text-violet-900 truncate">{title}</h1>
          <p className="text-sm text-gray-500 truncate">
            {enrollment.subject && enrollment.subject !== title ? `${enrollment.subject} · ` : ""}
            for {enrollment.studentName}
          </p>
        </div>

        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${getEnrollmentStatusStyle(
            enrollment.status,
          )}`}
        >
          {getEnrollmentStatusLabel(enrollment.status, "parent")}
        </span>
      </div>

      <div className="flex items-start gap-3 mt-4">
        <ChildAvatar src={teacher.photoUrl} name={teacher.name} size="sm" />

        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-800 truncate">{teacher.name}</p>

          {teacher.location && (
            <p className="flex items-center gap-1 text-xs text-gray-400">
              <MapPin size={11} />
              {teacher.location}
            </p>
          )}

          {teacher.aboutMe && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2 whitespace-pre-line">
              {teacher.aboutMe}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <CalendarClock size={13} />
          {formatSchedule(enrollment.scheduleDays, enrollment.scheduleTime)}
        </span>

        {enrollment.sessionLengthMinutes && (
          <span className="flex items-center gap-1.5">
            <Clock size={13} />
            {enrollment.sessionLengthMinutes} min classes
          </span>
        )}

        {enrollment.cyclesCompleted > 0 && (
          <span>
            {enrollment.cyclesCompleted} cycle{enrollment.cyclesCompleted === 1 ? "" : "s"} completed
          </span>
        )}
      </div>
    </div>
  );
}
