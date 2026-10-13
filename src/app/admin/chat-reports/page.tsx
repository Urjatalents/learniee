"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminPill,
  AdminTabs,
  adminButtonClass,
} from "@/features/admin/components/ui/primitives";

interface ChatReportRow {
  id: string;
  status: "OPEN" | "REVIEWED";
  reason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  chatRoomId: string;
  courseTitle: string | null;
  reporterRole: "PARENT" | "TEACHER";
  reporterName: string;
  message: {
    senderRole: "PARENT" | "TEACHER";
    senderName: string;
    body: string;
    originalBody: string | null;
    createdAt: string;
  };
}

function roleLabel(role: "PARENT" | "TEACHER") {
  return role === "PARENT" ? "parent" : "teacher";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminChatReportsPage() {
  const [reports, setReports] = useState<ChatReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"OPEN" | "REVIEWED">("OPEN");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError("");

      const res = await fetch("/api/admin/chat-reports", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load reported messages.");
      }

      setReports(data.reports ?? []);
    } catch (err) {
      console.error("Load chat reports error:", err);
      setError(err instanceof Error ? err.message : "Failed to load reported messages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markReviewed(reportId: string) {
    try {
      setBusyId(reportId);
      setError("");

      const res = await fetch(`/api/admin/chat-reports/${reportId}`, { method: "PATCH" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to update the report.");
      }

      await load();
    } catch (err) {
      console.error("Mark chat report reviewed error:", err);
      setError(err instanceof Error ? err.message : "Failed to update the report.");
    } finally {
      setBusyId(null);
    }
  }

  const openCount = reports.filter((report) => report.status === "OPEN").length;
  const visible = reports.filter((report) => report.status === tab);

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Classes and safety" }]}
        title="Reported messages"
        description="Chat messages a parent or teacher reported. The person reported is not told."
      />

      <div>
        <AdminTabs
          label="Report status"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "OPEN", label: "Open", count: openCount },
            { value: "REVIEWED", label: "Reviewed" },
          ]}
        />
      </div>

      <AdminError>{error}</AdminError>

      {loading ? (
        <AdminLoading />
      ) : visible.length === 0 ? (
        <AdminEmpty message={tab === "OPEN" ? "No open reports." : "No reviewed reports yet."} />
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((report) => (
            <AdminPanel key={report.id} padded>
              <article className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-[15px] text-admin-muted">
                    <span className="font-extrabold text-admin-ink">{report.reporterName}</span> (
                    {roleLabel(report.reporterRole)}) reported a message ·{" "}
                    {formatDateTime(report.createdAt)}
                  </p>
                  {report.courseTitle && <AdminPill>{report.courseTitle}</AdminPill>}
                </div>

                <div className="flex flex-col gap-1 rounded-[14px] bg-admin-surface px-4 py-3">
                  <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-admin-muted">
                    {report.message.senderName} ({roleLabel(report.message.senderRole)}) ·{" "}
                    {formatDateTime(report.message.createdAt)}
                  </span>
                  <p className="whitespace-pre-wrap break-words text-base">{report.message.body}</p>
                  {report.message.originalBody && (
                    <p className="mt-1 whitespace-pre-wrap break-words border-t border-admin-line pt-2 text-sm font-bold text-[#8a6500]">
                      Original (phone number hidden from the other party):{" "}
                      {report.message.originalBody}
                    </p>
                  )}
                </div>

                {report.reason && (
                  <p className="text-[15px]">
                    <span className="font-extrabold">Reason:</span> {report.reason}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/admin/chat/${report.chatRoomId}`}
                    className={adminButtonClass("secondary")}
                  >
                    Open conversation
                  </Link>
                  {report.status === "OPEN" ? (
                    <button
                      type="button"
                      onClick={() => markReviewed(report.id)}
                      disabled={busyId === report.id}
                      className={adminButtonClass("primary")}
                    >
                      {busyId === report.id ? "Saving…" : "Mark reviewed"}
                    </button>
                  ) : (
                    report.reviewedAt && (
                      <span className="text-sm text-admin-muted">
                        Reviewed {formatDateTime(report.reviewedAt)}
                      </span>
                    )
                  )}
                </div>
              </article>
            </AdminPanel>
          ))}
        </div>
      )}
    </AdminPage>
  );
}
