"use client";

import { useState } from "react";

import { useSessionReviews } from "@/features/admin/hooks/useSessionReviews";
import SessionDecisionDialog from "@/features/admin/components/SessionDecisionDialog";
import SessionReviewCard from "@/features/admin/components/SessionReviewCard";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
  AdminTabs,
  adminButtonClass,
} from "@/features/admin/components/ui/primitives";
import type { SessionReviewItem } from "@/features/shared/types/sessionReview";

type Tab = "open" | "decided";

export default function AdminSessionReviewsPage() {
  const { open, decided, loading, error, decide } = useSessionReviews();
  const [tab, setTab] = useState<Tab>("open");
  const [active, setActive] = useState<SessionReviewItem | null>(null);
  const [notice, setNotice] = useState<string[]>([]);

  const visible = tab === "open" ? open : decided;

  async function handleSubmit(status: string, reason: string) {
    if (!active) return null;

    const result = await decide({
      sessionId: active.id,
      status,
      expectedStatus: active.status,
      reason,
    });

    if (!result.ok) return result.error ?? "Failed to save this decision.";

    setNotice(result.warnings);
    setActive(null);

    return null;
  }

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Classes and safety" }]}
        title="Class reviews"
        description={`${open.length} class${open.length === 1 ? "" : "es"} waiting for your decision.`}
      />

      <div>
        <AdminTabs
          label="Review status"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "open", label: "Needs a decision", count: open.length },
            { value: "decided", label: "Decided" },
          ]}
        />
      </div>

      <AdminError>{error}</AdminError>

      {notice.length > 0 && (
        <div
          role="status"
          className="flex flex-col gap-1 rounded-[14px] border border-[#f4c01e] bg-[#fff8dc] px-4 py-3 text-[15px]"
        >
          <p className="font-extrabold">Decision saved. Please note:</p>
          {notice.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
          <button
            type="button"
            onClick={() => setNotice([])}
            className={adminButtonClass("ghost", "-ml-4 self-start")}
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <AdminLoading message="Loading class reviews…" />
      ) : visible.length === 0 ? (
        <AdminEmpty
          message={tab === "open" ? "Nothing waiting on a decision." : "No decisions yet."}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((item) => (
            <SessionReviewCard key={item.id} item={item} onDecide={() => setActive(item)} />
          ))}
        </div>
      )}

      {active && (
        <SessionDecisionDialog
          item={active}
          onCancel={() => setActive(null)}
          onSubmit={handleSubmit}
        />
      )}
    </AdminPage>
  );
}
