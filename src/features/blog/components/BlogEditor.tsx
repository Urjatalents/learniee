"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Circle, Loader2 } from "lucide-react";

import "@/features/landing/styles/landing.css";

import { changeBlogStatus, saveBlogPost, useTeacherBlogPost } from "../hooks/useTeacherBlogs";
import type { BlogPostStatus, TeacherBlogPost } from "../types";
import { BLOG_CATEGORIES } from "../utils/blogCategories";
import {
  BLOG_LIMITS,
  countWords,
  normalizeTags,
  validateDraft,
  validateForSubmit,
} from "../utils/blogRules";
import { parseMarkdown } from "../utils/markdown";
import BlogContent from "./BlogContent";
import BlogStatusBadge from "./TeacherBlogStatusBadge";

const INPUT =
  "w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:bg-gray-50";

type Format = "h2" | "h3" | "bold" | "italic" | "ul" | "ol" | "quote" | "link";

const TOOLBAR: { kind: Format; label: string; title: string }[] = [
  { kind: "h2", label: "H2", title: "Section heading" },
  { kind: "h3", label: "H3", title: "Sub-heading" },
  { kind: "bold", label: "B", title: "Bold" },
  { kind: "italic", label: "I", title: "Italic" },
  { kind: "ul", label: "• List", title: "Bullet list" },
  { kind: "ol", label: "1. List", title: "Numbered list" },
  { kind: "quote", label: "Quote", title: "Quote" },
  { kind: "link", label: "Link", title: "Insert link" },
];

/** Loads the post (edit mode) and hands it to the form. New posts render the form directly. */
export default function BlogEditor({ postId }: { postId?: string }) {
  const { post, loading, error } = useTeacherBlogPost(postId);

  if (postId && loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="size-6 animate-spin text-violet-600" />
      </div>
    );
  }

  if (postId && (error || !post)) {
    return (
      <div className="p-4 sm:p-8 max-w-3xl mx-auto">
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm border border-red-100">
          {error || "Blog post not found."}
        </div>
        <Link href="/teacher/blogs" className="mt-4 inline-block text-sm font-semibold text-violet-700">
          ← Back to your posts
        </Link>
      </div>
    );
  }

  return <EditorForm key={post?.id ?? "new"} initial={post} />;
}

function EditorForm({ initial }: { initial: TeacherBlogPost | null }) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [postId, setPostId] = useState<string | null>(initial?.id ?? null);
  const [status, setStatus] = useState<BlogPostStatus>(initial?.status ?? "DRAFT");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [rejection] = useState(initial?.rejectionReason ?? "");

  const [title, setTitle] = useState(initial?.title ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));

  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const editable = status === "DRAFT" || status === "REJECTED";
  const words = useMemo(() => countWords(content), [content]);
  const parsed = useMemo(() => parseMarkdown(content), [content]);
  const tags = normalizeTags(tagsText.split(","));

  const values = { title, excerpt, content, category, tags };

  const checklist = [
    {
      ok: title.trim().length >= BLOG_LIMITS.titleMin && title.trim().length <= BLOG_LIMITS.titleRecommended,
      text: `Title is ${BLOG_LIMITS.titleMin}–${BLOG_LIMITS.titleRecommended} characters (${title.trim().length}) so it isn't cut off in Google`,
    },
    {
      ok: excerpt.trim().length >= BLOG_LIMITS.excerptMin && excerpt.trim().length <= BLOG_LIMITS.excerptRecommendedMax,
      text: `Summary is ${BLOG_LIMITS.excerptMin}–${BLOG_LIMITS.excerptRecommendedMax} characters (${excerpt.trim().length}) — it becomes the search-result description`,
    },
    { ok: words >= BLOG_LIMITS.submitMinWords, text: `At least ${BLOG_LIMITS.submitMinWords} words (${words})` },
    {
      ok: parsed.headings.filter((h) => h.level === 2).length >= 2,
      text: "Two or more “##” section headings — they build the table of contents",
    },
    { ok: /\]\(\/[^)]*\)/.test(content), text: "A link to a Learniee page, e.g. [free demo](/signup)" },
    { ok: Boolean(category), text: "Category chosen" },
  ];

  function format(kind: Format) {
    const ta = textareaRef.current;
    if (!ta || !editable) return;

    const { selectionStart: s, selectionEnd: e, value } = ta;
    const selected = value.slice(s, e);
    let next = value;
    let caret = e;

    if (kind === "bold" || kind === "italic") {
      const mark = kind === "bold" ? "**" : "*";
      const inner = selected || (kind === "bold" ? "bold text" : "italic text");
      next = value.slice(0, s) + mark + inner + mark + value.slice(e);
      caret = s + mark.length + inner.length + mark.length;
    } else if (kind === "link") {
      const url = window.prompt("Link address (https://… or /page on Learniee):", "https://");
      if (!url) return;
      const text = selected || "link text";
      next = `${value.slice(0, s)}[${text}](${url.trim()})${value.slice(e)}`;
      caret = s + text.length + url.trim().length + 4;
    } else {
      const prefix = { h2: "## ", h3: "### ", ul: "- ", ol: "1. ", quote: "> " }[kind];
      const lineStart = value.lastIndexOf("\n", s - 1) + 1;
      next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
      caret = e + prefix.length;
    }

    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(caret, caret);
    });
  }

  /** Saves the draft; returns the saved id, or null after showing the error. */
  async function save(): Promise<string | null> {
    const problems = validateDraft(values);
    if (problems.length) {
      setError(problems.join(" "));
      return null;
    }

    const result = await saveBlogPost(postId, values);

    if (!result.ok) {
      setError(result.error);
      return null;
    }

    const saved = result.data.post;
    setPostId(saved.id);
    setSlug(saved.slug);
    setStatus(saved.status);

    if (!postId) window.history.replaceState(null, "", `/teacher/blogs/${saved.id}`);

    return saved.id;
  }

  async function handleSave() {
    setBusy(true);
    setError("");
    setNotice("");

    const id = await save();
    if (id) setNotice("Draft saved.");

    setBusy(false);
  }

  async function handleSubmit() {
    setError("");
    setNotice("");

    const problems = validateForSubmit(values);
    if (problems.length) {
      setError(problems.join(" "));
      return;
    }

    if (!window.confirm("Submit this post for review? You can't edit it while it's being reviewed.")) return;

    setBusy(true);

    const id = await save();

    if (id) {
      const result = await changeBlogStatus(id, "submit");

      if (result.ok) {
        router.push("/teacher/blogs");
        return;
      }

      setError(result.error);
    }

    setBusy(false);
  }

  async function handleStatus(action: "withdraw" | "unpublish") {
    if (!postId) return;
    if (
      action === "unpublish" &&
      !window.confirm("Unpublish this post? It will disappear from the public blog until an Admin approves it again.")
    ) {
      return;
    }

    setBusy(true);
    setError("");

    const result = await changeBlogStatus(postId, action);

    if (result.ok) {
      setStatus(result.data.post.status);
      setNotice(action === "withdraw" ? "Withdrawn — you can edit it again." : "Unpublished — you can edit it now.");
    } else {
      setError(result.error);
    }

    setBusy(false);
  }

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
          <Link href={`/blog/${slug}`} target="_blank" className="font-semibold underline">
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
                      className="rounded-lg border border-violet-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-violet-50"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
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
            {words} words · about {Math.max(1, Math.ceil(words / 200))} min read. Use ## for sections, **bold**, - for
            lists.
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
