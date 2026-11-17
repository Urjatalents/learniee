"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Wallet as WalletIcon, Plus } from "lucide-react";

import { useWallet } from "@/features/parent/hooks/useWallet";
import { PD_PILL } from "@/features/parent/components/layout/pdStyles";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * Navbar entry point for the Wallet — balance pill + a dropdown with
 * an "Add money" mini-form and the most recent activity, same
 * pattern as `DemoCouponButton` right next to it. Added Sep 7, 2026
 * per direct request (nav balance + self-service top-up).
 */
export default function WalletBadge() {
  const [open, setOpen] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [notice, setNotice] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { balance, transactions, loading, addingMoney, addMoney } = useWallet();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const recentTransactions = transactions.slice(0, 4);

  async function handleAddMoney() {
    const amount = Number(amountInput);
    setNotice("");

    const result = await addMoney(amount);

    setNotice(result.message);

    if (result.ok) {
      setAmountInput("");
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Wallet"
        className={PD_PILL}
      >
        <WalletIcon size={17} />
        <span className="text-sm font-bold">
          {loading ? "–" : currency.format(balance)}
        </span>
      </button>

      {open && (
        // On phones the popover spans the screen under the header (a 320px panel anchored to a mid-row button clips off the left edge); from sm up it anchors to its button. Pops in from the top-right.
        <div className="fixed inset-x-3 top-[4.25rem] max-h-[calc(100dvh-5rem)] overflow-y-auto origin-top-right animate-pop-in sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-80 bg-white rounded-2xl border border-violet-100 shadow-playful p-4 z-50">
          {/* BALANCE */}
          <div className="flex items-center gap-3 mb-4">
            <span className="w-9 h-9 rounded-xl bg-violet-100 text-brand flex items-center justify-center flex-shrink-0">
              <WalletIcon size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800">
                {loading ? "Loading balance..." : currency.format(balance)}
              </p>
              <p className="text-xs text-gray-500">
                Credits only — no cash-out. Refunds and adjustments land here.
              </p>
            </div>
          </div>

          <div className="h-px bg-violet-100 mb-4" />

          {/* ADD MONEY */}
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
              Add money
            </p>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  ₹
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  placeholder="Amount"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full h-9 rounded-full border-2 border-violet-100 bg-violet-50/50 pl-7 pr-3 text-sm outline-none focus:border-brand-light focus:bg-white transition"
                />
              </div>

              <button
                type="button"
                onClick={handleAddMoney}
                disabled={addingMoney || !amountInput}
                className="flex items-center gap-1 h-9 px-3 rounded-full bg-brand text-white text-sm font-bold hover:bg-brand-dark transition active:scale-[0.97] disabled:opacity-60 flex-shrink-0"
              >
                <Plus size={14} />
                {addingMoney ? "Please wait..." : "Add"}
              </button>
            </div>

            {notice && <p className="text-xs text-amber-600 mt-2">{notice}</p>}
          </div>

          <div className="h-px bg-violet-100 mb-4" />

          {/* RECENT ACTIVITY */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
              Recent activity
            </p>

            {loading ? (
              <p className="text-xs text-gray-400">Loading...</p>
            ) : recentTransactions.length === 0 ? (
              <p className="text-xs text-gray-500">No wallet activity yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentTransactions.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 bg-violet-50/60 rounded-xl px-3 py-2"
                  >
                    <span className="text-xs font-semibold text-gray-800 truncate">
                      {t.reason}
                    </span>
                    <span
                      className={`text-xs font-bold flex-shrink-0 ${
                        t.type === "CREDIT" ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {t.type === "CREDIT" ? "+" : "-"}
                      {currency.format(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <Link
              href="/parent/wallet"
              className="block text-center text-xs text-brand font-semibold hover:underline mt-3"
              onClick={() => setOpen(false)}
            >
              View full wallet
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
