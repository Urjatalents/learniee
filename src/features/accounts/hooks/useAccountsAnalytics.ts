"use client";

import { useEffect, useState } from "react";

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
}

export function useAccountsAnalytics() {
  const [analytics, setAnalytics] = useState<AccountsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/accounts/analytics");
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
