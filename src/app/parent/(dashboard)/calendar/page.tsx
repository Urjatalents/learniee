"use client";

import { Suspense } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

import { PD_BTN_PRI } from "@/features/parent/components/courses/pdUi";
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
          // Reached from the sidebar (Reschedule). "?new=1" opens the request dialog.
          {
            key: "reschedule",
            label: "Reschedule requests",
            standalone: true,
            heading: {
              title: "Reschedule",
              subtitle: "Move a class to a new time. The other side always approves first.",
              action: (
                <Link href="/parent/calendar?tab=reschedule&new=1" scroll={false} className={PD_BTN_PRI}>
                  <RefreshCw size={16} />
                  Request a reschedule
                </Link>
              ),
            },
            content: <RescheduleView />,
          },
        ]}
      />
    </Suspense>
  );
}
