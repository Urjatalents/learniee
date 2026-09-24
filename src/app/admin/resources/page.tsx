"use client";

import { FileText, Link as LinkIcon, Paperclip } from "lucide-react";

import { useAdminResources } from "@/features/admin/hooks/useResources";
import { displayName } from "@/features/shared/utils/displayName";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Admin oversight of the Resource Library (Sep 24, 2026): every
 * resource shared on the platform, newest first, with who shared it
 * and who it belongs to — read-only, no decision to make here (a
 * Teacher's own delete button is the only edit path). Same
 * decode-only Admin auth as the other Admin listing routes
 * (06-OPEN-DECISIONS.md #21).
 */
export default function AdminResourcesPage() {
  const { resources, loading, error } = useAdminResources();

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Resource Library</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Everything shared by a teacher with a student, across every course.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : resources.length === 0 ? (
        <div className="bg-white border rounded-xl p-8 text-center text-gray-500 text-sm">
          Nothing has been shared yet.
        </div>
      ) : (
        <div className="bg-white border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3 font-semibold">Resource</th>
                <th className="px-4 py-3 font-semibold">Course</th>
                <th className="px-4 py-3 font-semibold">Shared by (Teacher)</th>
                <th className="px-4 py-3 font-semibold">To (Student / Parent)</th>
                <th className="px-4 py-3 font-semibold">Shared</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => {
                const href = r.type === "LINK" ? r.externalUrl : r.fileUrl;
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {r.type === "LINK" ? (
                          <LinkIcon size={14} className="text-purple-500 flex-shrink-0" />
                        ) : (
                          <FileText size={14} className="text-purple-500 flex-shrink-0" />
                        )}
                        <span className="font-medium text-gray-800">{r.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.enrollment.course.courseTitle || r.enrollment.course.subject || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{displayName(r.teacher)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {displayName(r.student)}{" "}
                      <span className="text-gray-400">({displayName(r.parent)})</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3">
                      {href && (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-purple-600 hover:underline"
                        >
                          <Paperclip size={12} /> Open
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
