"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-purple-600">Reported Messages</h1>
          <p className="text-gray-500 mt-1">
            Chat messages a parent or teacher reported. The person reported is not told.
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          {(["OPEN", "REVIEWED"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                tab === value
                  ? "bg-purple-600 text-white"
                  : "bg-white border text-gray-600 hover:bg-gray-100"
              }`}
            >
              {value === "OPEN" ? `Open${openCount > 0 ? ` (${openCount})` : ""}` : "Reviewed"}
            </button>
          ))}
        </div>

        {error && <div className="bg-red-100 text-red-700 text-sm px-4 py-2 rounded-lg mb-4">{error}</div>}

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-gray-400 text-sm">
            {tab === "OPEN" ? "No open reports." : "No reviewed reports yet."}
          </p>
        ) : (
          <div className="space-y-4">
            {visible.map((report) => (
              <div key={report.id} className="bg-white rounded-xl border shadow-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-800">{report.reporterName}</span> (
                    {roleLabel(report.reporterRole)}) reported a message ·{" "}
                    {formatDateTime(report.createdAt)}
                  </p>
                  {report.courseTitle && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                      {report.courseTitle}
                    </span>
                  )}
                </div>

                <div className="bg-gray-50 border rounded-lg px-4 py-3 mb-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                    {report.message.senderName} ({roleLabel(report.message.senderRole)}) ·{" "}
                    {formatDateTime(report.message.createdAt)}
                  </p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                    {report.message.body}
                  </p>
                  {report.message.originalBody && (
                    <p className="text-xs text-amber-800 whitespace-pre-wrap break-words mt-2 border-t border-amber-200 pt-2">
                      Original (phone number hidden from the other party): {report.message.originalBody}
                    </p>
                  )}
                </div>

                {report.reason && (
                  <p className="text-sm text-gray-600 mb-3">
                    <span className="font-semibold text-gray-700">Reason:</span> {report.reason}
                  </p>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/chat/${report.chatRoomId}`)}
                    className="text-sm font-semibold text-purple-600 hover:text-purple-700"
                  >
                    Open conversation
                  </button>
                  {report.status === "OPEN" ? (
                    <button
                      type="button"
                      onClick={() => markReviewed(report.id)}
                      disabled={busyId === report.id}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      {busyId === report.id ? "Saving…" : "Mark reviewed"}
                    </button>
                  ) : (
                    report.reviewedAt && (
                      <span className="text-xs text-gray-400">
                        Reviewed {formatDateTime(report.reviewedAt)}
                      </span>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
