"use client";

import { ArrowLeft, CheckCircle2, Circle, Loader2 } from "lucide-react";
import Link from "next/link";

import "@/features/landing/styles/landing.css";

import type { TeacherBlogPost } from "../../types";
import { BLOG_CATEGORIES } from "../../utils/blogCategories";
import {
    BLOG_IMAGE_MIME_TYPES
} from "../../utils/blogImages";
import {
    BLOG_LIMITS
} from "../../utils/blogRules";
import BlogContent from "../BlogContent";
import BlogStatusBadge from "../TeacherBlogStatusBadge";
import { INPUT, TOOLBAR } from "./editorConfig";
import { useBlogEditorForm } from "./useBlogEditorForm";

export default function EditorForm({ initial }: { initial: TeacherBlogPost | null }) {
  const {
    textareaRef,
    fileInputRef,
    postId,
    status,
    slug,
    rejection,
    title,
    setTitle,
    excerpt,
    setExcerpt,
    content,
    setContent,
    category,
    setCategory,
    tagsText,
    setTagsText,
    preview,
    setPreview,
    busy,
    error,
    notice,
    uploading,
    editable,
    parsed,
    words,
    links,
    imageCount,
    checklist,
    format,
    handleImageChosen,
    handleSave,
    handleSubmit,
    handleStatus,
  } = useBlogEditorForm(initial);

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <Link
        href="/teacher/blogs"
        className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:underline mb-4"
      >
        <ArrowLeft size={14} /> Your posts
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-gray-800">
          {postId ? "Edit blog post" : "Write a blog post"}
        </h1>
        {postId && <BlogStatusBadge status={status} />}
      </div>

      {status === "REJECTED" && rejection && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <span className="font-semibold">Feedback from the reviewer:</span> {rejection}
        </p>
      )}
      {status === "PENDING_REVIEW" && (
        <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          This post is waiting for Admin review, so it&apos;s read-only. Withdraw it to make changes.
        </p>
      )}
      {status === "PUBLISHED" && (
        <p className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">
          This post is live. To edit it, unpublish it first — it will need approval again.{" "}
          <Link href={`/teacher/blogs/read/${slug}`} className="font-semibold underline">
            View live
          </Link>
        </p>
      )}
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm border border-red-100">{error}</div>}
      {notice && <div className="bg-green-50 text-green-700 p-3 rounded-xl mb-4 text-sm border border-green-100">{notice}</div>}

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="blog-title">
            Title
          </label>
          <input
            id="blog-title"
            className={INPUT}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={BLOG_LIMITS.titleMax}
            disabled={!editable}
            placeholder="e.g. 7 Study Habits That Help Class 8 Students Score Higher"
          />
          <p className="mt-1 text-xs text-gray-500">
            Put the main topic first. {title.trim().length}/{BLOG_LIMITS.titleRecommended} recommended.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="blog-category">
              Category
            </label>
            <select
              id="blog-category"
              className={INPUT}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={!editable}
            >
              <option value="">Choose…</option>
              {BLOG_CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="blog-tags">
              Keywords (up to {BLOG_LIMITS.maxTags}, comma separated)
            </label>
            <input
              id="blog-tags"
              className={INPUT}
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              disabled={!editable}
              placeholder="online tuition, class 8, study routine"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="blog-excerpt">
            Summary
          </label>
          <textarea
            id="blog-excerpt"
            className={INPUT}
            rows={3}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            maxLength={BLOG_LIMITS.excerptMax}
            disabled={!editable}
            placeholder="One or two sentences that make a parent want to click. Shown on Google and social media."
          />
          <p className="mt-1 text-xs text-gray-500">
            {excerpt.trim().length}/{BLOG_LIMITS.excerptRecommendedMax} recommended.
          </p>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <label className="block text-sm font-semibold text-gray-700" htmlFor="blog-content">
              Article
            </label>
            <div className="flex rounded-lg border border-violet-200 overflow-hidden text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPreview(false)}
                className={`px-3 py-1 ${!preview ? "bg-violet-600 text-white" : "bg-white text-gray-600"}`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setPreview(true)}
                className={`px-3 py-1 ${preview ? "bg-violet-600 text-white" : "bg-white text-gray-600"}`}
              >
                Preview
              </button>
            </div>
          </div>

          {preview ? (
            <div className="lh rounded-xl border border-violet-200 bg-white p-5 min-h-64">
              {content.trim() ? <BlogContent parsed={parsed} /> : <p>Nothing to preview yet.</p>}
            </div>
          ) : (
            <>
              {editable && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {TOOLBAR.map((t) => (
                    <button
                      key={t.kind}
                      type="button"
                      title={t.title}
                      onClick={() => format(t.kind)}
                      disabled={uploading && t.kind === "image"}
                      className="rounded-lg border border-violet-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-violet-50"
                    >
                      {t.label}
                    </button>
                  ))}
                  {uploading && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <Loader2 className="size-3.5 animate-spin" /> Uploading image…
                    </span>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={BLOG_IMAGE_MIME_TYPES.join(",")}
                className="hidden"
                onChange={(e) => void handleImageChosen(e.target.files?.[0])}
              />
              <textarea
                id="blog-content"
                ref={textareaRef}
                className={`${INPUT} font-mono leading-relaxed`}
                rows={20}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={BLOG_LIMITS.contentMaxChars}
                disabled={!editable}
                placeholder={"Start with a short intro, then use ## for each section.\n\n## First point\nYour text…"}
              />
            </>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {words} words · about {Math.max(1, Math.ceil(words / 200))} min read · {links.internal} internal /{" "}
            {links.external} external links · {imageCount} {imageCount === 1 ? "image" : "images"}. Use ## for sections,
            **bold**, - for lists.
          </p>
        </div>

        {editable && (
          <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
            <p className="text-sm font-semibold text-gray-800 mb-2">SEO checklist</p>
            <ul className="space-y-1.5">
              {checklist.map((c) => (
                <li key={c.text} className="flex items-start gap-2 text-sm text-gray-600">
                  {c.ok ? (
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" />
                  ) : (
                    <Circle size={16} className="mt-0.5 shrink-0 text-gray-300" />
                  )}
                  {c.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {editable && (
            <>
              <button
                onClick={handleSave}
                disabled={busy}
                className="rounded-xl border border-violet-300 bg-white px-5 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"
              >
                {busy ? "Working…" : "Save draft"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={busy}
                className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                Submit for review
              </button>
            </>
          )}
          {status === "PENDING_REVIEW" && (
            <button
              onClick={() => handleStatus("withdraw")}
              disabled={busy}
              className="rounded-xl border border-amber-300 bg-white px-5 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
            >
              Withdraw from review
            </button>
          )}
          {status === "PUBLISHED" && (
            <button
              onClick={() => handleStatus("unpublish")}
              disabled={busy}
              className="rounded-xl border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Unpublish to edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
