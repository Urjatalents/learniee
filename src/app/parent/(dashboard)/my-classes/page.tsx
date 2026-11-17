"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import PdHubTabs from "@/features/parent/components/PdHubTabs";
import { PD_BTN_PRI } from "@/features/parent/components/courses/pdUi";
import { useParentEnrollments } from "@/features/parent/hooks/useEnrollments";
import MyClassesView from "@/features/parent/components/views/MyClassesView";
import FreeDemoView from "@/features/parent/components/views/FreeDemoView";
import HomeworkTestsView from "@/features/parent/components/views/HomeworkTestsView";
import ChatListView from "@/features/parent/components/views/ChatListView";
import ResourcesView from "@/features/parent/components/views/ResourcesView";
import CertificatesView from "@/features/parent/components/views/CertificatesView";

const WAITING = new Set(["PENDING_APPROVAL", "PENDING_TEACHER_APPROVAL", "PENDING_ADMIN_APPROVAL", "APPROVED"]);

export default function ParentMyClassesHubPage() {
  // One fetch shared by the Classes and Homework tabs and the tab badge.
  const { enrollments, loading, error, respondToRevision } = useParentEnrollments(
    "/api/parent/my-classes",
  );
  const waitingCount = enrollments.filter((e) => !e.isLegacy && WAITING.has(e.status)).length;

  return (
    <Suspense fallback={null}>
      <PdHubTabs
        title="My classes"
        subtitle="Join classes, track progress and stay in touch with teachers."
        defaultTab="courses"
        action={
          <Link href="/parent/courses" className={PD_BTN_PRI}>
            <Search size={16} />
            Find a new course
          </Link>
        }
        tabs={[
          {
            key: "courses",
            label: "Classes",
            badge: waitingCount,
            content: (
              <MyClassesView
                enrollments={enrollments}
                loading={loading}
                error={error}
                onConfirmRevision={(id) => respondToRevision(id, "CONFIRM")}
                onDeclineRevision={(id) => respondToRevision(id, "DECLINE")}
              />
            ),
          },
          {
            key: "homework",
            label: "Homework",
            content: <HomeworkTestsView enrollments={enrollments} loading={loading} error={error} />,
          },
          { key: "chat", label: "Messages", content: <ChatListView /> },
          // Reached from the sidebar (Demos / Library); not part of this page's design.
          { key: "demos", label: "Demos", hidden: true, content: <FreeDemoView /> },
          { key: "resources", label: "Library", hidden: true, content: <ResourcesView /> },
          { key: "certificates", label: "Certificates", content: <CertificatesView /> },
        ]}
      />
    </Suspense>
  );
}
