"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { loginThenHref } from "./requestClassLink";
import { useViewerRole } from "./useViewerRole";

/**
 * Link from a public class card to the real course page. A signed-in parent
 * goes straight to it; everyone else logs in first and lands there after.
 */
export default function CourseLink({
  courseId,
  className,
  children,
}: {
  courseId: string;
  className?: string;
  children: ReactNode;
}) {
  const role = useViewerRole();
  const target = `/parent/courses/${encodeURIComponent(courseId)}`;
  const href = role === "parent" ? target : loginThenHref(target);

  return (
    <Link className={className} href={href} prefetch={false}>
      {children}
    </Link>
  );
}
