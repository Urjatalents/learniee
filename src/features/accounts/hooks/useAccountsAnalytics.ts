"use client";

import { useEffect, useState } from "react";

import type { LedgerPayoutStatus } from "@prisma/client";

export interface PayoutStatusSlice {
  status: LedgerPayoutStatus;
  amount: number;
  count: number;
}

export interface AccountsAnalytics {
  revenue: {
    tuitionRevenue: number;
    demoRevenue: number;
    totalRevenue: number;
  };
  expense: {
    teacherPayouts: number;
    referralRewards: number;
    manualWalletCredits: number;
    totalExpense: number;
  };
  profit: {
    platformProfit: number;
  };
  net: {
    profit: number;
    loss: number;
  };
  payoutStatusBreakdown: PayoutStatusSlice[];
}

/** "YYYY-MM-DD" strings — matches an `<input type="date">` value directly. */
export interface AccountsAnalyticsRange {
  from?: string;
  to?: string;
}

export function useAccountsAnalytics(range?: AccountsAnalyticsRange) {
  const [analytics, setAnalytics] = useState<AccountsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Re-fetch whenever the selected date range changes, not just on mount.
  const from = range?.from;
  const to = range?.to;

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const qs = params.toString();

      const res = await fetch(`/api/accounts/analytics${qs ? `?${qs}` : ""}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch analytics");
      }

      setAnalytics(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load the accounts analytics.");
    } finally {
      setLoading(false);
    }
  }

  return { analytics, loading, error, reload: load };
}
