"use client";

import {
  AdminError,
  AdminPanel,
  adminButtonClass,
  adminInputClass,
  adminLabelClass,
} from "@/features/admin/components/ui/primitives";
import { useCreateStaffAccount } from "@/features/admin/hooks/useCreateStaffAccount";
import type { StaffAccount } from "@/features/admin/types/staffAccount";

interface CreateStaffAccountFormProps {
  onCreated: (account: StaffAccount) => void;
  onCancel: () => void;
}

export default function CreateStaffAccountForm({ onCreated, onCancel }: CreateStaffAccountFormProps) {
  const {
    step,
    loading,
    error,
    firstName,
    lastName,
    email,
    phone,
    role,
    result,

    setFirstName,
    setLastName,
    setEmail,
    setPhone,
    setRole,

    handleCreateAccount,
  } = useCreateStaffAccount(onCreated);

  return (
    <AdminPanel padded className="max-w-lg">
      {step === "details" && (
        <div className="flex flex-col gap-4">
          <h2 className="font-heading text-xl font-bold">Create staff account</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="staff-first" className={adminLabelClass}>
                First name
              </label>
              <input
                id="staff-first"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={adminInputClass}
              />
            </div>
            <div>
              <label htmlFor="staff-last" className={adminLabelClass}>
                Last name
              </label>
              <input
                id="staff-last"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={adminInputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="staff-email" className={adminLabelClass}>
              Email
            </label>
            <input
              id="staff-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={adminInputClass}
            />
          </div>

          <div>
            <label htmlFor="staff-phone" className={adminLabelClass}>
              Phone
            </label>
            <input
              id="staff-phone"
              type="tel"
              placeholder="+91XXXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={adminInputClass}
            />
          </div>

          <div>
            <label htmlFor="staff-role" className={adminLabelClass}>
              Role
            </label>
            <select
              id="staff-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "HR" | "ACCOUNTS" | "IT")}
              className={adminInputClass}
            >
              <option value="HR">HR</option>
              <option value="ACCOUNTS">Accounts</option>
              <option value="IT">IT</option>
            </select>
          </div>

          <AdminError>{error}</AdminError>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCreateAccount}
              disabled={loading}
              className={adminButtonClass("primary")}
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
            <button type="button" onClick={onCancel} className={adminButtonClass("secondary")}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="flex flex-col gap-4">
          <h2 className="font-heading text-xl font-bold text-brand-dark">Account created</h2>
          <p className="text-[15px]">
            {result.account.firstName} {result.account.lastName} ({result.account.email}) can now log
            in with the temporary password below. They&apos;ll be asked to set a new password on
            first login.
          </p>
          <div className="select-all rounded-[14px] border border-admin-line bg-admin-surface p-3 font-mono text-sm">
            {result.tempPassword}
          </div>
          <p className="text-sm text-admin-muted">
            This was also emailed to {result.account.email}. It won&apos;t be shown again.
          </p>
          <div>
            <button type="button" onClick={onCancel} className={adminButtonClass("primary")}>
              Done
            </button>
          </div>
        </div>
      )}
    </AdminPanel>
  );
}
