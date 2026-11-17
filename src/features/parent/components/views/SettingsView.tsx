"use client";

import PdChangePasswordCard from "@/features/parent/components/account/PdChangePasswordCard";
import PdNotificationsCard from "@/features/parent/components/account/PdNotificationsCard";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";
import { PdBanner, PdSkeleton } from "@/features/parent/components/payments/paymentsUi";
import { useSettings } from "@/features/parent/hooks/useSettings";

/**
 * "Settings" tab of Account: the in-app notification master switch
 * (`/api/parent/settings`) and change password (`/api/auth/change-password`).
 * The fuller per-type notification settings stay Phase 2 (06 #32).
 */
export default function SettingsView() {
  const { settings, loading, saving, error, setNotificationsEnabled } = useSettings();
  const { toast, toastNode } = usePdToast();

  async function toggle(next: boolean) {
    const ok = await setNotificationsEnabled(next);
    if (ok) toast(`In-app notifications ${next ? "on" : "off"}`);
  }

  return (
    <div className="mt-6 flex max-w-[820px] flex-col gap-5">
      {error && <PdBanner tone="red">{error}</PdBanner>}

      {loading ? (
        <>
          <PdSkeleton height={150} />
          <PdSkeleton height={330} />
        </>
      ) : (
        <>
          <PdNotificationsCard
            enabled={settings?.notificationsEnabled ?? true}
            saving={saving}
            onToggle={toggle}
          />
          <PdChangePasswordCard onDone={toast} />
        </>
      )}

      {toastNode}
    </div>
  );
}
