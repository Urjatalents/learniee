"use client";

import ParentResourcePanel from "@/features/parent/components/resources/ParentResourcePanel";

/**
 * "Resources" sidebar entry (already wired in ParentSidebar, no
 * page behind it until now). Everything a Teacher has ever shared
 * with this Parent's student, across every course, newest first —
 * these stay listed here permanently, even once an enrollment ends.
 * A course-scoped copy of the same list also lives on each course's
 * My Classes page (Resources tab).
 */
export default function ParentResourcesPage() {
  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-wider text-brand">Resources</p>
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-gray-800 mt-1">
          Resource library
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Files and links your teachers have shared with you, across every course.
        </p>
      </div>

      <ParentResourcePanel />
    </div>
  );
}
