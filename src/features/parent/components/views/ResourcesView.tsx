"use client";

import LibraryContent from "@/features/parent/components/library/LibraryContent";

/**
 * "Library" sidebar entry: everything teachers have shared (files, links)
 * plus issued certificates, across every course and child. The page heading
 * comes from the My Classes hub tab (`?tab=resources`).
 */
export default function ResourcesView() {
  return <LibraryContent />;
}
