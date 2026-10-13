"use client";

import { Plus } from "lucide-react";

import { useStaffAccounts } from "@/features/admin/hooks/useStaffAccounts";
import StaffAccountsTable from "@/features/admin/components/StaffAccountsTable";
import CreateStaffAccountForm from "@/features/admin/components/CreateStaffAccountForm";
import {
  AdminError,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
  adminButtonClass,
} from "@/features/admin/components/ui/primitives";

export default function AdminStaffAccountsPage() {
  const {
    accounts,
    loading,
    error,
    deletingId,
    showCreateForm,
    setShowCreateForm,
    handleDelete,
    handleCreated,
  } = useStaffAccounts();

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "People" }]}
        title="Staff accounts"
        description="Create and manage HR, IT and Accounts logins. Each gets a simple dashboard on first login."
        actions={
          !showCreateForm && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className={adminButtonClass("primary")}
            >
              <Plus className="size-4" aria-hidden="true" />
              New staff account
            </button>
          )
        }
      />

      {showCreateForm && (
        <CreateStaffAccountForm onCreated={handleCreated} onCancel={() => setShowCreateForm(false)} />
      )}

      <AdminError>{error}</AdminError>

      {loading ? (
        <AdminLoading message="Loading staff accounts…" />
      ) : (
        <StaffAccountsTable accounts={accounts} deletingId={deletingId} onDelete={handleDelete} />
      )}
    </AdminPage>
  );
}
