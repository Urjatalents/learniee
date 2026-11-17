"use client";

import { Suspense } from "react";

import PdHubTabs from "@/features/parent/components/PdHubTabs";
import CoursesView from "@/features/parent/components/views/CoursesView";
import TeachersView from "@/features/parent/components/views/TeachersView";
import RequestClassView from "@/features/parent/components/views/RequestClassView";

export default function ParentFindCourseHubPage() {
  return (
    <Suspense fallback={null}>
      <PdHubTabs
        title="Find a course"
        subtitle="Browse approved courses, meet teachers, or request something custom."
        defaultTab="courses"
        tabs={[
          { key: "courses", label: "Courses", content: <CoursesView /> },
          { key: "teachers", label: "Teachers", content: <TeachersView /> },
          { key: "request", label: "Request a class", content: <RequestClassView /> },
        ]}
      />
    </Suspense>
  );
}
