"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Eye, PenLine } from "lucide-react";

import { deleteBlogPost, useTeacherBlogList } from "../hooks/useTeacherBlogs";
import { blogCategoryLabel } from "../utils/blogCategories";
import BlogStatusBadge from "./TeacherBlogStatusBadge";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function TeacherBlogList() {
  const { posts, loading, error, reload, setError } = useTeacherBlogList();
  const [busyId, setBusyId] = useState<string | null>(null);

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
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-brand">Blogs</p>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-gray-800 mt-1">Your blog posts</h1>
          <p className="text-gray-500 mt-1 text-sm max-w-xl">
            Write helpful guides for parents. Approved posts are published on the public Learniee
            blog under your name.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/teacher/blogs/read"
            className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
          >
            <BookOpen size={16} /> Read blogs
          </Link>
          <Link
            href="/teacher/blogs/new"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <PenLine size={16} /> Write a post
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-sm border border-red-100">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-violet-50 animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-8 text-center">
          <p className="text-gray-500">You haven&apos;t written a post yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id} className="bg-white border border-violet-100 rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-heading font-bold text-gray-800 break-words">{post.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {blogCategoryLabel(post.category)} &middot; {post.readingMinutes} min read &middot; edited{" "}
                    {formatDate(post.updatedAt)}
                  </p>
                </div>
                <BlogStatusBadge status={post.status} />
              </div>

              {post.status === "REJECTED" && post.rejectionReason && (
                <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  <span className="font-semibold">Feedback from the reviewer:</span> {post.rejectionReason}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold">
                <Link href={`/teacher/blogs/${post.id}`} className="text-violet-700 hover:underline">
                  {post.status === "DRAFT" || post.status === "REJECTED" ? "Edit" : "View"}
                </Link>
                {post.status === "PUBLISHED" && (
                  <Link
                    href={`/teacher/blogs/read/${post.slug}`}
                    className="inline-flex items-center gap-1 text-violet-700 hover:underline"
                  >
                    View live <Eye size={13} />
                  </Link>
                )}
                {post.status !== "PUBLISHED" && (
                  <button
                    onClick={() => handleDelete(post.id, post.title)}
                    disabled={busyId === post.id}
                    className="text-red-600 hover:underline disabled:opacity-50"
                  >
                    Delete
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
