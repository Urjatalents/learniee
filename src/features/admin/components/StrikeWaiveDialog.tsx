"use client";

import { useState } from "react";

import type { AdminTeacherStrike } from "@/features/admin/hooks/useTeacherStrikes";
import { formatPlatformTime } from "@/lib/platformTime";
import {
  AdminDialog,
  AdminError,
  adminButtonClass,
  adminLabelClass,
  adminTextareaClass,
} from "@/features/admin/components/ui/primitives";

export const STRIKE_REASON_LABEL: Record<AdminTeacherStrike["reason"], string> = {
  TEACHER_NO_SHOW: "Did not join",
  TEACHER_CANCELLED: "Cancelled the class",
};

const WAIVE_REASON_MIN = 5;
const WAIVE_REASON_MAX = 500;

export default function StrikeWaiveDialog({
  strike,
  onCancel,
  onSubmit,
}: {
  strike: AdminTeacherStrike;
  onCancel: () => void;
  onSubmit: (reason: string) => Promise<string | null>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const length = reason.trim().length;
  const canSubmit = !busy && length >= WAIVE_REASON_MIN && length <= WAIVE_REASON_MAX;
  const classTime = strike.classStartsAt ? formatPlatformTime(new Date(strike.classStartsAt), true) : "—";

  async function submit() {
    setBusy(true);
    setError("");

    const message = await onSubmit(reason.trim());

    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  return (
    <AdminDialog
      title="Waive this strike"
      subtitle={undefined}
      onClose={busy ? () => {} : onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} disabled={busy} className={adminButtonClass("secondary")}>
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={!canSubmit} className={adminButtonClass("primary")}>
            {busy ? "Saving…" : "Waive strike"}
          </button>
        </>
      }
    >
      <p className="-mt-2 mb-4 text-[15px] text-admin-muted">
        {strike.teacherName} · {STRIKE_REASON_LABEL[strike.reason]} · {classTime}. The strike stays
        on the record but no longer counts.
      </p>

      <AdminError>{error}</AdminError>

      <label htmlFor="waive-reason" className={`${adminLabelClass} ${error ? "mt-3" : ""}`}>
        Reason{" "}
        <span className="font-semibold text-admin-muted">(required, for example emergency leave)</span>
      </label>
      <textarea
        id="waive-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={WAIVE_REASON_MAX}
        className={adminTextareaClass}
      />
      <span className="mt-1 block text-sm text-admin-muted">
        At least {WAIVE_REASON_MIN} characters. Up to {WAIVE_REASON_MAX}.
      </span>
    </AdminDialog>
  );
}
