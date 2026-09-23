"use client";

import { useEffect, useState } from "react";

export interface ManagedAccount {
  id: string;
  role: "parent" | "teacher" | "accounts" | "hr" | "it" | "admin";
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export interface AccountAccessUpdateInput {
  newPassword?: string;
  passwordPermanent?: boolean;
  newEmail?: string;
  newPhone?: string;
}

/**
 * Shared by /admin/account-access and /it/account-access — the only
 * difference between the two is which API base path is passed in
 * (the server routes each enforce their own role scope regardless of
 * what the client sends). See accountAccess.service.ts.
 */
export function useAccountAccess(apiBasePath: string) {
  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [target, setTarget] = useState<ManagedAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(apiBasePath);
      if (!res.ok) throw new Error("Failed to load accounts.");
      const data = await res.json();
      setAccounts(data.accounts);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBasePath]);

  function openTarget(account: ManagedAccount) {
    setTarget(account);
    setFormError(null);
    setSuccessMessage(null);
  }

  function closeTarget() {
    setTarget(null);
    setFormError(null);
    setSuccessMessage(null);
  }

  async function submit(input: AccountAccessUpdateInput) {
    if (!target) return;
    setSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(apiBasePath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole: target.role,
          targetEmail: target.email,
          ...input,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Update failed.");

      setSuccessMessage("Account updated.");
      if (input.newEmail) {
        setTarget({ ...target, email: input.newEmail });
      }
      await load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = accounts.filter((a) =>
    `${a.firstName} ${a.lastName} ${a.email} ${a.role}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return {
    accounts: filtered,
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
  };
}
