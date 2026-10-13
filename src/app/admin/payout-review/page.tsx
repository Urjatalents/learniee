"use client";

import { useAdminPayoutReview } from "@/features/admin/hooks/usePayoutReview";
import {
  AdminEmpty,
  AdminError,
  AdminFact,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminPill,
  adminButtonClass,
  formatAdminDate,
} from "@/features/admin/components/ui/primitives";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * Admin's payout-review queue — every cycle Accounts put ON_HOLD or
 * REJECTED lands here, not anywhere final, until Admin decides. Matches
 * this app's existing "Admin has final say" pattern (Enrollment
 * dual-approval, Leave requests).
 */
export default function AdminPayoutReviewPage() {
  const { entries, loading, error, actingOn, release, reopen, confirmReject } = useAdminPayoutReview();

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Money" }]}
        title="Payout review"
        description={`${entries.length} payout${entries.length === 1 ? "" : "s"} Accounts held or rejected, waiting on your decision.`}
      />

      <AdminError>{error}</AdminError>

      {loading ? (
        <AdminLoading />
      ) : entries.length === 0 ? (
        <AdminEmpty message="Nothing waiting on your review right now." />
      ) : (
        <div className="flex flex-col gap-4">
          {entries.map((e) => {
            const reason = e.payoutStatus === "ON_HOLD" ? e.holdReason : e.rejectionReason;
            const busy = actingOn === e.id;

            return (
              <AdminPanel key={e.id} className="overflow-hidden">
                <article className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                  <div className="flex min-w-0 flex-col gap-3 p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-lg font-extrabold">{e.teacherName}</span>
                      <span className="text-[15px] font-bold text-admin-muted">
                        Cycle #{e.cycleNumber}
                      </span>
                      <AdminPill tone={e.payoutStatus === "ON_HOLD" ? "warn" : "dark"}>
                        {e.payoutStatus === "ON_HOLD" ? "On hold" : "Rejected"}
                      </AdminPill>
                    </div>

                    <span className="text-[15px] text-admin-muted">
                      {e.parentName} · {e.childName} · {e.subject}
                    </span>

                    <div className="grid grid-cols-2 gap-4">
                      <AdminFact label="Teacher pay">{currency.format(e.monthlyTeacherPay)}</AdminFact>
                      <AdminFact label="Completed">{formatAdminDate(e.transactionDate)}</AdminFact>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 border-t border-admin-line-soft bg-admin-surface p-5 sm:p-6 lg:border-l lg:border-t-0">
                    {reason && (
                      <AdminFact
                        label={
                          e.payoutStatus === "ON_HOLD"
                            ? "Accounts' hold reason"
                            : "Accounts' rejection reason"
                        }
                      >
                        <span className="font-normal">{reason}</span>
                      </AdminFact>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => release(e.id)}
                        className={adminButtonClass("primary")}
                      >
                        Release to payment
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => reopen(e.id)}
                        className={adminButtonClass("secondary")}
                      >
                        Send back to Accounts
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => confirmReject(e.id)}
                        className={adminButtonClass("secondary", "text-red-700")}
                      >
                        Confirm reject
                      </button>
                    </div>
                  </div>
                </article>
              </AdminPanel>
            );
          })}
        </div>
      )}
    </AdminPage>
  );
}
