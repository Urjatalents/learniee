"use client";

import { useStaffAccounts } from "@/features/admin/hooks/useStaffAccounts";
import StaffAccountsTable from "@/features/admin/components/StaffAccountsTable";
import CreateStaffAccountForm from "@/features/admin/components/CreateStaffAccountForm";

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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-purple-600">Staff Accounts</h1>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
          >
            + New Staff Account
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Create and manage HR, IT and Accounts logins. Each gets a simple dashboard on first login
        — full profile details for these roles aren&apos;t built yet.
      </p>

      {showCreateForm && (
        <CreateStaffAccountForm onCreated={handleCreated} onCancel={() => setShowCreateForm(false)} />
      )}

      {error && (
        <div className="mb-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading staff accounts…</p>
      ) : (
        <StaffAccountsTable accounts={accounts} deletingId={deletingId} onDelete={handleDelete} />
      )}
    </div>
  );
}
