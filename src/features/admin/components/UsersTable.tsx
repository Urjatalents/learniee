"use client";

import { Trash2 } from "lucide-react";

import type { AdminUser } from "@/features/admin/types/user";
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

interface UsersTableProps {
  users: AdminUser[];
  deletingEmail: string | null;
  confirmingEmail?: string | null;
  onView: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}

export default function UsersTable({
  users,
  deletingEmail,
  confirmingEmail,
  onView,
  onDelete,
}: UsersTableProps) {
  return (
    <AdminTableCard>
      <table className={adminTableClass}>
        <thead>
          <tr>
            <th className={adminThClass}>User</th>
            <th className={adminThClass}>Role</th>
            <th className={`${adminThClass} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const name = `${u.firstName} ${u.lastName}`.trim();

            return (
              <tr key={u.email} className={adminRowClass}>
                <td className={adminTdClass}>
                  <div className="flex min-w-0 items-center gap-3">
                    <AdminAvatar name={name || u.email} />
                    <div className="min-w-0">
                      <p className="truncate font-extrabold">{name || "—"}</p>
                      <p className="truncate text-sm text-admin-muted">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className={adminTdClass}>
                  <AdminPill className="capitalize">{u.role}</AdminPill>
                </td>
                <td className={`${adminTdClass} text-right`}>
                  {confirmingEmail === u.email ? (
                    <span className="text-sm font-extrabold text-admin-muted">
                      Awaiting confirmation
                    </span>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onView(u)}
                        aria-label={`View ${name || u.email}`}
                        className={adminButtonClass("secondary")}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(u)}
                        disabled={deletingEmail === u.email}
                        aria-label={`Delete ${name || u.email}`}
                        className={adminButtonClass("secondary", "text-red-700")}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        {deletingEmail === u.email ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
          {users.length === 0 && (
            <tr>
              <td colSpan={3} className="px-5 py-10 text-center text-admin-muted">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </AdminTableCard>
  );
}
