"use client";

import { Star } from "lucide-react";

import type { TeacherDirectoryRow } from "@/features/admin/hooks/useTeacherDirectory";
import {
  AdminAvatar,
  AdminPill,
  AdminTableCard,
  adminRowClass,
  adminTableClass,
  adminTdClass,
  adminThClass,
  formatAdminDate,
  type PillTone,
} from "@/features/admin/components/ui/primitives";

const APPROVAL: Record<TeacherDirectoryRow["approvalStatus"], { label: string; tone: PillTone }> = {
  APPROVED: { label: "Approved", tone: "brand" },
  PENDING: { label: "Pending", tone: "warn" },
  REJECTED: { label: "Rejected", tone: "dark" },
};

export default function TeacherDirectoryTable({ teachers }: { teachers: TeacherDirectoryRow[] }) {
  return (
    <AdminTableCard>
      <table className={`${adminTableClass} min-w-[1000px]`}>
        <thead>
          <tr>
            <th className={adminThClass}>Teacher</th>
            <th className={adminThClass}>Location</th>
            <th className={adminThClass}>Approval</th>
            <th className={adminThClass}>Onboarding</th>
            <th className={`${adminThClass} text-right`}>Courses</th>
            <th className={`${adminThClass} text-right`}>Active</th>
            <th className={`${adminThClass} text-right`}>Rating</th>
            <th className={`${adminThClass} text-right`}>Strikes</th>
            <th className={adminThClass}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((t) => {
            const approval = APPROVAL[t.approvalStatus] ?? APPROVAL.REJECTED;

            return (
              <tr key={t.id} className={adminRowClass}>
                <td className={adminTdClass}>
                  <div className="flex min-w-0 items-center gap-3">
                    <AdminAvatar name={t.name} />
                    <div className="min-w-0">
                      <p className="truncate font-extrabold">{t.name}</p>
                      <p className="truncate text-sm text-admin-muted">{t.email}</p>
                    </div>
                  </div>
                </td>
                <td className={adminTdClass}>
                  {[t.city, t.country].filter(Boolean).join(", ") || "—"}
                </td>
                <td className={adminTdClass}>
                  <AdminPill tone={approval.tone}>{approval.label}</AdminPill>
                </td>
                <td className={adminTdClass}>
                  <AdminPill tone={t.onboardingStatus === "COMPLETED" ? "brand" : "warn"}>
                    {t.onboardingStatus === "COMPLETED" ? "Completed" : "In progress"}
                  </AdminPill>
                </td>
                <td className={`${adminTdClass} text-right`}>{t.coursesCount}</td>
                <td className={`${adminTdClass} text-right`}>{t.activeEnrollmentsCount}</td>
                <td className={`${adminTdClass} text-right`}>
                  {t.averageRating === null ? (
                    <span className="text-admin-muted">No reviews</span>
                  ) : (
                    <span className="inline-flex items-center justify-end gap-1">
                      <Star size={14} className="fill-brand-yellow text-brand-yellow" aria-hidden="true" />
                      <span className="font-extrabold">{t.averageRating.toFixed(1)}</span>
                      <span className="text-sm text-admin-muted">({t.reviewCount})</span>
                    </span>
                  )}
                </td>
                <td className={`${adminTdClass} text-right`}>
                  {t.strikesCount > 0 ? (
                    <AdminPill tone="bad">{t.strikesCount}</AdminPill>
                  ) : (
                    t.strikesCount
                  )}
                </td>
                <td className={`${adminTdClass} whitespace-nowrap`}>{formatAdminDate(t.createdAt)}</td>
              </tr>
            );
          })}
          {teachers.length === 0 && (
            <tr>
              <td colSpan={9} className="px-5 py-10 text-center text-admin-muted">
                No teachers found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </AdminTableCard>
  );
}
