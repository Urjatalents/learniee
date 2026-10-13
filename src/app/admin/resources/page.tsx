"use client";

import { ExternalLink, FileText, Link as LinkIcon } from "lucide-react";

import { useAdminResources } from "@/features/admin/hooks/useResources";
import { displayName } from "@/features/shared/utils/displayName";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
  AdminTableCard,
  adminButtonClass,
  adminRowClass,
  adminTableClass,
  adminTdClass,
  adminThClass,
  formatAdminDate,
} from "@/features/admin/components/ui/primitives";

/**
 * Admin oversight of the Resource Library: every resource shared on the
 * platform, newest first, with who shared it and who it belongs to —
 * read-only, no decision to make here (a Teacher's own delete button is
 * the only edit path).
 */
export default function AdminResourcesPage() {
  const { resources, loading, error } = useAdminResources();

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Records" }]}
        title="Resource library"
        description="Everything shared by a teacher with a student, across every course. Read-only: only the teacher who shared a resource can delete it."
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-[15px] font-bold text-admin-muted">
        <span>Newest first</span>
        <span>{resources.length} shared</span>
      </div>

      <AdminError>{error}</AdminError>

      {loading ? (
        <AdminLoading />
      ) : resources.length === 0 ? (
        <AdminEmpty message="Nothing has been shared yet." />
      ) : (
        <AdminTableCard>
          <table className={`${adminTableClass} min-w-[900px]`}>
            <thead>
              <tr>
                <th className={adminThClass}>Resource</th>
                <th className={adminThClass}>Course</th>
                <th className={adminThClass}>Shared by (teacher)</th>
                <th className={adminThClass}>To (student, parent)</th>
                <th className={adminThClass}>Shared</th>
                <th className={`${adminThClass} text-right`}>Link</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => {
                const href = r.type === "LINK" ? r.externalUrl : r.fileUrl;
                const Icon = r.type === "LINK" ? LinkIcon : FileText;

                return (
                  <tr key={r.id} className={adminRowClass}>
                    <td className={adminTdClass}>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-admin-tint text-brand-dark">
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-extrabold">{r.title}</span>
                          <span className="text-sm text-admin-muted">
                            {r.type === "LINK" ? "Link" : "File"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className={adminTdClass}>
                      {r.enrollment.course.courseTitle || r.enrollment.course.subject || "—"}
                    </td>
                    <td className={adminTdClass}>{displayName(r.teacher)}</td>
                    <td className={adminTdClass}>
                      <div className="flex flex-col">
                        <span className="font-bold">{displayName(r.student)}</span>
                        <span className="text-sm text-admin-muted">Parent: {displayName(r.parent)}</span>
                      </div>
                    </td>
                    <td className={`${adminTdClass} whitespace-nowrap`}>{formatAdminDate(r.createdAt)}</td>
                    <td className={`${adminTdClass} text-right`}>
                      {href && (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${r.title}`}
                          className={adminButtonClass("secondary")}
                        >
                          Open
                          <ExternalLink className="size-4" aria-hidden="true" />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </AdminTableCard>
      )}
    </AdminPage>
  );
}
