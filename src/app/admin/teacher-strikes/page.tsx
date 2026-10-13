"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { useTeacherStrikes, type AdminTeacherStrike } from "@/features/admin/hooks/useTeacherStrikes";
import StrikeWaiveDialog, {
  STRIKE_REASON_LABEL,
} from "@/features/admin/components/StrikeWaiveDialog";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
  AdminPill,
  AdminStatCard,
  AdminTableCard,
  adminButtonClass,
  adminRowClass,
  adminTableClass,
  adminTdClass,
  adminThClass,
} from "@/features/admin/components/ui/primitives";
import { formatPlatformTime } from "@/lib/platformTime";

function at(iso: string | null) {
  return iso ? formatPlatformTime(new Date(iso), true) : "—";
}

export default function AdminTeacherStrikesPage() {
  const { strikes, loading, error, waive } = useTeacherStrikes();
  const [showWaived, setShowWaived] = useState(false);
  const [waiving, setWaiving] = useState<AdminTeacherStrike | null>(null);

  const active = strikes.filter((s) => !s.waivedAt);
  const waivedCount = strikes.length - active.length;
  const visible = showWaived ? strikes : active;

  // Active strikes per teacher, for the badge next to each name.
  const activeCount = new Map<string, number>();
  for (const s of active) activeCount.set(s.teacherId, (activeCount.get(s.teacherId) ?? 0) + 1);

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Classes and safety" }]}
        title="Teacher strikes"
        description={`${active.length} active strike${active.length === 1 ? "" : "s"}. Waive one for a good reason, for example an emergency, and it stops counting.`}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid grid-cols-2 gap-3">
          <AdminStatCard label="Active" value={active.length} />
          <AdminStatCard label="Waived" value={waivedCount} />
        </div>

        <button
          type="button"
          aria-pressed={showWaived}
          onClick={() => setShowWaived((v) => !v)}
          className={adminButtonClass("secondary")}
        >
          {showWaived ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
          {showWaived ? "Waived strikes shown. Hide waived" : "Show waived too"}
        </button>
      </div>

      <AdminError>{error}</AdminError>

      {loading ? (
        <AdminLoading message="Loading strikes…" />
      ) : visible.length === 0 ? (
        <AdminEmpty message="No strikes to show." />
      ) : (
        <AdminTableCard>
          <table className={`${adminTableClass} min-w-[820px]`}>
            <thead>
              <tr>
                <th className={adminThClass}>Teacher</th>
                <th className={adminThClass}>What happened</th>
                <th className={adminThClass}>Class time</th>
                <th className={adminThClass}>Recorded</th>
                <th className={`${adminThClass} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id} className={adminRowClass}>
                  <td className={adminTdClass}>
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-base font-extrabold">{s.teacherName}</span>
                      <AdminPill tone="warn">{activeCount.get(s.teacherId) ?? 0} active</AdminPill>
                    </div>
                  </td>
                  <td className={adminTdClass}>
                    <div className="flex flex-col">
                      <span className="font-bold">{STRIKE_REASON_LABEL[s.reason]}</span>
                      {s.courseTitle && <span className="text-sm text-admin-muted">{s.courseTitle}</span>}
                      {s.waivedAt && (
                        <span className="mt-1 text-sm text-admin-muted">
                          Waived {at(s.waivedAt)}
                          {s.waivedByName ? ` by ${s.waivedByName}` : ""}: {s.waiveReason}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`${adminTdClass} whitespace-nowrap`}>{at(s.classStartsAt)}</td>
                  <td className={`${adminTdClass} whitespace-nowrap`}>{at(s.recordedAt)}</td>
                  <td className={`${adminTdClass} text-right`}>
                    {s.waivedAt ? (
                      <AdminPill tone="neutral">Waived</AdminPill>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setWaiving(s)}
                        aria-label={`Waive strike for ${s.teacherName}`}
                        className={adminButtonClass("primary")}
                      >
                        Waive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableCard>
      )}

      {waiving && (
        <StrikeWaiveDialog
          strike={waiving}
          onCancel={() => setWaiving(null)}
          onSubmit={async (reason) => {
            const result = await waive(waiving.id, reason);

            if (!result.ok) return result.error ?? "Failed to waive this strike.";

            setWaiving(null);

            return null;
          }}
        />
      )}
    </AdminPage>
  );
}
