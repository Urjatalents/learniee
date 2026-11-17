"use client";

import PdPageHead from "@/features/parent/components/help/PdPageHead";
import HelpView from "@/features/parent/components/help/HelpView";

/**
 * Parent "Help" sidebar entry (`/parent/complain`). A Parent picks a department
 * (Accounts / HR / IT), writes a subject + description; it's OPEN until Admin responds
 * (`/admin/complaints`). Backend: `/api/parent/complaints` + `complaint.service.ts`.
 */
export default function ParentComplainPage() {
  return (
    <div className="mx-auto max-w-[1160px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
      <PdPageHead
        title="Help & support"
        subtitle="Send your issue to the right department. For anything urgent, call the number on the department card."
      />
      <HelpView />
    </div>
  );
}
