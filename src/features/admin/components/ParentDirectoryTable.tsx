"use client";

import type { ParentDirectoryRow } from "@/features/admin/hooks/useParentDirectory";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface ParentDirectoryTableProps {
  parents: ParentDirectoryRow[];
}

export default function ParentDirectoryTable({ parents }: ParentDirectoryTableProps) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-left text-gray-600">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Onboarding</th>
            <th className="px-4 py-3 text-right">Students</th>
            <th className="px-4 py-3 text-right">Active Enrollments</th>
            <th className="px-4 py-3 text-right">Wallet</th>
            <th className="px-4 py-3">Joined</th>
          </tr>
        </thead>
        <tbody>
          {parents.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
              <td className="px-4 py-3">{p.email}</td>
              <td className="px-4 py-3">
                {[p.city, p.country].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                    p.onboardingComplete
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {p.onboardingComplete ? "Complete" : "In progress"}
                </span>
              </td>
              <td className="px-4 py-3 text-right">{p.studentsCount}</td>
              <td className="px-4 py-3 text-right">{p.activeEnrollmentsCount}</td>
              <td className="px-4 py-3 text-right">₹{p.walletBalance.toLocaleString("en-IN")}</td>
              <td className="px-4 py-3 text-gray-500">{formatDate(p.createdAt)}</td>
            </tr>
          ))}
          {parents.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                No parents found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
