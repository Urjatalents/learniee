"use client";

import { useState } from "react";

import {
  useAccountAccess,
  type ManagedAccount,
} from "@/features/shared/hooks/useAccountAccess";

const ROLE_LABELS: Record<ManagedAccount["role"], string> = {
  parent: "Parent",
  teacher: "Teacher",
  accounts: "Accounts",
  hr: "HR",
  it: "IT",
  admin: "Admin",
};

interface AccountAccessManagerProps {
  heading: string;
  subheading: string;
  apiBasePath: string;
}

/**
 * Shared "password manager" screen for Admin (/admin/account-access,
 * every role) and IT (/it/account-access, Teacher/Parent only) — the
 * two pages differ only in apiBasePath; the server enforces the
 * actual scope either way. See accountAccess.service.ts.
 */
export default function AccountAccessManager({
  heading,
  subheading,
  apiBasePath,
}: AccountAccessManagerProps) {
  const {
    accounts,
    loading,
    loadError,
    search,
    setSearch,
    target,
    openTarget,
    closeTarget,
    saving,
    formError,
    successMessage,
    submit,
  } = useAccountAccess(apiBasePath);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-purple-600 mb-1">{heading}</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-2xl">{subheading}</p>

      <input
        type="text"
        placeholder="Search by name, email or role..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md mb-4 px-4 py-2 border rounded-lg"
      />

      {loadError && (
        <div className="mb-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm">
          {loadError}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading accounts…</p>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={`${a.role}-${a.id}`} className="border-t">
                  <td className="px-4 py-3">
                    {a.firstName} {a.lastName}
                  </td>
                  <td className="px-4 py-3">{ROLE_LABELS[a.role]}</td>
                  <td className="px-4 py-3">{a.email}</td>
                  <td className="px-4 py-3">{a.phone || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openTarget(a)}
                      className="text-purple-600 hover:text-purple-800 font-medium"
                    >
                      Manage access
                    </button>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    No accounts match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {target && (
        <AccountAccessModal
          account={target}
          saving={saving}
          formError={formError}
          successMessage={successMessage}
          onClose={closeTarget}
          onSubmit={submit}
        />
      )}
    </div>
  );
}

function AccountAccessModal({
  account,
  saving,
  formError,
  successMessage,
  onClose,
  onSubmit,
}: {
  account: ManagedAccount;
  saving: boolean;
  formError: string | null;
  successMessage: string | null;
  onClose: () => void;
  onSubmit: (input: {
    newPassword?: string;
    passwordPermanent?: boolean;
    newEmail?: string;
    newPhone?: string;
  }) => void;
}) {
  const [resetPassword, setResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordMode, setPasswordMode] = useState<"permanent" | "temporary">("temporary");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (resetPassword && newPassword.length < 8) {
      return; // the inline hint below covers this; nothing to submit
    }

    onSubmit({
      newPassword: resetPassword ? newPassword : undefined,
      passwordPermanent: resetPassword ? passwordMode === "permanent" : undefined,
      newEmail: newEmail.trim() || undefined,
      newPhone: newPhone.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-800">
            Manage access — {account.firstName} {account.lastName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {formError && (
            <div className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm">{formError}</div>
          )}
          {successMessage && (
            <div className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
              {successMessage}
            </div>
          )}

          <section className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <input
                type="checkbox"
                checked={resetPassword}
                onChange={(e) => setResetPassword(e.target.checked)}
              />
              Reset password
            </label>

            {resetPassword && (
              <div className="space-y-3 pl-6">
                <input
                  type="text"
                  placeholder="New password (min. 8 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                {newPassword.length > 0 && newPassword.length < 8 && (
                  <p className="text-xs text-red-500">Must be at least 8 characters.</p>
                )}

                <div className="flex gap-4 text-sm text-gray-700">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="passwordMode"
                      checked={passwordMode === "temporary"}
                      onChange={() => setPasswordMode("temporary")}
                    />
                    Temporary — must be reset on next login
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="passwordMode"
                      checked={passwordMode === "permanent"}
                      onChange={() => setPasswordMode("permanent")}
                    />
                    Permanent
                  </label>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Contact details</h3>
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-400">
                New email (leave blank to keep {account.email})
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            {account.role !== "admin" && (
              <div>
                <label className="text-xs uppercase tracking-wide text-gray-400">
                  New phone (leave blank to keep {account.phone || "unset"})
                </label>
                <input
                  type="tel"
                  placeholder="+91XXXXXXXXXX"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            )}
          </section>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
