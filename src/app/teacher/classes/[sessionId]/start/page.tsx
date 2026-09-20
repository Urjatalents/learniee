"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import SessionFlowPanel from "@/features/shared/components/session-flow/SessionFlowPanel";

/**
 * The Teacher's page for one class session. Cycle-model sessions
 * (Part 1B) get the real Start / End controls — `SessionFlowPanel`
 * records the events and the outcome is decided from them
 * (`resolveSession`); nothing is marked complete by hand there.
 *
 * Legacy sessions (created before the cycle model) keep the previous
 * behaviour exactly: opening this page marks the session complete.
 */
export default function StartClassSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  return (
    <SessionFlowPanel
      role="teacher"
      sessionId={sessionId}
      homeHref="/teacher"
      renderLegacy={() => <LegacyStartSession sessionId={sessionId} />}
    />
  );
}

/**
 * Legacy behaviour, unchanged: no real video room exists, so landing
 * here marks the underlying `ClassSession` complete via the existing
 * `PATCH /api/teacher/class-sessions/[id]/complete`, then sends the
 * Teacher back home. Completion is a single shared `ClassSession`
 * row, so it's reflected on the Parent's side immediately.
 */
function LegacyStartSession({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"starting" | "done" | "error">("starting");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch(`/api/teacher/class-sessions/${sessionId}/complete`, {
          method: "PATCH",
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to start this session.");
        }

        if (cancelled) return;
        setState("done");

        setTimeout(() => {
          if (!cancelled) router.replace("/teacher");
        }, 1200);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setState("error");
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
      {state === "starting" && (
        <>
          <Loader2 size={40} className="animate-spin text-brand mb-4" />
          <p className="text-gray-700 font-semibold">Starting the session…</p>
          <p className="text-sm text-gray-400 mt-1">Please wait a moment.</p>
        </>
      )}

      {state === "done" && (
        <>
          <CheckCircle2 size={40} className="text-green-600 mb-4" />
          <p className="text-gray-800 font-semibold">
            Session started — marked complete.
          </p>
          <p className="text-sm text-gray-500 mt-1">Taking you back home…</p>
        </>
      )}

      {state === "error" && (
        <>
          <XCircle size={40} className="text-red-500 mb-4" />
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button
            type="button"
            onClick={() => router.replace("/teacher")}
            className="text-sm font-bold text-white bg-brand hover:bg-brand-dark px-4 py-2.5 rounded-full transition-colors"
          >
            Back to home
          </button>
        </>
      )}
    </div>
  );
}
