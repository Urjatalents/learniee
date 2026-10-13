"use client";

import { useEffect, useState } from "react";
import { User, Pencil, X, Check } from "lucide-react";

import { useProfile, type AdminProfileFormFields } from "@/features/admin/hooks/useProfile";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import ProfileField from "@/features/shared/components/ProfileField";

/**
 * New (Sep 10, 2026) — Admin has no persistent sidebar/menu yet
 * (01-PROJECT-STATUS.md §1: "most individual Admin pages render
 * their own header inline"), so this is linked from the one shared
 * header on `/admin` itself, next to the NotificationBell, rather
 * than a sidebar entry like Parent/Teacher have.
 *
 * `Admin` is a minimal model (`03-DATA-MODEL.md`) — no phone/address
 * fields like Parent/Teacher — so this only shows/edits name, plus a
 * read-only email + join date.
 */

const emptyForm: AdminProfileFormFields = { firstName: "", lastName: "" };

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminProfilePage() {
  const { profile, loading, saving, error, save } = useProfile();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<AdminProfileFormFields>(emptyForm);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!profile) return;
    setForm({ firstName: profile.firstName, lastName: profile.lastName });
  }, [profile]);

  function field(name: keyof AdminProfileFormFields) {
    return (value: string) => setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleCancel() {
    if (profile) {
      setForm({ firstName: profile.firstName, lastName: profile.lastName });
    }
    setEditing(false);
    setNotice("");
  }

  async function handleSave() {
    setNotice("");
    const ok = await save(form);
    if (ok) {
      setEditing(false);
      setNotice("Profile updated.");
      setTimeout(() => setNotice(""), 3000);
    }
  }

  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : "";

  return (
    <div>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
              <User size={22} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {loading ? "Your Profile" : displayName || "Your Profile"}
              </h1>
              <p className="text-sm text-gray-500">{profile?.email}</p>
            </div>
          </div>

          {!loading && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm font-semibold px-3.5 py-2 rounded-lg flex-shrink-0"
            >
              <Pencil size={14} />
              Edit
            </button>
          )}
        </div>

        {error && <ErrorBanner>{error}</ErrorBanner>}
        {notice && (
          <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg mb-4">{notice}</div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-purple-50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-white border rounded-2xl shadow-sm p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ProfileField
                label="First Name"
                name="firstName"
                value={form.firstName}
                editing={editing}
                required
                onChange={field("firstName")}
              />
              <ProfileField
                label="Last Name"
                name="lastName"
                value={form.lastName}
                editing={editing}
                required
                onChange={field("lastName")}
              />
            </div>

            {profile && (
              <p className="text-xs text-gray-400 border-t pt-4">
                Admin since {formatDate(profile.createdAt)}
              </p>
            )}

            {editing && (
              <div className="flex items-center gap-3 border-t pt-5">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
                >
                  <Check size={15} />
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-lg"
                >
                  <X size={15} />
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
