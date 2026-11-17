"use client";

import { Suspense } from "react";

import PdHubTabs from "@/features/parent/components/PdHubTabs";
import ProfileView from "@/features/parent/components/views/ProfileView";
import StudentsView from "@/features/parent/components/views/StudentsView";
import SettingsView from "@/features/parent/components/views/SettingsView";

export default function ParentAccountHubPage() {
  return (
    <Suspense fallback={null}>
      <PdHubTabs
        title="Account"
        subtitle="Your profile, children and settings."
        defaultTab="profile"
        tabs={[
          { key: "profile", label: "Profile", content: <ProfileView /> },
          { key: "students", label: "Students", content: <StudentsView /> },
          { key: "settings", label: "Settings", content: <SettingsView /> },
        ]}
      />
    </Suspense>
  );
}
