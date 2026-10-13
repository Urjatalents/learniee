"use client";

import { useEffect, useState } from "react";
import type { AdminUser } from "@/features/admin/types/user";

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<AdminUser | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.users);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  /** Deletes immediately. The page asks for confirmation first (in-page dialog). */
  async function handleDelete(user: AdminUser) {
    setDeletingEmail(user.email);
    setError(null);

    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, role: user.role }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Delete failed");
      }

      setUsers((prev) => prev.filter((u) => u.email !== user.email));
      if (viewingUser?.email === user.email) setViewingUser(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingEmail(null);
    }
  }

  const filtered = users.filter((u) =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase()),
  );

  return {
    users: filtered,
    search,
    setSearch,
    loading,
    error,
    deletingEmail,
    handleDelete,
    viewingUser,
    setViewingUser,
  };
}
