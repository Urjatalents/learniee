"use client";

import { useState } from "react";

import { useAdminBankAccounts } from "@/features/admin/hooks/useBankAccounts";
import BankAccountCard from "@/features/admin/components/BankAccountCard";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
  AdminTabs,
} from "@/features/admin/components/ui/primitives";

type View = "pending" | "all";

/**
 * Admin's "Bank accounts" queue. Every Teacher-submitted `BankAccount`
 * — first-time or a re-edit — lands here as PENDING until
 * approved/rejected. Only an APPROVED row is usable for a payout (see
 * `listPaymentQueueGroupedByTeacher` in teacherPayout.service.ts).
 */
export default function AdminBankAccountsPage() {
  const { bankAccounts, loading, error, approve, reject } = useAdminBankAccounts();
  const [view, setView] = useState<View>("pending");

  const pendingCount = bankAccounts.filter((b) => b.status === "PENDING").length;
  const visible = view === "all" ? bankAccounts : bankAccounts.filter((b) => b.status === "PENDING");

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Approvals" }]}
        title="Bank accounts"
        description={`${pendingCount} submission${pendingCount === 1 ? "" : "s"} waiting on you. Only approved accounts can be used for a payout.`}
      />

      <div>
        <AdminTabs
          label="Submissions shown"
          value={view}
          onChange={setView}
          tabs={[
            { value: "pending", label: "Pending only", count: pendingCount },
            { value: "all", label: "All history" },
          ]}
        />
      </div>

      <AdminError>{error}</AdminError>

      {loading ? (
        <AdminLoading message="Loading bank accounts…" />
      ) : visible.length === 0 ? (
        <AdminEmpty
          message={
            view === "all" ? "No bank account submissions yet." : "Nothing waiting on your approval."
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((account) => (
            <BankAccountCard key={account.id} account={account} onApprove={approve} onReject={reject} />
          ))}
        </div>
      )}
    </AdminPage>
  );
}
