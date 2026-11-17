"use client";

import { PD_CARD } from "@/features/parent/components/payments/paymentsUi";

/** Design Settings > Notifications card with the `.sw-t` switch. */
export default function PdNotificationsCard({
  enabled,
  saving,
  onToggle,
}: {
  enabled: boolean;
  saving: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <section className={`${PD_CARD} flex flex-col gap-3`}>
      <h2 className="font-heading text-lg font-semibold text-pd-ink">Notifications</h2>
      <p className="text-[13px] text-pd-ink3">
        Controls the in-app notification bell — enrollment updates, class reminders, chat messages.
        Turning this off stops new notifications from being created; it won’t clear ones you already
        have.
      </p>
      <div className="flex items-center justify-between gap-3">
        <span id="notif-label" className="font-semibold text-pd-ink">
          In-app notifications
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby="notif-label"
          disabled={saving}
          onClick={() => onToggle(!enabled)}
          className={`relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            enabled ? "bg-pd-brand" : "bg-pd-line2"
          }`}
        >
          <span
            className={`absolute left-[3px] top-[3px] size-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              enabled ? "translate-x-[22px]" : ""
            }`}
          />
        </button>
      </div>
    </section>
  );
}
