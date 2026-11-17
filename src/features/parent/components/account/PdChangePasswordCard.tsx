"use client";

import { useState, type FormEvent } from "react";

import PdField from "@/features/parent/components/account/PdField";
import { PD_BTN_PRI, PD_INPUT } from "@/features/parent/components/courses/pdUi";
import { PD_CARD, PdBanner } from "@/features/parent/components/payments/paymentsUi";

type Errors = Partial<Record<"current" | "next" | "confirm", string>>;

/**
 * Design Settings > Change password card. Same rules and the same endpoint
 * (`/api/auth/change-password`) as the shared card the Teacher settings still use.
 */
export default function PdChangePasswordCard({ onDone }: { onDone: (message: string) => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    const found: Errors = {};
    if (!current) found.current = "Enter your current password.";
    if (next.length < 8) found.next = "Use at least 8 characters.";
    else if (!/[A-Z]/.test(next) || !/[a-z]/.test(next) || !/[0-9]/.test(next)) {
      found.next = "Include an upper-case letter, a lower-case letter and a number.";
    }
    if (confirm !== next) found.confirm = "Passwords don’t match.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFormError(
          res.status === 401
            ? "Your session has expired. Please log out and log back in."
            : data.error || "Failed to change your password.",
        );
        return;
      }

      setCurrent("");
      setNext("");
      setConfirm("");
      onDone("Password updated");
    } catch {
      setFormError("Network error. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={`${PD_CARD} flex flex-col gap-5`}>
      <div>
        <h2 className="font-heading text-lg font-semibold text-pd-ink">Change password</h2>
        <p className="text-[13px] text-pd-ink3">
          Update the password you use to log in. You’ll stay logged in on this device.
        </p>
      </div>

      {formError && <PdBanner tone="red">{formError}</PdBanner>}

      <PdField id="pw0" label="Current password" error={errors.current}>
        <input
          id="pw0"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          aria-invalid={Boolean(errors.current)}
          className={PD_INPUT}
        />
      </PdField>
      <PdField
        id="pw1"
        label="New password"
        hint="At least 8 characters, with upper-case, lower-case and a number."
        error={errors.next}
      >
        <input
          id="pw1"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          aria-invalid={Boolean(errors.next)}
          className={PD_INPUT}
        />
      </PdField>
      <PdField id="pw2" label="Confirm new password" error={errors.confirm}>
        <input
          id="pw2"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={Boolean(errors.confirm)}
          className={PD_INPUT}
        />
      </PdField>

      <button type="submit" disabled={saving} className={`${PD_BTN_PRI} self-start`}>
        {saving ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
