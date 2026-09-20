"use client";

import { useRouter } from "next/navigation";
import { User } from "lucide-react";

import NotificationBell from "@/features/shared/components/NotificationBell";

export default function AdminDashboard() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-8 py-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-purple-600">
            Learniee Admin Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage teachers, courses and approvals
          </p>
        </div>

        {/* Only this dashboard page has a shared header today — the
            other Admin pages (teachers, courses, users, chat,
            enrollments) each render their own, since there's no
            shared AdminShell yet (01-PROJECT-STATUS.md §1). The bell
            is only reachable from here until that's built. Same
            reasoning for the new Profile link (Sep 10, 2026) — no
            sidebar to attach a menu item to, so it lives here too. */}
        <div className="flex items-center gap-3">
          <NotificationBell />
          <button
            type="button"
            onClick={() => router.push("/admin/profile")}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-purple-600 transition"
            aria-label="Your profile"
          >
            <User size={18} />
            <span className="hidden sm:inline">Profile</span>
          </button>
        </div>
      </header>

      <main className="p-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800">
            Welcome, Admin 👋
          </h2>
          <p className="text-gray-500 mt-1">
            Manage the Learniee platform from here.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Teacher Approvals
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Review teachers waiting for approval.
            </p>
            <button
              onClick={() => router.push("/admin/teachers")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              View Teachers
            </button>
          </div>
    
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Course Approvals
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Review courses submitted by teachers.
            </p>
            <button
              onClick={() => router.push("/admin/courses")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              View Courses
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Enrollment Approvals
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Review enrollments the teacher has already approved.
            </p>
            <button
              onClick={() => router.push("/admin/enrollments")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              View Enrollments
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Chat Monitor
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              View any parent ↔ teacher conversation, read-only.
            </p>
            <button
              onClick={() => router.push("/admin/chat")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              View Chats
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Leave Requests
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Approve or reject teacher leave requests.
            </p>
            <button
              onClick={() => router.push("/admin/leave-requests")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              View Leave Requests
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Complaints
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Parent/Teacher issues waiting for a response.
            </p>
            <button
              onClick={() => router.push("/admin/complaints")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              View Complaints
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Payout Review
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Teacher payouts Accounts held or rejected — release, send back, or confirm.
            </p>
            <button
              onClick={() => router.push("/admin/payout-review")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              View Payout Review
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Class Reviews
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Classes a parent reported or that need an outcome — decide, or override a past decision.
            </p>
            <button
              onClick={() => router.push("/admin/session-reviews")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              View Class Reviews
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Bank Account Approvals
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Approve or reject teacher-submitted payout bank details.
            </p>
            <button
              onClick={() => router.push("/admin/bank-accounts")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              View Bank Accounts
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Teacher Directory
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Every teacher, approval/onboarding status, and activity at a glance.
            </p>
            <button
              onClick={() => router.push("/admin/teacher-directory")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              View Teacher Directory
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Parent Directory
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Every parent, onboarding status, and activity at a glance.
            </p>
            <button
              onClick={() => router.push("/admin/parent-directory")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              View Parent Directory
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Manage Users
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Delete a parent or teacher account completely.
            </p>
            <button
              onClick={() => router.push("/admin/users")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              Manage Users
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Staff Accounts
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Create and manage HR / Accounts logins.
            </p>
            <button
              onClick={() => router.push("/admin/staff-accounts")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              Manage Staff Accounts
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Accounts
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Export transactions and sessions as Excel.
            </p>
            <button
              onClick={() => router.push("/admin/accounts")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              View Accounts
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Activity Log
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Logins, payments, approvals — every major event, filterable and downloadable.
            </p>
            <button
              onClick={() => router.push("/admin/activity-logs")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              View Activity Log
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Platform
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Manage Learniee platform information.
            </p>
            <button
              className="mt-5 bg-gray-200 text-gray-500 px-5 py-2 rounded-lg cursor-not-allowed"
              disabled
            >
              Coming Soon
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}