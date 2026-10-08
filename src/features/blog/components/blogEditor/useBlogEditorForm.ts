"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import "@/features/landing/styles/landing.css";
import { uploadFileToS3 } from "@/lib/uploadFileToS3";

import { changeBlogStatus, saveBlogPost } from "../../hooks/useTeacherBlogs";
import type { BlogPostStatus, TeacherBlogPost } from "../../types";
import {
    BLOG_IMAGE_MAX_BYTES,
    BLOG_IMAGE_MIME_TYPES,
    blogImageUrlFromKey,
    cleanAltText,
} from "../../utils/blogImages";
import {
    BLOG_LIMITS,
    countBlockWords,
    normalizeTags,
    validateDraft,
    validateForSubmit,
} from "../../utils/blogRules";
import { countImages, countLinks, parseMarkdown } from "../../utils/markdown";
import type { Format } from "./editorConfig";

/** All state and actions of the blog editor form. */
export function useBlogEditorForm(initial: TeacherBlogPost | null) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [uploading, setUploading] = useState(false);

  const editable = status === "DRAFT" || status === "REJECTED";
  const parsed = useMemo(() => parseMarkdown(content), [content]);
  // Everything below is counted from the parsed article, i.e. exactly what readers will see.
  const words = useMemo(() => countBlockWords(parsed.blocks), [parsed]);
  const links = useMemo(() => countLinks(parsed.blocks), [parsed]);
  const imageCount = useMemo(() => countImages(parsed.blocks), [parsed]);
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
    {
      ok: links.internal >= 1,
      text: `A link to a Learniee page, e.g. [free demo](/signup) (${links.internal} found)`,
    },
    { ok: imageCount >= 1, text: `An image with a short description (${imageCount} added)` },
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
    } else if (kind === "image") {
      fileInputRef.current?.click();
      return;
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

  /** Uploads the chosen image to S3 and inserts `![description](url)` on its own lines at the caret. */
  async function handleImageChosen(file: File | undefined) {
    if (!file || !editable) return;

    setError("");
    setNotice("");

    if (!(BLOG_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError("Images must be PNG or JPEG.");
      return;
    }
    if (file.size > BLOG_IMAGE_MAX_BYTES) {
      setError(`That image is too large. The limit is ${BLOG_IMAGE_MAX_BYTES / (1024 * 1024)} MB.`);
      return;
    }

    const fallback = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
    const alt = cleanAltText(
      window.prompt("Describe the image in a few words (helps accessibility and Google):", fallback) ?? fallback,
    );

    const ta = textareaRef.current;
    const at = ta ? ta.selectionEnd : content.length;

    setUploading(true);

    try {
      // Re-wrap with a safe name so the stored extension always matches the type.
      const safe = new File([file], file.type === "image/png" ? "image.png" : "image.jpg", { type: file.type });
      const key = await uploadFileToS3({ file: safe, folder: "blog-images" });
      const markdown = `![${alt}](${blogImageUrlFromKey(key)})`;

      setContent((current) => {
        const pos = Math.min(at, current.length);
        const before = current.slice(0, pos);
        const after = current.slice(pos);
        const lead = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
        const tail = after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";

        return `${before}${lead}${markdown}${tail}${after}`;
      });
      setNotice("Image added. Save the draft to keep it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload the image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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


  return {
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
    tags,
    checklist,
    format,
    handleImageChosen,
    handleSave,
    handleSubmit,
    handleStatus,
  };
}
