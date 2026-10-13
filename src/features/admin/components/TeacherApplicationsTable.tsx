"use client";

import Link from "next/link";

import type { AdminTeacherSummary } from "@/features/admin/types/teacher";
import { getCompleteness } from "@/features/admin/utils/teacherCompleteness";
import {
  AdminAvatar,
  AdminPill,
  AdminTableCard,
  adminButtonClass,
  adminRowClass,
  adminTableClass,
  adminTdClass,
  adminThClass,
  formatAdminDate,
} from "@/features/admin/components/ui/primitives";

interface Props {
  teachers: AdminTeacherSummary[];
  /** "Submitted" while reviewing the queue, "Last updated" for decided applications. */
  dateLabel: string;
}

export default function TeacherApplicationsTable({ teachers, dateLabel }: Props) {
  return (
    <AdminTableCard>
      <table className={`${adminTableClass} min-w-[820px]`}>
        <thead>
          <tr>
            <th className={adminThClass}>Teacher</th>
            <th className={adminThClass}>Location</th>
            <th className={adminThClass}>Experience</th>
            <th className={adminThClass}>Documents</th>
            <th className={adminThClass}>{dateLabel}</th>
            <th className={`${adminThClass} text-right`}>Action</th>
          </tr>
        </thead>

        <tbody>
          {teachers.map((teacher) => {
            const { missingRequired } = getCompleteness(teacher.fileTypes, teacher.hasPan);
            const location = [teacher.city, teacher.country].filter(Boolean).join(", ");
            const name = `${teacher.firstName ?? ""} ${teacher.lastName ?? ""}`.trim();

            return (
              <tr key={teacher.id} className={adminRowClass}>
                <td className={adminTdClass}>
                  <div className="flex min-w-0 items-center gap-3">
                    <AdminAvatar name={name} />
                    <div className="min-w-0">
                      <p className="truncate text-base font-extrabold">{name}</p>
                      <p className="truncate text-sm text-admin-muted">{teacher.email}</p>
                    </div>
                  </div>
                </td>

                <td className={adminTdClass}>{location || "—"}</td>

                <td className={adminTdClass}>
                  <p>{teacher.qualifications || "—"}</p>
                  {teacher.overallExperience && (
                    <p className="text-sm text-admin-muted">{teacher.overallExperience} yrs</p>
                  )}
                </td>

                <td className={adminTdClass}>
                  <div className="flex flex-col items-start gap-1">
                    <AdminPill tone={missingRequired === 0 ? "brand" : "warn"}>
                      {missingRequired === 0 ? "Complete" : `${missingRequired} missing`}
                    </AdminPill>
                    {teacher.approvalStatus === "PENDING" && teacher.interviewScheduledAt && (
                      <span className="text-[13px] font-bold text-brand-dark">
                        Interview {formatAdminDate(teacher.interviewScheduledAt)}
                      </span>
                    )}
                    {teacher.appealCount > 0 && (
                      <span className="text-[13px] font-bold text-brand-dark">
                        Appeal #{teacher.appealCount}
                      </span>
                    )}
                  </div>
                </td>

                <td className={`${adminTdClass} whitespace-nowrap`}>
                  {formatAdminDate(teacher.updatedAt)}
                </td>

                <td className={`${adminTdClass} text-right`}>
                  <Link href={`/admin/teachers/${teacher.id}`} className={adminButtonClass("primary")}>
                    Review
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </AdminTableCard>
  );
}
