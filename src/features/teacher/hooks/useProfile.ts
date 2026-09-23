"use client";

import { useEffect, useState } from "react";

export interface TeacherProfileData {
  id: string;
  firstName: string;
  lastName: string;
  visibleName: string | null;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  pincode: string | null;
  aboutMe: string | null;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  /** Average of Parent-left course reviews, out of 5. Null = no reviews yet. */
  averageRating: number | null;
  reviewCount: number;
}

export type TeacherProfileFormFields = Pick<
  TeacherProfileData,
  | "firstName"
  | "lastName"
  | "visibleName"
  | "phone"
  | "whatsapp"
  | "address"
  | "city"
  | "country"
  | "pincode"
  | "aboutMe"
>;

/**
 * Backs the new `/teacher/profile` page (TeacherSidebar.tsx already
 * linked here — previously a dead link, same pattern as
 * Reschedule/Homework/Leave before those got built out).
 */
export function useProfile() {
  const [profile, setProfile] = useState<TeacherProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/teacher/profile");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load your profile.");
      }

      setProfile(data.teacher);
    } catch (err) {
      console.error(err);
      setError("Unable to load your profile.");
    } finally {
      setLoading(false);
    }
  }

  async function save(fields: Partial<TeacherProfileFormFields>) {
    try {
      setSaving(true);
      setError("");

      const res = await fetch("/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update your profile.");
      }

      // PATCH only returns the editable "contact card" fields — carry the
      // rating over from what GET last loaded rather than dropping it.
      setProfile((prev) => ({
        ...data.teacher,
        averageRating: prev?.averageRating ?? null,
        reviewCount: prev?.reviewCount ?? 0,
      }));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update your profile.";
      setError(message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { profile, loading, saving, error, save };
}
