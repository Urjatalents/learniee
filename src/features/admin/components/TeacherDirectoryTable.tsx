"use client";

import type { TeacherDirectoryRow } from "@/features/admin/hooks/useTeacherDirectory";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function approvalBadgeStyle(status: TeacherDirectoryRow["approvalStatus"]) {
  switch (status) {
    case "APPROVED":
      return "bg-green-100 text-green-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-yellow-100 text-yellow-700";
  }
}

interface TeacherDirectoryTableProps {
  teachers: TeacherDirectoryRow[];
}

export default function TeacherDirectoryTable({ teachers }: TeacherDirectoryTableProps) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-left text-gray-600">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Approval</th>
            <th className="px-4 py-3">Onboarding</th>
            <th className="px-4 py-3 text-right">Courses</th>
            <th className="px-4 py-3 text-right">Active Enrollments</th>
            <th className="px-4 py-3 text-right">Strikes</th>
            <th className="px-4 py-3">Joined</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
              <td className="px-4 py-3">{t.email}</td>
              <td className="px-4 py-3">
                {[t.city, t.country].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${approvalBadgeStyle(t.approvalStatus)}`}
                >
                  {t.approvalStatus}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {t.onboardingStatus === "COMPLETED" ? "Completed" : "In progress"}
              </td>
              <td className="px-4 py-3 text-right">{t.coursesCount}</td>
              <td className="px-4 py-3 text-right">{t.activeEnrollmentsCount}</td>
              <td
                className={`px-4 py-3 text-right ${t.strikesCount > 0 ? "font-semibold text-red-600" : ""}`}
              >
                {t.strikesCount}
              </td>
              <td className="px-4 py-3 text-gray-500">{formatDate(t.createdAt)}</td>
            </tr>
          ))}
          {teachers.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-6 text-center text-gray-400">
                No teachers found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
