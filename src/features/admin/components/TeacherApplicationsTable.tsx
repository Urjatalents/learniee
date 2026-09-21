"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import type { AdminTeacherSummary } from "@/features/admin/types/teacher";
import { getCompleteness } from "@/features/admin/utils/teacherCompleteness";
import TeacherStatusBadge from "@/features/admin/components/TeacherStatusBadge";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initials(teacher: AdminTeacherSummary) {
  return `${teacher.firstName?.[0] ?? ""}${teacher.lastName?.[0] ?? ""}`.toUpperCase();
}

interface Props {
  teachers: AdminTeacherSummary[];
  /** "Submitted" while reviewing the queue, "Last updated" for decided applications. */
  dateLabel: string;
}

export default function TeacherApplicationsTable({ teachers, dateLabel }: Props) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-left text-gray-600">
          <tr>
            <th className="px-4 py-3">Teacher</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Experience</th>
            <th className="px-4 py-3">Documents</th>
            <th className="px-4 py-3">{dateLabel}</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>

        <tbody>
          {teachers.map((teacher) => {
            const { missingRequired } = getCompleteness(teacher.fileTypes, teacher.hasPan);
            const location = [teacher.city, teacher.country].filter(Boolean).join(", ");

            return (
              <tr key={teacher.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold text-purple-700">
                      {initials(teacher)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800">
                        {teacher.firstName} {teacher.lastName}
                      </p>
                      <p className="truncate text-xs text-gray-500">{teacher.email}</p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 text-gray-600">{location || "—"}</td>

                <td className="px-4 py-3 text-gray-600">
                  <p>{teacher.qualifications || "—"}</p>
                  {teacher.overallExperience && (
                    <p className="text-xs text-gray-400">{teacher.overallExperience} yrs</p>
                  )}
                </td>

                <td className="px-4 py-3">
                  {missingRequired === 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                      <CheckCircle2 className="size-4" />
                      Complete
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                      <AlertTriangle className="size-4" />
                      {missingRequired} missing
                    </span>
                  )}
                </td>

                <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                  {formatDate(teacher.updatedAt)}
                </td>

                <td className="px-4 py-3">
                  <TeacherStatusBadge status={teacher.approvalStatus} />
                </td>

                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/teachers/${teacher.id}`}
                    className="inline-block rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
                  >
                    Review
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
