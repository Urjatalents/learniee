"use client";

import { useState } from "react";

import {
  AdminAvatar,
  AdminError,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
  AdminPill,
  AdminSearch,
  AdminTableCard,
  adminButtonClass,
  adminInputClass,
  adminLabelClass,
  adminRowClass,
  adminTableClass,
  adminTdClass,
  adminThClass,
} from "@/features/admin/components/ui/primitives";
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
  /** True inside the Admin shell (adds the breadcrumb, drops page padding). */
  embedded?: boolean;
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
  embedded = false,
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

  const content = (
    <AdminPage>
      <AdminPageHeader
        crumbs={embedded ? [{ label: "Overview", href: "/admin" }, { label: "People" }] : undefined}
        title={heading}
        description={subheading}
      />

      <div>
        <AdminSearch
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email or role"
        />
      </div>

      <AdminError>{loadError}</AdminError>

      {loading ? (
        <AdminLoading message="Loading accounts…" />
      ) : (
        <AdminTableCard>
          <table className={adminTableClass}>
            <thead>
              <tr>
                <th className={adminThClass}>Name</th>
                <th className={adminThClass}>Role</th>
                <th className={adminThClass}>Phone</th>
                <th className={`${adminThClass} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const name = `${a.firstName} ${a.lastName}`.trim();

                return (
                  <tr key={`${a.role}-${a.id}`} className={adminRowClass}>
                    <td className={adminTdClass}>
                      <div className="flex min-w-0 items-center gap-3">
                        <AdminAvatar name={name || a.email} />
                        <div className="min-w-0">
                          <p className="truncate font-extrabold">{name || "—"}</p>
                          <p className="truncate text-sm text-admin-muted">{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className={adminTdClass}>
                      <AdminPill>{ROLE_LABELS[a.role]}</AdminPill>
                    </td>
                    <td className={adminTdClass}>{a.phone || "—"}</td>
                    <td className={`${adminTdClass} text-right`}>
                      <button
                        type="button"
                        onClick={() => openTarget(a)}
                        aria-label={`Manage access for ${name || a.email}`}
                        className={adminButtonClass("primary")}
                      >
                        Manage access
                      </button>
                    </td>
                  </tr>
                );
              })}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-admin-muted">
                    No accounts match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </AdminTableCard>
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
    </AdminPage>
  );

  if (embedded) return content;

  return <div className="mx-auto min-h-screen max-w-5xl bg-admin-surface p-8 text-admin-ink">{content}</div>;
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
      <div className="absolute inset-0 bg-admin-ink/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Manage access"
        className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white shadow-xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-admin-line bg-white px-6 py-4">
          <h2 className="font-heading text-xl font-bold">
            Manage access: {account.firstName} {account.lastName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 items-center justify-center rounded-xl text-2xl leading-none text-admin-muted hover:bg-admin-hover"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6">
          <AdminError>{formError}</AdminError>
          {successMessage && (
            <div
              role="status"
              className="rounded-[14px] border border-green-200 bg-green-50 px-4 py-3 text-[15px] font-semibold text-green-800"
            >
              {successMessage}
            </div>
          )}

          <section className="flex flex-col gap-3">
            <label className="flex min-h-11 items-center gap-2.5 text-[15px] font-extrabold">
              <input
                type="checkbox"
                checked={resetPassword}
                onChange={(e) => setResetPassword(e.target.checked)}
                className="size-5 accent-brand"
              />
              Reset password
            </label>

            {resetPassword && (
              <div className="flex flex-col gap-3 pl-1">
                <div>
                  <label htmlFor="aa-password" className={adminLabelClass}>
                    New password
                  </label>
                  <input
                    id="aa-password"
                    type="text"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={adminInputClass}
                  />
                  {newPassword.length > 0 && newPassword.length < 8 && (
                    <p className="mt-1 text-sm font-bold text-red-700">Must be at least 8 characters.</p>
                  )}
                </div>

                <div className="flex flex-col gap-1 text-[15px]">
                  <label className="flex min-h-11 items-center gap-2.5">
                    <input
                      type="radio"
                      name="passwordMode"
                      checked={passwordMode === "temporary"}
                      onChange={() => setPasswordMode("temporary")}
                      className="accent-brand"
                    />
                    Temporary, must be reset on next login
                  </label>
                  <label className="flex min-h-11 items-center gap-2.5">
                    <input
                      type="radio"
                      name="passwordMode"
                      checked={passwordMode === "permanent"}
                      onChange={() => setPasswordMode("permanent")}
                      className="accent-brand"
                    />
                    Permanent
                  </label>
                </div>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-base font-extrabold">Contact details</h3>
            <div>
              <label htmlFor="aa-email" className={adminLabelClass}>
                New email{" "}
                <span className="font-semibold text-admin-muted">
                  (leave blank to keep {account.email})
                </span>
              </label>
              <input
                id="aa-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className={adminInputClass}
              />
            </div>
            {account.role !== "admin" && (
              <div>
                <label htmlFor="aa-phone" className={adminLabelClass}>
                  New phone{" "}
                  <span className="font-semibold text-admin-muted">
                    (leave blank to keep {account.phone || "unset"})
                  </span>
                </label>
                <input
                  id="aa-phone"
                  type="tel"
                  placeholder="+91XXXXXXXXXX"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className={adminInputClass}
                />
              </div>
            )}
          </section>

          <button type="submit" disabled={saving} className={adminButtonClass("primary", "w-full")}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
