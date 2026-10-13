"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import "@/features/landing/styles/landing.css";

import { decideBlogPost, fetchAdminBlogPost, useAdminBlogList } from "../hooks/useAdminBlogs";
import type { AdminBlogPost, BlogPostStatus } from "../types";
import { blogCategoryLabel } from "../utils/blogCategories";
import { countWords } from "../utils/blogRules";
import { displayName } from "@/features/shared/utils/displayName";
import BlogContent from "./BlogContent";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminPill,
  AdminTableCard,
  AdminTabs,
  adminButtonClass,
  adminLabelClass,
  adminRowClass,
  adminTableClass,
  adminTdClass,
  adminTextareaClass,
  adminThClass,
  formatAdminDate,
  type PillTone,
} from "@/features/admin/components/ui/primitives";

const TABS: { value: BlogPostStatus; label: string }[] = [
  { value: "PENDING_REVIEW", label: "Awaiting review" },
  { value: "PUBLISHED", label: "Published" },
  { value: "REJECTED", label: "Rejected" },
];

const STATUS_PILL: Partial<Record<BlogPostStatus, { label: string; tone: PillTone }>> = {
  PENDING_REVIEW: { label: "Awaiting review", tone: "warn" },
  PUBLISHED: { label: "Published", tone: "brand" },
  REJECTED: { label: "Rejected", tone: "dark" },
  DRAFT: { label: "Draft", tone: "neutral" },
};

export default function AdminBlogReview() {
  const [tab, setTab] = useState<BlogPostStatus>("PENDING_REVIEW");
  const { posts, loading, error, reload } = useAdminBlogList(tab);

  const [open, setOpen] = useState<AdminBlogPost | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  async function openPost(id: string) {
    setOpening(id);
    setActionError("");
    setReason("");

    const result = await fetchAdminBlogPost(id);
    setOpening(null);

    if (result.ok) setOpen(result.data.post);
    else setActionError(result.error);
  }

  async function decide(action: "approve" | "reject") {
    if (!open) return;

    if (action === "reject" && reason.trim().length < 5) {
      setActionError("Give the teacher a reason (at least 5 characters).");
      return;
    }

    setBusy(true);
    setActionError("");

    const result = await decideBlogPost(open.id, action, reason.trim());
    setBusy(false);

    if (!result.ok) {
      setActionError(result.error);
      return;
    }

    setOpen(null);
    await reload();
  }

  const openPill = open ? STATUS_PILL[open.status] : undefined;

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Approvals" }]}
        title="Blog posts"
        description="Teacher-written posts go live on the public blog only after you approve them."
      />

      <div>
        <AdminTabs
          label="Post status"
          value={tab}
          onChange={(next) => {
            setTab(next);
            setOpen(null);
            setActionError("");
          }}
          tabs={TABS.map((t) => ({
            ...t,
            count: t.value === tab && !loading ? posts.length : undefined,
          }))}
        />
      </div>

      {!open && <AdminError>{error || actionError}</AdminError>}

      {open ? (
        <section aria-label="Post review">
          <AdminPanel padded className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setOpen(null)}
                className={adminButtonClass("ghost", "-ml-3")}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to list
              </button>
              {openPill && <AdminPill tone={openPill.tone}>{openPill.label}</AdminPill>}
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="font-heading text-2xl font-bold">{open.title}</h2>
              <p className="text-[15px] text-admin-muted">
                By {displayName(open.teacher)} ({open.teacher.email}) ·{" "}
                {blogCategoryLabel(open.category)} · {countWords(open.content)} words · /blog/
                {open.slug}
              </p>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-admin-muted">
                Search description
              </span>
              <span className="text-base">{open.excerpt}</span>
            </div>

            {open.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-admin-muted">
                  Keywords
                </span>
                {open.tags.map((tag) => (
                  <AdminPill key={tag}>{tag}</AdminPill>
                ))}
              </div>
            )}

            <div className="lh max-h-[60vh] overflow-y-auto rounded-[14px] border border-admin-line p-5">
              <BlogContent markdown={open.content} />
            </div>

            <AdminError>{actionError}</AdminError>

            {(open.status === "PENDING_REVIEW" || open.status === "PUBLISHED") && (
              <div className="flex flex-col gap-3">
                <div>
                  <label htmlFor="blog-feedback" className={adminLabelClass}>
                    {open.status === "PUBLISHED"
                      ? "Reason for taking this post down"
                      : "Feedback for the teacher"}{" "}
                    <span className="font-semibold text-admin-muted">
                      {open.status === "PUBLISHED"
                        ? "(shown to the teacher)"
                        : "(required only if you reject)"}
                    </span>
                  </label>
                  <textarea
                    id="blog-feedback"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className={adminTextareaClass}
                  />
                  <span className="mt-1 block text-sm text-admin-muted">
                    At least 5 characters when rejecting. Up to 500.
                  </span>
                </div>

                <div className="flex flex-wrap gap-3">
                  {open.status === "PENDING_REVIEW" && (
                    <button
                      type="button"
                      onClick={() => decide("approve")}
                      disabled={busy}
                      className={adminButtonClass("primary")}
                    >
                      Approve and publish
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => decide("reject")}
                    disabled={busy}
                    className={adminButtonClass("secondary", "text-red-700")}
                  >
                    {open.status === "PUBLISHED" ? "Take down" : "Reject"}
                  </button>
                </div>
              </div>
            )}

            {open.status === "REJECTED" && open.rejectionReason && (
              <p className="rounded-[14px] bg-admin-surface px-4 py-3 text-[15px]">
                <span className="font-extrabold">Reason given:</span> {open.rejectionReason}
              </p>
            )}
          </AdminPanel>
        </section>
      ) : loading ? (
        <AdminLoading />
      ) : posts.length === 0 ? (
        <AdminEmpty message="Nothing here." />
      ) : (
        <AdminTableCard>
          <table className={adminTableClass}>
            <thead>
              <tr>
                <th className={adminThClass}>Post</th>
                <th className={adminThClass}>Teacher</th>
                <th className={adminThClass}>Category</th>
                <th className={adminThClass}>{tab === "PENDING_REVIEW" ? "Submitted" : "Updated"}</th>
                <th className={`${adminThClass} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className={adminRowClass}>
                  <td className={`${adminTdClass} font-extrabold`}>{p.title}</td>
                  <td className={adminTdClass}>{displayName(p.teacher)}</td>
                  <td className={adminTdClass}>{blogCategoryLabel(p.category)}</td>
                  <td className={`${adminTdClass} whitespace-nowrap`}>
                    {formatAdminDate(tab === "PENDING_REVIEW" ? p.submittedAt : p.updatedAt)}
                  </td>
                  <td className={`${adminTdClass} text-right`}>
                    <button
                      type="button"
                      onClick={() => openPost(p.id)}
                      disabled={opening === p.id}
                      aria-label={`Open ${p.title}`}
                      className={adminButtonClass("primary")}
                    >
                      {opening === p.id ? "Opening…" : "Open"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableCard>
      )}
    </AdminPage>
  );
}
