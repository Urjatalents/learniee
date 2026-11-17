"use client";

import { MessageCircle } from "lucide-react";

import { PD_BTN_PRI_SM, PD_BTN_SEC, PD_BTN_SEC_SM, PdEmpty } from "@/features/parent/components/courses/pdUi";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";
import { Tag } from "@/features/parent/components/home/HomeBits";
import {
  PD_CARD,
  PD_CARD_FLUSH,
  PD_COL,
  PD_PGRID,
  PD_SECTION_H,
  PdBanner,
  PdSkeleton,
  inr0,
} from "@/features/parent/components/payments/paymentsUi";
import { useReferral } from "@/features/parent/hooks/useReferral";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const formatDate = (v: string) => dateFmt.format(new Date(v));

function refereeName(r: { firstName: string; lastName: string; visibleName: string | null }) {
  return r.visibleName?.trim() || `${r.firstName} ${r.lastName}`.trim();
}

/**
 * Referral tab — the Parent's own code (`ParentProfile.referralCode`), share links and every referral
 * from GET /api/parent/referral. The reward is paid to the Wallet only once the referee's first
 * Enrollment payment goes through (`referral.service.ts`).
 */
export default function ReferralView() {
  const { summary, loading, error } = useReferral();
  const { toast, toastNode } = usePdToast();
  const reward = summary?.rewardAmount ?? 500;

  const shareText = summary
    ? `Join Learniee using my referral code ${summary.code} and get started with quality 1-on-1 online classes! Sign up at https://learniee.com and enter this code during onboarding.`
    : "";

  async function copy() {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary.code);
      toast("Code copied");
    } catch {
      // Clipboard can be blocked (permissions, non-secure context); the code is still on screen.
      toast("Couldn’t copy — select the code to copy it");
    }
  }

  const steps = [
    "Share your code with anyone looking for quality 1-on-1 or small-group online classes.",
    "They enter it while signing up, then enroll and pay for a course.",
    `The moment that enrollment goes through, ${inr0(reward)} lands in your wallet automatically.`,
  ];

  return (
    <div className={PD_PGRID}>
      <div className={PD_COL}>
        <section className={`${PD_CARD} flex flex-col gap-3`}>
          <div>
            <h2 className="font-heading text-lg font-semibold">Refer &amp; Earn</h2>
            <p className="text-[13px] text-pd-ink3">
              Share your code with anyone looking for quality online classes. You earn {inr0(reward)} once they
              successfully enroll in a course — not before.
            </p>
          </div>

          {error && <PdBanner tone="red">{error}</PdBanner>}

          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-pd-brand bg-pd-b50 px-4 py-3">
            <div>
              <span className="block text-[13px] font-bold text-pd-ink3">Your referral code</span>
              {loading ? (
                <div className="mt-1 h-8 w-36 animate-pulse rounded bg-pd-b100" />
              ) : (
                <b className="font-heading text-2xl font-semibold tracking-[0.12em] text-pd-brand-d">
                  {summary?.code ?? "—"}
                </b>
              )}
            </div>
            <button type="button" className={PD_BTN_PRI_SM} onClick={copy} disabled={!summary}>
              Copy
            </button>
          </div>

          {summary && (
            <a
              className={PD_BTN_SEC}
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Share on WhatsApp
            </a>
          )}
        </section>

        <section>
          <h2 className={PD_SECTION_H}>Your referrals</h2>
          <div className={PD_CARD_FLUSH}>
            {loading ? (
              <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-3 p-4">
                <PdSkeleton />
                <PdSkeleton />
              </div>
            ) : !summary || summary.referrals.length === 0 ? (
              <PdEmpty
                icon={MessageCircle}
                title="No referrals yet"
                text="Share your code above to get started."
              />
            ) : (
              summary.referrals.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 border-t border-pd-line px-5 py-3.5 first:border-t-0"
                >
                  <div className="min-w-0 flex-1">
                    <b className="block text-sm font-medium">{refereeName(r.referee)}</b>
                    <small className="block text-[13px] text-pd-ink3">
                      Referred {formatDate(r.createdAt)}
                      {r.rewardedAt && ` · Rewarded ${formatDate(r.rewardedAt)}`}
                    </small>
                  </div>
                  {r.status === "REWARDED" ? (
                    <b className="font-semibold text-pd-green">+{inr0(Number(r.rewardAmount))}</b>
                  ) : (
                    <Tag tone="amber">Awaiting enrollment</Tag>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className={PD_COL}>
        <div className="grid grid-cols-2 gap-3">
          <div className={PD_CARD}>
            <div className="text-[13px] font-bold text-pd-ink3">Total earned</div>
            <div className="font-heading text-2xl font-semibold">{loading ? "…" : inr0(summary?.totalEarned ?? 0)}</div>
          </div>
          <div className={PD_CARD}>
            <div className="text-[13px] font-bold text-pd-ink3">Awaiting enrollment</div>
            <div className="font-heading text-2xl font-semibold">{loading ? "…" : (summary?.pendingCount ?? 0)}</div>
          </div>
        </div>

        <section className={PD_CARD}>
          <h2 className="mb-3 font-heading text-base font-semibold">How it works</h2>
          {steps.map((text, i) => (
            <div key={i} className="flex items-start gap-3 py-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-pd-b100 text-[13px] font-semibold text-pd-brand-d">
                {i + 1}
              </span>
              <span className="text-sm">{text}</span>
            </div>
          ))}
        </section>

        <section className={`${PD_CARD} flex flex-col gap-2`}>
          <b className="font-semibold">Need help referring someone?</b>
          <span className="text-[13px] text-pd-ink3">Reach out to us directly.</span>
          <a
            className={`${PD_BTN_SEC_SM} self-start`}
            href="https://wa.me/919833077682"
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp us
          </a>
        </section>
      </div>

      {toastNode}
    </div>
  );
}
