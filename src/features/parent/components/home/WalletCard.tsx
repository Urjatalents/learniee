import Link from "next/link";
import { Check, Plus } from "lucide-react";

import { BTN_PRI, BTN_TXT, KidAvatar } from "./HomeBits";
import { inr, kidColor, renewalsDue, shortSubject } from "./homeLogic";
import type { HomeData } from "./homeTypes";

export default function WalletCard({ data }: { data: HomeData }) {
  const due = renewalsDue(data);
  const total = due.reduce((n, c) => n + c.price * c.total, 0);
  const gap = Math.max(0, total - data.walletBalance);
  const needsTopUp = gap > 0 || data.walletBalance < 1000;

  return (
    <section
      aria-label="Wallet and renewals"
      className="flex flex-col gap-1.5 rounded-[18px] border border-pd-line bg-white p-[18px]"
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-pd-ink3">Wallet</span>
        <span className="rounded-full bg-pd-b50 px-2.5 py-0.5 text-xs font-semibold text-pd-brand-d">
          {data.freeDemos} free demo{data.freeDemos === 1 ? "" : "s"} left
        </span>
      </div>

      <div className="text-[30px] font-bold leading-[1.15] tracking-[-0.02em]">{inr(data.walletBalance)}</div>

      {due.length > 0 && (
        <>
          <p className="mt-2.5 text-xs font-semibold text-pd-ink3">Renewals in the next 2 weeks</p>
          <ul className="flex flex-col">
            {due.map((c) => {
              const kid = data.kids.find((k) => k.id === c.kidId);
              return (
                <li
                  key={c.id}
                  className="flex items-center gap-2.5 border-t border-pd-line py-[9px] text-[13px] first:border-t-0"
                >
                  <KidAvatar name={kid?.first ?? "?"} color={kidColor(data.kids, c.kidId)} size="xs" />
                  <span className="flex min-w-0 flex-1 flex-col leading-[1.3]">
                    <span>
                      <b className="font-semibold">{shortSubject(c.subject)}</b> · {kid?.first}
                    </span>
                    <small className="text-xs text-pd-ink3">in {c.left} days</small>
                  </span>
                  <em className="font-semibold not-italic">{inr(c.price * c.total)}</em>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {due.length === 0 ? (
        <p className="my-1 flex items-center gap-1.5 text-[13px] font-semibold text-pd-green">
          No renewals due in the next 2 weeks.
        </p>
      ) : gap > 0 ? (
        <p className="mb-1.5 mt-1 rounded-[10px] bg-pd-amber-bg px-3 py-2 text-[13px] font-semibold text-pd-amber">
          {inr(gap)} more needed to cover these renewals.
        </p>
      ) : (
        <p className="my-1 flex items-center gap-1.5 text-[13px] font-semibold text-pd-green">
          <Check size={14} strokeWidth={3} />
          Your balance covers these renewals.
        </p>
      )}

      {needsTopUp ? (
        <Link href="/parent/wallet" className={`${BTN_PRI} w-full`}>
          <Plus size={14} />
          Add money
        </Link>
      ) : (
        <Link href="/parent/wallet" className={`${BTN_TXT} -ml-2 self-start`}>
          <Plus size={14} />
          Add money
        </Link>
      )}
    </section>
  );
}
