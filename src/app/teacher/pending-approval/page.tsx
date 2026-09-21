"use client";

import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { useTeacherApprovalWatch } from "@/features/teacher/hooks/useTeacherApprovalWatch";

function Step({
  label,
  description,
  status,
}: {
  label: string;
  description: string;
  status: "done" | "current" | "upcoming";
}) {
  return (
    <li className="flex gap-3">
      <div
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${
          status === "done"
            ? "bg-violet-600 text-white"
            : status === "current"
              ? "border-2 border-violet-600 bg-white text-violet-600"
              : "border-2 border-gray-200 bg-white text-gray-300"
        }`}
      >
        {status === "done" ? (
          <CheckCircle2 className="size-4" />
        ) : status === "current" ? (
          <Clock className="size-3.5" />
        ) : null}
      </div>
      <div>
        <p
          className={`text-sm font-medium ${
            status === "upcoming" ? "text-gray-400" : "text-gray-900"
          }`}
        >
          {label}
        </p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </li>
  );
}

/**
 * Where a teacher waits after submitting onboarding. They can't reach the
 * dashboard until Admin approves (enforced in `teacher/layout.tsx`); this
 * page checks the status on its own and moves them on once approved.
 */
export default function TeacherPendingApproval() {
  const router = useRouter();
  const { state, checking, lastChecked, check, logout } =
    useTeacherApprovalWatch();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-center gap-2.5 pt-12 pb-8 px-4">
        <div className="flex items-center justify-center size-10 rounded-full bg-violet-600 text-white shadow-sm shadow-violet-600/30">
          <GraduationCap className="size-5" />
        </div>
        <span className="text-2xl font-extrabold text-gray-900">
          Learn<span className="text-violet-600">ie</span>
        </span>
      </header>

      <div className="mx-auto w-full max-w-xl px-4 sm:px-6 pb-20">
        <main className="bg-white border border-gray-100 rounded-3xl shadow-sm shadow-gray-200/70 p-8 sm:p-10 text-center">
          {state === "loading" && (
            <div className="py-10">
              <Loader2 className="mx-auto size-6 animate-spin text-violet-600" />
              <p className="mt-3 text-sm text-gray-500">
                Checking your application...
              </p>
            </div>
          )}

          {state === "error" && (
            <div className="py-6">
              <p className="text-sm text-red-600">
                We couldn&apos;t check your application status.
              </p>
              <button
                onClick={check}
                className="mt-4 rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                Try again
              </button>
            </div>
          )}

          {state === "PENDING" && (
            <>
              <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Clock className="size-8" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900">
                Your application is under review
              </h1>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Thanks for completing your registration. Our admin team is
                reviewing your profile and documents. You can&apos;t access your
                teacher dashboard until you&apos;re approved.
              </p>

              <ol className="mx-auto mt-8 max-w-xs space-y-5 text-left">
                <Step
                  label="Application submitted"
                  description="Profile and documents received"
                  status="done"
                />
                <Step
                  label="Admin review"
                  description="We're checking your details"
                  status="current"
                />
                <Step
                  label="Start teaching"
                  description="Dashboard opens once approved"
                  status="upcoming"
                />
              </ol>

              <div className="mt-8 rounded-xl bg-violet-50/60 px-4 py-3 text-xs text-gray-500">
                You can leave this page open — it updates by itself and takes
                you to your dashboard as soon as you&apos;re approved. You&apos;ll
                also get a notification.
              </div>

              <div className="mt-6 flex flex-col items-center gap-2">
                <button
                  onClick={check}
                  disabled={checking}
                  className="inline-flex items-center gap-2 rounded-lg border border-violet-200 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-60"
                >
                  <RefreshCw
                    className={`size-4 ${checking ? "animate-spin" : ""}`}
                  />
                  Check status
                </button>
                {lastChecked && (
                  <p className="text-[11px] text-gray-400">
                    Last checked {lastChecked.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </>
          )}

          {state === "REJECTED" && (
            <>
              <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                <XCircle className="size-8" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900">
                Application not approved
              </h1>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Unfortunately our admin team couldn&apos;t approve your teacher
                application. If you think this is a mistake, please contact
                Learnie support.
              </p>
            </>
          )}

          {(state === "PENDING" || state === "REJECTED") && (
            <button
              onClick={logout}
              className="mt-6 text-sm font-medium text-gray-400 hover:text-violet-600"
            >
              Log out
            </button>
          )}
        </main>

        {state === "error" && (
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push("/login")}
              className="text-sm text-gray-400 hover:text-violet-600"
            >
              Back to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
