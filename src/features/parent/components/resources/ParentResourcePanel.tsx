"use client";

import { FileText, Link as LinkIcon, Paperclip } from "lucide-react";

import { useParentResources, type Resource } from "@/features/parent/hooks/useResources";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ResourceCard({ resource, showCourse }: { resource: Resource; showCourse?: boolean }) {
  const href = resource.type === "LINK" ? resource.externalUrl : resource.fileUrl;
  const courseTitle = resource.enrollment?.course.courseTitle || resource.enrollment?.course.subject;

  return (
    <div className="bg-white border border-violet-100 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-violet-100 text-brand flex items-center justify-center flex-shrink-0">
          {resource.type === "LINK" ? <LinkIcon size={15} /> : <FileText size={15} />}
        </span>

        <div className="min-w-0">
          <p className="font-heading font-bold text-gray-800">{resource.title}</p>
          {showCourse && courseTitle && (
            <p className="text-xs text-brand font-semibold mt-0.5">{courseTitle}</p>
          )}
          {resource.description && (
            <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">
              {resource.description}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">Shared {formatDate(resource.createdAt)}</p>

          {href && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline mt-2 font-semibold"
            >
              <Paperclip size={12} /> {resource.type === "LINK" ? "Open link" : "Download / view"}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Parent-side, view-only. Pass `enrollmentId` for the scoped My
 * Classes tab, or leave it out for the flat /parent/resources view
 * across every course (which also shows which course each resource
 * belongs to).
 */
export default function ParentResourcePanel({ enrollmentId }: { enrollmentId?: string }) {
  const { resources, loading, error } = useParentResources(enrollmentId);
  const showCourse = !enrollmentId;

  return (
    <div className="space-y-4">
      {error && (
        <ErrorBanner size="compact" spacing={false}>
          {error}
        </ErrorBanner>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading resources…</p>
      ) : resources.length === 0 ? (
        <div className="bg-white border rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">
            {showCourse
              ? "No resources shared yet. Once a teacher shares something, it'll show up here for good."
              : "No resources shared yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((r) => (
            <ResourceCard key={r.id} resource={r} showCourse={showCourse} />
          ))}
        </div>
      )}
    </div>
  );
}
