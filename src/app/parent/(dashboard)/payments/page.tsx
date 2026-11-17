"use client";

import { Suspense } from "react";

import PdHubTabs from "@/features/parent/components/PdHubTabs";
import PaymentsView from "@/features/parent/components/views/PaymentsView";
import WalletView from "@/features/parent/components/views/WalletView";
import ReferralView from "@/features/parent/components/views/ReferralView";

export default function ParentPaymentsHubPage() {
  return (
    <Suspense fallback={null}>
      <PdHubTabs
        title="Payments"
        subtitle="Invoices, wallet and referral rewards."
        defaultTab="payments"
        tabs={[
          { key: "payments", label: "Payments", content: <PaymentsView /> },
          { key: "wallet", label: "Wallet", content: <WalletView /> },
          { key: "referral", label: "Referral", content: <ReferralView /> },
        ]}
      />
    </Suspense>
  );
}
