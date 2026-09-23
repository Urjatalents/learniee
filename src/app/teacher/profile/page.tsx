"use client";

import { useEffect, useState } from "react";
import { User, Pencil, X, Check, Star } from "lucide-react";

import { useProfile, type TeacherProfileFormFields } from "@/features/teacher/hooks/useProfile";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import ProfileField from "@/features/shared/components/ProfileField";

/**
 * "Profile" sidebar entry — previously a placeholder link with no
 * page behind it (TeacherSidebar.tsx already pointed here, same
 * pattern as Reschedule/Homework/Leave before those got built out).
 *
 * Only edits the "contact card" — name, phone, address, bio — not
 * the onboarding-only fields (DOB, gender, nationality, PAN, criminal
 * disclosure), which stay scoped to onboarding. Email and approval
 * status are read-only here (email is the Cognito-linked identity
 * field; approval status is Admin-only, see `/admin/teachers`).
 */

const emptyForm: TeacherProfileFormFields = {
  firstName: "",
  lastName: "",
  visibleName: "",
  phone: "",
  whatsapp: "",
  address: "",
  city: "",
  country: "",
  pincode: "",
  aboutMe: "",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function approvalBadge(status: "PENDING" | "APPROVED" | "REJECTED") {
  const styles: Record<typeof status, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
  };
  const labels: Record<typeof status, string> = {
    PENDING: "Pending approval",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function RatingBadge({
  averageRating,
  reviewCount,
}: {
  averageRating: number | null;
  reviewCount: number;
}) {
  if (averageRating === null) {
    return (
      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
        No ratings yet
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
      <Star size={12} className="text-amber-500 fill-amber-500" />
      {averageRating.toFixed(1)} / 5
      <span className="font-medium text-amber-600/80">
        ({reviewCount} review{reviewCount === 1 ? "" : "s"})
      </span>
    </span>
  );
}

export default function TeacherProfilePage() {
  const { profile, loading, saving, error, save } = useProfile();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<TeacherProfileFormFields>(emptyForm);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!profile) return;

    setForm({
      firstName: profile.firstName,
      lastName: profile.lastName,
      visibleName: profile.visibleName ?? "",
      phone: profile.phone ?? "",
      whatsapp: profile.whatsapp ?? "",
      address: profile.address ?? "",
      city: profile.city ?? "",
      country: profile.country ?? "",
      pincode: profile.pincode ?? "",
      aboutMe: profile.aboutMe ?? "",
    });
  }, [profile]);

  function field(name: keyof TeacherProfileFormFields) {
    return (value: string) => setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleCancel() {
    if (profile) {
      setForm({
        firstName: profile.firstName,
        lastName: profile.lastName,
        visibleName: profile.visibleName ?? "",
        phone: profile.phone ?? "",
        whatsapp: profile.whatsapp ?? "",
        address: profile.address ?? "",
        city: profile.city ?? "",
        country: profile.country ?? "",
        pincode: profile.pincode ?? "",
        aboutMe: profile.aboutMe ?? "",
      });
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

  const displayName =
    profile?.visibleName?.trim() || (profile ? `${profile.firstName} ${profile.lastName}` : "");

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center flex-shrink-0">
            <User size={22} />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">
                {loading ? "Your Profile" : displayName || "Your Profile"}
              </h1>
              {profile && approvalBadge(profile.approvalStatus)}
              {profile && (
                <RatingBadge
                  averageRating={profile.averageRating}
                  reviewCount={profile.reviewCount}
                />
              )}
            </div>
            <p className="text-sm text-gray-500">{profile?.email}</p>
          </div>
        </div>

        {!loading && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 bg-violet-100 hover:bg-violet-200 text-violet-700 text-sm font-semibold px-3.5 py-2 rounded-lg flex-shrink-0"
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
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-violet-50 animate-pulse" />
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
            <ProfileField
              label="Display Name"
              name="visibleName"
              value={form.visibleName ?? ""}
              editing={editing}
              placeholder="How parents see you"
              onChange={field("visibleName")}
            />
            <ProfileField
              label="Phone"
              name="phone"
              value={form.phone ?? ""}
              editing={editing}
              onChange={field("phone")}
            />
            <ProfileField
              label="WhatsApp Number"
              name="whatsapp"
              value={form.whatsapp ?? ""}
              editing={editing}
              onChange={field("whatsapp")}
            />
          </div>

          <div className="border-t pt-5">
            <ProfileField
              label="About Me"
              name="aboutMe"
              value={form.aboutMe ?? ""}
              editing={editing}
              multiline
              placeholder="A short bio shown on your teacher profile"
              onChange={field("aboutMe")}
            />
          </div>

          <div className="border-t pt-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <ProfileField
                  label="Address"
                  name="address"
                  value={form.address ?? ""}
                  editing={editing}
                  onChange={field("address")}
                />
              </div>
              <ProfileField
                label="City"
                name="city"
                value={form.city ?? ""}
                editing={editing}
                onChange={field("city")}
              />
              <ProfileField
                label="Country"
                name="country"
                value={form.country ?? ""}
                editing={editing}
                onChange={field("country")}
              />
              <ProfileField
                label="Pincode"
                name="pincode"
                value={form.pincode ?? ""}
                editing={editing}
                onChange={field("pincode")}
              />
            </div>
          </div>

          {profile && (
            <p className="text-xs text-gray-400 border-t pt-4">
              Member since {formatDate(profile.createdAt)}
            </p>
          )}

          {editing && (
            <div className="flex items-center gap-3 border-t pt-5">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 bg-violet-700 hover:bg-violet-800 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
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
  );
}
