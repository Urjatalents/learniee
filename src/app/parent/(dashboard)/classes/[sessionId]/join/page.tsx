"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Video } from "lucide-react";

import SessionFlowPanel from "@/features/shared/components/session-flow/SessionFlowPanel";

/**
 * The Parent's page for one class session. Cycle-model sessions
 * (Part 1B) get the real Join control — `SessionFlowPanel` records
 * the join time (only from 10 minutes before the start, enforced on
 * the server) and shows the outcome once the class is over. There's
 * no video room yet (Jitsi is out of scope).
 *
 * Legacy sessions keep the previous placeholder screen unchanged.
 */
export default function JoinClassSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  return (
    <SessionFlowPanel
      role="parent"
      sessionId={sessionId}
      homeHref="/parent"
      renderLegacy={() => <LegacyJoinPlaceholder />}
    />
  );
}

/** Legacy behaviour, unchanged: a placeholder — the Teacher's "Start Session" marks the class complete. */
function LegacyJoinPlaceholder() {
  const router = useRouter();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
      <span className="w-14 h-14 rounded-2xl bg-violet-100 text-brand flex items-center justify-center mb-4">
        <Video size={26} />
      </span>
      <p className="text-gray-800 font-semibold">You&apos;re in the session.</p>
      <p className="text-sm text-gray-500 mt-1 max-w-sm">
        Live video isn&apos;t wired up yet — your teacher will start the
        class from their side. This screen is a placeholder until video
        calling is added.
      </p>
      <button
        type="button"
        onClick={() => router.replace("/parent")}
        className="mt-5 text-sm font-bold text-white bg-brand hover:bg-brand-dark px-4 py-2.5 rounded-full transition-colors"
      >
        Back to home
      </button>
    </div>
  );
}
