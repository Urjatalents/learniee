"use client";

import type { ParentDirectoryRow } from "@/features/admin/hooks/useParentDirectory";
import {
  AdminAvatar,
  AdminPill,
  AdminTableCard,
  adminRowClass,
  adminTableClass,
  adminTdClass,
  adminThClass,
  formatAdminDate,
} from "@/features/admin/components/ui/primitives";

export default function ParentDirectoryTable({ parents }: { parents: ParentDirectoryRow[] }) {
  return (
    <AdminTableCard>
      <table className={`${adminTableClass} min-w-[860px]`}>
        <thead>
          <tr>
            <th className={adminThClass}>Parent</th>
            <th className={adminThClass}>Location</th>
            <th className={adminThClass}>Onboarding</th>
            <th className={`${adminThClass} text-right`}>Students</th>
            <th className={`${adminThClass} text-right`}>Active</th>
            <th className={`${adminThClass} text-right`}>Wallet</th>
            <th className={adminThClass}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {parents.map((p) => (
            <tr key={p.id} className={adminRowClass}>
              <td className={adminTdClass}>
                <div className="flex min-w-0 items-center gap-3">
                  <AdminAvatar name={p.name} />
                  <div className="min-w-0">
                    <p className="truncate font-extrabold">{p.name}</p>
                    <p className="truncate text-sm text-admin-muted">{p.email}</p>
                  </div>
                </div>
              </td>
              <td className={adminTdClass}>
                {[p.city, p.country].filter(Boolean).join(", ") || "—"}
              </td>
              <td className={adminTdClass}>
                <AdminPill tone={p.onboardingComplete ? "brand" : "warn"}>
                  {p.onboardingComplete ? "Complete" : "In progress"}
                </AdminPill>
              </td>
              <td className={`${adminTdClass} text-right`}>{p.studentsCount}</td>
              <td className={`${adminTdClass} text-right`}>{p.activeEnrollmentsCount}</td>
              <td className={`${adminTdClass} text-right`}>₹{p.walletBalance.toLocaleString("en-IN")}</td>
              <td className={`${adminTdClass} whitespace-nowrap`}>{formatAdminDate(p.createdAt)}</td>
            </tr>
          ))}
          {parents.length === 0 && (
            <tr>
              <td colSpan={7} className="px-5 py-10 text-center text-admin-muted">
                No parents found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </AdminTableCard>
  );
}
