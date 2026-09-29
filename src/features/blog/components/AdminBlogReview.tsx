"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import "@/features/landing/styles/landing.css";

import { decideBlogPost, fetchAdminBlogPost, useAdminBlogList } from "../hooks/useAdminBlogs";
import type { AdminBlogPost, BlogPostStatus } from "../types";
import { blogCategoryLabel } from "../utils/blogCategories";
import { countWords } from "../utils/blogRules";
import { displayName } from "@/features/shared/utils/displayName";
import BlogContent from "./BlogContent";
import BlogStatusBadge from "./TeacherBlogStatusBadge";

const TABS: { status: BlogPostStatus; label: string }[] = [
  { status: "PENDING_REVIEW", label: "Awaiting review" },
  { status: "PUBLISHED", label: "Published" },
  { status: "REJECTED", label: "Rejected" },
];

function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";
}

export default function AdminBlogReview() {
  const router = useRouter();
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.push("/admin")}
          className="text-sm text-gray-500 hover:text-purple-600 mb-2"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-purple-600">Blog Posts</h1>
        <p className="text-gray-500 mt-1 mb-6">
          Teacher-written posts go live on the public blog only after you approve them.
        </p>

        <div className="flex gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t.status}
              onClick={() => {
                setTab(t.status);
                setOpen(null);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium border ${
                tab === t.status
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-gray-600 hover:bg-purple-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {(error || actionError) && !open && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm border border-red-100">
            {error || actionError}
          </div>
        )}

        {open ? (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <button onClick={() => setOpen(null)} className="text-sm text-gray-500 hover:text-purple-600 mb-3">
              ← Back to list
            </button>

            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{open.title}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  By {displayName(open.teacher)} ({open.teacher.email}) · {blogCategoryLabel(open.category)} ·{" "}
                  {countWords(open.content)} words · /blog/{open.slug}
                </p>
              </div>
              <BlogStatusBadge status={open.status} />
            </div>

            <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
              <span className="font-semibold">Search description:</span> {open.excerpt}
            </p>
            {open.tags.length > 0 && (
              <p className="mt-2 text-sm text-gray-500">Keywords: {open.tags.join(", ")}</p>
            )}

            <div className="lh mt-5 rounded-lg border p-5 max-h-[60vh] overflow-y-auto">
              <BlogContent markdown={open.content} />
            </div>

            {actionError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mt-4 text-sm border border-red-100">
                {actionError}
              </div>
            )}

            {(open.status === "PENDING_REVIEW" || open.status === "PUBLISHED") && (
              <div className="mt-5 space-y-3">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder={
                    open.status === "PUBLISHED"
                      ? "Reason for taking this post down (shown to the teacher)…"
                      : "Feedback for the teacher — required only if you reject…"
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-3">
                  {open.status === "PENDING_REVIEW" && (
                    <button
                      onClick={() => decide("approve")}
                      disabled={busy}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg disabled:opacity-50"
                    >
                      Approve &amp; publish
                    </button>
                  )}
                  <button
                    onClick={() => decide("reject")}
                    disabled={busy}
                    className="border border-red-300 text-red-700 hover:bg-red-50 px-5 py-2 rounded-lg disabled:opacity-50"
                  >
                    {open.status === "PUBLISHED" ? "Take down" : "Reject"}
                  </button>
                </div>
              </div>
            )}

            {open.status === "REJECTED" && open.rejectionReason && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <span className="font-semibold">Reason given:</span> {open.rejectionReason}
              </p>
            )}
          </div>
        ) : loading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : posts.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center text-gray-500 text-sm">
            Nothing here.
          </div>
        ) : (
          <div className="bg-white border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b bg-gray-50">
                  <th className="px-4 py-3 font-semibold">Post</th>
                  <th className="px-4 py-3 font-semibold">Teacher</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">{tab === "PENDING_REVIEW" ? "Submitted" : "Updated"}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.title}</td>
                    <td className="px-4 py-3 text-gray-600">{displayName(p.teacher)}</td>
                    <td className="px-4 py-3 text-gray-600">{blogCategoryLabel(p.category)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(tab === "PENDING_REVIEW" ? p.submittedAt : p.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openPost(p.id)}
                        disabled={opening === p.id}
                        className="text-purple-600 hover:underline font-medium disabled:opacity-50"
                      >
                        {opening === p.id ? "Opening…" : "Open"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
