"use client";

import { useState } from "react";

import {
  ADMIN_DECISION_OPTIONS,
  DECISION_REASON_MAX_LENGTH,
  DECISION_REASON_MIN_LENGTH,
} from "@/features/shared/utils/outcomeConfirmation";
import { SESSION_STATUS_LABEL } from "@/features/shared/utils/sessionOutcome";
import type { SessionReviewItem } from "@/features/shared/types/sessionReview";
import {
  AdminDialog,
  adminButtonClass,
  adminLabelClass,
  adminTextareaClass,
  cx,
} from "@/features/admin/components/ui/primitives";

/** Decide (or override) a class outcome. Opens from a Class review card. */
export default function SessionDecisionDialog({
  item,
  onCancel,
  onSubmit,
}: {
  item: SessionReviewItem;
  onCancel: () => void;
  onSubmit: (status: string, reason: string) => Promise<string | null>;
}) {
  const [status, setStatus] = useState<string>(item.reason === "REPORTED" ? item.status : "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isOverride = item.kind === "OVERRIDE";
  const stands = status === item.status;
  const reasonLength = reason.trim().length;
  const canSubmit =
    !busy &&
    status !== "" &&
    reasonLength >= DECISION_REASON_MIN_LENGTH &&
    !(isOverride && stands);

  async function submit() {
    setBusy(true);
    setError("");

    const failure = await onSubmit(status, reason);

    if (failure) {
      setError(failure);
      setBusy(false);
    }
  }

  return (
    <AdminDialog
      wide
      title={isOverride ? "Override outcome" : "Decide outcome"}
      subtitle={undefined}
      onClose={busy ? () => {} : onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={adminButtonClass("secondary")}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className={adminButtonClass("primary")}
          >
            {busy ? "Saving…" : "Save decision"}
          </button>
        </>
      }
    >
      <p className="-mt-2 mb-4 text-[15px] text-admin-muted">
        Recorded as <strong>{SESSION_STATUS_LABEL[item.status]}</strong>.
        {item.reason === "REPORTED" && " Pick the same outcome to keep it as recorded."}
        {isOverride && " For an override, pick a different outcome than the one recorded."}
      </p>

      <fieldset className="flex flex-col gap-2">
        <legend className={adminLabelClass}>Outcome</legend>
        {ADMIN_DECISION_OPTIONS.map((option) => (
          <label
            key={option.status}
            className={cx(
              "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-2.5",
              status === option.status
                ? "border-brand bg-admin-tint"
                : "border-admin-line hover:bg-admin-hover",
            )}
          >
            <input
              type="radio"
              name="outcome"
              value={option.status}
              checked={status === option.status}
              onChange={() => setStatus(option.status)}
              className="mt-1 accent-brand"
            />
            <span className="flex flex-col">
              <span className="text-[15px] font-extrabold">
                {option.label}
                {option.status === item.status && (
                  <span className="ml-2 text-sm font-semibold text-admin-muted">(as recorded)</span>
                )}
              </span>
              <span className="text-sm text-admin-muted">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="mt-4">
        <label htmlFor="decision-reason" className={adminLabelClass}>
          Reason{" "}
          <span className="font-semibold text-admin-muted">
            (required, it is logged and shown in the class history)
          </span>
        </label>
        <textarea
          id="decision-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={DECISION_REASON_MAX_LENGTH}
          className={adminTextareaClass}
        />
        <span className="mt-1 block text-sm text-admin-muted">
          At least {DECISION_REASON_MIN_LENGTH} characters.
        </span>
      </div>

      {isOverride && stands && (
        <p className="mt-2 text-sm font-bold text-[#8a6500]">
          That is already the recorded outcome. Pick a different one to override it.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[15px] font-bold text-red-700">
          {error}
        </p>
      )}
    </AdminDialog>
  );
}
