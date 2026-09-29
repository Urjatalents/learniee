"use client";

import { useCallback, useEffect, useState } from "react";

import type { AdminBlogPost, BlogPostStatus } from "../types";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function call<T>(url: string, init?: RequestInit): Promise<Result<T>> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) return { ok: false, error: data?.error || "Something went wrong." };

    return { ok: true, data: data as T };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Network error. Please try again." };
  }
}

export function fetchAdminBlogPost(postId: string) {
  return call<{ post: AdminBlogPost }>(`/api/admin/blogs/${postId}`);
}

export function decideBlogPost(postId: string, action: "approve" | "reject", reason?: string) {
  return call<{ post: AdminBlogPost }>(`/api/admin/blogs/${postId}/decision`, {
    method: "POST",
    body: JSON.stringify({ action, reason }),
  });
}

/** Admin's list of posts in one status (no article bodies). */
export function useAdminBlogList(status: BlogPostStatus) {
  const [posts, setPosts] = useState<Omit<AdminBlogPost, "content">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const result = await call<{ posts: Omit<AdminBlogPost, "content">[] }>(
      `/api/admin/blogs?status=${status}`,
    );

    if (result.ok) setPosts(result.data.posts);
    else setError(result.error);

    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  return { posts, loading, error, reload: load };
}
