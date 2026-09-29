import type { BlogPostStatus } from "../types";

const STYLES: Record<BlogPostStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  PENDING_REVIEW: { label: "In review", className: "bg-amber-100 text-amber-800" },
  PUBLISHED: { label: "Published", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "Needs changes", className: "bg-red-100 text-red-700" },
};

export default function BlogStatusBadge({ status }: { status: BlogPostStatus }) {
  const s = STYLES[status];

  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.className}`}>
      {s.label}
    </span>
  );
}
