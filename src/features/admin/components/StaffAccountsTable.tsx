"use client";

import { Trash2 } from "lucide-react";

import type { StaffAccount } from "@/features/admin/types/staffAccount";
import {
  AdminAvatar,
  AdminPill,
  AdminTableCard,
  adminButtonClass,
  adminRowClass,
  adminTableClass,
  adminTdClass,
  adminThClass,
} from "@/features/admin/components/ui/primitives";

interface StaffAccountsTableProps {
  accounts: StaffAccount[];
  deletingId: string | null;
  onDelete: (account: StaffAccount) => void;
}

export default function StaffAccountsTable({ accounts, deletingId, onDelete }: StaffAccountsTableProps) {
  return (
    <AdminTableCard>
      <table className={adminTableClass}>
        <thead>
          <tr>
            <th className={adminThClass}>Name</th>
            <th className={adminThClass}>Phone</th>
            <th className={adminThClass}>Role</th>
            <th className={`${adminThClass} text-right`}>Action</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => {
            const name = `${a.firstName} ${a.lastName}`.trim();

            return (
              <tr key={a.id} className={adminRowClass}>
                <td className={adminTdClass}>
                  <div className="flex min-w-0 items-center gap-3">
                    <AdminAvatar name={name} />
                    <div className="min-w-0">
                      <p className="truncate font-extrabold">{name}</p>
                      <p className="truncate text-sm text-admin-muted">{a.email}</p>
                    </div>
                  </div>
                </td>
                <td className={adminTdClass}>{a.phone}</td>
                <td className={adminTdClass}>
                  <AdminPill className="capitalize">{a.role.toLowerCase()}</AdminPill>
                </td>
                <td className={`${adminTdClass} text-right`}>
                  <button
                    type="button"
                    onClick={() => onDelete(a)}
                    disabled={deletingId === a.id}
                    aria-label={`Delete ${name}`}
                    className={adminButtonClass("secondary", "text-red-700")}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    {deletingId === a.id ? "Deleting…" : "Delete"}
                  </button>
                </td>
              </tr>
            );
          })}
          {accounts.length === 0 && (
            <tr>
              <td colSpan={4} className="px-5 py-10 text-center text-admin-muted">
                No staff accounts yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </AdminTableCard>
  );
}
