"use client";

import AccountAccessManager from "@/features/shared/components/AccountAccessManager";

export default function AdminAccountAccessPage() {
  return (
    <AccountAccessManager
      heading="Account Access"
      subheading="Reset a login's password, or change the email/phone Cognito has on file — Teacher, Parent, Accounts, HR, IT and other Admin logins."
      apiBasePath="/api/admin/account-access"
    />
  );
}
