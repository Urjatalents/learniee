"use client";

import AccountAccessManager from "@/features/shared/components/AccountAccessManager";

export default function AdminAccountAccessPage() {
  return (
    <AccountAccessManager
      heading="Account access"
      subheading="Reset a login's password, or change the email/phone Cognito has on file, for Teacher, Parent, Accounts, HR, IT and other Admin logins."
      apiBasePath="/api/admin/account-access"
      embedded
    />
  );
}
