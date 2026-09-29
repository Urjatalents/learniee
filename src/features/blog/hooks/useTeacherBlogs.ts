"use client";

import { useCallback, useEffect, useState } from "react";

import type { BlogPostFormValues, TeacherBlogPost } from "../types";

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function call<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: data?.error || "Something went wrong. Please try again." };
    }

    return { ok: true, data: data as T };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Network error. Please try again." };
  }
}

/** Create (no id) or update (id) a draft. Returns the saved post. */
export function saveBlogPost(postId: string | null, values: BlogPostFormValues) {
  return call<{ post: TeacherBlogPost }>(
    postId ? `/api/teacher/blogs/${postId}` : "/api/teacher/blogs",
    { method: postId ? "PATCH" : "POST", body: JSON.stringify(values) },
  );
}

export function changeBlogStatus(postId: string, action: "submit" | "withdraw" | "unpublish") {
  return call<{ post: TeacherBlogPost }>(`/api/teacher/blogs/${postId}/status`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export function deleteBlogPost(postId: string) {
  return call<{ success: true }>(`/api/teacher/blogs/${postId}`, { method: "DELETE" });
}

/** The Teacher's own posts (list view — no article bodies). */
export function useTeacherBlogList() {
  const [posts, setPosts] = useState<Omit<TeacherBlogPost, "content">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const result = await call<{ posts: Omit<TeacherBlogPost, "content">[] }>("/api/teacher/blogs");

    if (result.ok) setPosts(result.data.posts);
    else setError(result.error);

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { posts, loading, error, reload: load, setError };
}

/** One post with its body, for the editor. */
export function useTeacherBlogPost(postId: string | undefined) {
  const [post, setPost] = useState<TeacherBlogPost | null>(null);
  const [loading, setLoading] = useState(Boolean(postId));
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!postId) return;

    setLoading(true);
    setError("");

    const result = await call<{ post: TeacherBlogPost }>(`/api/teacher/blogs/${postId}`);

    if (result.ok) setPost(result.data.post);
    else setError(result.error);

    setLoading(false);
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  return { post, setPost, loading, error };
}
