import { ArrowUpRight, Download, FileText } from "lucide-react";

import { PD_BTN_SEC_SM } from "@/features/parent/components/courses/pdUi";
import type { Resource } from "@/features/parent/hooks/useResources";

const fmtShared = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const resourceCourse = (r: Resource) =>
  r.enrollment?.course.courseTitle || r.enrollment?.course.subject || "Course";

/** One shared file or link (design: Library > Resources row). */
export default function LibraryResourceRow({
  resource,
  learner,
}: {
  resource: Resource;
  /** First name of the child it was shared for, when known. */
  learner?: string;
}) {
  const isLink = resource.type === "LINK";
  const href = isLink ? resource.externalUrl : resource.fileUrl;

  return (
    <article className="flex flex-wrap items-center gap-3.5 border-t border-pd-line px-[18px] py-3.5 first:border-t-0">
      <span
        className={`grid size-11 shrink-0 place-items-center rounded-xl ${
          isLink ? "bg-[#e8f1fd] text-[#1d4ed8]" : "bg-pd-b50 text-pd-brand"
        }`}
      >
        {isLink ? <ArrowUpRight size={20} /> : <FileText size={20} />}
      </span>

      <div className="min-w-0 flex-1 basis-[200px]">
        <b className="block text-[15px] font-semibold text-pd-ink">{resource.title}</b>
        <small className="block truncate text-xs text-pd-ink3">
          {resourceCourse(resource)}
          {learner ? ` · ${learner}` : ""} · Shared {fmtShared(resource.createdAt)}
        </small>
        {resource.description && (
          <p className="mt-1 line-clamp-2 text-sm text-pd-ink2">{resource.description}</p>
        )}
      </div>

      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={`${PD_BTN_SEC_SM} max-[560px]:ml-[58px]`}
        >
          {isLink ? <ArrowUpRight size={14} /> : <Download size={14} />}
          {isLink ? "Open link" : "Download"}
        </a>
      ) : null}
    </article>
  );
}
