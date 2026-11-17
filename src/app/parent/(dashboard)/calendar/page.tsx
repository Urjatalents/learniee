"use client";

import { Suspense } from "react";

import PdHubTabs from "@/features/parent/components/PdHubTabs";
import CalendarView from "@/features/parent/components/views/CalendarView";
import RescheduleView from "@/features/parent/components/views/RescheduleView";

export default function ParentCalendarHubPage() {
  return (
    <Suspense fallback={null}>
      <PdHubTabs
        title="Calendar"
        subtitle="Every scheduled class across your children — filter to one child if you like."
        defaultTab="schedule"
        tabs={[
          { key: "schedule", label: "Calendar", standalone: true, content: <CalendarView /> },
          // Reached from the sidebar (Reschedule); gets its own design page later.
          {
            key: "reschedule",
            label: "Reschedule requests",
            standalone: true,
            heading: {
              title: "Reschedule",
              subtitle:
                "Move a class to a new date/time — from either side, with the other party's approval.",
            },
            content: <RescheduleView />,
          },
        ]}
      />
    </Suspense>
  );
}
