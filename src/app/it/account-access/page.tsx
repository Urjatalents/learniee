"use client";

import AccountAccessManager from "@/features/shared/components/AccountAccessManager";

export default function ItAccountAccessPage() {
  return (
    <AccountAccessManager
      heading="Account Access"
      subheading="Reset a login's password, or change the email/phone Cognito has on file — Teacher and Parent accounts only."
      apiBasePath="/api/it/account-access"
    />
  );
}
