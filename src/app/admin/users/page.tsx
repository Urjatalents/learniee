"use client";

import { useState } from "react";

import { useAdminUsers } from "@/features/admin/hooks/useAdminUsers";
import UsersTable from "@/features/admin/components/UsersTable";
import UserDetailPanel from "@/features/admin/components/UserDetailPanel";
import {
  AdminDialog,
  AdminError,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
  AdminSearch,
  adminButtonClass,
} from "@/features/admin/components/ui/primitives";
import type { AdminUser } from "@/features/admin/types/user";

export default function AdminUsersPage() {
  const {
    users,
    search,
    setSearch,
    loading,
    error,
    deletingEmail,
    handleDelete,
    viewingUser,
    setViewingUser,
  } = useAdminUsers();
  const [confirming, setConfirming] = useState<AdminUser | null>(null);

  async function confirmDelete() {
    if (!confirming) return;

    const target = confirming;
    setConfirming(null);
    await handleDelete(target);
  }

  const confirmName = confirming ? `${confirming.firstName} ${confirming.lastName}`.trim() : "";

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "People" }]}
        title="Manage users"
        description="Delete a user's account and all their data from Cognito and the database."
      />

      <div className="flex flex-wrap items-center gap-4">
        <AdminSearch value={search} onChange={setSearch} placeholder="Search by name or email" label="Find a user" />
        <span className="text-[15px] font-bold text-admin-muted">{users.length} users shown</span>
      </div>

      <AdminError>{error}</AdminError>

      {loading ? (
        <AdminLoading message="Loading users…" />
      ) : (
        <UsersTable
          users={users}
          deletingEmail={deletingEmail}
          confirmingEmail={confirming?.email}
          onView={setViewingUser}
          onDelete={setConfirming}
        />
      )}

      {viewingUser && (
        <UserDetailPanel
          email={viewingUser.email}
          role={viewingUser.role}
          onClose={() => setViewingUser(null)}
        />
      )}

      {confirming && (
        <AdminDialog
          title={`Permanently delete ${confirmName || confirming.email}?`}
          subtitle={confirming.email}
          onClose={() => setConfirming(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className={adminButtonClass("secondary")}
              >
                Keep user
              </button>
              <button type="button" onClick={confirmDelete} className={adminButtonClass("danger")}>
                Delete permanently
              </button>
            </>
          }
        >
          <p className="text-[15px]">
            This removes them from Cognito and the database. This cannot be undone.
          </p>
        </AdminDialog>
      )}
    </AdminPage>
  );
}
