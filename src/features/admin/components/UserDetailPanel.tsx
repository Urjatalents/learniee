"use client";

import { useAdminUserDetail } from "@/features/admin/hooks/useAdminUserDetail";
import {
  formatDetailLabel,
  formatDetailValue,
  isDisplayableEntry,
  splitDetailEntries,
} from "@/features/admin/utils/userDetailFormatting";
import type { AdminUser } from "@/features/admin/types/user";

interface UserDetailPanelProps {
  email: string;
  role: AdminUser["role"];
  onClose: () => void;
}

export default function UserDetailPanel({ email, role, onClose }: UserDetailPanelProps) {
  const { detail, loading, error } = useAdminUserDetail(email, role);
  const { flatEntries, arrayEntries, objectEntries } = splitDetailEntries(detail);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-admin-ink/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="font-heading text-xl font-bold text-admin-ink">User details</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 items-center justify-center rounded-xl text-2xl leading-none text-admin-muted hover:bg-admin-hover"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {loading && <p className="text-gray-500">Loading…</p>}
          {error && <p className="text-red-600 text-sm">{error}</p>}

          {detail && (
            <div className="space-y-6">
              <div className="space-y-3">
                {flatEntries.map(([key, value]) => (
                  <div key={key}>
                    <div className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-admin-muted">
                      {formatDetailLabel(key)}
                    </div>
                    <div className="text-[15px] font-bold text-admin-ink">{formatDetailValue(value)}</div>
                  </div>
                ))}
              </div>

              {arrayEntries.map(([key, value]) => (
                <div key={key}>
                  <h3 className="text-base font-extrabold text-admin-ink mb-2">
                    {formatDetailLabel(key)}
                  </h3>
                  <div className="space-y-3">
                    {(value as Record<string, unknown>[]).map((item, i) => (
                      <div key={i} className="border border-admin-line rounded-[14px] p-3 bg-admin-surface space-y-1">
                        {Object.entries(item)
                          .filter(isDisplayableEntry)
                          .map(([k, v]) => (
                            <div key={k} className="text-xs">
                              <span className="text-gray-400">{formatDetailLabel(k)}: </span>
                              <span className="text-gray-800">{formatDetailValue(v)}</span>
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {objectEntries.map(([key, value]) => (
                <div key={key}>
                  <h3 className="text-base font-extrabold text-admin-ink mb-2">
                    {formatDetailLabel(key)}
                  </h3>
                  <div className="border border-admin-line rounded-[14px] p-3 bg-admin-surface space-y-1">
                    {Object.entries(value as Record<string, unknown>)
                      .filter(isDisplayableEntry)
                      .map(([k, v]) => (
                        <div key={k} className="text-xs">
                          <span className="text-gray-400">{formatDetailLabel(k)}: </span>
                          <span className="text-gray-800">{formatDetailValue(v)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
