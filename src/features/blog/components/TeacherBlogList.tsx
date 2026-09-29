"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, Eye, PenLine, Pencil, Trash2 } from "lucide-react";

import { deleteBlogPost, useTeacherBlogList } from "../hooks/useTeacherBlogs";
import type { BlogPostStatus } from "../types";
import { blogCategoryLabel } from "../utils/blogCategories";
import BlogStatusBadge from "./TeacherBlogStatusBadge";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const STRIPE: Record<BlogPostStatus, string> = {
  DRAFT: "bg-gray-300",
  PENDING_REVIEW: "bg-amber-400",
  PUBLISHED: "bg-green-500",
  REJECTED: "bg-red-500",
};

const TABS: { key: "ALL" | BlogPostStatus; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PUBLISHED", label: "Published" },
  { key: "PENDING_REVIEW", label: "In review" },
  { key: "DRAFT", label: "Drafts" },
  { key: "REJECTED", label: "Needs changes" },
];

const BTN =
  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-50";

export default function TeacherBlogList() {
  const { posts, loading, error, reload, setError } = useTeacherBlogList();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<"ALL" | BlogPostStatus>("ALL");

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: posts.length };
    for (const p of posts) c[p.status] = (c[p.status] ?? 0) + 1;

    return c;
  }, [posts]);

  const visible = tab === "ALL" ? posts : posts.filter((p) => p.status === tab);

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;

    setBusyId(id);
    const result = await deleteBlogPost(id);
    setBusyId(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    await reload();
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-light to-brand-dark p-6 sm:p-10 text-white">
        <span aria-hidden="true" className="absolute -right-10 -top-10 size-44 rounded-full bg-white/10" />
        <span aria-hidden="true" className="absolute right-24 bottom-[-2.5rem] size-24 rounded-full bg-brand-yellow/80" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-yellow">Learniee blog</p>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold mt-2">Your blog posts</h1>
            <p className="mt-2 text-sm sm:text-base text-white/85">
              Write helpful guides for parents. Approved posts are published on the Learniee blog under your name.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/teacher/blogs/read"
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/25"
            >
              <BookOpen size={16} /> Read blogs
            </Link>
            <Link
              href="/teacher/blogs/new"
              className="inline-flex items-center gap-2 rounded-full bg-brand-yellow px-4 py-2.5 text-sm font-bold text-violet-900 shadow-sm hover:brightness-95"
            >
              <PenLine size={16} /> Write a post
            </Link>
          </div>
        </div>
      </header>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {/* Status tabs */}
      {!loading && posts.length > 0 && (
        <nav aria-label="Filter posts" className="mt-6 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                tab === t.key
                  ? "bg-brand text-white shadow-sm"
                  : "bg-white border border-violet-200 text-violet-700 hover:bg-violet-50"
              }`}
            >
              {t.label} <span className="opacity-70">({counts[t.key] ?? 0})</span>
            </button>
          ))}
        </nav>
      )}

      {loading ? (
        <div className="mt-6 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-3xl bg-violet-100/60" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-6 rounded-3xl border-2 border-dashed border-violet-200 bg-white p-10 text-center">
          <p className="font-heading text-lg font-bold text-gray-800">You haven&apos;t written a post yet</p>
          <p className="mt-1 text-sm text-gray-500">Share what you know — parents read these before choosing a teacher.</p>
          <Link
            href="/teacher/blogs/new"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            <PenLine size={16} /> Write your first post
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-violet-100 bg-white p-8 text-center text-sm text-gray-500">
          No posts in this view.
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {visible.map((post) => (
            <li
              key={post.id}
              className="relative overflow-hidden rounded-3xl border border-violet-100 bg-white p-5 pl-7 shadow-sm transition hover:shadow-md"
            >
              <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${STRIPE[post.status]}`} />

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-heading text-lg font-bold text-gray-800 break-words">{post.title}</p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {blogCategoryLabel(post.category)} &middot; {post.readingMinutes} min read &middot; edited{" "}
                    {formatDate(post.updatedAt)}
                  </p>
                </div>
                <BlogStatusBadge status={post.status} />
              </div>

              {post.status === "REJECTED" && post.rejectionReason && (
                <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                  <span className="font-semibold">Feedback from the reviewer:</span> {post.rejectionReason}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link
                  href={`/teacher/blogs/${post.id}`}
                  className={`${BTN} border-violet-200 text-violet-700 hover:bg-violet-50`}
                >
                  <Pencil size={13} /> {post.status === "DRAFT" || post.status === "REJECTED" ? "Edit" : "View"}
                </Link>
                {post.status === "PUBLISHED" && (
                  <Link
                    href={`/teacher/blogs/read/${post.slug}`}
                    className={`${BTN} border-green-200 text-green-700 hover:bg-green-50`}
                  >
                    <Eye size={13} /> View live
                  </Link>
                )}
                {post.status !== "PUBLISHED" && (
                  <button
                    type="button"
                    onClick={() => handleDelete(post.id, post.title)}
                    disabled={busyId === post.id}
                    className={`${BTN} border-red-200 text-red-600 hover:bg-red-50`}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
